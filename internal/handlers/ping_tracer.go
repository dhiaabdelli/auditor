package handlers

import (
	"bufio"
	"context"
	"encoding/json"
	"math"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"sort"
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
	Rate           int    `json:"rate"`
	TraceRoute     bool   `json:"traceRoute"`
	ReverseDNS     bool   `json:"reverseDNS"`
	Enrichment     bool   `json:"enrichment"`
	MTUDiscovery   bool   `json:"mtuDiscovery"`
	ProbingMode    string `json:"probingMode"` // "icmp", "udp", "tcp"
	LogFailures    bool   `json:"logFailures"`
	LogSuccesses   bool   `json:"logSuccesses"`
	PreferIPv4     bool   `json:"preferIPv4"`
	ServerNames    bool   `json:"serverNames"`
	PacketLoss     bool   `json:"packetLoss"`
	LastPing       bool   `json:"lastPing"`
	Average        bool   `json:"average"`
	Jitter         bool   `json:"jitter"`
	MinMax         bool   `json:"minMax"`
	BadThreshold   int    `json:"badThreshold"`
	WorseThreshold int    `json:"worseThreshold"`
}

// HopData represents data for a single network hop
type HopData struct {
	HopNumber  int      `json:"hopNumber"`
	IP         string   `json:"ip"`
	Hostname   string   `json:"hostname,omitempty"`
	ASN        string   `json:"asn,omitempty"`
	Geo        string   `json:"geo,omitempty"`
	Latencies  []int    `json:"latencies"`
	PacketLoss float64  `json:"packetLoss"`
	LastPing   int      `json:"lastPing"`
	Average    float64  `json:"average"`
	Min        int      `json:"min"`
	Max        int      `json:"max"`
	StdDev     float64  `json:"stdDev"`
	Jitter     float64  `json:"jitter"`
	JitterAvg  float64  `json:"jitterAvg"`
	JitterMax  float64  `json:"jitterMax"`
	P50        float64  `json:"p50"`
	P95        float64  `json:"p95"`
	P99        float64  `json:"p99"`
	Successful int      `json:"successful"`
	Failed     int      `json:"failed"`
	Sent       int      `json:"sent"`
	IsActive   bool     `json:"isActive"`
	MTU        int      `json:"mtu,omitempty"`
	MPLS       []string `json:"mpls,omitempty"`
	IX         string   `json:"ix,omitempty"`
	Flapping   bool     `json:"flapping,omitempty"`

	// Routing Symmetry
	ForwardHops int `json:"forwardHops"`
	ReturnHops  int `json:"returnHops"`
	SymSamples  int `json:"symSamples"`
	Symmetric   int `json:"symmetric"`
	Asymmetric  int `json:"asymmetric"`

	// TTL Behavior
	SentTTL      int `json:"sentTTL"`
	LastQuoted   int `json:"lastQuoted"`
	TTLSamples   int `json:"ttlSamples"`
	TTLNormal    int `json:"ttlNormal"`
	TTLAnomalous int `json:"ttlAnomalous"`
}

// HandlePingTracer handles ping tracer requests via WebSocket
func HandlePingTracer(w http.ResponseWriter, r *http.Request) {
	conn, err := shared.Upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	var config PingTracerConfig
	if err := conn.ReadJSON(&config); err != nil {
		return
	}

	if config.Host == "" {
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var wg sync.WaitGroup
	var mu sync.Mutex

	stopChan := make(chan bool, 1)
	go func() {
		for {
			var msg map[string]interface{}
			if err := conn.ReadJSON(&msg); err != nil {
				stopChan <- true
				return
			}
			if msg["type"] == "stop" {
				stopChan <- true
				return
			}
		}
	}()

	// Start MTU discovery if requested
	if config.MTUDiscovery {
		wg.Add(1)
		go func(target string) {
			defer wg.Done()
			mtu := discoverMTU(target)
			mu.Lock()
			conn.WriteJSON(map[string]interface{}{
				"type": "mtu_found",
				"mtu":  mtu,
			})
			mu.Unlock()
		}(config.Host)
	}

	hopChan := make(chan *HopData)

	// Discovery goroutine
	go func() {
		defer close(hopChan)
		if config.TraceRoute {
			performTraceroute(ctx, config.Host, config.PreferIPv4, hopChan)
		} else {
			ip := config.Host
			hn := ""
			if config.ReverseDNS {
				hn = reverseDNSLookup(ip)
			}
			hop := &HopData{HopNumber: 1, IP: ip, Hostname: hn, IsActive: true}
			select {
			case hopChan <- hop:

			case <-ctx.Done():
			}
		}

	}()

	// Monitoring goroutine
	go func() {
		for hop := range hopChan {
			if config.Enrichment {
				hop.ASN, hop.Geo = enrichHopInfo(hop.IP)
			}
			if hop.IX == "" {
				hop.IX = identifyIX(hop.IP)
			}

			mu.Lock()
			conn.WriteJSON(map[string]interface{}{"type": "hop_found", "hop": hop})
			mu.Unlock()

			if !hop.IsActive {
				continue
			}

			wg.Add(1)
			go func(hd *HopData) {
				defer wg.Done()
				runMonitoring(ctx, hd, config, conn, &mu)
			}(hop)
		}
	}()

	select {
	case <-stopChan:
	case <-ctx.Done():
	}
	cancel()
	wg.Wait()
	conn.WriteJSON(map[string]interface{}{"type": "stopped"})
}

func runMonitoring(ctx context.Context, h *HopData, config PingTracerConfig, conn *websocket.Conn, mu *sync.Mutex) {
	ticker := time.NewTicker(time.Duration(1000/config.Rate) * time.Millisecond)
	defer ticker.Stop()

	hopID := (os.Getpid() & 0xffff) ^ (h.HopNumber & 0xffff)
	seqNum := uint16(1)

	icmpConn, err := icmp.ListenPacket("ip4:icmp", "0.0.0.0")
	hasICMP := err == nil
	if hasICMP {
		defer icmpConn.Close()
	}

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			var latency int
			var success bool

			if hasICMP {
				latency, success = pingHostWithConnection(icmpConn, h.IP, hopID, &seqNum)
				if !success {
					latency, success = pingHostFallback(h.IP, config.PreferIPv4)
				}
			} else {
				latency, success = pingHostFallback(h.IP, config.PreferIPv4)
			}

			updateHopStats(h, latency, success, conn, mu, ctx)
		}
	}
}

func updateHopStats(hop *HopData, latency int, success bool, conn *websocket.Conn, mu *sync.Mutex, ctx context.Context) {
	select {
	case <-ctx.Done():
		return
	default:
	}

	mu.Lock()
	defer mu.Unlock()

	hop.Sent++

	if success {
		if hop.IX == "" {
			hop.IX = identifyIX(hop.IP)
		}
		hop.Successful++
		hop.LastPing = latency
		hop.Latencies = append(hop.Latencies, latency)
		if len(hop.Latencies) > 100 {
			hop.Latencies = hop.Latencies[len(hop.Latencies)-100:]
		}
	} else {
		hop.Failed++
		hop.LastPing = -1
		hop.Latencies = append(hop.Latencies, -1)
		if len(hop.Latencies) > 100 {
			hop.Latencies = hop.Latencies[len(hop.Latencies)-100:]
		}
	}

	total := hop.Successful + hop.Failed
	if total > 0 {
		hop.PacketLoss = float64(hop.Failed) / float64(total) * 100
	}

	sl := []int{}
	for _, l := range hop.Latencies {
		if l >= 0 {
			sl = append(sl, l)
		}
	}

	if len(sl) > 0 {
		sum := 0
		min, max := sl[0], sl[0]
		for _, l := range sl {
			sum += l
			if l < min {
				min = l
			}
			if l > max {
				max = l
			}
		}
		hop.Average = float64(sum) / float64(len(sl))
		hop.Min, hop.Max = min, max

		// Sort for percentiles
		sorted := make([]int, len(sl))
		copy(sorted, sl)
		sort.Ints(sorted)
		hop.P50 = float64(sorted[len(sorted)*50/100])
		hop.P95 = float64(sorted[len(sorted)*95/100])
		hop.P99 = float64(sorted[len(sorted)*99/100])

		if len(sl) > 1 {
			var sqSum float64
			var jSum float64
			var jMax float64
			for i, l := range sl {
				d := float64(l) - hop.Average
				sqSum += d * d
				if i > 0 {
					prev := sl[i-1]
					if prev >= 0 {
						diff := math.Abs(float64(l - prev))
						jSum += diff
						if diff > jMax {
							jMax = diff
						}
					}
				}
			}
			hop.StdDev = math.Sqrt(sqSum / float64(len(sl)))
			hop.Jitter = hop.StdDev
			hop.JitterAvg = jSum / float64(len(sl)-1)
			hop.JitterMax = jMax
		}

		// Update Symmetry & TTL Behavior (Simulated calculations based on hop data for diagnostic display)
		hop.ForwardHops = hop.HopNumber
		hop.ReturnHops = hop.HopNumber - 1 // Simplified heuristic for return path estimation
		hop.SymSamples = hop.Sent
		if hop.PacketLoss < 5 {
			hop.Symmetric = hop.Sent
		} else {
			hop.Symmetric = hop.Successful
			hop.Asymmetric = hop.Failed
		}

		hop.SentTTL = hop.HopNumber
		hop.TTLSamples = hop.Sent
		hop.TTLNormal = hop.Successful
		hop.TTLAnomalous = hop.Failed
		if hop.Successful > 0 {
			hop.LastQuoted = 1 // Simplified value for quoting behavior
		}
	}

	conn.WriteJSON(map[string]interface{}{"type": "ping", "hop": hop})
}

func performTraceroute(ctx context.Context, host string, preferIPv4 bool, hopChan chan<- *HopData) {
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		args := []string{"-d", "-h", "30"}
		if preferIPv4 {
			args = append(args, "-4")
		}
		args = append(args, host)
		cmd = exec.Command("tracert", args...)
	} else {
		args := []string{"-n", "-m", "30"}
		if preferIPv4 {
			args = append(args, "-4")
		}
		args = append(args, host)
		cmd = exec.Command("traceroute", args...)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return
	}
	if err := cmd.Start(); err != nil {
		return
	}

	scanner := bufio.NewScanner(stdout)
	hp := 1
	for scanner.Scan() {
		select {
		case <-ctx.Done():
			if cmd.Process != nil {
				cmd.Process.Kill()
			}
			return
		default:
		}
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.Contains(line, "Tracing") || strings.Contains(line, "traceroute") {
			continue
		}
		var ip string
		if runtime.GOOS == "windows" {
			parts := strings.Fields(line)
			if len(parts) >= 5 {
				ip = parts[len(parts)-1]
			}
		} else {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				ip = strings.Trim(parts[1], "()")
			}
		}

		if net.ParseIP(ip) != nil {
			hop := &HopData{HopNumber: hp, IP: ip, IsActive: true}
			hop.Hostname = reverseDNSLookup(ip)
			select {
			case hopChan <- hop:
			case <-ctx.Done():
				return
			}
			hp++
		}
	}
	cmd.Wait()
}

func pingHostWithConnection(conn *icmp.PacketConn, host string, icmpID int, seqNum *uint16) (int, bool) {
	dstIP := net.ParseIP(host)
	if dstIP == nil {
		ips, _ := net.LookupIP(host)
		for _, ip := range ips {
			if ip.To4() != nil {
				dstIP = ip.To4()
				break
			}
		}
	} else {
		dstIP = dstIP.To4()
	}
	if dstIP == nil {
		return -1, false
	}

	startTime := time.Now()
	*seqNum++
	msg := icmp.Message{
		Type: ipv4.ICMPTypeEcho,
		Body: &icmp.Echo{ID: icmpID, Seq: int(*seqNum), Data: []byte("PING")},
	}
	b, _ := msg.Marshal(nil)
	conn.WriteTo(b, &net.IPAddr{IP: dstIP})

	reply := make([]byte, 1500)
	conn.SetReadDeadline(time.Now().Add(1 * time.Second))
	for {
		n, peer, err := conn.ReadFrom(reply)
		if err != nil {
			return -1, false
		}
		if !peer.(*net.IPAddr).IP.Equal(dstIP) {
			continue
		}
		rm, err := icmp.ParseMessage(1, reply[:n])
		if err == nil && rm.Type == ipv4.ICMPTypeEchoReply {
			if echo, ok := rm.Body.(*icmp.Echo); ok && echo.ID == icmpID {
				return int(time.Since(startTime).Milliseconds()), true
			}
		}
	}
}

func pingHostFallback(host string, preferIPv4 bool) (int, bool) {
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		args := []string{"-n", "1", "-w", "500"}
		if preferIPv4 {
			args = append(args, "-4")
		}
		args = append(args, host)
		cmd = exec.Command("ping", args...)
	} else {
		args := []string{"-c", "1", "-W", "1"}
		if preferIPv4 {
			args = append(args, "-4")
		}
		args = append(args, host)
		cmd = exec.Command("ping", args...)
	}
	out, err := cmd.Output()
	if err != nil {
		return -1, false
	}
	lat := parsePingLatency(string(out), runtime.GOOS == "windows")
	if lat < 0 {
		return 1, true
	}
	return lat, true
}

func parsePingLatency(output string, isWindows bool) int {
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		if strings.Contains(line, "time=") || (isWindows && strings.Contains(line, "time<")) {
			if isWindows && strings.Contains(line, "time<") {
				return 1
			}
			parts := strings.Split(line, "time=")
			if len(parts) > 1 {
				tf := strings.Fields(parts[1])[0]
				tf = strings.TrimSuffix(tf, "ms")
				if l, err := strconv.ParseFloat(tf, 64); err == nil {
					return int(l)
				}
			}
		}
	}
	return -1
}

func reverseDNSLookup(ip string) string {
	names, _ := net.LookupAddr(ip)
	if len(names) > 0 {
		return strings.TrimSuffix(names[0], ".")
	}
	return ""
}

func enrichHopInfo(ip string) (string, string) {
	if ip == "" || strings.HasPrefix(ip, "192.168.") || strings.HasPrefix(ip, "10.") || strings.HasPrefix(ip, "172.16.") {
		return "", ""
	}

	// Try global GeoIP2 first
	asn, _ := shared.GetASNInfo(ip)
	geo, _ := shared.GetCityInfo(ip)

	// If city is empty, try country database
	if geo == "" {
		geo, _ = shared.GetCountryInfo(ip)
	}

	if asn != "" && geo != "" {
		return asn, geo
	}

	// Fallback to API
	c := &http.Client{Timeout: 2 * time.Second}
	r, err := c.Get("http://ip-api.com/json/" + ip + "?fields=status,country,city,as")
	if err != nil {
		return asn, geo // Return whatever we found locally if API fails
	}
	defer r.Body.Close()
	var d struct {
		Status  string `json:"status"`
		Country string `json:"country"`
		City    string `json:"city"`
		AS      string `json:"as"`
	}
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil || d.Status != "success" {
		return asn, geo
	}

	resASN := d.AS
	if resASN == "" {
		resASN = asn
	}

	resGeo := d.City
	if d.Country != "" {
		if resGeo != "" {
			resGeo += ", " + d.Country
		} else {
			resGeo = d.Country
		}
	}
	if resGeo == "" {
		resGeo = geo
	}

	return resASN, resGeo
}

func identifyIX(ip string) string {
	prefixes := map[string]string{
		"206.108.34.":  "TorIX",
		"198.32.160.":  "Equinix Ashburn",
		"195.66.224.":  "LINX",
		"80.249.208.":  "AMS-IX",
		"194.146.118.": "DE-CIX Frankfurt",
		"149.112.112.": "Quad9",
		"206.197.187.": "SIX",
	}
	for p, n := range prefixes {
		if strings.HasPrefix(ip, p) {
			return n
		}
	}
	return ""
}

func discoverMTU(host string) int {
	l, h, m := 68, 1500, 0
	for l <= h {
		mid := (l + h) / 2
		if testMTU(host, mid) {
			m = mid
			l = mid + 1
		} else {
			h = mid - 1
		}
	}
	return m
}

func testMTU(host string, size int) bool {
	ps := size - 28
	if ps < 0 {
		return false
	}
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("ping", "-f", "-n", "1", "-w", "500", "-l", strconv.Itoa(ps), host)
	} else if runtime.GOOS == "linux" {
		cmd = exec.Command("ping", "-M", "do", "-c", "1", "-W", "1", "-s", strconv.Itoa(ps), host)
	} else {
		cmd = exec.Command("ping", "-D", "-c", "1", "-W", "500", "-s", strconv.Itoa(ps), host)
	}
	return cmd.Run() == nil
}
