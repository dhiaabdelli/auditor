package handlers

import (
	"encoding/json"
	"net/http"
	"runtime"
	"time"

	"network-script-generator/internal/database"
)

// ServiceHealth represents the health status of a service
type ServiceHealth struct {
	Name        string                 `json:"name"`
	Status      string                 `json:"status"` // "healthy", "degraded", "unhealthy"
	Message     string                 `json:"message"`
	LastCheck   time.Time              `json:"lastCheck"`
	Details     map[string]interface{} `json:"details,omitempty"`
	ResponseTime int64                 `json:"responseTime"` // milliseconds
}

// SystemHealth represents overall system health
type SystemHealth struct {
	Overall     string                 `json:"overall"` // "healthy", "degraded", "unhealthy"
	Timestamp   time.Time              `json:"timestamp"`
	Services    []ServiceHealth        `json:"services"`
	SystemInfo  map[string]interface{} `json:"systemInfo,omitempty"`
	Uptime      int64                  `json:"uptime"` // seconds
}

var (
	appStartTime = time.Now()
)

// HandleGetHealth returns comprehensive health status of all services
func HandleGetHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	health := SystemHealth{
		Timestamp: time.Now(),
		Services:  []ServiceHealth{},
		SystemInfo: map[string]interface{}{},
		Uptime:    int64(time.Since(appStartTime).Seconds()),
	}

	// Check Database
	dbHealth := checkDatabaseHealth()
	health.Services = append(health.Services, dbHealth)

	// Check Automation Service
	automationHealth := checkAutomationHealth()
	health.Services = append(health.Services, automationHealth)

	// Check Workflow Execution Manager
	workflowHealth := checkWorkflowExecutionHealth()
	health.Services = append(health.Services, workflowHealth)

	// Check Scheduler Service
	schedulerHealth := checkSchedulerHealth()
	health.Services = append(health.Services, schedulerHealth)

	// Check WebSocket Services
	wsHealth := checkWebSocketHealth()
	health.Services = append(health.Services, wsHealth)

	// Check Task Manager
	taskHealth := checkTaskManagerHealth()
	health.Services = append(health.Services, taskHealth)

	// System Information
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	health.SystemInfo = map[string]interface{}{
		"goVersion":      runtime.Version(),
		"numGoroutines":  runtime.NumGoroutine(),
		"memoryAlloc":    m.Alloc,
		"memoryTotalAlloc": m.TotalAlloc,
		"memorySys":      m.Sys,
		"numGC":          m.NumGC,
		"cpuCount":       runtime.NumCPU(),
	}

	// Determine overall health
	overallStatus := "healthy"
	for _, service := range health.Services {
		if service.Status == "unhealthy" {
			overallStatus = "unhealthy"
			break
		} else if service.Status == "degraded" && overallStatus == "healthy" {
			overallStatus = "degraded"
		}
	}
	health.Overall = overallStatus

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
}

// checkDatabaseHealth checks database connectivity and health
func checkDatabaseHealth() ServiceHealth {
	start := time.Now()
	health := ServiceHealth{
		Name:      "Database",
		Status:    "unhealthy",
		Message:   "Database check failed",
		LastCheck: time.Now(),
		Details:   map[string]interface{}{},
	}

	if database.DB == nil {
		health.Message = "Database connection is nil"
		health.ResponseTime = time.Since(start).Milliseconds()
		return health
	}

	// Test database connection
	err := database.DB.Ping()
	health.ResponseTime = time.Since(start).Milliseconds()

	if err != nil {
		health.Message = "Database ping failed: " + err.Error()
		health.Status = "unhealthy"
		return health
	}

	// Get database stats
	var pageCount int
	var pageSize int
	err = database.DB.QueryRow("PRAGMA page_count").Scan(&pageCount)
	if err == nil {
		health.Details["pageCount"] = pageCount
	}
	err = database.DB.QueryRow("PRAGMA page_size").Scan(&pageSize)
	if err == nil {
		health.Details["pageSize"] = pageSize
		health.Details["databaseSize"] = pageCount * pageSize
	}

	health.Status = "healthy"
	health.Message = "Database is operational"
	return health
}

// checkAutomationHealth checks automation service health
func checkAutomationHealth() ServiceHealth {
	start := time.Now()
	health := ServiceHealth{
		Name:      "Automation Service",
		Status:    "healthy",
		Message:   "Automation service is operational",
		LastCheck: time.Now(),
		Details:   map[string]interface{}{},
	}

	// Check if we can query workflows
	if database.DB == nil {
		health.Status = "unhealthy"
		health.Message = "Database not available"
		health.ResponseTime = time.Since(start).Milliseconds()
		return health
	}

	var workflowCount int
	err := database.DB.QueryRow("SELECT COUNT(*) FROM automation_workflows").Scan(&workflowCount)
	health.ResponseTime = time.Since(start).Milliseconds()

	if err != nil {
		health.Status = "degraded"
		health.Message = "Cannot query workflows: " + err.Error()
		return health
	}

	var activeSchedulerCount int
	err = database.DB.QueryRow("SELECT COUNT(*) FROM automation_schedulers WHERE active = 1").Scan(&activeSchedulerCount)
	if err == nil {
		health.Details["activeSchedulers"] = activeSchedulerCount
	}

	var activeWebhookCount int
	err = database.DB.QueryRow("SELECT COUNT(*) FROM automation_webhooks WHERE active = 1").Scan(&activeWebhookCount)
	if err == nil {
		health.Details["activeWebhooks"] = activeWebhookCount
	}

	health.Details["totalWorkflows"] = workflowCount
	health.ResponseTime = time.Since(start).Milliseconds()
	return health
}

// checkWorkflowExecutionHealth checks workflow execution manager health
func checkWorkflowExecutionHealth() ServiceHealth {
	start := time.Now()
	health := ServiceHealth{
		Name:      "Workflow Execution Manager",
		Status:    "healthy",
		Message:   "Workflow execution manager is operational",
		LastCheck: time.Now(),
		Details:   map[string]interface{}{},
	}

	manager := GetExecutionManager()
	if manager == nil {
		health.Status = "unhealthy"
		health.Message = "Execution manager not initialized"
		health.ResponseTime = time.Since(start).Milliseconds()
		return health
	}

	runningExecutions := manager.GetRunningExecutions()
	health.Details["runningExecutions"] = len(runningExecutions)
	health.Details["maxConcurrent"] = cap(manager.WorkerPool)

	if len(runningExecutions) > 0 {
		health.Details["executions"] = runningExecutions
	}

	health.ResponseTime = time.Since(start).Milliseconds()
	return health
}

// checkSchedulerHealth checks scheduler service health
func checkSchedulerHealth() ServiceHealth {
	start := time.Now()
	health := ServiceHealth{
		Name:      "Scheduler Service",
		Status:    "healthy",
		Message:   "Scheduler service is operational",
		LastCheck: time.Now(),
		Details:   map[string]interface{}{},
	}

	if cronScheduler == nil {
		health.Status = "unhealthy"
		health.Message = "Cron scheduler not initialized"
		health.ResponseTime = time.Since(start).Milliseconds()
		return health
	}

	health.Details["activeEntries"] = len(schedulerEntries)
	health.Details["schedulerRunning"] = true

	health.ResponseTime = time.Since(start).Milliseconds()
	return health
}

// checkWebSocketHealth checks WebSocket services health
func checkWebSocketHealth() ServiceHealth {
	start := time.Now()
	health := ServiceHealth{
		Name:      "WebSocket Services",
		Status:    "healthy",
		Message:   "WebSocket services are operational",
		LastCheck: time.Now(),
		Details:   map[string]interface{}{},
	}

	manager := GetExecutionManager()
	if manager == nil || manager.wsHub == nil {
		health.Status = "degraded"
		health.Message = "Workflow WebSocket hub not available"
		health.ResponseTime = time.Since(start).Milliseconds()
		return health
	}

	manager.wsHub.mu.RLock()
	clientCount := len(manager.wsHub.clients)
	manager.wsHub.mu.RUnlock()

	health.Details["connectedClients"] = clientCount
	health.Details["services"] = []string{
		"Workflow Updates",
		"Notifications",
		"System Info",
		"PowerShell",
		"SSH",
	}

	health.ResponseTime = time.Since(start).Milliseconds()
	return health
}

// checkTaskManagerHealth checks task manager health
func checkTaskManagerHealth() ServiceHealth {
	start := time.Now()
	health := ServiceHealth{
		Name:      "Task Manager",
		Status:    "healthy",
		Message:   "Task manager is operational",
		LastCheck: time.Now(),
		Details:   map[string]interface{}{},
	}

	taskManager := GetTaskManager()
	if taskManager == nil {
		health.Status = "unhealthy"
		health.Message = "Task manager not initialized"
		health.ResponseTime = time.Since(start).Milliseconds()
		return health
	}

	allTasks := taskManager.GetAllTasks()
	activeTasks := taskManager.GetActiveTasks()

	health.Details["totalTasks"] = len(allTasks)
	health.Details["activeTasks"] = len(activeTasks)

	if len(activeTasks) > 0 {
		health.Details["tasks"] = activeTasks
	}

	health.ResponseTime = time.Since(start).Milliseconds()
	return health
}
