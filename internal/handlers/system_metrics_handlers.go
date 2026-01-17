package handlers

import (
	"encoding/json"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"golang.org/x/net/icmp"
	"golang.org/x/net/ipv4"
)

// Global metrics cache
var (
	cachedMetrics SystemMetrics
	metricsMutex  sync.RWMutex
	startTime     = time.Now()
)

var metricsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// HandleSystemMetricsWebSocket handles WebSocket connections for system metrics
func HandleSystemMetricsWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := metricsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Send immediate update
	metricsMutex.RLock()
	if err := conn.WriteJSON(cachedMetrics); err != nil {
		metricsMutex.RUnlock()
		return
	}
	metricsMutex.RUnlock()

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			metricsMutex.RLock()
			data := cachedMetrics
			metricsMutex.RUnlock()

			if err := conn.WriteJSON(data); err != nil {
				return
			}
		}
	}
}

// StartSystemMonitoring starts background monitoring routines
func StartSystemMonitoring() {
	// Initialize with some data
	updateSystemMetrics()
	// ...

	// Fast loop (Ping) - 5 seconds
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			updateNetworkMetrics()
		}
	}()

	// Fast loop (System Stats & Interfaces) - 1 second
	go func() {
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			updateSystemMetrics()
		}
	}()
	// Public IP loop - 15 minutes
	go func() {
		// Initial fetch
		updatePublicNetworkMetrics()

		ticker := time.NewTicker(15 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			updatePublicNetworkMetrics()
		}
	}()
}

func updateNetworkMetrics() {
	netMetrics := getNetworkMetrics()

	metricsMutex.Lock()
	defer metricsMutex.Unlock()

	cachedMetrics.Network = netMetrics
	cachedMetrics.Timestamp = time.Now()
}

func updatePublicNetworkMetrics() {
	info := getPublicNetworkInfo()

	metricsMutex.Lock()
	defer metricsMutex.Unlock()

	cachedMetrics.PublicIP = info
}

func updateSystemMetrics() {
	var metrics SystemMetrics
	if runtime.GOOS == "windows" {
		metrics = getWindowsSystemMetrics()
	} else {
		metrics = getLinuxSystemMetrics()
	}

	// Preserve latest network metrics if they exist (since they run faster)
	metricsMutex.RLock()
	lastNet := cachedMetrics.Network
	lastPublic := cachedMetrics.PublicIP
	metricsMutex.RUnlock()

	metrics.Network = lastNet
	metrics.PublicIP = lastPublic
	metrics.Uptime = int64(time.Since(startTime).Seconds())
	if metrics.Network.Latency == nil {
		metrics.Network = getNetworkMetrics() // First run fallback
	}

	// Add network interfaces
	if ifaces, err := getNetworkInterfaces(); err == nil {
		metrics.Interfaces = ifaces
	}

	// Add wifi status
	if wifi := getWifiStatus(); wifi.SSID != "" {
		metrics.WiFi = &wifi
	}

	metricsMutex.Lock()
	cachedMetrics = metrics
	metricsMutex.Unlock()
}

// SystemMetrics represents comprehensive system metrics
type SystemMetrics struct {
	CPU         CPUMetrics         `json:"cpu"`
	Memory      MemoryMetrics      `json:"memory"`
	Disk        []DiskMetrics      `json:"disk"`
	Temperature TemperatureMetrics `json:"temperature"`
	Network     NetworkMetrics     `json:"network"`
	Interfaces  []NetworkInterface `json:"interfaces"`
	WiFi        *WifiStatus        `json:"wifi"`
	Services    []ServiceStatus    `json:"services"`
	Uptime      int64              `json:"uptime"`
	PublicIP    PublicIPInfo       `json:"publicIp"`
	Timestamp   time.Time          `json:"timestamp"`
}

// PublicIPInfo represents public network information
type PublicIPInfo struct {
	IP      string `json:"ip"`
	ISP     string `json:"isp"`
	Country string `json:"country"`
	City    string `json:"city"`
}

// getPublicNetworkInfo fetches public IP and ISP from external APIs
func getPublicNetworkInfo() PublicIPInfo {
	info := PublicIPInfo{}

	// Try ip-api.com first (provides ISP info)
	client := http.Client{Timeout: 5 * time.Second}

	resp, err := client.Get("http://ip-api.com/json/")
	if err == nil {
		defer resp.Body.Close()
		var result map[string]interface{}
		if json.NewDecoder(resp.Body).Decode(&result) == nil {
			if status, ok := result["status"].(string); ok && status == "success" {
				if ip, ok := result["query"].(string); ok {
					info.IP = ip
				}
				if isp, ok := result["isp"].(string); ok {
					info.ISP = isp
				}
				if country, ok := result["country"].(string); ok {
					info.Country = country
				}
				if city, ok := result["city"].(string); ok {
					info.City = city
				}
				return info
			}
		}
	}

	// Fallback to ipify if ip-api fails (IP only)
	resp, err = client.Get("https://api.ipify.org?format=json")
	if err == nil {
		defer resp.Body.Close()
		var result map[string]interface{}
		if json.NewDecoder(resp.Body).Decode(&result) == nil {
			if ip, ok := result["ip"].(string); ok {
				info.IP = ip
				info.ISP = "Unknown Provider"
			}
		}
	}

	return info
}

// CPUMetrics represents CPU usage information
type CPUMetrics struct {
	Usage       float64 `json:"usage"`     // percentage
	LoadAvg1    float64 `json:"loadAvg1"`  // 1 minute load average
	LoadAvg5    float64 `json:"loadAvg5"`  // 5 minute load average
	LoadAvg15   float64 `json:"loadAvg15"` // 15 minute load average
	Cores       int     `json:"cores"`
	Temperature float64 `json:"temperature"` // degrees Celsius
}

// MemoryMetrics represents memory usage information
type MemoryMetrics struct {
	Total       uint64  `json:"total"`       // bytes
	Used        uint64  `json:"used"`        // bytes
	Free        uint64  `json:"free"`        // bytes
	UsedPercent float64 `json:"usedPercent"` // percentage
	SwapTotal   uint64  `json:"swapTotal"`   // bytes
	SwapUsed    uint64  `json:"swapUsed"`    // bytes
	SwapFree    uint64  `json:"swapFree"`    // bytes
}

// DiskMetrics represents disk usage information
type DiskMetrics struct {
	Device      string  `json:"device"`
	MountPoint  string  `json:"mountPoint"`
	Total       uint64  `json:"total"`       // bytes
	Used        uint64  `json:"used"`        // bytes
	Free        uint64  `json:"free"`        // bytes
	UsedPercent float64 `json:"usedPercent"` // percentage
}

// TemperatureMetrics represents temperature sensor information
type TemperatureMetrics struct {
	CPU     float64            `json:"cpu"`     // degrees Celsius
	Sensors map[string]float64 `json:"sensors"` // additional sensors
}

// NetworkMetrics represents network metrics
type NetworkMetrics struct {
	Latency map[string]int64 `json:"latency"` // ping latency in ms
	RXBytes uint64           `json:"rxBytes"` // total received bytes
	TXBytes uint64           `json:"txBytes"` // total transmitted bytes
}

// ServiceStatus represents a system service status
type ServiceStatus struct {
	Name    string `json:"name"`
	Status  string `json:"status"` // "running", "stopped", "not-found"
	PID     string `json:"pid"`
	Uptime  string `json:"uptime"`
	Enabled bool   `json:"enabled"` // auto-start enabled
}

// HandleGetSystemMetrics returns comprehensive system metrics
func HandleGetSystemMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	metricsMutex.RLock()
	metrics := cachedMetrics
	metricsMutex.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

// getLinuxSystemMetrics collects system metrics on Linux (optimized with goroutines)
func getLinuxSystemMetrics() SystemMetrics {
	metrics := SystemMetrics{
		Timestamp: time.Now(),
	}

	// Use channels to collect metrics in parallel
	cpuChan := make(chan CPUMetrics, 1)
	memChan := make(chan MemoryMetrics, 1)
	diskChan := make(chan []DiskMetrics, 1)
	tempChan := make(chan TemperatureMetrics, 1)
	netChan := make(chan NetworkMetrics, 1)
	svcChan := make(chan []ServiceStatus, 1)

	// Collect metrics in parallel
	go func() { cpuChan <- getLinuxCPUMetrics() }()
	go func() { memChan <- getLinuxMemoryMetrics() }()
	go func() { diskChan <- getLinuxDiskMetrics() }()
	go func() { tempChan <- getLinuxTemperatureMetrics() }()
	go func() { netChan <- getNetworkMetrics() }()
	go func() { svcChan <- getLinuxServiceStatus() }()

	// Wait for all metrics with timeout
	timeout := time.After(3 * time.Second)

	// Collect results
	metricsCollected := 0
	for metricsCollected < 6 {
		select {
		case metrics.CPU = <-cpuChan:
			metricsCollected++
		case metrics.Memory = <-memChan:
			metricsCollected++
		case metrics.Disk = <-diskChan:
			metricsCollected++
		case metrics.Temperature = <-tempChan:
			metricsCollected++
		case metrics.Network = <-netChan:
			metricsCollected++
		case metrics.Services = <-svcChan:
			metricsCollected++
		case <-timeout:
			// Timeout reached, return what we have
			return metrics
		}
	}

	return metrics
}

// getWindowsSystemMetrics collects system metrics on Windows (optimized with goroutines)
func getWindowsSystemMetrics() SystemMetrics {
	metrics := SystemMetrics{
		Timestamp: time.Now(),
	}

	// Use channels to collect metrics in parallel
	cpuChan := make(chan CPUMetrics, 1)
	memChan := make(chan MemoryMetrics, 1)
	diskChan := make(chan []DiskMetrics, 1)
	netChan := make(chan NetworkMetrics, 1)
	svcChan := make(chan []ServiceStatus, 1)

	// Collect metrics in parallel
	go func() { cpuChan <- getWindowsCPUMetrics() }()
	go func() { memChan <- getWindowsMemoryMetrics() }()
	go func() { diskChan <- getWindowsDiskMetrics() }()
	go func() { netChan <- getNetworkMetrics() }()
	go func() { svcChan <- getWindowsServiceStatus() }()

	// Temperature Metrics (limited on Windows)
	metrics.Temperature = TemperatureMetrics{
		Sensors: make(map[string]float64),
	}

	// Wait for all metrics with timeout
	timeout := time.After(3 * time.Second)

	// Collect results
	metricsCollected := 0
	for metricsCollected < 5 {
		select {
		case metrics.CPU = <-cpuChan:
			metricsCollected++
		case metrics.Memory = <-memChan:
			metricsCollected++
		case metrics.Disk = <-diskChan:
			metricsCollected++
		case metrics.Network = <-netChan:
			metricsCollected++
		case metrics.Services = <-svcChan:
			metricsCollected++
		case <-timeout:
			// Timeout reached, return what we have
			return metrics
		}
	}

	return metrics
}

// getLinuxCPUMetrics reads CPU metrics from /proc/stat and /proc/loadavg
func getLinuxCPUMetrics() CPUMetrics {
	cpu := CPUMetrics{
		Cores: runtime.NumCPU(),
	}

	// Read load average
	data, err := os.ReadFile("/proc/loadavg")
	if err == nil {
		fields := strings.Fields(string(data))
		if len(fields) >= 3 {
			cpu.LoadAvg1, _ = strconv.ParseFloat(fields[0], 64)
			cpu.LoadAvg5, _ = strconv.ParseFloat(fields[1], 64)
			cpu.LoadAvg15, _ = strconv.ParseFloat(fields[2], 64)
		}
	}

	// Calculate CPU usage
	cpu.Usage = calculateCPUUsage()

	// Get CPU temperature
	cpu.Temperature = getCPUTemperature()

	return cpu
}

// calculateCPUUsage calculates current CPU usage percentage
func calculateCPUUsage() float64 {
	data, err := os.ReadFile("/proc/stat")
	if err != nil {
		return 0
	}

	lines := strings.Split(string(data), "\n")
	if len(lines) == 0 {
		return 0
	}

	// Parse first line (cpu overall)
	fields := strings.Fields(lines[0])
	if len(fields) < 5 || fields[0] != "cpu" {
		return 0
	}

	// user + nice + system + idle + iowait + irq + softirq
	var total, idle uint64
	for i := 1; i < len(fields) && i < 8; i++ {
		val, _ := strconv.ParseUint(fields[i], 10, 64)
		total += val
		if i == 4 { // idle is 4th field
			idle = val
		}
	}

	// Calculate percentage
	used := total - idle
	if total == 0 {
		return 0
	}
	return float64(used) / float64(total) * 100
}

// getCPUTemperature reads CPU temperature from thermal zones
func getCPUTemperature() float64 {
	// Try to read from thermal_zone0
	data, err := os.ReadFile("/sys/class/thermal/thermal_zone0/temp")
	if err != nil {
		return 0
	}

	temp, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64)
	if err != nil {
		return 0
	}

	// Convert from millidegrees to degrees
	return temp / 1000.0
}

// getLinuxMemoryMetrics reads memory metrics from /proc/meminfo
func getLinuxMemoryMetrics() MemoryMetrics {
	mem := MemoryMetrics{}

	data, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return mem
	}

	lines := strings.Split(string(data), "\n")
	values := make(map[string]uint64)

	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		key := strings.TrimSuffix(fields[0], ":")
		val, _ := strconv.ParseUint(fields[1], 10, 64)
		values[key] = val * 1024 // Convert kB to bytes
	}

	mem.Total = values["MemTotal"]
	mem.Free = values["MemFree"] + values["Buffers"] + values["Cached"]
	mem.Used = mem.Total - mem.Free
	if mem.Total > 0 {
		mem.UsedPercent = float64(mem.Used) / float64(mem.Total) * 100
	}
	mem.SwapTotal = values["SwapTotal"]
	mem.SwapFree = values["SwapFree"]
	mem.SwapUsed = mem.SwapTotal - mem.SwapFree

	return mem
}

// getLinuxDiskMetrics reads disk usage using df command
func getLinuxDiskMetrics() []DiskMetrics {
	disks := []DiskMetrics{}

	cmd := exec.Command("df", "-B1", "--output=source,target,size,used,avail,pcent")
	output, err := cmd.Output()
	if err != nil {
		return disks
	}

	lines := strings.Split(string(output), "\n")
	for i, line := range lines {
		if i == 0 || line == "" {
			continue // Skip header
		}

		fields := strings.Fields(line)
		if len(fields) < 6 {
			continue
		}

		// Skip non-physical devices
		if !strings.HasPrefix(fields[0], "/dev/") {
			continue
		}

		total, _ := strconv.ParseUint(fields[2], 10, 64)
		used, _ := strconv.ParseUint(fields[3], 10, 64)
		free, _ := strconv.ParseUint(fields[4], 10, 64)
		percentStr := strings.TrimSuffix(fields[5], "%")
		percent, _ := strconv.ParseFloat(percentStr, 64)

		disks = append(disks, DiskMetrics{
			Device:      fields[0],
			MountPoint:  fields[1],
			Total:       total,
			Used:        used,
			Free:        free,
			UsedPercent: percent,
		})
	}

	return disks
}

// getLinuxTemperatureMetrics reads temperature from various sensors (with timeout)
func getLinuxTemperatureMetrics() TemperatureMetrics {
	temp := TemperatureMetrics{
		Sensors: make(map[string]float64),
	}

	// Read CPU temperature (fast, from /sys)
	temp.CPU = getCPUTemperature()

	// Try sensors command if available (with timeout to avoid blocking)
	cmd := exec.Command("sensors", "-u")
	done := make(chan []byte, 1)

	go func() {
		output, err := cmd.Output()
		if err == nil {
			done <- output
		} else {
			done <- nil
		}
	}()

	select {
	case output := <-done:
		if output != nil {
			parseSensorsOutput(string(output), &temp)
		}
	case <-time.After(200 * time.Millisecond):
		// Timeout - skip sensors command
		if cmd.Process != nil {
			cmd.Process.Kill()
		}
	}

	return temp
}

// parseSensorsOutput parses lm-sensors output
func parseSensorsOutput(output string, temp *TemperatureMetrics) {
	lines := strings.Split(output, "\n")
	currentChip := ""

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		if !strings.Contains(line, ":") {
			currentChip = line
			continue
		}

		if strings.Contains(line, "_input:") {
			parts := strings.Split(line, ":")
			if len(parts) == 2 {
				value, err := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
				if err == nil {
					key := currentChip + "_" + strings.TrimSpace(parts[0])
					temp.Sensors[key] = value
				}
			}
		}
	}
}

// getNetworkMetrics measures network latency (optimized with parallel pings)
func getNetworkMetrics() NetworkMetrics {
	metrics := NetworkMetrics{
		Latency: make(map[string]int64),
	}

	// Ping common endpoints in parallel with timeout
	// Microsoft (Bing - 204.79.197.200), Google (8.8.8.8), Cloudflare (1.1.1.1)
	endpoints := []string{"204.79.197.200", "8.8.8.8", "1.1.1.1"}

	type latencyResult struct {
		host    string
		latency int64
	}

	resultChan := make(chan latencyResult, len(endpoints))

	for _, endpoint := range endpoints {
		go func(host string) {
			latency := measureLatency(host)
			resultChan <- latencyResult{host: host, latency: latency}
		}(endpoint)
	}

	// Collect results with timeout
	timeout := time.After(2500 * time.Millisecond)
	collected := 0
	for collected < len(endpoints) {
		select {
		case result := <-resultChan:
			metrics.Latency[result.host] = result.latency
			collected++
		case <-timeout:
			// Skip remaining if timeout
			collected = len(endpoints)
		}
	}

	// Get total network traffic from /proc/net/dev (Linux only)
	if runtime.GOOS == "linux" {
		data, err := os.ReadFile("/proc/net/dev")
		if err == nil {
			lines := strings.Split(string(data), "\n")
			for _, line := range lines {
				if !strings.Contains(line, ":") {
					continue
				}
				fields := strings.Fields(line)
				if len(fields) >= 10 {
					rxBytes, _ := strconv.ParseUint(fields[1], 10, 64)
					txBytes, _ := strconv.ParseUint(fields[9], 10, 64)
					metrics.RXBytes += rxBytes
					metrics.TXBytes += txBytes
				}
			}
		}
	}

	return metrics
}

// measureLatency measures network latency using ICMP raw sockets (like IP Scanner)
func measureLatency(host string) int64 {
	// Fallback to command if privileged access fails
	latency, success := pingHostICMP(host)
	if !success {
		return -1
	}
	return int64(latency)
}

// pingHostICMP pings a host using raw ICMP sockets
func pingHostICMP(host string) (int, bool) {
	// Resolve IP
	dstIP := net.ParseIP(host)
	if dstIP == nil {
		ips, err := net.LookupIP(host)
		if err != nil || len(ips) == 0 {
			return -1, false
		}
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

	if dstIP == nil {
		return -1, false
	}

	// Create persistent connection
	conn, err := icmp.ListenPacket("ip4:icmp", "0.0.0.0")
	if err != nil {
		// Fallback to system ping if permission denied
		return pingHostFallbackMetrics(host)
	}
	defer conn.Close()

	// Unique ID (pid + random)
	icmpID := os.Getpid() & 0xffff

	// Create message
	msg := icmp.Message{
		Type: ipv4.ICMPTypeEcho,
		Code: 0,
		Body: &icmp.Echo{
			ID:   icmpID,
			Seq:  1,
			Data: []byte("PING"),
		},
	}

	msgBytes, err := msg.Marshal(nil)
	if err != nil {
		return -1, false
	}

	start := time.Now()
	_, err = conn.WriteTo(msgBytes, &net.IPAddr{IP: dstIP})
	if err != nil {
		return -1, false
	}

	// Set deadline
	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	reply := make([]byte, 1500)

	for {
		n, peer, err := conn.ReadFrom(reply)
		if err != nil {
			return -1, false
		}

		if !peer.(*net.IPAddr).IP.Equal(dstIP) {
			continue
		}

		replyMsg, err := icmp.ParseMessage(1, reply[:n])
		if err != nil {
			continue
		}

		if replyMsg.Type == ipv4.ICMPTypeEchoReply {
			if echo, ok := replyMsg.Body.(*icmp.Echo); ok {
				if echo.ID == icmpID {
					return int(time.Since(start).Milliseconds()), true
				}
			}
		}
	}
}

// pingHostFallbackMetrics uses system ping command
func pingHostFallbackMetrics(host string) (int, bool) {
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("ping", "-n", "1", "-w", "2000", host)
	} else {
		cmd = exec.Command("ping", "-c", "1", "-W", "2", host)
	}

	start := time.Now()
	err := cmd.Run()
	if err != nil {
		return -1, false
	}
	return int(time.Since(start).Milliseconds()), true
}

// getLinuxServiceStatus checks status of common services (parallel with timeout)
func getLinuxServiceStatus() []ServiceStatus {
	serviceNames := []string{"hostapd", "dnsmasq", "ssh", "sshd", "NetworkManager"}

	resultChan := make(chan ServiceStatus, len(serviceNames))

	// Check services in parallel
	for _, name := range serviceNames {
		go func(svcName string) {
			status := checkLinuxService(svcName)
			resultChan <- status
		}(name)
	}

	// Collect results with timeout
	services := []ServiceStatus{}
	timeout := time.After(500 * time.Millisecond)
	collected := 0

	for collected < len(serviceNames) {
		select {
		case status := <-resultChan:
			if status.Status != "not-found" {
				services = append(services, status)
			}
			collected++
		case <-timeout:
			// Timeout reached, return what we have
			return services
		}
	}

	return services
}

// checkLinuxService checks a specific service status
func checkLinuxService(name string) ServiceStatus {
	status := ServiceStatus{
		Name:   name,
		Status: "not-found",
	}

	// Try systemctl first
	cmd := exec.Command("systemctl", "is-active", name)
	output, _ := cmd.Output()
	activeStatus := strings.TrimSpace(string(output))

	if activeStatus == "active" {
		status.Status = "running"

		// Get PID
		cmd = exec.Command("systemctl", "show", "-p", "MainPID", name)
		output, _ = cmd.Output()
		if strings.Contains(string(output), "MainPID=") {
			status.PID = strings.TrimPrefix(strings.TrimSpace(string(output)), "MainPID=")
		}

		// Check if enabled
		cmd = exec.Command("systemctl", "is-enabled", name)
		output, _ = cmd.Output()
		status.Enabled = strings.TrimSpace(string(output)) == "enabled"

	} else if activeStatus == "inactive" || activeStatus == "failed" {
		status.Status = "stopped"
	}

	return status
}

// getWindowsCPUMetrics gets CPU metrics on Windows
func getWindowsCPUMetrics() CPUMetrics {
	cpu := CPUMetrics{
		Cores: runtime.NumCPU(),
	}

	// Use wmic to get CPU usage
	cmd := exec.Command("wmic", "cpu", "get", "loadpercentage")
	output, err := cmd.Output()
	if err == nil {
		lines := strings.Split(string(output), "\n")
		if len(lines) > 1 {
			usage, _ := strconv.ParseFloat(strings.TrimSpace(lines[1]), 64)
			cpu.Usage = usage
		}
	}

	return cpu
}

// getWindowsMemoryMetrics gets memory metrics on Windows
func getWindowsMemoryMetrics() MemoryMetrics {
	mem := MemoryMetrics{}

	cmd := exec.Command("wmic", "OS", "get", "FreePhysicalMemory,TotalVisibleMemorySize")
	output, err := cmd.Output()
	if err == nil {
		lines := strings.Split(string(output), "\n")
		if len(lines) > 1 {
			fields := strings.Fields(lines[1])
			if len(fields) >= 2 {
				free, _ := strconv.ParseUint(fields[0], 10, 64)
				total, _ := strconv.ParseUint(fields[1], 10, 64)
				mem.Total = total * 1024
				mem.Free = free * 1024
				mem.Used = mem.Total - mem.Free
				if mem.Total > 0 {
					mem.UsedPercent = float64(mem.Used) / float64(mem.Total) * 100
				}
			}
		}
	}

	return mem
}

// getWindowsDiskMetrics gets disk metrics on Windows
func getWindowsDiskMetrics() []DiskMetrics {
	disks := []DiskMetrics{}

	cmd := exec.Command("wmic", "logicaldisk", "get", "DeviceID,Size,FreeSpace")
	output, err := cmd.Output()
	if err != nil {
		return disks
	}

	lines := strings.Split(string(output), "\n")
	for i, line := range lines {
		if i == 0 || line == "" {
			continue
		}

		fields := strings.Fields(line)
		if len(fields) < 3 {
			continue
		}

		free, _ := strconv.ParseUint(fields[1], 10, 64)
		total, _ := strconv.ParseUint(fields[2], 10, 64)
		used := total - free
		var percent float64
		if total > 0 {
			percent = float64(used) / float64(total) * 100
		}

		disks = append(disks, DiskMetrics{
			Device:      fields[0],
			MountPoint:  fields[0],
			Total:       total,
			Used:        used,
			Free:        free,
			UsedPercent: percent,
		})
	}

	return disks
}

// getWindowsServiceStatus checks Windows services (parallel with timeout)
func getWindowsServiceStatus() []ServiceStatus {
	serviceNames := []string{"sshd", "WinRM", "DHCP", "DNS"}

	resultChan := make(chan ServiceStatus, len(serviceNames))

	// Check services in parallel
	for _, name := range serviceNames {
		go func(svcName string) {
			status := checkWindowsService(svcName)
			resultChan <- status
		}(name)
	}

	// Collect results with timeout
	services := []ServiceStatus{}
	timeout := time.After(500 * time.Millisecond)
	collected := 0

	for collected < len(serviceNames) {
		select {
		case status := <-resultChan:
			if status.Status != "not-found" {
				services = append(services, status)
			}
			collected++
		case <-timeout:
			// Timeout reached, return what we have
			return services
		}
	}

	return services
}

// checkWindowsService checks a Windows service status
func checkWindowsService(name string) ServiceStatus {
	status := ServiceStatus{
		Name:   name,
		Status: "not-found",
	}

	cmd := exec.Command("sc", "query", name)
	output, err := cmd.Output()
	if err != nil {
		return status
	}

	outputStr := string(output)
	if strings.Contains(outputStr, "RUNNING") {
		status.Status = "running"
	} else if strings.Contains(outputStr, "STOPPED") {
		status.Status = "stopped"
	}

	// Parse PID if running
	if status.Status == "running" {
		lines := strings.Split(outputStr, "\n")
		for _, line := range lines {
			if strings.Contains(line, "PID") {
				fields := strings.Fields(line)
				if len(fields) >= 3 {
					status.PID = fields[2]
				}
			}
		}
	}

	return status
}
