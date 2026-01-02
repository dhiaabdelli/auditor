package handlers

import (
	"bufio"
	"context"
	"math/rand"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"network-script-generator/internal/shared"

	"github.com/gorilla/websocket"
	"golang.org/x/net/icmp"
	"golang.org/x/net/ipv4"
)

// PingTracerConfig represents the configuration for ping tracer
type PingTracerConfig struct {
	Host           string `json:"host"`
	Rate           int    `json:"rate"` // pings per second per host
	TraceRoute     bool   `json:"traceRoute"`
	ReverseDNS     bool   `json:"reverseDNS"`
	LogFailures    bool   `json:"logFailures"`
	LogSuccesses   bool   `json:"logSuccesses"`
	PreferIPv4     bool   `json:"preferIPv4"`
	ServerNames    bool   `json:"serverNames"`
	PacketLoss     bool   `json:"packetLoss"`
	LastPing       bool   `json:"lastPing"`
	Average        bool   `json:"average"`
	Jitter         bool   `json:"jitter"`
	MinMax         bool   `json:"minMax"`
	BadThreshold   int    `json:"badThreshold"`   // ms
	WorseThreshold int    `json:"worseThreshold"` // ms
}

// HopData represents data for a single network hop
type HopData struct {
	HopNumber  int     `json:"hopNumber"`
	IP         string  `json:"ip"`
	Hostname   string  `json:"hostname,omitempty"`
	Latencies  []int   `json:"latencies"`  // Recent latencies in ms
	PacketLoss float64 `json:"packetLoss"` // Percentage
	LastPing   int     `json:"lastPing"`   // Last ping latency in ms
	Average    float64 `json:"average"`    // Average latency
	Min        int     `json:"min"`        // Min latency
	Max        int     `json:"max"`        // Max latency
	Jitter     float64 `json:"jitter"`     // Jitter (std deviation)
	Successful int     `json:"successful"` // Total successful pings
	Failed     int     `json:"failed"`     // Total failed pings
	IsActive   bool    `json:"isActive"`   // Whether this hop is being monitored
}

// PingResult represents a single ping result
type PingResult struct {
	HopNumber int   `json:"hopNumber"`
	Latency   int   `json:"latency"` // -1 if failed
	Success   bool  `json:"success"`
	Timestamp int64 `json:"timestamp"`
}

// HandlePingTracer handles ping tracer requests via WebSocket
func HandlePingTracer(w http.ResponseWriter, r *http.Request) {
	// Upgrade to WebSocket
	conn, err := shared.Upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Read initial message with configuration
	var config PingTracerConfig
	err = conn.ReadJSON(&config)
	if err != nil {
		conn.WriteJSON(map[string]interface{}{
			"type":  "error",
			"error": "Failed to read configuration",
		})
		return
	}

	// Validate configuration
	if config.Host == "" {
		conn.WriteJSON(map[string]interface{}{
			"type":  "error",
			"error": "host parameter required",
		})
		return
	}

	if config.Rate <= 0 {
		config.Rate = 1
	}
	if config.Rate > 10 {
		config.Rate = 10
	}

	if config.BadThreshold <= 0 {
		config.BadThreshold = 100
	}
	if config.WorseThreshold <= 0 {
		config.WorseThreshold = 200
	}

	// Perform traceroute or single hop if requested
	// We use a channel to receive hops as they are discovered
	hopChan := make(chan *HopData)
	hops := []*HopData{}

	// Send initial empty hops data to clear client and reset counters
	// This ensures the frontend starts with a clean state
	conn.WriteJSON(map[string]interface{}{
		"type": "hops",
		"hops": []*HopData{}, // Explicitly empty array
	})

	// Start continuous pinging context
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var wg sync.WaitGroup
	var mu sync.Mutex

	// Handle client messages (for stop requests) and connection close
	stopChan := make(chan bool, 1)
	connClosed := make(chan bool, 1)
	
	// Monitor connection close
	go func() {
		for {
			var msg map[string]interface{}
			if err := conn.ReadJSON(&msg); err != nil {
				// Connection closed or error - stop everything
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					// Client disconnected unexpectedly
				}
				connClosed <- true
				stopChan <- true
				return
			}
			if msg["type"] == "stop" {
				stopChan <- true
				return
			}
		}
	}()

	// Start traceroute or single hop generation in a goroutine
	go func() {
		defer close(hopChan)
		if config.TraceRoute {
			performTraceroute(ctx, config.Host, config.PreferIPv4, hopChan)
		} else {
			// Single hop - just ping the host
			ip := config.Host
			hostname := ""
			if config.ReverseDNS {
				hostname = reverseDNSLookup(ip)
			}
		hop := &HopData{
			HopNumber:  1,
			IP:         ip,
			Hostname:   hostname,
			Latencies:  []int{},
			IsActive:   true,
			Successful: 0, // Explicitly initialize to 0
			Failed:     0, // Explicitly initialize to 0
		}
			select {
			case hopChan <- hop:
			case <-ctx.Done():
			}
		}
	}()

	// Ping interval based on rate (e.g., rate=3 means ping every 333ms)
	pingInterval := time.Duration(1000/config.Rate) * time.Millisecond

	// Helper function to update hop statistics
	updateHopStats := func(hop *HopData, latency int, success bool) {
		// Check if context is cancelled before updating
		select {
		case <-ctx.Done():
			return // Stop updating if context is cancelled
		default:
		}

		mu.Lock()
		defer mu.Unlock()

		if success {
			hop.Successful++
			hop.LastPing = latency
			// Keep last 100 latencies for graph
			hop.Latencies = append(hop.Latencies, latency)
			if len(hop.Latencies) > 100 {
				hop.Latencies = hop.Latencies[len(hop.Latencies)-100:]
			}
		} else {
			hop.Failed++
			hop.LastPing = -1
			// Add -1 for failed ping
			hop.Latencies = append(hop.Latencies, -1)
			if len(hop.Latencies) > 100 {
				hop.Latencies = hop.Latencies[len(hop.Latencies)-100:]
			}
		}

		// Calculate statistics
		total := hop.Successful + hop.Failed
		if total > 0 {
			hop.PacketLoss = float64(hop.Failed) / float64(total) * 100
		}

		// Calculate average, min, max, jitter from successful pings
		successfulLatencies := []int{}
		for _, lat := range hop.Latencies {
			if lat > 0 {
				successfulLatencies = append(successfulLatencies, lat)
			}
		}

		if len(successfulLatencies) > 0 {
			sum := 0
			min := successfulLatencies[0]
			max := successfulLatencies[0]
			for _, lat := range successfulLatencies {
				sum += lat
				if lat < min {
					min = lat
				}
				if lat > max {
					max = lat
				}
			}
			hop.Average = float64(sum) / float64(len(successfulLatencies))
			hop.Min = min
			hop.Max = max

			// Calculate jitter (standard deviation)
			if len(successfulLatencies) > 1 {
				variance := 0.0
				for _, lat := range successfulLatencies {
					diff := float64(lat) - hop.Average
					variance += diff * diff
				}
				hop.Jitter = variance / float64(len(successfulLatencies))
			}
		}

		// Send update only if context is not cancelled
		select {
		case <-ctx.Done():
			return // Don't send if context is cancelled
		default:
			// Try to send update, but ignore errors if connection is closed
			conn.WriteJSON(map[string]interface{}{
				"type": "ping",
				"hop":  hop,
			})
		}
	}

	// Consume hops from channel and start pinging
	go func() {
		for hop := range hopChan {
			// Add to local list
			mu.Lock()
			hops = append(hops, hop)
			mu.Unlock()

			// Send hop to client immediately
			conn.WriteJSON(map[string]interface{}{
				"type": "hop_found",
				"hop":  hop,
			})

			// Start pinging this hop
			if !hop.IsActive {
				continue
			}

			wg.Add(1)
			go func(h *HopData) {
				defer wg.Done()

				// Randomize start time slightly to avoid synchronized pings causing network congestion/packet loss
				time.Sleep(time.Duration(rand.Intn(200)) * time.Millisecond)

				// Create a unique ID for this hop to avoid mixing responses
				hopID := (os.Getpid() & 0xffff) ^ (h.HopNumber & 0xffff)

				// Create a persistent ICMP connection for this hop
				icmpConn, err := icmp.ListenPacket("ip4:icmp", "0.0.0.0")
				if err != nil {
					// If we can't create raw socket, fallback to system ping
					ticker := time.NewTicker(pingInterval)
					defer ticker.Stop()

					for {
						select {
						case <-ctx.Done():
							return
						case <-ticker.C:
							// Use fallback ping
							latency, success := pingHostFallback(h.IP, config.PreferIPv4)
							if !success {
								time.Sleep(50 * time.Millisecond)
								latency, success = pingHostFallback(h.IP, config.PreferIPv4)
							}
							updateHopStats(h, latency, success)
						}
					}
				}
				defer icmpConn.Close()

				ticker := time.NewTicker(pingInterval)
				defer ticker.Stop()

				// Sequence number for this hop
				seqNum := uint16(1)

				for {
					select {
					case <-ctx.Done():
						return
					case <-ticker.C:
						// Perform ping with persistent connection
						latency, success := pingHostWithConnection(icmpConn, h.IP, hopID, &seqNum)
						if !success {
							// Try once more to be sure
							time.Sleep(100 * time.Millisecond)
							latency, success = pingHostWithConnection(icmpConn, h.IP, hopID, &seqNum)
						}

						// If raw socket ping failed, fallback to system ping as a last resort
						// This handles cases where raw sockets might be unreliable or blocked
						if !success {
							latency, success = pingHostFallback(h.IP, config.PreferIPv4)
						}

						updateHopStats(h, latency, success)
					}
				}
			}(hop)
		}

		// Signal that hop discovery is complete
		conn.WriteJSON(map[string]interface{}{
			"type": "discovery_complete",
		})
	}()

	// Wait for stop signal or connection close
	select {
	case <-stopChan:
		// Stop requested
	case <-connClosed:
		// Connection closed
	}
	
	// Cancel all contexts to stop all ping goroutines immediately
	cancel()
	
	// Wait for all goroutines to finish (with timeout)
	done := make(chan bool, 1)
	go func() {
		wg.Wait()
		done <- true
	}()
	
	// Wait up to 2 seconds for goroutines to finish
	select {
	case <-done:
		// All goroutines finished
	case <-time.After(2 * time.Second):
		// Timeout - force continue (goroutines should respect context cancellation)
	}

	// Try to send stop confirmation (ignore errors if connection is closed)
	select {
	case <-time.After(100 * time.Millisecond):
		// Timeout - connection probably closed
	default:
		conn.WriteJSON(map[string]interface{}{
			"type": "stopped",
		})
	}
}

// performTraceroute performs a traceroute and streams hop data to a channel
func performTraceroute(ctx context.Context, host string, preferIPv4 bool, hopChan chan<- *HopData) {
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("tracert", "-d", "-h", "30", host)
	} else {
		cmd = exec.Command("traceroute", "-n", "-m", "30", host)
	}

	// Get stdout pipe
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return
	}

	if err := cmd.Start(); err != nil {
		return
	}

	// Use scanner to read output line by line
	scanner := bufio.NewScanner(stdout)

	// Parse traceroute output
	hopNumber := 1
	consecutiveFailures := 0

	for scanner.Scan() {
		// Check context cancellation
		select {
		case <-ctx.Done():
			if cmd.Process != nil {
				cmd.Process.Kill()
			}
			return
		default:
		}

		line := scanner.Text()
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Skip header lines
		if strings.Contains(line, "Tracing route") || strings.Contains(line, "traceroute") {
			continue
		}

		// Check for hop line (format varies by OS)
		var ip string
		if runtime.GOOS == "windows" {
			// Windows format: "  1    <1 ms    <1 ms    <1 ms  192.168.1.1"
			parts := strings.Fields(line)
			if len(parts) >= 5 {
				ip = parts[len(parts)-1]
				// Validate IP
				if net.ParseIP(ip) == nil {
					consecutiveFailures++
					if consecutiveFailures >= 5 {
						break
					}
					continue
				}
			} else {
				consecutiveFailures++
				if consecutiveFailures >= 5 {
					break
				}
				continue
			}
		} else {
			// Linux/Mac format: " 1  192.168.1.1 (192.168.1.1)  1.234 ms  1.234 ms  1.234 ms"
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				ip = parts[1]
				// Remove parentheses if present
				ip = strings.Trim(ip, "()")
				// Validate IP
				if net.ParseIP(ip) == nil {
					consecutiveFailures++
					if consecutiveFailures >= 5 {
						break
					}
					continue
				}
			} else {
				consecutiveFailures++
				if consecutiveFailures >= 5 {
					break
				}
				continue
			}
		}

		// Reset consecutive failures on success
		consecutiveFailures = 0

		hostname := ""
		if ip != "" {
			hostname = reverseDNSLookup(ip)
		}

		hop := &HopData{
			HopNumber:  hopNumber,
			IP:         ip,
			Hostname:   hostname,
			Latencies:  []int{},
			IsActive:   true,
			Successful: 0, // Explicitly initialize to 0
			Failed:     0, // Explicitly initialize to 0
		}

		// Send hop to channel
		select {
		case hopChan <- hop:
		case <-ctx.Done():
			if cmd.Process != nil {
				cmd.Process.Kill()
			}
			return
		}

		hopNumber++
	}

	cmd.Wait()
}

// pingHost pings a host using raw ICMP sockets and returns latency in ms and success status
func pingHost(host string, preferIPv4 bool) (int, bool) {
	return pingHostWithID(host, preferIPv4, os.Getpid()&0xffff)
}

// pingHostWithConnection pings a host using a persistent ICMP connection
func pingHostWithConnection(conn *icmp.PacketConn, host string, icmpID int, seqNum *uint16) (int, bool) {
	// Parse IP address
	dstIP := net.ParseIP(host)
	if dstIP == nil {
		// Try to resolve hostname
		ips, err := net.LookupIP(host)
		if err != nil || len(ips) == 0 {
			return -1, false
		}
		// Use first IPv4 address
		for _, ip := range ips {
			if ip.To4() != nil {
				dstIP = ip.To4()
				break
			}
		}
		if dstIP == nil {
			return -1, false
		}
	} else {
		dstIP = dstIP.To4()
	}

	// Use IPv4
	if dstIP.To4() == nil {
		return -1, false
	}
	dstIP = dstIP.To4()

	// Record start time (deadline set per read attempt)
	startTime := time.Now()

	// Increment sequence number
	*seqNum++
	if *seqNum == 0 {
		*seqNum = 1 // Skip 0
	}

	// Create ICMP echo request message with unique ID
	msg := icmp.Message{
		Type: ipv4.ICMPTypeEcho,
		Code: 0,
		Body: &icmp.Echo{
			ID:   icmpID,
			Seq:  int(*seqNum),
			Data: []byte("PING"),
		},
	}

	// Marshal the message
	msgBytes, err := msg.Marshal(nil)
	if err != nil {
		return -1, false
	}

	// Send ICMP packet
	_, err = conn.WriteTo(msgBytes, &net.IPAddr{IP: dstIP})
	if err != nil {
		return -1, false
	}

	// Read response (simpler approach like IP Scanner with multiple attempts)
	reply := make([]byte, 1500)

	// Read response with proper ID verification
	// Set deadline for reading (5 seconds)
	conn.SetReadDeadline(time.Now().Add(5 * time.Second))

	// Loop until we find a match or timeout
	// We removed maxReads to ensure we process all incoming ICMP traffic during the window
	firstResponseTime := time.Time{}

	for {
		n, peer, err := conn.ReadFrom(reply)
		if err != nil {
			// Check if it's a timeout
			if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
				// If we got a response from the correct IP but wrong ID, and it's been a while,
				// accept it as a fallback (some routers modify IDs)
				if !firstResponseTime.IsZero() && time.Since(firstResponseTime) > 500*time.Millisecond {
					latency := time.Since(startTime).Milliseconds()
					return int(latency), true
				}
				return -1, false
			}
			// Other error, continue reading
			continue
		}

		// Verify it's from the correct IP
		if !peer.(*net.IPAddr).IP.Equal(dstIP) {
			// Not our response, continue reading
			continue
		}

		// Record first response time from correct IP
		if firstResponseTime.IsZero() {
			firstResponseTime = time.Now()
		}

		// Parse ICMP message
		replyMsg, err := icmp.ParseMessage(1, reply[:n])
		if err != nil {
			continue
		}

		// Check if it's an echo reply
		if replyMsg.Type == ipv4.ICMPTypeEchoReply {
			// Verify it's the correct echo reply by checking ID
			// This is critical when using shared connections to avoid mixing responses
			if echo, ok := replyMsg.Body.(*icmp.Echo); ok {
				// Check ID to ensure this is our response (not from another hop)
				if echo.ID == icmpID {
					// We successfully found a matching reply.
					// We do NOT strictly check sequence number here because some routers/firewalls
					// might not preserve it or we might be seeing a re-transmission.
					// Matching IP + Matching ID (unique per hop) is strong enough evidence.

					// Calculate latency
					latency := time.Since(startTime).Milliseconds()
					return int(latency), true
				}
			} else {
				// If echo body parsing fails but we got a reply from correct IP,
				// and it's been a reasonable time, accept it (some routers don't preserve echo body)
				if time.Since(firstResponseTime) > 200*time.Millisecond {
					latency := time.Since(startTime).Milliseconds()
					return int(latency), true
				}
			}
		}
	}

	// If we got a response from the correct IP but never matched ID, and it's been a while,
	// accept it as a fallback (some routers modify IDs)
	if !firstResponseTime.IsZero() && time.Since(firstResponseTime) > 500*time.Millisecond {
		latency := time.Since(startTime).Milliseconds()
		return int(latency), true
	}

	return -1, false
}

// pingHostWithID pings a host with a specific ICMP ID to avoid mixing responses
func pingHostWithID(host string, preferIPv4 bool, icmpID int) (int, bool) {
	// First, resolve hostname to IP if needed
	var dstIP net.IP
	parsedIP := net.ParseIP(host)
	if parsedIP == nil {
		// Try DNS lookup
		ips, err := net.LookupIP(host)
		if err != nil || len(ips) == 0 {
			return -1, false
		}
		// Prefer IPv4 if requested
		for _, ip := range ips {
			if preferIPv4 && ip.To4() != nil {
				dstIP = ip
				break
			} else if !preferIPv4 && ip.To4() == nil {
				dstIP = ip
				break
			}
		}
		if dstIP == nil {
			// Use first IPv4 available
			for _, ip := range ips {
				if ip.To4() != nil {
					dstIP = ip
					break
				}
			}
			if dstIP == nil {
				// No IPv4 found, use first available
				dstIP = ips[0]
			}
		}
	} else {
		dstIP = parsedIP
	}

	// Use IPv4
	if dstIP.To4() == nil {
		// IPv6 not supported yet, fallback to system ping
		return pingHostFallback(host, preferIPv4)
	}
	dstIP = dstIP.To4()

	// Create ICMP connection
	conn, err := icmp.ListenPacket("ip4:icmp", "0.0.0.0")
	if err != nil {
		// If we can't create raw socket (requires privileges), fallback to system ping
		return pingHostFallback(host, preferIPv4)
	}
	defer conn.Close()

	// Set read deadline (5 seconds timeout - longer for traceroute hops)
	conn.SetReadDeadline(time.Now().Add(5 * time.Second))

	// Record start time
	startTime := time.Now()

	// Create ICMP echo request message with unique ID
	msg := icmp.Message{
		Type: ipv4.ICMPTypeEcho,
		Code: 0,
		Body: &icmp.Echo{
			ID:   icmpID,
			Seq:  1,
			Data: []byte("PING"),
		},
	}

	// Marshal the message
	msgBytes, err := msg.Marshal(nil)
	if err != nil {
		return -1, false
	}

	// Send ICMP packet
	_, err = conn.WriteTo(msgBytes, &net.IPAddr{IP: dstIP})
	if err != nil {
		return -1, false
	}

	// Read response
	reply := make([]byte, 1500)
	n, peer, err := conn.ReadFrom(reply)
	if err != nil {
		return -1, false
	}

	// Verify it's from the correct IP (same order as IP Scanner)
	if !peer.(*net.IPAddr).IP.Equal(dstIP) {
		return -1, false
	}

	// Parse ICMP message
	replyMsg, err := icmp.ParseMessage(1, reply[:n])
	if err != nil {
		return -1, false
	}

	// Check if it's an echo reply
	if replyMsg.Type == ipv4.ICMPTypeEchoReply {
		// Verify it's the correct echo reply (check ID to avoid mixing responses from different hops)
		if echo, ok := replyMsg.Body.(*icmp.Echo); ok {
			if echo.ID == icmpID {
				// Calculate latency
				latency := time.Since(startTime).Milliseconds()
				return int(latency), true
			}
		}
	}

	return -1, false
}

// pingHostFallback uses system ping command as fallback when raw sockets are not available
func pingHostFallback(host string, preferIPv4 bool) (int, bool) {
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("ping", "-n", "1", "-w", "1000", host)
	} else {
		cmd = exec.Command("ping", "-c", "1", "-W", "1", host)
	}

	output, err := cmd.Output()
	if err != nil {
		return -1, false
	}

	// Parse latency from output
	outputStr := string(output)
	latency := parsePingLatency(outputStr, runtime.GOOS == "windows")
	if latency <= 0 {
		return 1, true // Assume success if latency is 0 but command succeeded (e.g. <1ms)
	}

	return latency, true
}

// parsePingLatency extracts latency from ping output
func parsePingLatency(output string, isWindows bool) int {
	if isWindows {
		// Windows format: "Reply from 192.168.1.1: bytes=32 time=1ms TTL=64" or "time<1ms"
		lines := strings.Split(output, "\n")
		for _, line := range lines {
			if strings.Contains(line, "time=") || strings.Contains(line, "time<") {
				if strings.Contains(line, "time<") {
					return 1 // <1ms, return 1ms
				}
				parts := strings.Split(line, "time=")
				if len(parts) > 1 {
					timePart := strings.Fields(parts[1])[0]
					timePart = strings.TrimSuffix(timePart, "ms")
					if latency, err := strconv.Atoi(timePart); err == nil {
						return latency
					}
				}
			}
		}
	} else {
		// Linux/Mac format: "64 bytes from 192.168.1.1: icmp_seq=0 ttl=64 time=1.234 ms"
		lines := strings.Split(output, "\n")
		for _, line := range lines {
			if strings.Contains(line, "time=") {
				parts := strings.Split(line, "time=")
				if len(parts) > 1 {
					timePart := strings.Fields(parts[1])[0]
					timePart = strings.TrimSuffix(timePart, "ms")
					if latency, err := strconv.ParseFloat(timePart, 64); err == nil {
						return int(latency)
					}
				}
			}
		}
	}
	return -1
}

// reverseDNSLookup performs reverse DNS lookup
func reverseDNSLookup(ip string) string {
	names, err := net.LookupAddr(ip)
	if err != nil || len(names) == 0 {
		return ""
	}
	// Remove trailing dot
	hostname := names[0]
	if strings.HasSuffix(hostname, ".") {
		hostname = hostname[:len(hostname)-1]
	}
	return hostname
}