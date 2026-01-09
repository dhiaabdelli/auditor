package handlers

import (
	"bytes"
	"context"
	"fmt"
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

	"github.com/google/gopacket"
	"github.com/google/gopacket/layers"
	"github.com/google/gopacket/pcap"
	"github.com/gorilla/websocket"
	"golang.org/x/net/icmp"
	"golang.org/x/net/ipv4"
)

// IPScannerResult represents a single IP scan result
type IPScannerResult struct {
	IP       string `json:"ip"`
	Status   string `json:"status"` // "online", "offline", "scanning"
	Hostname string `json:"hostname,omitempty"`
	MAC      string `json:"mac,omitempty"`
	Ports    []int  `json:"ports,omitempty"`
	RTT      int    `json:"rtt,omitempty"` // Round trip time in ms
	Error    string `json:"error,omitempty"`
}

// HandleIPScanner handles IP range scanning requests via WebSocket
func HandleIPScanner(w http.ResponseWriter, r *http.Request) {
	// Upgrade to WebSocket
	conn, err := shared.Upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Read initial message with scan parameters
	var initMsg map[string]interface{}
	err = conn.ReadJSON(&initMsg)
	if err != nil {
		conn.WriteJSON(map[string]interface{}{
			"type":  "error",
			"error": "Failed to read scan parameters",
		})
		return
	}

	ipRange, ok := initMsg["range"].(string)
	if !ok || ipRange == "" {
		conn.WriteJSON(map[string]interface{}{
			"type":  "error",
			"error": "range parameter required (e.g., 192.168.1.0/24 or 192.168.1.1-192.168.1.254)",
		})
		return
	}

	scanPorts := false
	if sp, ok := initMsg["scanPorts"].(bool); ok {
		scanPorts = sp
	}

	portList := ""
	if pl, ok := initMsg["ports"].(string); ok {
		portList = pl
	}

	timeout := 1
	if t, ok := initMsg["timeout"].(float64); ok {
		timeout = int(t)
		if timeout <= 0 {
			timeout = 1
		}
		if timeout > 5 {
			timeout = 5
		}
	}

	// Parse IP range
	ips, err := parseIPRange(ipRange)
	if err != nil {
		conn.WriteJSON(map[string]interface{}{
			"type":  "error",
			"error": err.Error(),
		})
		return
	}

	// Send initial status
	conn.WriteJSON(map[string]interface{}{
		"type":  "start",
		"total": len(ips),
	})

	// Parse ports if provided
	var portsToScan []int
	if scanPorts && portList != "" {
		portsToScan = parsePortList(portList)
	} else if scanPorts {
		// Default common ports
		portsToScan = []int{22, 23, 80, 135, 139, 443, 445, 3389, 5985, 5986}
	}

	// Scan IPs concurrently with limit
	maxConcurrent := 50
	semaphore := make(chan struct{}, maxConcurrent)
	var wg sync.WaitGroup
	var writeMutex sync.Mutex // Protect concurrent writes to WebSocket

	// Handle client messages (for stop requests)
	stopChan := make(chan bool, 1)
	go func() {
		for {
			var msg map[string]interface{}
			if err := conn.ReadJSON(&msg); err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					// Client disconnected
				}
				stopChan <- true
				return
			}
			if msg["type"] == "stop" {
				stopChan <- true
				return
			}
		}
	}()

	for _, ip := range ips {
		// Check if scan was stopped
		select {
		case <-stopChan:
			conn.WriteJSON(map[string]interface{}{
				"type": "stopped",
			})
			return
		default:
		}

		wg.Add(1)
		semaphore <- struct{}{} // Acquire

		go func(targetIP string) {
			defer wg.Done()
			defer func() { <-semaphore }() // Release

			// Check if scan was stopped
			select {
			case <-stopChan:
				return
			default:
			}

			result := scanIP(targetIP, timeout, scanPorts, portsToScan)

			// Send result (protected by mutex to prevent corruption)
			writeMutex.Lock()
			conn.WriteJSON(result)
			writeMutex.Unlock()
		}(ip)
	}

	wg.Wait()

	// Send completion
	conn.WriteJSON(map[string]interface{}{
		"type": "done",
	})
}

// parseIPRange parses IP range in CIDR notation or range format
func parseIPRange(rangeStr string) ([]string, error) {
	var ips []string

	// Check if it's CIDR notation (e.g., 192.168.1.0/24)
	if strings.Contains(rangeStr, "/") {
		_, ipNet, err := net.ParseCIDR(rangeStr)
		if err != nil {
			return nil, fmt.Errorf("invalid CIDR notation: %v", err)
		}

		// Get network address
		networkIP := ipNet.IP.To4()
		if networkIP == nil {
			return nil, fmt.Errorf("only IPv4 addresses are supported")
		}

		// Calculate broadcast address
		mask := ipNet.Mask
		broadcast := make(net.IP, len(networkIP))
		for i := range networkIP {
			broadcast[i] = networkIP[i] | ^mask[i]
		}

		// Generate all IPs in range
		currentIP := make(net.IP, len(networkIP))
		copy(currentIP, networkIP)
		for {
			ips = append(ips, currentIP.String())
			if currentIP.Equal(broadcast) {
				break
			}
			inc(currentIP)
		}

		// Remove network and broadcast addresses if there are more than 2 IPs
		if len(ips) > 2 {
			ips = ips[1 : len(ips)-1]
		}
	} else if strings.Contains(rangeStr, "-") {
		// Range format (e.g., 192.168.1.1-192.168.1.254)
		parts := strings.Split(rangeStr, "-")
		if len(parts) != 2 {
			return nil, fmt.Errorf("invalid range format, use: start-end")
		}

		startIP := net.ParseIP(strings.TrimSpace(parts[0]))
		endIP := net.ParseIP(strings.TrimSpace(parts[1]))

		if startIP == nil || endIP == nil {
			return nil, fmt.Errorf("invalid IP addresses in range")
		}

		startIP = startIP.To4()
		endIP = endIP.To4()

		if startIP == nil || endIP == nil {
			return nil, fmt.Errorf("only IPv4 addresses are supported")
		}

		currentIP := make(net.IP, len(startIP))
		copy(currentIP, startIP)
		for {
			ips = append(ips, currentIP.String())
			if currentIP.Equal(endIP) {
				break
			}
			inc(currentIP)
		}
	} else {
		// Single IP
		ip := net.ParseIP(rangeStr)
		if ip == nil {
			return nil, fmt.Errorf("invalid IP address")
		}
		ips = append(ips, ip.String())
	}

	return ips, nil
}

// inc increments an IP address
func inc(ip net.IP) {
	for j := len(ip) - 1; j >= 0; j-- {
		ip[j]++
		if ip[j] > 0 {
			break
		}
	}
}

// parsePortList parses comma-separated port list
func parsePortList(portList string) []int {
	var ports []int
	parts := strings.Split(portList, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if strings.Contains(part, "-") {
			// Port range
			rangeParts := strings.Split(part, "-")
			if len(rangeParts) == 2 {
				start, err1 := strconv.Atoi(strings.TrimSpace(rangeParts[0]))
				end, err2 := strconv.Atoi(strings.TrimSpace(rangeParts[1]))
				if err1 == nil && err2 == nil && start > 0 && end > 0 && start <= end && end <= 65535 {
					for p := start; p <= end; p++ {
						ports = append(ports, p)
					}
				}
			}
		} else {
			// Single port
			port, err := strconv.Atoi(part)
			if err == nil && port > 0 && port <= 65535 {
				ports = append(ports, port)
			}
		}
	}
	return ports
}

// scanIP scans a single IP address
func scanIP(ip string, timeout int, scanPorts bool, portsToScan []int) IPScannerResult {
	result := IPScannerResult{
		IP:     ip,
		Status: "scanning",
	}

	// First, try ping (do it twice to reduce false positives)
	isOnline := pingIP(ip, timeout)
	if !isOnline {
		// Try once more to be sure
		time.Sleep(100 * time.Millisecond)
		isOnline = pingIP(ip, timeout)
	}

	if !isOnline {
		result.Status = "offline"
		return result
	}

	result.Status = "online"

	// Get hostname
	result.Hostname = getHostname(ip)

	// Get MAC address (ARP table)
	// After ping, the ARP table should be populated, but we need to wait a bit
	// Try multiple times with increasing delays to allow ARP table to update
	time.Sleep(300 * time.Millisecond) // Initial delay to let ARP table update
	for attempt := 0; attempt < 5; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(100+attempt*100) * time.Millisecond)
		}
		result.MAC = getMACAddress(ip)
		if result.MAC != "" && result.MAC != "00:00:00:00:00:00" {
			break
		}
	}

	// Scan ports if requested
	if scanPorts && len(portsToScan) > 0 {
		result.Ports = scanPortsForIP(ip, portsToScan, timeout)
	}

	return result
}

// pingIP pings an IP address using raw ICMP sockets and returns true only if a reply was received
func pingIP(ip string, timeout int) bool {
	// Parse IP address
	dstIP := net.ParseIP(ip)
	if dstIP == nil {
		return false
	}

	// Use IPv4
	if dstIP.To4() == nil {
		// IPv6 not supported yet
		return false
	}
	dstIP = dstIP.To4()

	// Create ICMP connection
	conn, err := icmp.ListenPacket("ip4:icmp", "0.0.0.0")
	if err != nil {
		// If we can't create raw socket (requires privileges), fallback to system ping
		return pingIPFallback(ip, timeout)
	}
	defer conn.Close()

	// Set read deadline
	conn.SetReadDeadline(time.Now().Add(time.Duration(timeout) * time.Second))

	// Create ICMP echo request message
	msg := icmp.Message{
		Type: ipv4.ICMPTypeEcho,
		Code: 0,
		Body: &icmp.Echo{
			ID:   os.Getpid() & 0xffff,
			Seq:  1,
			Data: []byte("PING"),
		},
	}

	// Marshal the message
	msgBytes, err := msg.Marshal(nil)
	if err != nil {
		return false
	}

	// Send ICMP packet
	_, err = conn.WriteTo(msgBytes, &net.IPAddr{IP: dstIP})
	if err != nil {
		return false
	}

	// Read response
	reply := make([]byte, 1500)
	n, peer, err := conn.ReadFrom(reply)
	if err != nil {
		return false
	}

	// Verify it's from the correct IP
	if !peer.(*net.IPAddr).IP.Equal(dstIP) {
		return false
	}

	// Parse ICMP message
	replyMsg, err := icmp.ParseMessage(1, reply[:n])
	if err != nil {
		return false
	}

	// Check if it's an echo reply
	if replyMsg.Type == ipv4.ICMPTypeEchoReply {
		return true
	}

	return false
}

// pingIPFallback uses system ping command as fallback when raw sockets are not available
func pingIPFallback(ip string, timeout int) bool {
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeout+2)*time.Second)
	defer cancel()

	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.CommandContext(ctx, "ping", "-n", "1", "-w", strconv.Itoa(timeout*1000), ip)
	} else {
		cmd = exec.CommandContext(ctx, "ping", "-c", "1", "-W", strconv.Itoa(timeout), ip)
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		return false
	}

	outputStr := string(output)

	// Check if we actually received a reply
	if runtime.GOOS == "windows" {
		return strings.Contains(outputStr, "Reply from") || strings.Contains(outputStr, "Réponse de")
	} else {
		return strings.Contains(outputStr, "1 received") || strings.Contains(outputStr, "1 packets received")
	}
}

// getHostname attempts to resolve hostname from IP
func getHostname(ip string) string {
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

// getMACAddress reads MAC address using ARP via pcap/gopacket only
func getMACAddress(ip string) string {
	targetIP := net.ParseIP(ip)
	if targetIP == nil {
		return ""
	}

	if targetIP.To4() == nil {
		return "" // IPv6 not supported yet
	}
	targetIP = targetIP.To4()

	// Check if this is our own IP address - get MAC directly from interface
	if mac := getMACForLocalIP(targetIP); mac != "" {
		return mac
	}

	// On Windows, use routing table to find correct interface, then ARP
	if runtime.GOOS == "windows" {
		return getMACAddressWindowsWithRouting(targetIP)
	}

	// On Linux, use pcap
	return getMACAddressPcap(targetIP)
}

// getMACForLocalIP checks if the target IP is one of our local IPs and returns the interface MAC
func getMACForLocalIP(targetIP net.IP) string {
	interfaces, err := net.Interfaces()
	if err != nil {
		return ""
	}

	for _, iface := range interfaces {
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			if ipNet, ok := addr.(*net.IPNet); ok {
				if ipNet.IP.To4() != nil && ipNet.IP.Equal(targetIP) {
					// This is our own IP, return the interface MAC
					if len(iface.HardwareAddr) == 6 {
						return iface.HardwareAddr.String()
					}
				}
			}
		}
	}
	return ""
}

// getMACAddressWindowsWithRouting uses Windows routing table to find correct interface, then ARP
func getMACAddressWindowsWithRouting(targetIP net.IP) string {
	// Get interface using Windows routing table
	iface, err := getInterfaceForTargetWindows(targetIP.String())
	if err != nil {
		return ""
	}

	// Find pcap device for this interface
	dev, err := findPcapDeviceForInterface(iface)
	if err != nil {
		return ""
	}

	// Open pcap handle
	handle, err := pcap.OpenLive(dev.Name, 65536, true, pcap.BlockForever)
	if err != nil {
		return ""
	}
	defer handle.Close()

	// Set ARP filter
	err = handle.SetBPFFilter("arp")
	if err != nil {
		return ""
	}

	// Channel for ARP reply
	arpChan := make(chan net.HardwareAddr, 1)

	// Start listening for ARP replies
	packetSource := gopacket.NewPacketSource(handle, handle.LinkType())
	packets := packetSource.Packets()

	go func() {
		for packet := range packets {
			if packet == nil {
				continue
			}
			arpLayer := packet.Layer(layers.LayerTypeARP)
			if arpLayer == nil {
				continue
			}

			arp := arpLayer.(*layers.ARP)
			if arp.Operation == layers.ARPReply &&
				net.IP(arp.SourceProtAddress).Equal(targetIP) {
				mac := net.HardwareAddr(arp.SourceHwAddress)
				if len(mac) == 6 && mac.String() != "00:00:00:00:00:00" {
					select {
					case arpChan <- mac:
					default:
					}
					return
				}
			}
		}
	}()

	// Get local IP for this interface
	localIP := getLocalIPForInterface(iface)
	if localIP == nil {
		return ""
	}

	// Send ARP request
	eth := &layers.Ethernet{
		SrcMAC:       iface.HardwareAddr,
		DstMAC:       net.HardwareAddr{0xff, 0xff, 0xff, 0xff, 0xff, 0xff},
		EthernetType: layers.EthernetTypeARP,
	}

	arp := &layers.ARP{
		AddrType:          layers.LinkTypeEthernet,
		Protocol:          layers.EthernetTypeIPv4,
		HwAddressSize:     6,
		ProtAddressSize:   4,
		Operation:         layers.ARPRequest,
		SourceHwAddress:   []byte(iface.HardwareAddr),
		SourceProtAddress: []byte(localIP.To4()),
		DstHwAddress:      []byte{0, 0, 0, 0, 0, 0},
		DstProtAddress:    []byte(targetIP.To4()),
	}

	buf := gopacket.NewSerializeBuffer()
	opts := gopacket.SerializeOptions{
		FixLengths:       true,
		ComputeChecksums: true,
	}

	err = gopacket.SerializeLayers(buf, opts, eth, arp)
	if err != nil {
		return ""
	}

	// Send ARP request multiple times
	for i := 0; i < 3; i++ {
		if i > 0 {
			time.Sleep(200 * time.Millisecond)
		}
		err = handle.WritePacketData(buf.Bytes())
		if err != nil {
			continue
		}
	}

	// Wait for ARP reply with timeout
	select {
	case mac := <-arpChan:
		return mac.String()
	case <-time.After(2 * time.Second):
		return ""
	}
}

// getInterfaceForTargetWindows is defined in ip_scanner_windows.go (Windows) or ip_scanner_unix.go (Linux/Unix)

// findPcapDeviceForInterface finds the pcap device for a given network interface
func findPcapDeviceForInterface(iface *net.Interface) (*pcap.Interface, error) {
	devs, err := pcap.FindAllDevs()
	if err != nil {
		return nil, err
	}

	addrs, _ := iface.Addrs()

	for _, d := range devs {
		for _, da := range d.Addresses {
			for _, ia := range addrs {
				if ipnet, ok := ia.(*net.IPNet); ok {
					if da.IP != nil && da.IP.Equal(ipnet.IP) {
						return &d, nil
					}
				}
			}
		}
	}
	return nil, fmt.Errorf("pcap device not found")
}

// getLocalIPForInterface gets the local IPv4 address for an interface
func getLocalIPForInterface(iface *net.Interface) net.IP {
	addrs, err := iface.Addrs()
	if err != nil {
		return nil
	}

	for _, addr := range addrs {
		if ipnet, ok := addr.(*net.IPNet); ok {
			if ip := ipnet.IP.To4(); ip != nil {
				return ip
			}
		}
	}
	return nil
}

// getMACAddressPcap uses pcap/gopacket to send ARP request and get MAC address
func getMACAddressPcap(targetIP net.IP) string {
	// Find the appropriate network interface
	iface, localIP, err := findInterfaceForIP(targetIP)
	if err != nil {
		return ""
	}

	// Open pcap handle
	handle, err := pcap.OpenLive(iface.Name, 65536, true, pcap.BlockForever)
	if err != nil {
		return ""
	}
	defer handle.Close()

	// Set a filter to only capture ARP packets
	err = handle.SetBPFFilter("arp")
	if err != nil {
		return ""
	}

	// Create ARP request packet
	eth := layers.Ethernet{
		SrcMAC:       iface.HardwareAddr,
		DstMAC:       net.HardwareAddr{0xff, 0xff, 0xff, 0xff, 0xff, 0xff}, // Broadcast
		EthernetType: layers.EthernetTypeARP,
	}

	arp := layers.ARP{
		AddrType:          layers.LinkTypeEthernet,
		Protocol:          layers.EthernetTypeIPv4,
		HwAddressSize:     6,
		ProtAddressSize:   4,
		Operation:         layers.ARPRequest,
		SourceHwAddress:   []byte(iface.HardwareAddr),
		SourceProtAddress: []byte(localIP.To4()),
		DstHwAddress:      []byte{0, 0, 0, 0, 0, 0},
		DstProtAddress:    []byte(targetIP.To4()),
	}

	// Serialize packet
	buf := gopacket.NewSerializeBuffer()
	opts := gopacket.SerializeOptions{
		FixLengths:       true,
		ComputeChecksums: true,
	}

	err = gopacket.SerializeLayers(buf, opts, &eth, &arp)
	if err != nil {
		return ""
	}

	// Start packet capture BEFORE sending requests
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	packetSource := gopacket.NewPacketSource(handle, handle.LinkType())
	packets := packetSource.Packets()

	// Channel to receive MAC address
	macChan := make(chan string, 1)

	// Start listening for ARP replies in a goroutine
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case packet := <-packets:
				if packet == nil {
					continue
				}

				arpLayer := packet.Layer(layers.LayerTypeARP)
				if arpLayer == nil {
					continue
				}

				arpReply := arpLayer.(*layers.ARP)

				// Check if it's an ARP reply
				if arpReply.Operation != layers.ARPReply {
					continue
				}

				// In ARP reply:
				// - SourceProtAddress is the IP that replied (should be our target)
				// - DstProtAddress is the IP that requested (should be our local IP)
				// - SourceHwAddress is the MAC we're looking for
				if bytes.Equal(arpReply.SourceProtAddress, []byte(targetIP.To4())) &&
					bytes.Equal(arpReply.DstProtAddress, []byte(localIP.To4())) &&
					!bytes.Equal([]byte(iface.HardwareAddr), arpReply.SourceHwAddress) {

					// Found the MAC address
					mac := net.HardwareAddr(arpReply.SourceHwAddress)
					if len(mac) == 6 && mac.String() != "00:00:00:00:00:00" {
						select {
						case macChan <- mac.String():
						default:
						}
						return
					}
				}
			}
		}
	}()

	// Send ARP request multiple times for reliability
	for i := 0; i < 3; i++ {
		if i > 0 {
			time.Sleep(200 * time.Millisecond)
		}
		err = handle.WritePacketData(buf.Bytes())
		if err != nil {
			continue
		}
	}

	// Wait for MAC address or timeout
	select {
	case mac := <-macChan:
		return mac
	case <-ctx.Done():
		return ""
	}
}

// findInterfaceForIP finds the network interface that can reach the target IP
func findInterfaceForIP(targetIP net.IP) (*net.Interface, net.IP, error) {
	interfaces, err := net.Interfaces()
	if err != nil {
		return nil, nil, err
	}

	// First, try to find interface where target IP is in the same network
	for _, iface := range interfaces {
		// Skip loopback and down interfaces
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}

		// Skip interfaces without hardware address
		if len(iface.HardwareAddr) == 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if !ok {
				continue
			}

			// Check if target IP is in the same network
			if ipNet.Contains(targetIP) {
				// Get the interface IP
				localIP := ipNet.IP.To4()
				if localIP != nil {
					return &iface, localIP, nil
				}
			}
		}
	}

	// If no exact match, try to find default route interface
	// On Windows, we can use GetBestInterface, but for cross-platform,
	// we'll use the first interface that has a route to the target
	// For now, return the first non-loopback interface with an IP
	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		if len(iface.HardwareAddr) == 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if !ok {
				continue
			}

			localIP := ipNet.IP.To4()
			if localIP != nil {
				// Use this interface even if target is not in same network
				// The router will handle forwarding the ARP request
				return &iface, localIP, nil
			}
		}
	}

	return nil, nil, fmt.Errorf("no suitable interface found")
}

// scanPortsForIP scans ports for a given IP
func scanPortsForIP(ip string, ports []int, timeout int) []int {
	var openPorts []int
	var wg sync.WaitGroup
	var mu sync.Mutex

	maxConcurrent := 20
	semaphore := make(chan struct{}, maxConcurrent)

	for _, port := range ports {
		wg.Add(1)
		semaphore <- struct{}{}

		go func(p int) {
			defer wg.Done()
			defer func() { <-semaphore }()

			if isPortOpen(ip, p, timeout) {
				mu.Lock()
				openPorts = append(openPorts, p)
				mu.Unlock()
			}
		}(port)
	}

	wg.Wait()
	return openPorts
}

// isPortOpen checks if a port is open
func isPortOpen(ip string, port int, timeout int) bool {
	address := fmt.Sprintf("%s:%d", ip, port)
	conn, err := net.DialTimeout("tcp", address, time.Duration(timeout)*time.Second)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}
