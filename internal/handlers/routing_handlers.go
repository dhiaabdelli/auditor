package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
)

// RouteEntry represents a single route in the routing table
type RouteEntry struct {
	Destination string `json:"destination"`
	Gateway     string `json:"gateway"`
	Interface   string `json:"interface"`
	Metric      int    `json:"metric"`
}

// GetRoutingTableHandler returns the current routing table
func GetRoutingTableHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if runtime.GOOS == "windows" {
		json.NewEncoder(w).Encode(map[string]interface{}{"routes": []RouteEntry{}})
		return
	}

	cmd := exec.Command("ip", "route")
	output, err := cmd.Output()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get routes: %v", err), http.StatusInternalServerError)
		return
	}

	routes := parseLinuxRoutes(string(output))
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"routes": routes})
}

func parseLinuxRoutes(output string) []RouteEntry {
	lines := strings.Split(output, "\n")
	var routes []RouteEntry
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) < 3 {
			continue
		}

		entry := RouteEntry{
			Destination: fields[0],
			Interface:   "unknown",
			Gateway:     "0.0.0.0",
		}

		for i, field := range fields {
			if field == "dev" && i+1 < len(fields) {
				entry.Interface = fields[i+1]
			}
			if field == "via" && i+1 < len(fields) {
				entry.Gateway = fields[i+1]
			}
			if field == "metric" && i+1 < len(fields) {
				m, _ := strconv.Atoi(fields[i+1])
				entry.Metric = m
			}
		}
		routes = append(routes, entry)
	}
	return routes
}

// SetDefaultRouteHandler updates the default route preference
func SetDefaultRouteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if runtime.GOOS == "windows" {
		http.Error(w, "Not supported on Windows", http.StatusNotImplemented)
		return
	}

	var req struct {
		Interface string `json:"interface"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	if req.Interface == "" {
		http.Error(w, "Interface required", http.StatusBadRequest)
		return
	}

	// Try getting current gateway first
	// We specifically look for the gateway associated with the 'default' route for this interface,
	// OR if not found, maybe just any gateway?
	// A robust way: `ip route show` might list "default via X dev Y".
	// We want to verify X.
	// Command: ip route show dev <iface> default
	cmd := exec.Command("sh", "-c", fmt.Sprintf("ip route show dev %s | grep default | awk '{print $3}'", req.Interface))
	gwOut, _ := cmd.Output()
	gateway := strings.TrimSpace(string(gwOut))

	if gateway == "" {
		// Try fallback: look for ANY route via this device that smells like a gateway?
		// Or just fail.
		http.Error(w, "Could not determine gateway for interface. Ensure it is connected and has a valid IP configuration.", http.StatusInternalServerError)
		return
	}

	// Set Metric 100 (High Priority)
	// Command: ip route replace default via <gateway> dev <iface> metric 100
	cmdReplace := exec.Command("ip", "route", "replace", "default", "via", gateway, "dev", req.Interface, "metric", "100")
	if out, err := cmdReplace.CombinedOutput(); err != nil {
		http.Error(w, fmt.Sprintf("Failed to set route: %s", string(out)), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "message": "Default route updated"})
}
