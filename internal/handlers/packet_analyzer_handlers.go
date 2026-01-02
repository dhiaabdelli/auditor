package handlers

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"network-script-generator/internal/models"
	"network-script-generator/internal/shared"

	"github.com/google/gopacket"
	"github.com/google/gopacket/layers"
	"github.com/google/gopacket/pcap"
)

var (
	captureSessions   = make(map[string]*models.CaptureSession)
	captureSessionsMu sync.RWMutex
	packetCounter     = make(map[string]int)
)

// HandleListInterfaces returns a list of available network interfaces
func HandleListInterfaces(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	devices, err := pcap.FindAllDevs()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to list interfaces: %v", err), http.StatusInternalServerError)
		return
	}

	// Get all system interfaces for matching
	systemIfaces, _ := net.Interfaces()

	interfaces := []models.NetworkInterface{}
	for _, device := range devices {
		addrs := []string{}
		for _, addr := range device.Addresses {
			addrs = append(addrs, addr.IP.String())
		}

		// Find matching system interface by MAC address (more reliable than IP)
		var matchedIface *net.Interface
		macAddr := ""
		realAdapterName := device.Description

		// First pass: try to match by MAC address from device name
		for i := range systemIfaces {
			iface := &systemIfaces[i]
			// Skip loopback and interfaces without MAC
			if iface.Flags&net.FlagLoopback != 0 || len(iface.HardwareAddr) == 0 {
				continue
			}

			// Try to match by IP address
			ifaceAddrs, _ := iface.Addrs()
			for _, ifaceAddr := range ifaceAddrs {
				ipNet, ok := ifaceAddr.(*net.IPNet)
				if ok {
					for _, devAddr := range addrs {
						// Match IPv4 addresses
						if ipNet.IP.String() == devAddr && ipNet.IP.To4() != nil {
							matchedIface = iface
							macAddr = iface.HardwareAddr.String()
							// Use Windows interface name (e.g., "Ethernet", "Wi-Fi", "Ethernet 2")
							realAdapterName = iface.Name
							break
						}
					}
					if matchedIface != nil {
						break
					}
				}
			}
			if matchedIface != nil {
				break
			}
		}

		// Build friendly name
		friendlyName := ""

		// Priority 1: Use Windows interface name if available (e.g., "Ethernet", "Wi-Fi")
		if realAdapterName != "" &&
			realAdapterName != "Microsoft" &&
			realAdapterName != "Microsoft Corporation" &&
			len(realAdapterName) < 50 {
			friendlyName = realAdapterName
		}

		// Priority 2: Use device description if it's detailed
		if friendlyName == "" &&
			device.Description != "" &&
			device.Description != "Microsoft" &&
			device.Description != "Microsoft Corporation" {
			friendlyName = device.Description
			realAdapterName = device.Description
		}

		// Priority 3: Fallback to generic name with MAC
		if friendlyName == "" ||
			friendlyName == "Microsoft" ||
			friendlyName == "Microsoft Corporation" {
			if macAddr != "" {
				friendlyName = "Network Adapter (" + macAddr + ")"
			} else {
				// Last resort: use GUID prefix
				if strings.Contains(device.Name, "NPF_") {
					guid := strings.TrimPrefix(device.Name, "\\Device\\NPF_")
					guid = strings.TrimPrefix(guid, "{")
					if len(guid) >= 8 {
						friendlyName = "Adapter-" + guid[:8]
					}
				}
			}
			realAdapterName = friendlyName
		}

		interfaces = append(interfaces, models.NetworkInterface{
			Name:         device.Name,
			FriendlyName: friendlyName,
			Description:  realAdapterName,
			Addresses:    addrs,
			MACAddress:   macAddr,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":    true,
		"interfaces": interfaces,
	})
}

// HandleStartCapture starts a new packet capture session
func HandleStartCapture(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.PacketCaptureRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Interface == "" {
		http.Error(w, "Interface is required", http.StatusBadRequest)
		return
	}

	// Default values
	if req.Snaplen == 0 {
		req.Snaplen = 1600
	}

	sessionID := fmt.Sprintf("%s-%d", req.Interface, time.Now().Unix())

	// Check if session already exists
	captureSessionsMu.RLock()
	if _, exists := captureSessions[sessionID]; exists {
		captureSessionsMu.RUnlock()
		http.Error(w, "Capture session already exists", http.StatusConflict)
		return
	}
	captureSessionsMu.RUnlock()

	session := &models.CaptureSession{
		ID:        sessionID,
		Interface: req.Interface,
		Filter:    req.Filter,
		Active:    true,
		StopCh:    make(chan struct{}),
		PacketCh:  make(chan *models.PacketInfo, 1000000), // 1M buffer for very high-traffic capture
		CreatedAt: time.Now(),
	}

	captureSessionsMu.Lock()
	captureSessions[sessionID] = session
	packetCounter[sessionID] = 0
	captureSessionsMu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"sessionId": sessionID,
		"message":   "Capture session created",
	})
}

// HandleStopCapture stops a packet capture session
func HandleStopCapture(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		SessionID string `json:"sessionId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	captureSessionsMu.Lock()
	session, exists := captureSessions[req.SessionID]
	if !exists {
		captureSessionsMu.Unlock()
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}

	session.Active = false
	close(session.StopCh)
	delete(captureSessions, req.SessionID)
	delete(packetCounter, req.SessionID)
	captureSessionsMu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Capture session stopped",
	})
}

// HandlePacketCaptureWebSocket handles WebSocket connections for real-time packet streaming
func HandlePacketCaptureWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := shared.Upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Packet capture WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	sessionID := r.URL.Query().Get("sessionId")
	if sessionID == "" {
		conn.WriteJSON(models.WSMessage{Type: "error", Data: "Missing sessionId"})
		return
	}

	captureSessionsMu.RLock()
	session, exists := captureSessions[sessionID]
	captureSessionsMu.RUnlock()

	if !exists {
		conn.WriteJSON(models.WSMessage{Type: "error", Data: "Session not found"})
		return
	}

	// Channel to detect WebSocket close
	connClosed := make(chan bool, 1)

	// Monitor WebSocket connection close in a goroutine
	go func() {
		for {
			// Try to read from WebSocket - if it fails, connection is closed
			var msg map[string]interface{}
			if err := conn.ReadJSON(&msg); err != nil {
				// Connection closed or error
				connClosed <- true
				return
			}
			// Handle any incoming messages (e.g., stop requests)
			if msgType, ok := msg["type"].(string); ok && msgType == "stop" {
				connClosed <- true
				return
			}
		}
	}()

	// Start packet capture in a goroutine
	go startPacketCapture(session)

	// Stream packets to WebSocket with batching for performance
	ticker := time.NewTicker(50 * time.Millisecond) // Batch every 50ms
	defer ticker.Stop()

	var packetBatch []*models.PacketInfo

	for {
		select {
		case packet := <-session.PacketCh:
			packetBatch = append(packetBatch, packet)

			// Send immediately if batch reaches 100 packets
			if len(packetBatch) >= 100 {
				if err := conn.WriteJSON(packetBatch); err != nil {
					log.Printf("WebSocket write error: %v", err)
					// Connection closed - stop capture
					stopCaptureSession(sessionID)
					return
				}
				// Reuse slice capacity
				packetBatch = packetBatch[:0]
			}

		case <-ticker.C:
			// Send accumulated packets every 50ms
			if len(packetBatch) > 0 {
				if err := conn.WriteJSON(packetBatch); err != nil {
					log.Printf("WebSocket write error: %v", err)
					// Connection closed - stop capture
					stopCaptureSession(sessionID)
					return
				}
				// Reuse slice capacity
				packetBatch = packetBatch[:0]
			}

		case <-connClosed:
			// WebSocket connection closed - stop capture immediately
			log.Printf("WebSocket connection closed for session %s, stopping capture", sessionID)
			stopCaptureSession(sessionID)
			return

		case <-session.StopCh:
			// Send any remaining packets
			if len(packetBatch) > 0 {
				conn.WriteJSON(packetBatch)
			}
			conn.WriteJSON(models.WSMessage{Type: "info", Data: "Capture stopped"})
			return
		}
	}
}

// stopCaptureSession stops a capture session and cleans up resources
func stopCaptureSession(sessionID string) {
	captureSessionsMu.Lock()
	defer captureSessionsMu.Unlock()

	session, exists := captureSessions[sessionID]
	if !exists {
		return
	}

	// Mark session as inactive
	session.Active = false

	// Close StopCh to signal capture goroutine to stop
	// Use select to avoid panic if channel already closed
	select {
	case <-session.StopCh:
		// Channel already closed
	default:
		close(session.StopCh)
	}

	// Clean up session
	delete(captureSessions, sessionID)
	delete(packetCounter, sessionID)

	log.Printf("Capture session %s stopped and cleaned up", sessionID)
}

// startPacketCapture starts capturing packets on the specified interface
func startPacketCapture(session *models.CaptureSession) {
	handle, err := pcap.OpenLive(session.Interface, 1600, true, pcap.BlockForever)
	if err != nil {
		log.Printf("Failed to open device %s: %v", session.Interface, err)
		session.PacketCh <- &models.PacketInfo{
			Number:   0,
			Protocol: "ERROR",
			Info:     fmt.Sprintf("Failed to open device: %v", err),
		}
		close(session.PacketCh)
		return
	}
	defer handle.Close()

	// Apply BPF filter if provided
	if session.Filter != "" {
		if err := handle.SetBPFFilter(session.Filter); err != nil {
			log.Printf("Failed to set BPF filter: %v", err)
			session.PacketCh <- &models.PacketInfo{
				Number:   0,
				Protocol: "ERROR",
				Info:     fmt.Sprintf("Invalid filter: %v", err),
			}
			close(session.PacketCh)
			return
		}
	}

	packetSource := gopacket.NewPacketSource(handle, handle.LinkType())

	for {
		select {
		case <-session.StopCh:
			close(session.PacketCh)
			return
		case packet := <-packetSource.Packets():
			if packet == nil {
				continue
			}

			captureSessionsMu.Lock()
			packetCounter[session.ID]++
			packetNum := packetCounter[session.ID]
			captureSessionsMu.Unlock()

			packetInfo := parsePacket(packet, packetNum)

			select {
			case session.PacketCh <- packetInfo:
				// Packet sent successfully
			default:
				// Channel full, skip packet (rate limiting in effect)
				// Only log every 1000th dropped packet to avoid log spam
				if packetNum%1000 == 0 {
					log.Printf("Warning: Packet channel at capacity, dropping packets (total captured: %d)", packetNum)
				}
			}
		}
	}
}

// parsePacket extracts information from a captured packet
func parsePacket(packet gopacket.Packet, packetNum int) *models.PacketInfo {
	info := &models.PacketInfo{
		Number:    packetNum,
		Timestamp: packet.Metadata().Timestamp.Format("2006-01-02 15:04:05.000000"),
		Length:    packet.Metadata().Length,
		Layers:    make(map[string]interface{}),
	}

	// Extract source and destination from various layers
	if ethLayer := packet.Layer(layers.LayerTypeEthernet); ethLayer != nil {
		eth := ethLayer.(*layers.Ethernet)

		// Enhanced Ethernet II frame data
		ethData := map[string]interface{}{
			"destinationMAC": eth.DstMAC.String(),
			"sourceMAC":      eth.SrcMAC.String(),
			"etherType":      eth.EthernetType.String(),
			"etherTypeHex":   fmt.Sprintf("0x%04x", uint16(eth.EthernetType)),
			"frameLength":    len(packet.Data()),
		}

		// Classify destination MAC
		if eth.DstMAC[0]&0x01 == 1 {
			if eth.DstMAC.String() == "ff:ff:ff:ff:ff:ff" {
				ethData["destinationType"] = "Broadcast"
			} else {
				ethData["destinationType"] = "Multicast"
			}
		} else {
			ethData["destinationType"] = "Unicast"
		}

		// Get vendor info from OUI (first 3 bytes of MAC)
		ethData["sourceVendor"] = getVendorFromMAC(eth.SrcMAC.String())
		ethData["destinationVendor"] = getVendorFromMAC(eth.DstMAC.String())

		// Check for VLAN tags (802.1Q)
		if eth.EthernetType == 0x8100 {
			ethData["vlanTagged"] = true
		}

		info.Layers["ethernet"] = ethData
	}

	// WiFi / 802.11 Detection
	if dot11Layer := packet.Layer(layers.LayerTypeDot11); dot11Layer != nil {
		dot11 := dot11Layer.(*layers.Dot11)

		wifiData := map[string]interface{}{
			"type":           dot11.Type.String(),
			"flags":          fmt.Sprintf("0x%02x", dot11.Flags),
			"durationID":     dot11.DurationID,
			"sequenceNumber": dot11.SequenceNumber,
			"fragmentNumber": dot11.FragmentNumber,
		}

		// Extract MAC addresses based on frame type
		if len(dot11.Address1) > 0 {
			wifiData["address1"] = dot11.Address1.String() // Usually receiver/destination
		}
		if len(dot11.Address2) > 0 {
			wifiData["address2"] = dot11.Address2.String() // Usually transmitter/source
		}
		if len(dot11.Address3) > 0 {
			wifiData["address3"] = dot11.Address3.String() // BSSID or filtering address
		}
		if len(dot11.Address4) > 0 {
			wifiData["address4"] = dot11.Address4.String() // Used in WDS mode
		}

		// Set source and destination
		info.Protocol = "802.11"
		if len(dot11.Address2) > 0 {
			info.Source = dot11.Address2.String()
		}
		if len(dot11.Address1) > 0 {
			info.Destination = dot11.Address1.String()
		}

		// Determine frame type and subtype
		frameType := ""
		switch dot11.Type {
		case layers.Dot11TypeMgmt:
			wifiData["frameType"] = "Management"
			// Check for beacon frames
			if beaconLayer := packet.Layer(layers.LayerTypeDot11MgmtBeacon); beaconLayer != nil {
				wifiData["subtype"] = "Beacon"
				frameType = "Beacon"
			} else if probeReqLayer := packet.Layer(layers.LayerTypeDot11MgmtProbeReq); probeReqLayer != nil {
				wifiData["subtype"] = "Probe Request"
				frameType = "Probe Request"
			} else if probeRespLayer := packet.Layer(layers.LayerTypeDot11MgmtProbeResp); probeRespLayer != nil {
				wifiData["subtype"] = "Probe Response"
				frameType = "Probe Response"
			} else {
				frameType = "Management"
			}
		case layers.Dot11TypeCtrl:
			wifiData["frameType"] = "Control"
			// Check for control frames
			if rtsLayer := packet.Layer(layers.LayerTypeDot11CtrlRTS); rtsLayer != nil {
				wifiData["subtype"] = "RTS"
				frameType = "RTS"
			} else if ctsLayer := packet.Layer(layers.LayerTypeDot11CtrlCTS); ctsLayer != nil {
				wifiData["subtype"] = "CTS"
				frameType = "CTS"
			} else if ackLayer := packet.Layer(layers.LayerTypeDot11CtrlAck); ackLayer != nil {
				wifiData["subtype"] = "ACK"
				frameType = "ACK"
			} else {
				frameType = "Control"
			}
		case layers.Dot11TypeData:
			wifiData["frameType"] = "Data"
			wifiData["subtype"] = "Data"
			frameType = "Data"
		default:
			frameType = dot11.Type.String()
		}

		if frameType != "" {
			info.Info = fmt.Sprintf("802.11 %s", frameType)
		} else {
			info.Info = "802.11"
		}

		info.Layers["wifi"] = wifiData
	}

	if ipLayer := packet.Layer(layers.LayerTypeIPv4); ipLayer != nil {
		ip := ipLayer.(*layers.IPv4)
		info.Source = ip.SrcIP.String()
		info.Destination = ip.DstIP.String()
		info.Protocol = ip.Protocol.String()
		info.TTL = int(ip.TTL)

		// Enhanced IPv4 data with all fields
		ipv4Data := map[string]interface{}{
			"version":        ip.Version,
			"ihl":            ip.IHL,
			"headerLength":   ip.IHL * 4,
			"dscp":           (ip.TOS >> 2) & 0x3F, // Differentiated Services Code Point
			"ecn":            ip.TOS & 0x03,        // Explicit Congestion Notification
			"tos":            ip.TOS,               // Type of Service
			"tosHex":         fmt.Sprintf("0x%02x", ip.TOS),
			"totalLength":    ip.Length,
			"identification": ip.Id,
			"idHex":          fmt.Sprintf("0x%04x", ip.Id),
			"flags":          getIPv4Flags(ip),
			"flagsRaw":       uint8(ip.Flags),
			"fragmentOffset": ip.FragOffset,
			"ttl":            ip.TTL,
			"protocol":       ip.Protocol.String(),
			"protocolNumber": uint8(ip.Protocol),
			"headerChecksum": ip.Checksum,
			"checksumHex":    fmt.Sprintf("0x%04x", ip.Checksum),
			"sourceIP":       ip.SrcIP.String(),
			"destinationIP":  ip.DstIP.String(),
		}

		// Parse IP options if present
		if len(ip.Options) > 0 {
			ipOptions := []map[string]interface{}{}
			for _, opt := range ip.Options {
				optData := map[string]interface{}{
					"type":   opt.OptionType,
					"length": opt.OptionLength,
				}
				ipOptions = append(ipOptions, optData)
			}
			ipv4Data["options"] = ipOptions
			ipv4Data["optionsCount"] = len(ip.Options)
		}

		// Calculate payload length
		ipv4Data["payloadLength"] = ip.Length - uint16(ip.IHL*4)

		info.Layers["ipv4"] = ipv4Data
	}

	if ipv6Layer := packet.Layer(layers.LayerTypeIPv6); ipv6Layer != nil {
		ipv6 := ipv6Layer.(*layers.IPv6)
		info.Source = ipv6.SrcIP.String()
		info.Destination = ipv6.DstIP.String()
		info.Protocol = ipv6.NextHeader.String()
		info.TTL = int(ipv6.HopLimit) // IPv6 uses Hop Limit instead of TTL

		// Enhanced IPv6 data with all fields
		ipv6Data := map[string]interface{}{
			"version":          ipv6.Version,
			"trafficClass":     ipv6.TrafficClass,
			"trafficClassHex":  fmt.Sprintf("0x%02x", ipv6.TrafficClass),
			"dscp":             (ipv6.TrafficClass >> 2) & 0x3F,
			"ecn":              ipv6.TrafficClass & 0x03,
			"flowLabel":        ipv6.FlowLabel,
			"flowLabelHex":     fmt.Sprintf("0x%05x", ipv6.FlowLabel),
			"payloadLength":    ipv6.Length,
			"nextHeader":       ipv6.NextHeader.String(),
			"nextHeaderNumber": uint8(ipv6.NextHeader),
			"hopLimit":         ipv6.HopLimit,
			"sourceIP":         ipv6.SrcIP.String(),
			"destinationIP":    ipv6.DstIP.String(),
		}

		// Calculate total packet length (40 byte header + payload)
		ipv6Data["totalLength"] = 40 + ipv6.Length

		info.Layers["ipv6"] = ipv6Data
	}

	if tcpLayer := packet.Layer(layers.LayerTypeTCP); tcpLayer != nil {
		tcp := tcpLayer.(*layers.TCP)
		info.Protocol = "TCP"
		info.SrcPort = int(tcp.SrcPort)
		info.DstPort = int(tcp.DstPort)
		info.SeqNum = tcp.Seq
		info.AckNum = tcp.Ack
		info.TcpSegLen = len(tcp.Payload) // TCP Segment Length (payload)

		// Build Info string in Wireshark format
		flagsStr := getTCPFlagsWireshark(tcp)
		if tcp.ACK && tcp.Ack > 0 {
			info.Info = fmt.Sprintf("%d → %d %s Seq=%d Ack=%d Win=%d Len=%d",
				tcp.SrcPort, tcp.DstPort, flagsStr, tcp.Seq, tcp.Ack, tcp.Window, len(tcp.Payload))
		} else {
			info.Info = fmt.Sprintf("%d → %d %s Seq=%d Win=%d Len=%d",
				tcp.SrcPort, tcp.DstPort, flagsStr, tcp.Seq, tcp.Window, len(tcp.Payload))
		}

		// Enhanced Transmission Control Protocol data
		tcpData := map[string]interface{}{
			"srcPort":        tcp.SrcPort,
			"dstPort":        tcp.DstPort,
			"sequenceNumber": tcp.Seq,
			"ackNumber":      tcp.Ack,
			"dataOffset":     tcp.DataOffset,
			"headerLength":   tcp.DataOffset * 4,
			"reserved":       0, // Reserved bits
			"flags":          getTCPFlags(tcp),
			"flagsDetailed":  getTCPFlagsDetailed(tcp),
			"windowSize":     tcp.Window,
			"checksum":       tcp.Checksum,
			"urgentPointer":  tcp.Urgent,
			"payloadLength":  len(tcp.Payload),
		}

		// Calculate relative sequence numbers (if this is not the first packet)
		tcpData["sequenceNumberRaw"] = tcp.Seq
		tcpData["ackNumberRaw"] = tcp.Ack

		// TCP Stream information
		streamInfo := map[string]interface{}{
			"srcPort": tcp.SrcPort,
			"dstPort": tcp.DstPort,
		}
		tcpData["stream"] = streamInfo

		// Connection state analysis
		connectionState := analyzeConnectionState(tcp)
		tcpData["connectionState"] = connectionState

		// Parse TCP options with full details
		if len(tcp.Options) > 0 {
			options := []map[string]interface{}{}
			for _, opt := range tcp.Options {
				optData := map[string]interface{}{
					"kind":   opt.OptionType.String(),
					"type":   opt.OptionType.String(),
					"length": opt.OptionLength,
				}

				// Parse specific options with detailed information
				switch opt.OptionType {
				case layers.TCPOptionKindMSS:
					if len(opt.OptionData) >= 2 {
						mss := uint16(opt.OptionData[0])<<8 | uint16(opt.OptionData[1])
						optData["value"] = fmt.Sprintf("MSS=%d bytes", mss)
						optData["mss"] = mss
					}
				case layers.TCPOptionKindWindowScale:
					if len(opt.OptionData) >= 1 {
						scale := opt.OptionData[0]
						optData["value"] = fmt.Sprintf("Shift=%d, Multiplier=%d", scale, 1<<scale)
						optData["shift"] = scale
						optData["multiplier"] = 1 << scale
					}
				case layers.TCPOptionKindTimestamps:
					if len(opt.OptionData) >= 8 {
						tsval := uint32(opt.OptionData[0])<<24 | uint32(opt.OptionData[1])<<16 | uint32(opt.OptionData[2])<<8 | uint32(opt.OptionData[3])
						tsecr := uint32(opt.OptionData[4])<<24 | uint32(opt.OptionData[5])<<16 | uint32(opt.OptionData[6])<<8 | uint32(opt.OptionData[7])
						optData["value"] = fmt.Sprintf("TSval=%d, TSecr=%d", tsval, tsecr)
						optData["tsval"] = tsval
						optData["tsecr"] = tsecr
					}
				case layers.TCPOptionKindSACKPermitted:
					optData["value"] = "SACK Permitted"
				case layers.TCPOptionKindSACK:
					optData["value"] = "Selective Acknowledgment"
					// Parse SACK blocks
					if len(opt.OptionData) >= 8 {
						blocks := len(opt.OptionData) / 8
						optData["blocks"] = blocks
					}
				case layers.TCPOptionKindNop:
					optData["value"] = "No Operation (padding)"
				case layers.TCPOptionKindEndList:
					optData["value"] = "End of Option List"
				}

				options = append(options, optData)
			}
			tcpData["options"] = options
			tcpData["optionsCount"] = len(options)
		}

		// Detect common application protocols by port
		appProtocol := detectApplicationByPort(int(tcp.SrcPort), int(tcp.DstPort))
		tcpData["application"] = appProtocol

		// Add segment analysis
		tcpData["segmentLength"] = len(tcp.Payload)
		tcpData["nextSequenceNumber"] = tcp.Seq + uint32(len(tcp.Payload))

		info.Layers["tcp"] = tcpData
	}

	if udpLayer := packet.Layer(layers.LayerTypeUDP); udpLayer != nil {
		udp := udpLayer.(*layers.UDP)
		info.Protocol = "UDP"
		info.SrcPort = int(udp.SrcPort)
		info.DstPort = int(udp.DstPort)
		info.Info = fmt.Sprintf("%d → %d Len=%d", udp.SrcPort, udp.DstPort, udp.Length)

		// Enhanced UDP data with all fields
		udpData := map[string]interface{}{
			"sourcePort":      udp.SrcPort,
			"destinationPort": udp.DstPort,
			"length":          udp.Length,
			"checksum":        udp.Checksum,
			"checksumHex":     fmt.Sprintf("0x%04x", udp.Checksum),
			"payloadLength":   len(udp.Payload),
			"headerLength":    8, // UDP header is always 8 bytes
		}

		// Calculate data length (total length - header)
		if udp.Length >= 8 {
			udpData["dataLength"] = udp.Length - 8
		}

		// Detect common application protocols by port
		appProtocol := detectApplicationByPort(int(udp.SrcPort), int(udp.DstPort))
		udpData["application"] = appProtocol

		// Add stream information
		udpData["stream"] = map[string]interface{}{
			"srcPort": udp.SrcPort,
			"dstPort": udp.DstPort,
		}

		info.Layers["udp"] = udpData
	}

	if icmpLayer := packet.Layer(layers.LayerTypeICMPv4); icmpLayer != nil {
		icmp := icmpLayer.(*layers.ICMPv4)
		info.Protocol = "ICMP"

		icmpType := icmp.TypeCode.Type()
		icmpCode := icmp.TypeCode.Code()
		icmpTypeName := getICMPTypeName(icmpType, icmpCode)

		info.Info = fmt.Sprintf("%s (Type=%d Code=%d)", icmpTypeName, icmpType, icmpCode)

		// Enhanced ICMP data with all fields
		icmpData := map[string]interface{}{
			"type":        icmpType,
			"code":        icmpCode,
			"typeName":    icmpTypeName,
			"checksum":    icmp.Checksum,
			"checksumHex": fmt.Sprintf("0x%04x", icmp.Checksum),
			"identifier":  icmp.Id,
			"idHex":       fmt.Sprintf("0x%04x", icmp.Id),
			"sequence":    icmp.Seq,
			"seqHex":      fmt.Sprintf("0x%04x", icmp.Seq),
		}

		// Add payload data if present
		if len(icmp.Payload) > 0 {
			icmpData["dataLength"] = len(icmp.Payload)
			// For echo requests/replies, show first bytes of data
			if icmpType == 0 || icmpType == 8 {
				dataPreview := icmp.Payload
				if len(dataPreview) > 32 {
					dataPreview = dataPreview[:32]
				}
				icmpData["dataPreview"] = hex.EncodeToString(dataPreview)
			}
		}

		info.Layers["icmp"] = icmpData
	}

	if dnsLayer := packet.Layer(layers.LayerTypeDNS); dnsLayer != nil {
		dns := dnsLayer.(*layers.DNS)
		info.Protocol = "DNS"

		dnsData := map[string]interface{}{
			"transactionID":       dns.ID,
			"idHex":               fmt.Sprintf("0x%04x", dns.ID),
			"flags":               getDNSFlags(dns),
			"queryResponse":       dns.QR,
			"opcode":              dns.OpCode,
			"opcodeName":          getDNSOpcodeName(dns.OpCode),
			"authoritativeAnswer": dns.AA,
			"truncated":           dns.TC,
			"recursionDesired":    dns.RD,
			"recursionAvailable":  dns.RA,
			"z":                   dns.Z,
			"authenticatedData":   (dns.Z & 0x20) != 0,
			"checkingDisabled":    (dns.Z & 0x10) != 0,
			"responseCode":        dns.ResponseCode,
			"rcodeName":           getDNSRcodeName(dns.ResponseCode),
			"questionCount":       len(dns.Questions),
			"answerCount":         len(dns.Answers),
			"authorityCount":      len(dns.Authorities),
			"additionalCount":     len(dns.Additionals),
			"questions":           []map[string]interface{}{},
			"answers":             []map[string]interface{}{},
		}

		var urls []string

		if len(dns.Questions) > 0 {
			domainName := string(dns.Questions[0].Name)

			// Include domain in Info for visibility
			if dns.Questions[0].Type == layers.DNSTypeA || dns.Questions[0].Type == layers.DNSTypeAAAA {
				info.Info = fmt.Sprintf("Query %s → %s", dns.Questions[0].Type, domainName)
			} else {
				info.Info = fmt.Sprintf("Query %s %s", dns.Questions[0].Type, domainName)
			}

			for _, q := range dns.Questions {
				domain := string(q.Name)
				dnsData["questions"] = append(dnsData["questions"].([]map[string]interface{}), map[string]interface{}{
					"name":  domain,
					"type":  q.Type.String(),
					"class": q.Class.String(),
				})

				// Add URL for A/AAAA records
				if q.Type == layers.DNSTypeA || q.Type == layers.DNSTypeAAAA {
					urls = append(urls, "http://"+domain)
				}
			}
		} else if len(dns.Answers) > 0 {
			domainName := string(dns.Answers[0].Name)
			var ipAddr string
			if dns.Answers[0].IP != nil {
				ipAddr = dns.Answers[0].IP.String()
			}

			// Include domain and IP in Info
			if ipAddr != "" {
				info.Info = fmt.Sprintf("Response %s → %s is %s", dns.Answers[0].Type, domainName, ipAddr)
			} else {
				info.Info = fmt.Sprintf("Response %s for %s (%d answers)", dns.Answers[0].Type, domainName, len(dns.Answers))
			}

			for _, a := range dns.Answers {
				domain := string(a.Name)
				answer := map[string]interface{}{
					"name":  domain,
					"type":  a.Type.String(),
					"class": a.Class.String(),
					"ttl":   a.TTL,
				}
				if a.IP != nil {
					answer["ip"] = a.IP.String()
				}
				dnsData["answers"] = append(dnsData["answers"].([]map[string]interface{}), answer)

				// Add URL for resolved domains
				if a.Type == layers.DNSTypeA || a.Type == layers.DNSTypeAAAA {
					urls = append(urls, "http://"+domain)
				}
			}
		}

		// Store URLs
		if len(urls) > 0 {
			dnsData["urls"] = urls
		}

		info.Layers["dns"] = dnsData
	}

	if arpLayer := packet.Layer(layers.LayerTypeARP); arpLayer != nil {
		arp := arpLayer.(*layers.ARP)
		info.Protocol = "ARP"

		srcIP := getARPIP(arp.SourceProtAddress)
		dstIP := getARPIP(arp.DstProtAddress)

		if arp.Operation == 1 {
			info.Info = fmt.Sprintf("Who has %s? Tell %s", dstIP, srcIP)
		} else if arp.Operation == 2 {
			info.Info = fmt.Sprintf("%s is at %s", srcIP, string(arp.SourceHwAddress))
		}

		// Enhanced ARP data with all fields
		arpData := map[string]interface{}{
			"hardwareType":     arp.AddrType,
			"hardwareTypeHex":  fmt.Sprintf("0x%04x", uint16(arp.AddrType)),
			"hardwareTypeName": getARPHardwareType(uint16(arp.AddrType)),
			"protocolType":     arp.Protocol,
			"protocolTypeHex":  fmt.Sprintf("0x%04x", uint16(arp.Protocol)),
			"protocolTypeName": getARPProtocolType(uint16(arp.Protocol)),
			"hardwareSize":     arp.HwAddressSize,
			"protocolSize":     arp.ProtAddressSize,
			"operation":        arp.Operation,
			"operationName":    getARPOperationName(arp.Operation),
			"senderMAC":        string(arp.SourceHwAddress),
			"senderMACAddress": fmt.Sprintf("%02x:%02x:%02x:%02x:%02x:%02x", arp.SourceHwAddress[0], arp.SourceHwAddress[1], arp.SourceHwAddress[2], arp.SourceHwAddress[3], arp.SourceHwAddress[4], arp.SourceHwAddress[5]),
			"senderIP":         srcIP,
			"targetMAC":        string(arp.DstHwAddress),
			"targetMACAddress": fmt.Sprintf("%02x:%02x:%02x:%02x:%02x:%02x", arp.DstHwAddress[0], arp.DstHwAddress[1], arp.DstHwAddress[2], arp.DstHwAddress[3], arp.DstHwAddress[4], arp.DstHwAddress[5]),
			"targetIP":         dstIP,
		}

		info.Layers["arp"] = arpData
	}

	// Detect HTTP (check TCP payload for HTTP patterns)
	if tcpLayer := packet.Layer(layers.LayerTypeTCP); tcpLayer != nil {
		tcp := tcpLayer.(*layers.TCP)
		payload := tcp.Payload

		if len(payload) > 0 {
			payloadStr := string(payload)

			// HTTP Detection
			if strings.HasPrefix(payloadStr, "HTTP/") ||
				strings.HasPrefix(payloadStr, "GET ") ||
				strings.HasPrefix(payloadStr, "POST ") ||
				strings.HasPrefix(payloadStr, "PUT ") ||
				strings.HasPrefix(payloadStr, "DELETE ") ||
				strings.HasPrefix(payloadStr, "HEAD ") ||
				strings.HasPrefix(payloadStr, "OPTIONS ") {

				info.Protocol = "HTTP"
				httpData := parseHTTP(payload)
				info.Layers["http"] = httpData

				if method, ok := httpData["method"].(string); ok {
					// Include Host header in Info for requests
					if host, hostOk := httpData["host"].(string); hostOk {
						if uri, ok := httpData["uri"].(string); ok {
							info.Info = fmt.Sprintf("%s http://%s%s", method, host, uri)
						} else {
							info.Info = fmt.Sprintf("%s http://%s", method, host)
						}
					} else if uri, ok := httpData["uri"].(string); ok {
						info.Info = fmt.Sprintf("%s %s", method, uri)
					}
				} else if status, ok := httpData["status"].(string); ok {
					info.Info = fmt.Sprintf("HTTP/1.1 %s", status)
				}
			}

			// TLS Detection (check for TLS record)
			if len(payload) > 5 && (payload[0] >= 0x14 && payload[0] <= 0x17) {
				info.Protocol = "TLS"
				tlsData := parseTLS(payload)
				info.Layers["tls"] = tlsData

				// Check content type
				contentType, _ := tlsData["contentType"].(string)
				handshakeType, hasHandshake := tlsData["handshakeType"].(string)

				// Application Data - most common for encrypted traffic
				if payload[0] == 0x17 {
					if version, ok := tlsData["version"].(string); ok {
						info.Info = fmt.Sprintf("%s Application Data", version)
					} else {
						info.Info = "Application Data"
					}
				} else if hasHandshake {
					// Handshake messages (Client Hello, Server Hello, etc.)
					if serverName, ok := tlsData["serverName"].(string); ok {
						info.Info = fmt.Sprintf("%s → %s", handshakeType, serverName)
					} else {
						info.Info = fmt.Sprintf("%s", handshakeType)
					}
				} else if serverName, ok := tlsData["serverName"].(string); ok {
					// Fallback for logic without handshake type (should rely on above)
					info.Info = fmt.Sprintf("TLS → %s", serverName)
				} else if version, ok := tlsData["version"].(string); ok {
					// Other TLS content types
					if contentType != "" {
						info.Info = fmt.Sprintf("%s %s", version, contentType)
					} else {
						info.Info = version
					}
				} else if contentType != "" {
					info.Info = contentType
				}
			}
		}
	}

	// QUIC Detection (UDP-based, usually port 443)
	if udpLayer := packet.Layer(layers.LayerTypeUDP); udpLayer != nil {
		udp := udpLayer.(*layers.UDP)
		payload := udp.Payload

		if len(payload) > 0 {
			// QUIC packets have specific header format
			// Check for QUIC Initial, 0-RTT, Handshake, or Retry packets
			if (udp.DstPort == 443 || udp.SrcPort == 443 || udp.DstPort == 80 || udp.SrcPort == 80) && len(payload) > 5 {
				// QUIC Long Header: bit 7 is set (0x80 or higher)
				// QUIC Short Header: bit 7 is clear
				if payload[0]&0x40 != 0 { // Check for QUIC version bit
					info.Protocol = "QUIC"
					quicData := parseQUIC(payload)
					info.Layers["quic"] = quicData

					if packetType, ok := quicData["packetType"].(string); ok {
						info.Info = fmt.Sprintf("QUIC %s", packetType)
						if connID, ok := quicData["destinationConnectionID"].(string); ok {
							info.Info = fmt.Sprintf("QUIC %s (DCID: %s)", packetType, connID)
						}
					}
				}
			}

			// DHCP Detection (already have parseDHCP but ensure it's triggered)
			if (udp.SrcPort == 67 || udp.SrcPort == 68) && (udp.DstPort == 67 || udp.DstPort == 68) {
				if dhcpLayer := packet.Layer(layers.LayerTypeDHCPv4); dhcpLayer != nil {
					dhcp := dhcpLayer.(*layers.DHCPv4)
					info.Protocol = "DHCP"
					dhcpData := parseDHCP(dhcp)
					info.Layers["dhcp"] = dhcpData

					if msgType, ok := dhcpData["messageType"].(string); ok {
						info.Info = fmt.Sprintf("DHCP %s", msgType)
					}
				}
			}
		}
	}

	// Generate hex dump of packet data
	if packet.Data() != nil {
		info.Raw = hex.Dump(packet.Data())
	}

	// Default info if not set
	if info.Info == "" {
		info.Info = fmt.Sprintf("%s packet", info.Protocol)
	}

	return info
}

// getTCPFlags returns a string representation of TCP flags
func getTCPFlags(tcp *layers.TCP) string {
	flags := ""
	if tcp.SYN {
		flags += "S"
	}
	if tcp.ACK {
		flags += "A"
	}
	if tcp.FIN {
		flags += "F"
	}
	if tcp.RST {
		flags += "R"
	}
	if tcp.PSH {
		flags += "P"
	}
	if tcp.URG {
		flags += "U"
	}
	return flags
}

// getTCPFlagsWireshark returns TCP flags in Wireshark format (e.g., [SYN], [SYN, ACK])
func getTCPFlagsWireshark(tcp *layers.TCP) string {
	var flags []string

	if tcp.SYN {
		flags = append(flags, "SYN")
	}
	if tcp.ACK {
		flags = append(flags, "ACK")
	}
	if tcp.FIN {
		flags = append(flags, "FIN")
	}
	if tcp.RST {
		flags = append(flags, "RST")
	}
	if tcp.PSH {
		flags = append(flags, "PSH")
	}
	if tcp.URG {
		flags = append(flags, "URG")
	}
	if tcp.ECE {
		flags = append(flags, "ECE")
	}
	if tcp.CWR {
		flags = append(flags, "CWR")
	}

	if len(flags) == 0 {
		return ""
	}

	return "[" + strings.Join(flags, ", ") + "]"
}

// getTCPFlagsDetailed returns detailed TCP flags information
func getTCPFlagsDetailed(tcp *layers.TCP) map[string]bool {
	return map[string]bool{
		"SYN": tcp.SYN,
		"ACK": tcp.ACK,
		"FIN": tcp.FIN,
		"RST": tcp.RST,
		"PSH": tcp.PSH,
		"URG": tcp.URG,
		"ECE": tcp.ECE,
		"CWR": tcp.CWR,
		"NS":  tcp.NS,
	}
}

// getIPv4Flags returns IPv4 flags information
func getIPv4Flags(ip *layers.IPv4) map[string]interface{} {
	return map[string]interface{}{
		"dontFragment":  ip.Flags&layers.IPv4DontFragment != 0,
		"moreFragments": ip.Flags&layers.IPv4MoreFragments != 0,
		"reserved":      ip.Flags&layers.IPv4EvilBit != 0,
	}
}

// getICMPTypeName returns human-readable ICMP type name
func getICMPTypeName(icmpType uint8, icmpCode uint8) string {
	switch icmpType {
	case 0:
		return "Echo Reply"
	case 3:
		switch icmpCode {
		case 0:
			return "Destination Network Unreachable"
		case 1:
			return "Destination Host Unreachable"
		case 2:
			return "Destination Protocol Unreachable"
		case 3:
			return "Destination Port Unreachable"
		case 4:
			return "Fragmentation Required"
		case 5:
			return "Source Route Failed"
		default:
			return "Destination Unreachable"
		}
	case 4:
		return "Source Quench"
	case 5:
		return "Redirect"
	case 8:
		return "Echo Request (Ping)"
	case 9:
		return "Router Advertisement"
	case 10:
		return "Router Solicitation"
	case 11:
		switch icmpCode {
		case 0:
			return "TTL Expired in Transit"
		case 1:
			return "Fragment Reassembly Time Exceeded"
		default:
			return "Time Exceeded"
		}
	case 12:
		return "Parameter Problem"
	case 13:
		return "Timestamp Request"
	case 14:
		return "Timestamp Reply"
	default:
		return fmt.Sprintf("Type %d", icmpType)
	}
}

// getDNSFlags returns DNS flags as a hex string
func getDNSFlags(dns *layers.DNS) string {
	flags := uint16(0)
	if dns.QR {
		flags |= 0x8000
	}
	flags |= uint16(dns.OpCode) << 11
	if dns.AA {
		flags |= 0x0400
	}
	if dns.TC {
		flags |= 0x0200
	}
	if dns.RD {
		flags |= 0x0100
	}
	if dns.RA {
		flags |= 0x0080
	}
	flags |= uint16(dns.Z) << 4
	flags |= uint16(dns.ResponseCode)
	return fmt.Sprintf("0x%04x", flags)
}

// getDNSOpcodeName returns human-readable DNS opcode name
func getDNSOpcodeName(opcode layers.DNSOpCode) string {
	opcodes := map[layers.DNSOpCode]string{
		0: "Standard Query",
		1: "Inverse Query",
		2: "Server Status Request",
		4: "Notify",
		5: "Update",
	}
	if name, ok := opcodes[opcode]; ok {
		return name
	}
	return fmt.Sprintf("Unknown (%d)", opcode)
}

// getDNSRcodeName returns human-readable DNS response code name
func getDNSRcodeName(rcode layers.DNSResponseCode) string {
	rcodes := map[layers.DNSResponseCode]string{
		0:  "No Error",
		1:  "Format Error",
		2:  "Server Failure",
		3:  "Non-Existent Domain",
		4:  "Not Implemented",
		5:  "Query Refused",
		6:  "Name Exists",
		7:  "RR Set Exists",
		8:  "RR Set Does Not Exist",
		9:  "Not Authoritative",
		10: "Not Zone",
	}
	if name, ok := rcodes[rcode]; ok {
		return name
	}
	return fmt.Sprintf("Unknown (%d)", rcode)
}

// getARPHardwareType returns hardware type name
func getARPHardwareType(hwType uint16) string {
	types := map[uint16]string{
		1:  "Ethernet",
		6:  "IEEE 802",
		7:  "ARCNET",
		15: "Frame Relay",
		16: "ATM",
		17: "HDLC",
		18: "Fibre Channel",
		19: "ATM",
		20: "Serial Line",
	}
	if name, ok := types[hwType]; ok {
		return name
	}
	return fmt.Sprintf("Unknown (%d)", hwType)
}

// getARPProtocolType returns protocol type name
func getARPProtocolType(protoType uint16) string {
	types := map[uint16]string{
		0x0800: "IPv4",
		0x0806: "ARP",
		0x0842: "Wake-on-LAN",
		0x86DD: "IPv6",
		0x8035: "RARP",
	}
	if name, ok := types[protoType]; ok {
		return name
	}
	return fmt.Sprintf("Unknown (0x%04x)", protoType)
}

// getARPOperationName returns ARP operation name
func getARPOperationName(operation uint16) string {
	operations := map[uint16]string{
		1: "Request",
		2: "Reply",
		3: "RARP Request",
		4: "RARP Reply",
		5: "DRARP Request",
		6: "DRARP Reply",
		7: "DRARP Error",
		8: "InARP Request",
		9: "InARP Reply",
	}
	if name, ok := operations[operation]; ok {
		return name
	}
	return fmt.Sprintf("Unknown (%d)", operation)
}

// analyzeConnectionState analyzes TCP connection state based on flags
func analyzeConnectionState(tcp *layers.TCP) string {
	if tcp.SYN && !tcp.ACK {
		return "Connection Establishment (SYN)"
	} else if tcp.SYN && tcp.ACK {
		return "Connection Establishment (SYN-ACK)"
	} else if tcp.FIN {
		return "Connection Termination (FIN)"
	} else if tcp.RST {
		return "Connection Reset (RST)"
	} else if tcp.PSH {
		return "Data Transfer (PSH)"
	} else if tcp.ACK && len(tcp.Payload) > 0 {
		return "Data Transfer (ACK)"
	} else if tcp.ACK {
		return "Acknowledgment"
	}
	return "Unknown"
}

// getVendorFromMAC returns vendor name from MAC address OUI
func getVendorFromMAC(mac string) string {
	// Extract OUI (first 3 octets)
	if len(mac) < 8 {
		return "Unknown"
	}

	oui := mac[:8] // First 3 octets (XX:XX:XX)

	// Common vendor OUIs (simplified list)
	vendors := map[string]string{
		"00:50:56": "VMware",
		"00:0c:29": "VMware",
		"00:05:69": "VMware",
		"00:1c:42": "Parallels",
		"08:00:27": "Oracle VirtualBox",
		"52:54:00": "QEMU/KVM",
		"00:15:5d": "Microsoft Hyper-V",
		"00:03:ff": "Microsoft",
		"00:0d:3a": "Microsoft",
		"f8:b1:56": "Microsoft",
		"00:1b:21": "Intel",
		"00:1e:67": "Intel",
		"00:19:d1": "Intel",
		"d8:9e:f3": "Intel",
		"00:50:b6": "Dell",
		"00:14:22": "Dell",
		"b8:ca:3a": "Dell",
		"00:1a:a0": "Dell",
		"00:04:23": "Cisco",
		"00:0a:41": "Cisco",
		"00:1b:0c": "Cisco",
		"00:1c:0e": "Cisco",
		"00:03:93": "Apple",
		"00:0a:27": "Apple",
		"00:0a:95": "Apple",
		"00:1b:63": "Apple",
		"00:1c:b3": "Apple",
		"00:1e:c2": "Apple",
		"00:23:32": "Apple",
		"00:25:00": "Apple",
		"00:26:08": "Apple",
		"00:26:b0": "Apple",
		"00:26:bb": "Apple",
		"28:cf:e9": "Apple",
		"3c:07:54": "Apple",
		"40:6c:8f": "Apple",
		"ac:de:48": "Apple",
		"f0:18:98": "Apple",
		"00:1f:3a": "Hewlett Packard",
		"00:1f:29": "Hewlett Packard",
		"00:21:5a": "Hewlett Packard",
		"00:23:7d": "Hewlett Packard",
		"00:0f:b0": "Netgear",
		"00:14:6c": "Netgear",
		"00:18:4d": "Netgear",
		"00:1b:2f": "Netgear",
		"00:1e:2a": "Netgear",
		"00:1f:33": "Netgear",
		"00:22:3f": "Netgear",
		"00:24:b2": "Netgear",
		"00:26:f2": "Netgear",
		"00:0c:41": "TP-Link",
		"00:13:ef": "TP-Link",
		"00:1d:0f": "TP-Link",
		"00:21:27": "TP-Link",
		"00:23:cd": "TP-Link",
		"00:25:86": "TP-Link",
		"00:27:19": "TP-Link",
		"f8:1a:67": "TP-Link",
		"00:1a:11": "Google",
		"00:1a:8a": "Google",
		"3c:5a:b4": "Google",
		"f4:f5:d8": "Google",
	}

	if vendor, ok := vendors[oui]; ok {
		return vendor
	}

	return "Unknown"
}

// detectApplicationByPort detects common application protocols by port number
func detectApplicationByPort(srcPort, dstPort int) string {
	ports := map[int]string{
		20:    "FTP-DATA",
		21:    "FTP",
		22:    "SSH",
		23:    "Telnet",
		25:    "SMTP",
		53:    "DNS",
		67:    "DHCP Server",
		68:    "DHCP Client",
		69:    "TFTP",
		80:    "HTTP",
		110:   "POP3",
		123:   "NTP",
		143:   "IMAP",
		161:   "SNMP",
		162:   "SNMP Trap",
		179:   "BGP",
		389:   "LDAP",
		443:   "HTTPS",
		445:   "SMB",
		465:   "SMTPS",
		514:   "Syslog",
		587:   "SMTP (Submission)",
		636:   "LDAPS",
		993:   "IMAPS",
		995:   "POP3S",
		1433:  "MS SQL Server",
		1521:  "Oracle DB",
		3306:  "MySQL",
		3389:  "RDP",
		5432:  "PostgreSQL",
		5900:  "VNC",
		6379:  "Redis",
		8080:  "HTTP Proxy",
		8443:  "HTTPS Alt",
		27017: "MongoDB",
	}

	if app, ok := ports[dstPort]; ok {
		return app
	}
	if app, ok := ports[srcPort]; ok {
		return app
	}

	// Check for ephemeral ports
	if srcPort >= 49152 && srcPort <= 65535 {
		if app, ok := ports[dstPort]; ok {
			return app
		}
	}
	if dstPort >= 49152 && dstPort <= 65535 {
		if app, ok := ports[srcPort]; ok {
			return app
		}
	}

	return "Unknown"
}

// getARPIP converts ARP protocol address to IP string
func getARPIP(addr []byte) string {
	if len(addr) == 4 {
		return fmt.Sprintf("%d.%d.%d.%d", addr[0], addr[1], addr[2], addr[3])
	}
	return ""
}

// parseHTTP extracts HTTP request/response data
func parseHTTP(payload []byte) map[string]interface{} {
	data := make(map[string]interface{})
	lines := bytes.Split(payload, []byte("\r\n"))

	if len(lines) == 0 {
		return data
	}

	// Parse first line
	firstLine := string(lines[0])
	parts := strings.Split(firstLine, " ")

	if len(parts) >= 2 {
		// Check if it's a request or response
		if strings.HasPrefix(firstLine, "HTTP/") {
			// Response
			data["type"] = "response"
			if len(parts) >= 3 {
				data["status"] = strings.Join(parts[1:], " ")
				data["statusCode"] = parts[1]
			}
		} else {
			// Request
			data["type"] = "request"
			data["method"] = parts[0]
			if len(parts) >= 2 {
				data["uri"] = parts[1]
			}
			if len(parts) >= 3 {
				data["version"] = parts[2]
			}
		}
	}

	// Parse headers
	headers := make(map[string]string)
	for i := 1; i < len(lines); i++ {
		line := string(lines[i])
		if line == "" {
			break
		}

		colonIdx := strings.Index(line, ":")
		if colonIdx > 0 {
			key := strings.TrimSpace(line[:colonIdx])
			value := strings.TrimSpace(line[colonIdx+1:])
			headers[key] = value

			// Extract Host header for URL construction
			if strings.ToLower(key) == "host" {
				data["host"] = value
			}
		}
	}

	if len(headers) > 0 {
		data["headers"] = headers
	}

	return data
}

// parseTLS extracts TLS handshake information
func parseTLS(payload []byte) map[string]interface{} {
	data := make(map[string]interface{})

	if len(payload) < 6 {
		return data
	}

	contentType := payload[0]
	version := (uint16(payload[1]) << 8) | uint16(payload[2])
	length := (uint16(payload[3]) << 8) | uint16(payload[4])

	contentTypes := map[byte]string{
		0x14: "Change Cipher Spec",
		0x15: "Alert",
		0x16: "Handshake",
		0x17: "Application Data",
	}

	data["contentType"] = contentTypes[contentType]
	if data["contentType"] == nil {
		data["contentType"] = fmt.Sprintf("Unknown (0x%02x)", contentType)
	}

	data["length"] = length

	versionMap := map[uint16]string{
		0x0300: "SSL 3.0",
		0x0301: "TLS 1.0",
		0x0302: "TLS 1.1",
		0x0303: "TLS 1.2",
		0x0304: "TLS 1.3",
	}

	data["version"] = versionMap[version]
	if data["version"] == nil {
		data["version"] = fmt.Sprintf("Unknown (0x%04x)", version)
	}

	// Parse handshake type if it's a handshake message
	if contentType == 0x16 && len(payload) > 5 {
		handshakeType := payload[5]
		handshakeTypes := map[byte]string{
			0x00: "Hello Request",
			0x01: "Client Hello",
			0x02: "Server Hello",
			0x0b: "Certificate",
			0x0c: "Server Key Exchange",
			0x0d: "Certificate Request",
			0x0e: "Server Hello Done",
			0x0f: "Certificate Verify",
			0x10: "Client Key Exchange",
			0x14: "Finished",
		}

		data["handshakeType"] = handshakeTypes[handshakeType]
		if data["handshakeType"] == nil {
			data["handshakeType"] = fmt.Sprintf("Unknown (0x%02x)", handshakeType)
		}

		// Extract SNI (Server Name Indication) from Client Hello
		if handshakeType == 0x01 {
			sni := extractSNI(payload)
			if sni != "" {
				data["serverName"] = sni
				data["url"] = "https://" + sni
			}
		}
	}

	return data
}

// extractSNI extracts Server Name Indication from TLS Client Hello
func extractSNI(payload []byte) string {
	// TLS Record: [0] type, [1-2] version, [3-4] length
	// Handshake: [5] type, [6-8] length, [9-10] version
	// Session ID: [11] length, [12+] session id
	// Skip: record header (5) + handshake header (4) + version (2)

	if len(payload) < 43 {
		return ""
	}

	offset := 43 // Start after fixed Client Hello fields

	// Skip Session ID
	if offset >= len(payload) {
		return ""
	}
	sessionIDLen := int(payload[offset])
	offset += 1 + sessionIDLen

	// Skip Cipher Suites
	if offset+2 > len(payload) {
		return ""
	}
	cipherSuitesLen := int(payload[offset])<<8 | int(payload[offset+1])
	offset += 2 + cipherSuitesLen

	// Skip Compression Methods
	if offset+1 > len(payload) {
		return ""
	}
	compressionMethodsLen := int(payload[offset])
	offset += 1 + compressionMethodsLen

	// Extensions Length
	if offset+2 > len(payload) {
		return ""
	}
	extensionsLen := int(payload[offset])<<8 | int(payload[offset+1])
	offset += 2

	if offset+extensionsLen > len(payload) {
		return ""
	}

	// Parse Extensions
	extensionsEnd := offset + extensionsLen
	for offset < extensionsEnd {
		if offset+4 > len(payload) {
			break
		}

		extType := int(payload[offset])<<8 | int(payload[offset+1])
		extLen := int(payload[offset+2])<<8 | int(payload[offset+3])
		offset += 4

		if offset+extLen > len(payload) {
			break
		}

		// SNI Extension Type = 0
		if extType == 0 && extLen > 5 {
			// SNI List Length
			sniListLen := int(payload[offset])<<8 | int(payload[offset+1])
			offset += 2

			if sniListLen > 0 && offset+3 <= len(payload) {
				// SNI Type (0 = hostname)
				sniType := payload[offset]
				offset++

				if sniType == 0 {
					// Hostname Length
					hostnameLen := int(payload[offset])<<8 | int(payload[offset+1])
					offset += 2

					if offset+hostnameLen <= len(payload) {
						hostname := string(payload[offset : offset+hostnameLen])
						return hostname
					}
				}
			}
			return ""
		}

		offset += extLen
	}

	return ""
}

// parseDHCP extracts DHCP message information
func parseDHCP(dhcp *layers.DHCPv4) map[string]interface{} {
	data := make(map[string]interface{})

	opMap := map[layers.DHCPOp]string{
		layers.DHCPOpRequest: "Request",
		layers.DHCPOpReply:   "Reply",
	}

	data["operation"] = opMap[dhcp.Operation]
	data["hardwareType"] = dhcp.HardwareType
	data["transactionID"] = dhcp.Xid
	data["clientIP"] = dhcp.ClientIP.String()
	data["yourIP"] = dhcp.YourClientIP.String()
	data["serverIP"] = dhcp.NextServerIP.String()
	data["clientMAC"] = dhcp.ClientHWAddr.String()

	// Parse options
	options := make(map[string]interface{})
	for _, opt := range dhcp.Options {
		switch opt.Type {
		case layers.DHCPOptMessageType:
			if len(opt.Data) > 0 {
				msgTypes := map[byte]string{
					1: "Discover",
					2: "Offer",
					3: "Request",
					4: "Decline",
					5: "ACK",
					6: "NAK",
					7: "Release",
					8: "Inform",
				}
				data["messageType"] = msgTypes[opt.Data[0]]
			}
		case layers.DHCPOptServerID:
			if len(opt.Data) == 4 {
				options["serverID"] = fmt.Sprintf("%d.%d.%d.%d", opt.Data[0], opt.Data[1], opt.Data[2], opt.Data[3])
			}
		case layers.DHCPOptRequestIP:
			if len(opt.Data) == 4 {
				options["requestedIP"] = fmt.Sprintf("%d.%d.%d.%d", opt.Data[0], opt.Data[1], opt.Data[2], opt.Data[3])
			}
		case layers.DHCPOptHostname:
			options["hostname"] = string(opt.Data)
		}
	}

	if len(options) > 0 {
		data["options"] = options
	}

	return data
}

// parseQUIC extracts QUIC protocol information
func parseQUIC(payload []byte) map[string]interface{} {
	data := make(map[string]interface{})

	if len(payload) < 6 {
		return data
	}

	firstByte := payload[0]

	// Check if it's a long header (bit 7 set)
	isLongHeader := (firstByte & 0x80) != 0
	data["headerType"] = "Short Header"

	if isLongHeader {
		data["headerType"] = "Long Header"

		// Extract version (4 bytes after first byte)
		if len(payload) >= 5 {
			version := uint32(payload[1])<<24 | uint32(payload[2])<<16 | uint32(payload[3])<<8 | uint32(payload[4])
			data["version"] = version
			data["versionHex"] = fmt.Sprintf("0x%08x", version)

			// Version 0 is used for version negotiation
			if version == 0 {
				data["packetType"] = "Version Negotiation"
			} else {
				// Packet type is in bits 4-5 of first byte
				packetTypeBits := (firstByte >> 4) & 0x03
				packetTypes := map[uint8]string{
					0x00: "Initial",
					0x01: "0-RTT",
					0x02: "Handshake",
					0x03: "Retry",
				}
				data["packetType"] = packetTypes[packetTypeBits]
			}
		}

		// Extract connection IDs length
		if len(payload) >= 6 {
			dcidLen := payload[5]
			data["destinationConnectionIDLength"] = dcidLen

			offset := 6
			// Extract Destination Connection ID
			if len(payload) >= offset+int(dcidLen) {
				dcid := payload[offset : offset+int(dcidLen)]
				data["destinationConnectionID"] = hex.EncodeToString(dcid)
				offset += int(dcidLen)

				// Extract Source Connection ID length
				if len(payload) > offset {
					scidLen := payload[offset]
					data["sourceConnectionIDLength"] = scidLen
					offset++

					if len(payload) >= offset+int(scidLen) {
						scid := payload[offset : offset+int(scidLen)]
						data["sourceConnectionID"] = hex.EncodeToString(scid)
					}
				}
			}
		}
	} else {
		// Short header packet
		data["packetType"] = "1-RTT (Protected)"

		// Extract Destination Connection ID (variable length, need to know from handshake)
		// For now, just indicate it's present
		data["hasDestinationConnectionID"] = true
	}

	// Key phase bit (bit 2)
	if !isLongHeader {
		keyPhase := (firstByte & 0x04) != 0
		data["keyPhase"] = keyPhase
	}

	data["payloadLength"] = len(payload)

	return data
}