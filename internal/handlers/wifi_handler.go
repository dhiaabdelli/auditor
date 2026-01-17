package handlers

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"
)

// WifiClient represents a connected WiFi client
type WifiClient struct {
	MAC           string  `json:"mac"`
	IP            string  `json:"ip"`
	Hostname      string  `json:"hostname"`
	Signal        int     `json:"signal"`        // dBm
	RxBitrate     float64 `json:"rxBitrate"`     // MBit/s
	TxBitrate     float64 `json:"txBitrate"`     // MBit/s
	ConnectedTime int     `json:"connectedTime"` // seconds
	Vendor        string  `json:"vendor,omitempty"`
}

// WifiLinkStatus represents the status of the Pi connected as a client
type WifiLinkStatus struct {
	Connected bool    `json:"connected"`
	SSID      string  `json:"ssid,omitempty"`
	BSSID     string  `json:"bssid,omitempty"`
	Signal    int     `json:"signal,omitempty"`
	Freq      int     `json:"freq,omitempty"`
	Bitrate   float64 `json:"bitrate,omitempty"`
}

// WifiStatus represents the overall WiFi AP status and Client Link status
type WifiStatus struct {
	Interface    string          `json:"interface"`
	Band         string          `json:"band"`     // 2.4GHz / 5GHz
	Protocol     string          `json:"protocol"` // b/g/n/ac/ax
	Channel      int             `json:"channel"`
	SSID         string          `json:"ssid"`
	Password     string          `json:"password"`
	Clients      []WifiClient    `json:"clients"`
	TotalClients int             `json:"totalClients"`
	TrafficRx    int64           `json:"trafficRx"` // bytes
	TrafficTx    int64           `json:"trafficTx"` // bytes
	LinkStatus   *WifiLinkStatus `json:"linkStatus,omitempty"`
}

// HandleWifiStatus returns the current WiFi AP status and connected clients
func HandleWifiStatus(w http.ResponseWriter, r *http.Request) {
	status := getWifiStatus()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// HandleWifiKickClient disconnects a client by MAC address
func HandleWifiKickClient(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	mac := r.URL.Query().Get("mac")
	if mac == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "MAC address is required"})
		return
	}

	if runtime.GOOS == "windows" {
		json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Mock: Client kicked"})
		return
	}

	// hostapd_cli disconnects a station
	// Detect the AP interface
	iface := detectAPInterface()

	// 1. Try hostapd_cli (cleanest way)
	// Try without -i first, then with -i, then fallback to iw
	// We try to find the control socket path too
	ctrlPaths := []string{"/var/run/hostapd", "/run/hostapd", "/etc/hostapd"}
	var hostapdErr error
	var hostapdOutput []byte

	for _, path := range ctrlPaths {
		if _, err := os.Stat(path); err == nil {
			// Try with this path
			cmd := exec.Command("sudo", "hostapd_cli", "-p", path, "-i", iface, "disconnect", mac)
			hostapdOutput, hostapdErr = cmd.CombinedOutput()
			if hostapdErr == nil {
				json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Client kicked via hostapd"})
				return
			}
		}
	}

	// 2. Fallback to iw (works directly with the driver)
	iwCmd := exec.Command("sudo", "iw", "dev", iface, "station", "del", mac)
	iwOutput, iwErr := iwCmd.CombinedOutput()
	if iwErr == nil {
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "success",
			"message": "Client kicked via iw (hostapd disassociate failed)",
		})
		return
	}

	// If everything fails
	w.WriteHeader(http.StatusInternalServerError)
	json.NewEncoder(w).Encode(map[string]string{
		"error":          "Failed to kick client after multiple attempts",
		"hostapd_error":  fmt.Sprint(hostapdErr),
		"hostapd_output": string(hostapdOutput),
		"iw_error":       fmt.Sprint(iwErr),
		"iw_output":      string(iwOutput),
		"interface":      iface,
	})
}

// HandleWifiBlockClient permanently blocks a client by MAC address
func HandleWifiBlockClient(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	mac := r.URL.Query().Get("mac")
	if mac == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "MAC address is required"})
		return
	}

	if runtime.GOOS == "windows" {
		json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Mock: Client blocked and kicked"})
		return
	}

	iface := detectAPInterface()

	// 1. Add to hostapd.deny file to persist across reboots
	denyFile := "/etc/hostapd/hostapd.deny"
	// Ensure the file exists
	f, err := os.OpenFile(denyFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err == nil {
		content, _ := os.ReadFile(denyFile)
		if !strings.Contains(strings.ToLower(string(content)), strings.ToLower(mac)) {
			f.WriteString(mac + "\n")
		}
		f.Close()
	}

	// 2. Use hostapd_cli to deny_acl ADD <mac> to apply immediately
	ctrlPaths := []string{"/var/run/hostapd", "/run/hostapd", "/etc/hostapd"}
	for _, path := range ctrlPaths {
		if _, err := os.Stat(path); err == nil {
			exec.Command("sudo", "hostapd_cli", "-p", path, "-i", iface, "deny_acl", "ADD", mac).Run()
			exec.Command("sudo", "hostapd_cli", "-p", path, "-i", iface, "disconnect", mac).Run()
		}
	}

	// 3. Final kick via iw
	exec.Command("sudo", "iw", "dev", iface, "station", "del", mac).Run()

	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "Client blocked and kicked permanently",
	})
}

// detectAPInterface tries to find the interface used for AP
func detectAPInterface() string {
	// 1. Check /var/run/hostapd
	files, err := os.ReadDir("/var/run/hostapd")
	if err == nil && len(files) > 0 {
		for _, f := range files {
			if !f.IsDir() {
				return f.Name()
			}
		}
	}

	// 2. Check /run/hostapd
	files, err = os.ReadDir("/run/hostapd")
	if err == nil && len(files) > 0 {
		for _, f := range files {
			if !f.IsDir() {
				return f.Name()
			}
		}
	}

	// 3. Fallback to iw dev parsing
	cmd := exec.Command("iw", "dev")
	output, err := cmd.Output()
	if err == nil {
		lines := strings.Split(string(output), "\n")
		var lastIface string
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "Interface ") {
				lastIface = strings.TrimPrefix(line, "Interface ")
			}
			if line == "type AP" && lastIface != "" {
				return lastIface
			}
		}
	}

	return "wlan0_ap" // Default fallback
}

func getWifiStatus() WifiStatus {
	// Mock data for non-Linux environments (Windows/Dev)
	if runtime.GOOS == "windows" {
		return getMockWifiStatus()
	}

	// Real implementation for Linux (Raspberry Pi)
	iface := detectAPInterface()

	// 1. Get Hostapd Config (SSID, Password, Channel)
	// Try standard locations
	hostapdPaths := []string{"/etc/hostapd/hostapd.conf", "/etc/hostapd.conf"}
	var hostapdConfig map[string]string
	for _, path := range hostapdPaths {
		cmd := exec.Command("sudo", "cat", path)
		output, err := cmd.Output()
		if err == nil {
			hostapdConfig = parseHostapdConfig(string(output))
			break
		}
	}

	clients := []WifiClient{}

	// 2. Get Station Dump (MAC, Signal, Bitrates, Time)
	// sudo iw dev wlan0_ap station dump
	iwCmd := exec.Command("sudo", "iw", "dev", iface, "station", "dump")
	iwOutput, _ := iwCmd.Output()

	stationMap := parseIwStationDump(string(iwOutput))

	// 3. Get DHCP Leases (IP, Hostname)
	// sudo cat /var/lib/misc/dnsmasq.leases
	leasesCmd := exec.Command("sudo", "cat", "/var/lib/misc/dnsmasq.leases")
	leasesOutput, _ := leasesCmd.Output()
	leaseMap := parseDnsmasqLeases(string(leasesOutput))

	// Merge data
	for mac, stats := range stationMap {
		client := WifiClient{
			MAC:           mac,
			Signal:        stats.Signal,
			RxBitrate:     stats.RxBitrate,
			TxBitrate:     stats.TxBitrate,
			ConnectedTime: stats.ConnectedTime,
		}

		if lease, ok := leaseMap[mac]; ok {
			client.IP = lease.IP
			client.Hostname = lease.Hostname
		} else {
			client.IP = "Unknown"
			client.Hostname = "Unknown"
		}

		clients = append(clients, client)
	}

	// Determine Band/Protocol
	band := "2.4GHz"
	protocol := "802.11n"
	channel, _ := strconv.Atoi(hostapdConfig["channel"])

	if hostapdConfig["hw_mode"] == "a" {
		band = "5GHz"
		protocol = "802.11a/n"
	}
	if hostapdConfig["ieee80211ac"] == "1" {
		protocol = "802.11ac"
	}

	// 4. Get Client Link Status (optional, if wlan0 is used as client)
	linkStatus := getClientLinkStatus("wlan0")

	return WifiStatus{
		Interface:    iface,
		Band:         band,
		Protocol:     protocol,
		Channel:      channel,
		SSID:         hostapdConfig["ssid"],
		Password:     hostapdConfig["wpa_passphrase"],
		Clients:      clients,
		TotalClients: len(clients),
		LinkStatus:   linkStatus,
	}
}

func getClientLinkStatus(iface string) *WifiLinkStatus {
	// Try the provided interface first
	status := checkInterfaceLink(iface)
	if status.Connected {
		return status
	}

	// Fallback: Try common interface names if the primary one isn't connected
	commonIfaces := []string{"wlan0", "wlan1", "wlan2"}
	for _, name := range commonIfaces {
		if name == iface {
			continue // Already tried
		}
		status = checkInterfaceLink(name)
		if status.Connected {
			return status
		}
	}

	return status
}

func checkInterfaceLink(iface string) *WifiLinkStatus {
	cmd := exec.Command("sudo", "iw", "dev", iface, "link")
	output, err := cmd.Output()
	if err != nil {
		return &WifiLinkStatus{Connected: false}
	}

	content := string(output)
	if strings.Contains(content, "Not connected") || strings.TrimSpace(content) == "" {
		return &WifiLinkStatus{Connected: false}
	}

	status := &WifiLinkStatus{Connected: true}
	scanner := bufio.NewScanner(strings.NewReader(content))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		if strings.Contains(line, "Connected to") {
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				status.BSSID = parts[2]
			}
		} else if strings.HasPrefix(line, "SSID:") {
			status.SSID = strings.TrimSpace(strings.TrimPrefix(line, "SSID:"))
		} else if strings.HasPrefix(line, "signal:") {
			status.Signal = extractInt(line)
		} else if strings.HasPrefix(line, "freq:") {
			status.Freq = extractInt(line)
		} else if strings.HasPrefix(line, "tx bitrate:") {
			status.Bitrate = extractFloat(line)
		}
	}
	return status
}

func parseHostapdConfig(output string) map[string]string {
	config := make(map[string]string)
	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			config[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
		}
	}
	return config
}

type stationStats struct {
	Signal        int
	RxBitrate     float64
	TxBitrate     float64
	ConnectedTime int
}

func parseIwStationDump(output string) map[string]stationStats {
	result := make(map[string]stationStats)
	scanner := bufio.NewScanner(strings.NewReader(output))

	var currentMac string
	var currentStats stationStats

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		if strings.HasPrefix(line, "Station") {
			// Save previous if exists
			if currentMac != "" {
				result[currentMac] = currentStats
			}
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				currentMac = parts[1]
				currentStats = stationStats{}
			}
		} else if strings.HasPrefix(line, "signal:") {
			currentStats.Signal = extractInt(line)
		} else if strings.HasPrefix(line, "rx bitrate:") {
			currentStats.RxBitrate = extractFloat(line)
		} else if strings.HasPrefix(line, "tx bitrate:") {
			currentStats.TxBitrate = extractFloat(line)
		} else if strings.HasPrefix(line, "connected time:") {
			currentStats.ConnectedTime = extractInt(line)
		}
	}
	// Add last one
	if currentMac != "" {
		result[currentMac] = currentStats
	}

	return result
}

// extractInt extracts the first integer found in the string after a colon
func extractInt(line string) int {
	parts := strings.SplitN(line, ":", 2)
	if len(parts) < 2 {
		return 0
	}
	re := regexp.MustCompile(`-?\d+`)
	match := re.FindString(parts[1])
	if match != "" {
		val, _ := strconv.Atoi(match)
		return val
	}
	return 0
}

// extractFloat extracts the first float found in the string after a colon
func extractFloat(line string) float64 {
	parts := strings.SplitN(line, ":", 2)
	if len(parts) < 2 {
		return 0
	}
	re := regexp.MustCompile(`-?\d+(\.\d+)?`)
	match := re.FindString(parts[1])
	if match != "" {
		val, _ := strconv.ParseFloat(match, 64)
		return val
	}
	return 0
}

type leaseInfo struct {
	IP       string
	Hostname string
}

func parseDnsmasqLeases(output string) map[string]leaseInfo {
	result := make(map[string]leaseInfo)
	scanner := bufio.NewScanner(strings.NewReader(output))

	for scanner.Scan() {
		// Format: 1704768210 aa:bb:cc:dd:ee:ff 192.168.50.23 android-phone *
		fields := strings.Fields(scanner.Text())
		if len(fields) >= 4 {
			mac := fields[1]
			ip := fields[2]
			hostname := fields[3]
			if hostname == "*" {
				hostname = "Unknown"
			}
			result[mac] = leaseInfo{IP: ip, Hostname: hostname}
		}
	}
	return result
}

func getMockWifiStatus() WifiStatus {
	// Simulate some random movement for aesthetics
	return WifiStatus{
		Interface:    "wlan0_ap",
		Band:         "5GHz",
		Protocol:     "802.11ac",
		Channel:      36,
		SSID:         "SecureNet_AP",
		Password:     "P@ssw0rd123!",
		TotalClients: 3,
		TrafficRx:    1024500 + time.Now().Unix(),
		TrafficTx:    500200 + time.Now().Unix(),
		LinkStatus: &WifiLinkStatus{
			Connected: true,
			SSID:      "Upstream_Home_Wifi",
			BSSID:     "00:11:22:33:44:55",
			Signal:    -55,
			Freq:      5240,
			Bitrate:   300.0,
		},
		Clients: []WifiClient{
			{
				MAC:           "AA:BB:CC:11:22:33",
				IP:            "192.168.50.10",
				Hostname:      "Pixel-7-Pro",
				Signal:        -45,
				RxBitrate:     866.7,
				TxBitrate:     780.0,
				ConnectedTime: 450,
				Vendor:        "Google",
			},
			{
				MAC:           "DD:EE:FF:44:55:66",
				IP:            "192.168.50.11",
				Hostname:      "iPad-Air",
				Signal:        -62,
				RxBitrate:     400.0,
				TxBitrate:     350.0,
				ConnectedTime: 120,
				Vendor:        "Apple",
			},
			{
				MAC:           "11:22:33:77:88:99",
				IP:            "192.168.50.15",
				Hostname:      "ESP32-SmartLight",
				Signal:        -75,
				RxBitrate:     72.2,
				TxBitrate:     65.0,
				ConnectedTime: 3600,
				Vendor:        "Espressif",
			},
		},
	}
}
