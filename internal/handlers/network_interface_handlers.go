package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
)

// NetworkInterface represents a network interface with its properties
type NetworkInterface struct {
	Name      string `json:"name"`
	Status    string `json:"status"`
	IP        string `json:"ip"`
	MAC       string `json:"mac"`
	RXBytes   int64  `json:"rxBytes"`
	TXBytes   int64  `json:"txBytes"`
	RXPackets int64  `json:"rxPackets"`
	TXPackets int64  `json:"txPackets"`
	MTU       int    `json:"mtu"`
	Type      string `json:"type"` // ethernet, wireless, usb, loopback, etc.
}

// NetworkInterfacesResponse represents the response structure
type NetworkInterfacesResponse struct {
	Interfaces []NetworkInterface `json:"interfaces"`
	Error      string             `json:"error,omitempty"`
}

// GetNetworkInterfacesHandler returns information about all network interfaces
func GetNetworkInterfacesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	interfaces, err := getNetworkInterfaces()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(NetworkInterfacesResponse{
			Error: err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(NetworkInterfacesResponse{
		Interfaces: interfaces,
	})
}

// getNetworkInterfaces retrieves network interface information
func getNetworkInterfaces() ([]NetworkInterface, error) {
	if runtime.GOOS == "windows" {
		return getWindowsNetworkInterfaces()
	}
	return getLinuxNetworkInterfaces()
}

// getLinuxNetworkInterfaces retrieves network interfaces on Linux
func getLinuxNetworkInterfaces() ([]NetworkInterface, error) {
	interfaces := []NetworkInterface{}

	// Get interface list with ip link
	cmd := exec.Command("ip", "link", "show")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to execute ip link: %v", err)
	}

	// Parse ip link output
	lines := strings.Split(string(output), "\n")
	var currentInterface *NetworkInterface

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// New interface line (starts with number)
		if matched, _ := regexp.MatchString(`^\d+:`, line); matched {
			// Save previous interface
			if currentInterface != nil {
				interfaces = append(interfaces, *currentInterface)
			}

			// Parse interface name and status
			parts := strings.Fields(line)
			if len(parts) < 2 {
				continue
			}

			name := strings.TrimSuffix(parts[1], ":")
			currentInterface = &NetworkInterface{
				Name:   name,
				Status: "DOWN",
				Type:   detectInterfaceType(name),
			}

			// Check if UP (Physical Link/Carrier)
			// strictly check for LOWER_UP to determine if connected
			if strings.Contains(line, "LOWER_UP") {
				currentInterface.Status = "UP"
			} else {
				currentInterface.Status = "DOWN"
			}

			// Parse MTU
			mtuRegex := regexp.MustCompile(`mtu (\d+)`)
			if match := mtuRegex.FindStringSubmatch(line); len(match) > 1 {
				mtu, _ := strconv.Atoi(match[1])
				currentInterface.MTU = mtu
			}
		} else if currentInterface != nil {
			// Parse MAC address
			if strings.Contains(line, "link/ether") || strings.Contains(line, "link/loopback") {
				parts := strings.Fields(line)
				if len(parts) >= 2 {
					currentInterface.MAC = parts[1]
				}
			}
		}
	}

	// Save last interface
	if currentInterface != nil {
		interfaces = append(interfaces, *currentInterface)
	}

	// Get IP addresses with ip addr
	cmd = exec.Command("ip", "addr", "show")
	output, err = cmd.Output()
	if err == nil {
		parseIPAddresses(string(output), interfaces)
	}

	// Get traffic statistics from /proc/net/dev
	getTrafficStats(interfaces)

	return interfaces, nil
}

// getWindowsNetworkInterfaces retrieves network interfaces on Windows
func getWindowsNetworkInterfaces() ([]NetworkInterface, error) {
	interfaces := []NetworkInterface{}

	// Use ipconfig for Windows
	cmd := exec.Command("ipconfig", "/all")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to execute ipconfig: %v", err)
	}

	lines := strings.Split(string(output), "\n")
	var currentInterface *NetworkInterface

	for _, line := range lines {
		line = strings.TrimSpace(line)

		// New adapter
		if strings.Contains(line, "adapter") && strings.HasSuffix(line, ":") {
			if currentInterface != nil {
				interfaces = append(interfaces, *currentInterface)
			}
			name := strings.TrimSuffix(line, ":")
			name = strings.Replace(name, "adapter ", "", 1)

			ifaceType := "ethernet"
			lowerName := strings.ToLower(name)
			if strings.Contains(lowerName, "wi-fi") || strings.Contains(lowerName, "wireless") || strings.Contains(lowerName, "wlan") {
				ifaceType = "wireless"
			}
			// Mark virtual/hyper-v adapters as 'virtual' so they don't count as physical ethernet
			if strings.Contains(lowerName, "vethernet") || strings.Contains(lowerName, "virtual") || strings.Contains(lowerName, "loopback") || strings.Contains(lowerName, "pseudo") || strings.Contains(lowerName, "vmware") {
				ifaceType = "virtual"
			}

			currentInterface = &NetworkInterface{
				Name:   name,
				Status: "UP",
				Type:   ifaceType,
			}
		} else if currentInterface != nil {
			// Parse properties
			if strings.Contains(line, "Physical Address") {
				parts := strings.Split(line, ":")
				if len(parts) > 1 {
					currentInterface.MAC = strings.TrimSpace(strings.Join(parts[1:], ":"))
				}
			} else if strings.Contains(line, "IPv4 Address") {
				parts := strings.Split(line, ":")
				if len(parts) > 1 {
					ip := strings.TrimSpace(parts[1])
					ip = strings.TrimSuffix(ip, "(Preferred)")
					currentInterface.IP = strings.TrimSpace(ip)
				}
			} else if strings.Contains(line, "Media State") {
				if strings.Contains(line, "disconnected") {
					currentInterface.Status = "DOWN"
				}
			}
		}
	}

	if currentInterface != nil {
		interfaces = append(interfaces, *currentInterface)
	}

	return interfaces, nil
}

// parseIPAddresses parses IP addresses from ip addr output
func parseIPAddresses(output string, interfaces []NetworkInterface) {
	lines := strings.Split(output, "\n")
	currentIndex := -1

	for _, line := range lines {
		line = strings.TrimSpace(line)

		// Find interface
		if matched, _ := regexp.MatchString(`^\d+:`, line); matched {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				name := strings.TrimSuffix(parts[1], ":")
				for i, iface := range interfaces {
					if iface.Name == name {
						currentIndex = i
						break
					}
				}
			}
		} else if currentIndex >= 0 && strings.HasPrefix(line, "inet ") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				ip := strings.Split(parts[1], "/")[0]
				interfaces[currentIndex].IP = ip
			}
		}
	}
}

// getTrafficStats reads traffic statistics from /proc/net/dev
func getTrafficStats(interfaces []NetworkInterface) {
	cmd := exec.Command("cat", "/proc/net/dev")
	output, err := cmd.Output()
	if err != nil {
		return
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if !strings.Contains(line, ":") {
			continue
		}

		parts := strings.Split(line, ":")
		if len(parts) != 2 {
			continue
		}

		ifaceName := strings.TrimSpace(parts[0])
		stats := strings.Fields(strings.TrimSpace(parts[1]))

		if len(stats) < 10 {
			continue
		}

		for i := range interfaces {
			if interfaces[i].Name == ifaceName {
				interfaces[i].RXBytes, _ = strconv.ParseInt(stats[0], 10, 64)
				interfaces[i].RXPackets, _ = strconv.ParseInt(stats[1], 10, 64)
				interfaces[i].TXBytes, _ = strconv.ParseInt(stats[8], 10, 64)
				interfaces[i].TXPackets, _ = strconv.ParseInt(stats[9], 10, 64)
				break
			}
		}
	}
}

// detectInterfaceType detects the type of network interface based on its name
func detectInterfaceType(name string) string {
	switch {
	case strings.HasPrefix(name, "lo"):
		return "loopback"
	case strings.HasPrefix(name, "wlan") || strings.HasPrefix(name, "wlp"):
		return "wireless"
	case strings.HasPrefix(name, "eth") || strings.HasPrefix(name, "enp") || strings.HasPrefix(name, "eno"):
		return "ethernet"
	case strings.HasPrefix(name, "usb"):
		return "usb"
	case strings.HasPrefix(name, "docker") || strings.HasPrefix(name, "br-"):
		return "bridge"
	case strings.HasPrefix(name, "veth"):
		return "virtual"
	default:
		return "unknown"
	}
}

// SetInterfaceStateHandler enables or disables a network interface
func SetInterfaceStateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Interface string `json:"interface"`
		State     string `json:"state"` // "up" or "down"
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Interface == "" || (req.State != "up" && req.State != "down") {
		http.Error(w, "Invalid parameters", http.StatusBadRequest)
		return
	}

	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Network control features are only available on Linux",
		})
		return
	} else {
		// Linux: ip link set dev interface up/down
		cmd = exec.Command("ip", "link", "set", "dev", req.Interface, req.State)
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("%v: %s", err, string(output)),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Interface %s set to %s", req.Interface, req.State),
	})
}

// RestartNetworkStackHandler restarts the network stack
func RestartNetworkStackHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		// Windows: restart network adapters
		cmd = exec.Command("powershell", "-Command", "Restart-NetAdapter -Name '*'")
	} else {
		// Linux: restart NetworkManager
		cmd = exec.Command("systemctl", "restart", "NetworkManager")
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		// Try alternative method for Linux
		if runtime.GOOS != "windows" {
			cmd = exec.Command("service", "network-manager", "restart")
			output, err = cmd.CombinedOutput()
		}
	}

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("%v: %s", err, string(output)),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Network stack restarted successfully",
	})
}
