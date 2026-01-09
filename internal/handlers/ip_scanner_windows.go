//go:build windows

package handlers

import (
	"encoding/binary"
	"fmt"
	"net"
	"unsafe"

	"golang.org/x/sys/windows"
)

// getInterfaceForTargetWindows uses Windows routing table to find the correct interface
func getInterfaceForTargetWindows(target string) (*net.Interface, error) {
	ip := net.ParseIP(target).To4()
	if ip == nil {
		return nil, fmt.Errorf("invalid IPv4")
	}

	// Use iphlpapi.dll GetBestRoute2 function
	iphlpapi := windows.NewLazySystemDLL("iphlpapi.dll")
	getBestRoute2 := iphlpapi.NewProc("GetBestRoute2")

	// Create destination address structure
	ipBytes := ip.To4()
	destAddr := [4]byte{ipBytes[0], ipBytes[1], ipBytes[2], ipBytes[3]}

	// MIB_IPFORWARD_ROW2 structure (simplified)
	// We need to allocate enough space for the structure
	// Size is approximately 200+ bytes on 64-bit
	rowBuf := make([]byte, 256)

	// Call GetBestRoute2
	// Parameters: (PMIB_IPFORWARD_ROW2, PMIB_IPFORWARD_ROW2, SOCKADDR_INET, PMIB_IPFORWARD_ROW2, ULONG, PMIB_IPFORWARD_ROW2, ULONG)
	ret, _, _ := getBestRoute2.Call(
		0,                                     // InterfaceLuid (optional)
		0,                                     // InterfaceIndex (optional)
		uintptr(unsafe.Pointer(nil)),          // SourceAddress (optional)
		uintptr(unsafe.Pointer(&destAddr[0])), // DestinationAddress
		0,                                     // AddressSortOptions
		uintptr(unsafe.Pointer(&rowBuf[0])),   // BestRoute
		0,                                     // BestSourceAddress (optional)
	)

	if ret != 0 {
		return nil, fmt.Errorf("GetBestRoute2 failed: %d", ret)
	}

	// Extract InterfaceIndex from the structure (offset 8 for 64-bit, 4 for 32-bit)
	var interfaceIndex uint32
	if unsafe.Sizeof(uintptr(0)) == 8 {
		interfaceIndex = binary.LittleEndian.Uint32(rowBuf[8:12])
	} else {
		interfaceIndex = binary.LittleEndian.Uint32(rowBuf[4:8])
	}

	if interfaceIndex == 0 {
		return nil, fmt.Errorf("no route found")
	}

	return net.InterfaceByIndex(int(interfaceIndex))
}

