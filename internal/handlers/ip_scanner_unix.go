//go:build !windows

package handlers

import (
	"fmt"
	"net"
)

// getInterfaceForTargetWindows is a stub for non-Windows systems
// On Linux/Unix, we use a different approach to find the interface
func getInterfaceForTargetWindows(target string) (*net.Interface, error) {
	// On Linux/Unix, we can use a simpler approach
	// Try to find an interface that can reach the target
	ip := net.ParseIP(target).To4()
	if ip == nil {
		return nil, fmt.Errorf("invalid IPv4")
	}

	// Get all interfaces
	interfaces, err := net.Interfaces()
	if err != nil {
		return nil, fmt.Errorf("failed to get interfaces: %v", err)
	}

	// Try to find an interface with an IP in the same subnet
	for _, iface := range interfaces {
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if !ok {
				continue
			}

			// Check if target is in the same network
			if ipNet.Contains(ip) {
				return &iface, nil
			}
		}
	}

	// Fallback: return first non-loopback interface
	for _, iface := range interfaces {
		if iface.Flags&net.FlagLoopback == 0 && iface.Flags&net.FlagUp != 0 {
			return &iface, nil
		}
	}

	return nil, fmt.Errorf("no suitable interface found")
}

