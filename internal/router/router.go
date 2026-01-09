package router

import (
	// Standard library
	"net/http"
	"strings"
	"time"

	// Internal packages
	"network-script-generator/internal/handlers"
	"network-script-generator/internal/security"
)

// SetupRoutes registers all HTTP routes for the application.
// staticFS is the file system used to serve static assets (can be embedded).
func SetupRoutes(staticFS http.FileSystem) {
	// Initialize security
	security.InitializeSecurity()

	// Health check endpoint (no auth required)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Favicon handler (no auth required) - returns 204 No Content if favicon doesn't exist
	http.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		// Try to serve it, if not found, return 204 No Content
		file, err := staticFS.Open("favicon.ico")
		if err != nil {
			// No favicon found - return 204 No Content (browsers will stop requesting)
			w.WriteHeader(http.StatusNoContent)
			return
		}
		defer file.Close()

		// Serve the favicon
		http.ServeContent(w, r, "favicon.ico", time.Time{}, file)
	})

	// Serve static files from the provided file system with security middleware
	fs := http.FileServer(staticFS)
	staticHandler := security.ChainMiddleware(
		fs,
		security.SecurityHeaders,
		security.CORS,
		security.RequestLogging,
		security.InputValidation,
	)
	http.Handle("/", staticHandler)

	// API endpoints for generating PowerShell script (with security middleware)
	apiHandler := security.ChainMiddleware(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.URL.Path {
			case "/api/generate-script":
				handlers.HandleGenerateScript(w, r)
			case "/api/download-script":
				handlers.HandleDownloadScript(w, r)
			}
		}),
		security.AuthenticateAPIKey,
		security.RateLimitMiddleware,
		security.SecurityHeaders,
		security.CORS,
		security.RequestLogging,
		security.InputValidation,
	)
	http.Handle("/api/generate-script", apiHandler)
	http.Handle("/api/download-script", apiHandler)

	// Workflow execution WebSocket endpoint (authentication handled in handler)
	http.Handle("/api/workflows/ws", http.HandlerFunc(handlers.HandleWorkflowWebSocket))
	http.Handle("/ws/workflows", http.HandlerFunc(handlers.HandleWorkflowWebSocket))

	// SSH WebSocket endpoint (authentication handled in handler, not middleware)
	// WebSocket upgrades must happen before middleware, so auth is handled in the handler itself
	http.Handle("/api/ssh/ws", http.HandlerFunc(handlers.HandleSSHWebSocket))

	// SSH WebSocket endpoint without middleware (uses message-based auth)
	http.Handle("/ws/ssh", http.HandlerFunc(handlers.HandleSSHWebSocket))

	// PowerShell WebSocket endpoint (uses message-based auth)
	http.Handle("/ws/powershell", http.HandlerFunc(handlers.HandlePowerShellWebSocket))

	// Telnet WebSocket endpoint (uses message-based auth)
	http.Handle("/api/telnet/ws", http.HandlerFunc(handlers.HandleTelnetWebSocket))

	// WinRM WebSocket endpoint (uses message-based auth)
	http.Handle("/api/winrm/ws", http.HandlerFunc(handlers.HandleWinRMWebSocket))

	// Create secure API handler wrapper with audit logging
	secureAPIHandler := func(handler http.HandlerFunc) http.Handler {
		return security.ChainMiddleware(
			security.AuditMiddleware(http.HandlerFunc(handler)),
			security.AuthenticateAPIKey,
			security.RateLimitMiddleware,
			security.SecurityHeaders,
			security.CORS,
			security.RequestLogging,
			security.InputValidation,
		)
	}

	// SFTP API endpoints
	// SFTP WebSocket endpoint (no auth middleware - handled in handler)
	http.HandleFunc("/api/sftp/ws", handlers.HandleSFTPWebSocket)
	http.Handle("/api/sftp/connections", secureAPIHandler(handlers.HandleSFTPConnections))

	// Keep REST API endpoints for backward compatibility (optional - can be removed)
	// http.Handle("/api/sftp/connect", secureAPIHandler(handlers.HandleSFTPConnect))
	// http.Handle("/api/sftp/list", secureAPIHandler(handlers.HandleSFTPList))
	// http.Handle("/api/sftp/download", secureAPIHandler(handlers.HandleSFTPDownload))
	// http.Handle("/api/sftp/upload", secureAPIHandler(handlers.HandleSFTPUpload))
	// http.Handle("/api/sftp/delete", secureAPIHandler(handlers.HandleSFTPDelete))
	// http.Handle("/api/sftp/mkdir", secureAPIHandler(handlers.HandleSFTPMkdir))
	// http.Handle("/api/sftp/rename", secureAPIHandler(handlers.HandleSFTPRename))
	// http.Handle("/api/sftp/disconnect", secureAPIHandler(handlers.HandleSFTPDisconnect))

	// Comprehensive health check endpoint (with authentication)
	http.Handle("/api/health", secureAPIHandler(handlers.HandleGetHealth))

	// Documentation API endpoints
	http.Handle("/api/docs/categories", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.HandleGetCategories(w, r)
		case "POST":
			handlers.HandleCreateCategory(w, r)
		case "PUT":
			handlers.HandleUpdateCategory(w, r)
		case "DELETE":
			handlers.HandleDeleteCategory(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	http.Handle("/api/docs/subcategories", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.HandleGetSubcategories(w, r)
		case "POST":
			handlers.HandleCreateSubcategory(w, r)
		case "PUT":
			handlers.HandleUpdateSubcategory(w, r)
		case "DELETE":
			handlers.HandleDeleteSubcategory(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	http.Handle("/api/docs/documents", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.HandleGetDocuments(w, r)
		case "POST":
			handlers.HandleCreateDocument(w, r)
		case "PUT":
			handlers.HandleUpdateDocument(w, r)
		case "DELETE":
			handlers.HandleDeleteDocument(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	http.Handle("/api/docs/attachments", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.HandleGetAttachments(w, r)
		case "POST":
			handlers.HandleUploadAttachment(w, r)
		case "DELETE":
			handlers.HandleDeleteAttachment(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	http.Handle("/api/docs/attachments/download", secureAPIHandler(handlers.HandleDownloadAttachment))
	http.Handle("/api/docs/attachments/view", secureAPIHandler(handlers.HandleViewAttachment))

	// Security endpoints for API key management
	// Get API key for first-time setup (one-time display)
	http.Handle("/api/security/api-key/setup", security.ChainMiddleware(
		http.HandlerFunc(handlers.HandleGetAPIKeyForSetup),
		security.RateLimitMiddleware,
		security.SecurityHeaders,
		security.CORS,
		security.RequestLogging,
		security.InputValidation,
	))

	// Check API key status
	http.Handle("/api/security/api-key/status", security.ChainMiddleware(
		http.HandlerFunc(handlers.HandleCheckAPIKeyStatus),
		security.RateLimitMiddleware,
		security.SecurityHeaders,
		security.CORS,
		security.RequestLogging,
		security.InputValidation,
	))

	// Validate API key for login (with audit logging)
	http.Handle("/api/security/validate-key", security.ChainMiddleware(
		security.AuditMiddleware(http.HandlerFunc(handlers.HandleValidateAPIKey)),
		security.RateLimitMiddleware,
		security.SecurityHeaders,
		security.CORS,
		security.RequestLogging,
		security.InputValidation,
	))

	// User authentication endpoints
	// Register new user (first time setup)
	http.Handle("/api/auth/register", security.ChainMiddleware(
		security.AuditMiddleware(http.HandlerFunc(handlers.HandleRegisterUser)),
		security.RateLimitMiddleware,
		security.SecurityHeaders,
		security.CORS,
		security.RequestLogging,
		security.InputValidation,
	))

	// Login user
	http.Handle("/api/auth/login", security.ChainMiddleware(
		security.AuditMiddleware(http.HandlerFunc(handlers.HandleLoginUser)),
		security.RateLimitMiddleware,
		security.SecurityHeaders,
		security.CORS,
		security.RequestLogging,
		security.InputValidation,
	))

	// Check if user exists (for setup mode)
	http.Handle("/api/auth/check", security.ChainMiddleware(
		http.HandlerFunc(handlers.HandleCheckUserExists),
		security.RateLimitMiddleware,
		security.SecurityHeaders,
		security.CORS,
		security.RequestLogging,
		security.InputValidation,
	))

	// Validate JWT token
	http.Handle("/api/auth/validate", security.ChainMiddleware(
		security.AuthenticateAPIKey(http.HandlerFunc(handlers.HandleValidateToken)),
		security.RateLimitMiddleware,
		security.SecurityHeaders,
		security.CORS,
		security.RequestLogging,
		security.InputValidation,
	))

	// MFA login endpoints
	http.Handle("/api/auth/mfa/request", security.ChainMiddleware(
		security.AuthenticateAPIKey(http.HandlerFunc(handlers.HandleMFALoginRequest)),
		security.RateLimitMiddleware,
		security.SecurityHeaders,
		security.CORS,
		security.RequestLogging,
		security.InputValidation,
	))
	http.Handle("/api/auth/mfa/status/", security.ChainMiddleware(
		http.HandlerFunc(handlers.HandleMFAStatus),
		security.RateLimitMiddleware,
		security.SecurityHeaders,
		security.CORS,
		security.RequestLogging,
		security.InputValidation,
	))
	http.Handle("/api/auth/mfa/totp/verify", security.ChainMiddleware(
		security.AuthenticateAPIKey(http.HandlerFunc(handlers.HandleMFATOTPVerify)),
		security.RateLimitMiddleware,
		security.SecurityHeaders,
		security.CORS,
		security.RequestLogging,
		security.InputValidation,
	))
	http.Handle("/api/auth/mfa/complete", security.ChainMiddleware(
		security.AuthenticateAPIKey(http.HandlerFunc(handlers.HandleMFAComplete)),
		security.RateLimitMiddleware,
		security.SecurityHeaders,
		security.CORS,
		security.RequestLogging,
		security.InputValidation,
	))

	// Legacy endpoint (for backward compatibility, but should not be used)
	http.Handle("/api/security/api-key", security.ChainMiddleware(
		http.HandlerFunc(security.HandleGetAPIKey),
		security.RateLimitMiddleware,
		security.SecurityHeaders,
		security.CORS,
		security.RequestLogging,
		security.InputValidation,
	))

	// Todo API endpoints
	http.Handle("/api/todos", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.HandleGetTodos(w, r)
		case "POST":
			handlers.HandleCreateTodo(w, r)
		case "PUT":
			handlers.HandleUpdateTodo(w, r)
		case "DELETE":
			handlers.HandleDeleteTodo(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.Handle("/api/todos/reorder", secureAPIHandler(handlers.HandleReorderTodos))

	// Todo Subtasks API endpoints
	http.Handle("/api/todos/subtasks", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.HandleGetSubtasks(w, r)
		case "POST":
			handlers.HandleCreateSubtask(w, r)
		case "PUT":
			handlers.HandleUpdateSubtask(w, r)
		case "DELETE":
			handlers.HandleDeleteSubtask(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.Handle("/api/todos/subtasks/toggle", secureAPIHandler(handlers.HandleToggleSubtask))

	// Todo Tabs API endpoints
	http.Handle("/api/todo-tabs", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.HandleGetTodoTabs(w, r)
		case "POST":
			handlers.HandleCreateTodoTab(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	http.Handle("/api/todo-tabs/delete", secureAPIHandler(handlers.HandleDeleteTodoTab))

	// Hyper-V Report API endpoints
	http.Handle("/api/hyperv-reports", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.HandleGetHyperVReports(w, r)
		case "POST":
			handlers.HandleCreateHyperVReport(w, r)
		case "PUT":
			handlers.HandleUpdateHyperVReport(w, r)
		case "DELETE":
			handlers.HandleDeleteHyperVReport(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.Handle("/api/hyperv-reports/get", secureAPIHandler(handlers.HandleGetHyperVReport))

	// Individual HyperV report handler for templates
	http.Handle("/api/hyperv-reports/", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" && strings.HasPrefix(r.URL.Path, "/api/hyperv-reports/") {
			handlers.HandleGetSingleHyperVReport(w, r)
		}
	}))
	http.Handle("/api/hyperv-reports/generate-script", secureAPIHandler(handlers.HandleGenerateHyperVReportScript))
	http.Handle("/api/hyperv-reports/import", secureAPIHandler(handlers.HandleImportHyperVReport))

	// Windows Server Auditor API endpoints
	http.Handle("/api/windows-server-reports", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.HandleGetWindowsServerReports(w, r)
		case "POST":
			handlers.HandleCreateWindowsServerReport(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.Handle("/api/windows-server-reports/get", secureAPIHandler(handlers.HandleGetSingleWindowsServerReport))
	http.Handle("/api/windows-server-reports/", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" && strings.HasPrefix(r.URL.Path, "/api/windows-server-reports/") {
			handlers.HandleGetSingleWindowsServerReport(w, r)
		}
	}))
	http.Handle("/api/windows-server-reports/update", secureAPIHandler(handlers.HandleUpdateWindowsServerReport))
	http.Handle("/api/windows-server-reports/delete", secureAPIHandler(handlers.HandleDeleteWindowsServerReport))
	http.Handle("/api/windows-server-reports/audit", secureAPIHandler(handlers.HandleAuditWindowsServer))
	http.Handle("/api/windows-server-reports/generate-script", secureAPIHandler(handlers.HandleGenerateWindowsServerReportScript))
	http.Handle("/api/windows-server-reports/import", secureAPIHandler(handlers.HandleImportWindowsServerReport))

	// Linux Server Auditor API endpoints
	http.Handle("/api/linux-server-reports", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.HandleGetLinuxServerReports(w, r)
		case "POST":
			handlers.HandleCreateLinuxServerReport(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.Handle("/api/linux-server-reports/get", secureAPIHandler(handlers.HandleGetSingleLinuxServerReport))
	http.Handle("/api/linux-server-reports/", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" && strings.HasPrefix(r.URL.Path, "/api/linux-server-reports/") {
			handlers.HandleGetSingleLinuxServerReport(w, r)
		}
	}))
	http.Handle("/api/linux-server-reports/update", secureAPIHandler(handlers.HandleUpdateLinuxServerReport))
	http.Handle("/api/linux-server-reports/delete", secureAPIHandler(handlers.HandleDeleteLinuxServerReport))
	http.Handle("/api/linux-server-reports/generate-script", secureAPIHandler(handlers.HandleGenerateLinuxServerReportScript))
	http.Handle("/api/linux-server-reports/import", secureAPIHandler(handlers.HandleImportLinuxServerReport))

	// Veeam Auditor API endpoints
	http.Handle("/api/veeam-reports", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			handlers.HandleGetVeeamReports(w, r)
		} else if r.Method == "POST" {
			handlers.HandleCreateVeeamReport(w, r)
		}
	}))
	http.Handle("/api/veeam-reports/get", secureAPIHandler(handlers.HandleGetSingleVeeamReport))
	http.Handle("/api/veeam-reports/", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" && strings.HasPrefix(r.URL.Path, "/api/veeam-reports/") {
			handlers.HandleGetSingleVeeamReport(w, r)
		}
	}))
	http.Handle("/api/veeam-reports/update", secureAPIHandler(handlers.HandleUpdateVeeamReport))
	http.Handle("/api/veeam-reports/delete", secureAPIHandler(handlers.HandleDeleteVeeamReport))
	http.Handle("/api/veeam-reports/audit", secureAPIHandler(handlers.HandleAuditVeeam))
	http.Handle("/api/veeam-reports/generate-script", secureAPIHandler(handlers.HandleGenerateVeeamReportScript))
	http.Handle("/api/veeam-reports/import", secureAPIHandler(handlers.HandleImportVeeamReport))

	// File Share Auditor API endpoints
	http.Handle("/api/file-share-reports", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.HandleGetFileShareReports(w, r)
		case "POST":
			handlers.HandleCreateFileShareReport(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.Handle("/api/file-share-reports/get", secureAPIHandler(handlers.HandleGetSingleFileShareReport))
	http.Handle("/api/file-share-reports/", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" && strings.HasPrefix(r.URL.Path, "/api/file-share-reports/") {
			handlers.HandleGetSingleFileShareReport(w, r)
		}
	}))
	http.Handle("/api/file-share-reports/update", secureAPIHandler(handlers.HandleUpdateFileShareReport))
	http.Handle("/api/file-share-reports/delete", secureAPIHandler(handlers.HandleDeleteFileShareReport))
	http.Handle("/api/file-share-reports/generate-script", secureAPIHandler(handlers.HandleGenerateFileShareReportScript))
	http.Handle("/api/file-share-reports/import", secureAPIHandler(handlers.HandleImportFileShareReport))
	http.Handle("/api/file-share-reports/html", secureAPIHandler(handlers.HandleGenerateFileShareHTMLReport))

	// SSH Client API endpoints
	http.Handle("/api/ssh-connections/check", secureAPIHandler(handlers.HandleCheckSSHConnections))
	http.Handle("/api/ssh-connections/unlock", secureAPIHandler(handlers.HandleUnlockSSHConnections))
	http.Handle("/api/ssh-connections/save", secureAPIHandler(handlers.HandleSaveSSHConnection))
	http.Handle("/api/ssh-connections/update", secureAPIHandler(handlers.HandleUpdateSSHConnection))
	http.Handle("/api/ssh-connections/delete", secureAPIHandler(handlers.HandleDeleteSSHConnection))

	// Telnet Client API endpoints
	http.Handle("/api/telnet/connect", secureAPIHandler(handlers.HandleTelnetConnect))
	http.Handle("/api/telnet/disconnect", secureAPIHandler(handlers.HandleTelnetDisconnect))
	http.Handle("/ws/telnet", http.HandlerFunc(handlers.HandleTelnetWebSocket))

	// WinRM Client API endpoints
	http.Handle("/api/winrm/connect", secureAPIHandler(handlers.HandleWinRMConnect))
	http.Handle("/api/winrm/disconnect", secureAPIHandler(handlers.HandleWinRMDisconnect))
	http.Handle("/ws/winrm", http.HandlerFunc(handlers.HandleWinRMWebSocket))

	// FTP Client API endpoints
	http.Handle("/api/ftp/connect", secureAPIHandler(handlers.HandleFTPConnect))
	http.Handle("/api/ftp/disconnect", secureAPIHandler(handlers.HandleFTPDisconnect))
	http.Handle("/api/ftp/list", secureAPIHandler(handlers.HandleFTPList))
	http.Handle("/api/ftp/download", secureAPIHandler(handlers.HandleFTPDownload))
	http.Handle("/api/ftp/upload", secureAPIHandler(handlers.HandleFTPUpload))
	http.Handle("/api/ftp/delete", secureAPIHandler(handlers.HandleFTPDelete))
	http.Handle("/api/ftp/mkdir", secureAPIHandler(handlers.HandleFTPMkdir))
	http.Handle("/api/ftp/rename", secureAPIHandler(handlers.HandleFTPRename))

	// Database Client API endpoints
	http.Handle("/api/database/connect", secureAPIHandler(handlers.HandleDatabaseConnect))
	http.Handle("/api/database/disconnect", secureAPIHandler(handlers.HandleDatabaseDisconnect))
	http.Handle("/api/database/query", secureAPIHandler(handlers.HandleDatabaseQuery))
	http.Handle("/api/database/execute", secureAPIHandler(handlers.HandleDatabaseExecute))
	http.Handle("/api/database/tables", secureAPIHandler(handlers.HandleDatabaseTables))

	// Infrastructure Diagram API endpoints
	http.Handle("/api/infrastructure-diagrams", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.HandleGetInfrastructureDiagrams(w, r)
		case "POST":
			handlers.HandleCreateInfrastructureDiagram(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.Handle("/api/infrastructure-diagrams/get", secureAPIHandler(handlers.HandleGetInfrastructureDiagram))
	http.Handle("/api/infrastructure-diagrams/delete", secureAPIHandler(handlers.HandleDeleteInfrastructureDiagram))

	// Device Templates API endpoints
	http.Handle("/api/device-templates", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.HandleGetDeviceTemplates(w, r)
		case http.MethodPost:
			handlers.HandleCreateDeviceTemplate(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.Handle("/api/device-templates/update", secureAPIHandler(handlers.HandleUpdateDeviceTemplate))
	http.Handle("/api/device-templates/delete", secureAPIHandler(handlers.HandleDeleteDeviceTemplate))
	http.Handle("/api/device-images", secureAPIHandler(handlers.HandleGetDeviceImages))

	// Automation Workflows API endpoints
	http.Handle("/api/automation/workflows", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.HandleGetWorkflows(w, r)
		case "POST":
			handlers.HandleCreateWorkflow(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.Handle("/api/automation/workflows/get", secureAPIHandler(handlers.HandleGetWorkflow))
	http.Handle("/api/automation/workflows/update", secureAPIHandler(handlers.HandleUpdateWorkflow))
	http.Handle("/api/automation/workflows/delete", secureAPIHandler(handlers.HandleDeleteWorkflow))

	// Automation Webhooks API endpoints
	http.Handle("/api/automation/webhooks", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.HandleGetWebhooks(w, r)
		case "POST":
			handlers.HandleCreateWebhook(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.Handle("/api/automation/webhooks/update", secureAPIHandler(handlers.HandleUpdateWebhook))
	http.Handle("/api/automation/webhooks/delete", secureAPIHandler(handlers.HandleDeleteWebhook))

	// Public webhook trigger endpoint (no auth required)
	http.HandleFunc("/api/webhook/", handlers.HandleTriggerWebhook)

	// Automation Schedulers API endpoints
	http.Handle("/api/automation/schedulers", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.HandleGetSchedulers(w, r)
		case "POST":
			handlers.HandleCreateScheduler(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.Handle("/api/automation/schedulers/update", secureAPIHandler(handlers.HandleUpdateScheduler))
	http.Handle("/api/automation/schedulers/delete", secureAPIHandler(handlers.HandleDeleteScheduler))

	// Automation Executions API
	http.Handle("/api/automation/executions", secureAPIHandler(handlers.HandleGetExecutions))
	http.Handle("/api/automation/executions/stats", secureAPIHandler(handlers.HandleGetExecutionStats))

	// IP Scanner WebSocket endpoint (authentication handled in handler)
	http.Handle("/api/network/ip-scanner", http.HandlerFunc(handlers.HandleIPScanner))

	// Ping Tracer API endpoint
	http.Handle("/api/network/ping-tracer", http.HandlerFunc(handlers.HandlePingTracer))

	// Domain Lookup RDAP endpoint
	http.Handle("/api/domain/lookup", secureAPIHandler(handlers.HandleDomainLookup))

	// Speedtest API endpoints
	http.Handle("/api/speedtest/servers", secureAPIHandler(handlers.HandleSpeedtestServers))
	http.Handle("/api/speedtest/start", secureAPIHandler(handlers.HandleStartSpeedtest))
	http.Handle("/api/speedtest/ws", http.HandlerFunc(handlers.HandleSpeedtestWebSocket))
	http.Handle("/api/speedtest/results", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.HandleSpeedtestResults(w, r)
		case "DELETE":
			handlers.HandleDeleteSpeedtestResult(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.Handle("/api/speedtest/stats", secureAPIHandler(handlers.HandleSpeedtestStats))
	http.Handle("/api/speedtest/chart", secureAPIHandler(handlers.HandleSpeedtestChartData))
	http.Handle("/api/speedtest/latest", secureAPIHandler(handlers.HandleSpeedtestLatest))

	// Task Management API endpoints
	http.Handle("/api/tasks", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.HandleGetAllTasks(w, r)
		case "POST":
			handlers.HandleCreateTask(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.Handle("/api/tasks/get", secureAPIHandler(handlers.HandleGetTask))
	http.Handle("/api/tasks/progress", secureAPIHandler(handlers.HandleUpdateTaskProgress))
	http.Handle("/api/tasks/complete", secureAPIHandler(handlers.HandleCompleteTask))
	http.Handle("/api/tasks/fail", secureAPIHandler(handlers.HandleFailTask))
	http.Handle("/api/tasks/cancel", secureAPIHandler(handlers.HandleCancelTask))

	// Packet Analyzer API endpoints
	http.Handle("/api/packet-analyzer/interfaces", secureAPIHandler(handlers.HandleListInterfaces))
	http.Handle("/api/packet-analyzer/start", secureAPIHandler(handlers.HandleStartCapture))
	http.Handle("/api/packet-analyzer/stop", secureAPIHandler(handlers.HandleStopCapture))
	http.Handle("/api/packet-analyzer/ws", http.HandlerFunc(handlers.HandlePacketCaptureWebSocket))

	// Report Templates handlers
	reportTemplateHandler := secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		// Check if it is a specific resource (has ID)
		// Path should look like /api/report-templates/123
		if strings.HasPrefix(r.URL.Path, "/api/report-templates/") && len(r.URL.Path) > len("/api/report-templates/") {
			switch r.Method {
			case "PUT":
				handlers.HandleUpdateReportTemplate(w, r)
			case "DELETE":
				handlers.HandleDeleteReportTemplate(w, r)
			default:
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
			return
		}

		// Collection handlers
		switch r.Method {
		case "GET":
			handlers.HandleGetReportTemplates(w, r)
		case "POST":
			handlers.HandleCreateReportTemplate(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	http.Handle("/api/report-templates", reportTemplateHandler)
	http.Handle("/api/report-templates/", reportTemplateHandler)

	http.Handle("/api/report-templates/generate-docx", secureAPIHandler(handlers.HandleGenerateDOCXReport))
	http.Handle("/api/report-templates/generate-docx-with-placeholders", secureAPIHandler(handlers.HandleGenerateDOCXWithPlaceholders))

	// Crypto Tools API endpoints
	http.Handle("/api/crypto/rsa-generate", secureAPIHandler(handlers.HandleGenerateRSAKeyPair))

	// Infrastructure Inventory handlers
	http.Handle("/api/infrastructure-inventory/generate-excel", secureAPIHandler(handlers.HandleGenerateInfrastructureExcel))
	http.Handle("/api/infrastructure-inventory", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			if r.URL.Query().Get("id") != "" {
				handlers.HandleGetInfrastructureInventory(w, r)
			} else {
				handlers.HandleGetInfrastructureInventories(w, r)
			}
		case "POST":
			handlers.HandleCreateInfrastructureInventory(w, r)
		case "PUT":
			handlers.HandleUpdateInfrastructureInventory(w, r)
		case "DELETE":
			handlers.HandleDeleteInfrastructureInventory(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	// API Audit endpoints
	http.Handle("/api/audit/logs", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.GetAPIAuditLogs(w, r)
		case "DELETE":
			handlers.DeleteAPIAuditLogs(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.Handle("/api/audit/stats", secureAPIHandler(handlers.GetAPIAuditLogStats))

	// Sessions endpoints
	http.Handle("/api/sessions", secureAPIHandler(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.GetSessions(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.Handle("/api/sessions/stats", secureAPIHandler(handlers.GetSessionStats))

	// Settings endpoints
	http.Handle("/api/settings/mfa", secureAPIHandler(handlers.HandleMFASettings))
	http.Handle("/api/settings/mfa/totp/generate", secureAPIHandler(handlers.HandleMFATOTPGenerate))
	http.Handle("/api/settings/mfa/totp/validate", secureAPIHandler(handlers.HandleMFATOTPValidate))
	http.Handle("/api/settings/mfa/totp/enable", secureAPIHandler(handlers.HandleMFATOTPEnable))

	// Logout endpoint (no auth required - user is logging out, but we still want to audit it)
	http.Handle("/api/logout", security.ChainMiddleware(
		security.AuditMiddleware(http.HandlerFunc(handlers.HandleLogout)),
		security.SecurityHeaders,
		security.CORS,
		security.RequestLogging,
		security.InputValidation,
	))
}
