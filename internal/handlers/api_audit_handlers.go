package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"network-script-generator/internal/database"
)

// GetAPIAuditLogs retrieves API audit logs with filtering and pagination
func GetAPIAuditLogs(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	query := r.URL.Query()
	
	// Pagination
	page, _ := strconv.Atoi(query.Get("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(query.Get("pageSize"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 50
	}
	offset := (page - 1) * pageSize

	// Filters
	eventType := query.Get("eventType")
	method := query.Get("method")
	path := query.Get("path")
	ipAddress := query.Get("ipAddress")
	statusCode := query.Get("statusCode")
	search := query.Get("search")
	startDate := query.Get("startDate")
	endDate := query.Get("endDate")

	// Build WHERE clause
	whereConditions := []string{"1=1"}
	args := []interface{}{}

	if eventType != "" {
		whereConditions = append(whereConditions, "event_type = ?")
		args = append(args, eventType)
	}

	if method != "" {
		whereConditions = append(whereConditions, "method = ?")
		args = append(args, method)
	}

	if path != "" {
		whereConditions = append(whereConditions, "path LIKE ?")
		args = append(args, "%"+path+"%")
	}

	if ipAddress != "" {
		whereConditions = append(whereConditions, "ip_address LIKE ?")
		args = append(args, "%"+ipAddress+"%")
	}

	if statusCode != "" {
		whereConditions = append(whereConditions, "response_status = ?")
		args = append(args, statusCode)
	}

	if search != "" {
		whereConditions = append(whereConditions, "(path LIKE ? OR ip_address LIKE ? OR request_body LIKE ? OR response_body LIKE ?)")
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern, searchPattern, searchPattern, searchPattern)
	}

	if startDate != "" {
		whereConditions = append(whereConditions, "created_at >= ?")
		args = append(args, startDate)
	}

	if endDate != "" {
		whereConditions = append(whereConditions, "created_at <= ?")
		args = append(args, endDate)
	}

	whereClause := strings.Join(whereConditions, " AND ")

	// Get total count
	var totalCount int
	countQuery := "SELECT COUNT(*) FROM api_audit_logs WHERE " + whereClause
	err := database.DB.QueryRow(countQuery, args...).Scan(&totalCount)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to get log count: " + err.Error(),
		})
		return
	}

	// Get logs
	querySQL := `
		SELECT id, event_type, method, path, ip_address, user_agent,
		       request_headers, request_body, response_status,
		       response_body, response_time_ms, error_message, event_description, session_id, created_at
		FROM api_audit_logs
		WHERE ` + whereClause + `
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?`

	queryArgs := make([]interface{}, len(args))
	copy(queryArgs, args)
	queryArgs = append(queryArgs, pageSize, offset)

	rows, err := database.DB.Query(querySQL, queryArgs...)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to query logs: " + err.Error(),
		})
		return
	}
	defer rows.Close()

	type AuditLogResponse struct {
		ID              int64                  `json:"id"`
		EventType       string                 `json:"eventType"`
		Method          string                 `json:"method"`
		Path            string                 `json:"path"`
		IPAddress       string                 `json:"ipAddress"`
		UserAgent       string                 `json:"userAgent"`
		RequestHeaders  map[string]string      `json:"requestHeaders"`
		RequestBody     string                 `json:"requestBody"`
		ResponseStatus  int                    `json:"responseStatus"`
		ResponseBody    string                 `json:"responseBody"`
		ResponseTimeMs  *int                   `json:"responseTimeMs,omitempty"`
		ErrorMessage    *string                `json:"errorMessage,omitempty"`
		EventDescription *string                `json:"eventDescription,omitempty"`
		SessionID       *string                `json:"sessionId,omitempty"`
		CreatedAt       time.Time              `json:"createdAt"`
	}

	logs := []AuditLogResponse{}
	for rows.Next() {
		var log AuditLogResponse
		var errorMsg sql.NullString
		var eventDesc sql.NullString
		var requestHeadersJSON string

		var eventType sql.NullString
		var sessionID sql.NullString
		var responseTimeMs sql.NullInt64
		err := rows.Scan(
			&log.ID,
			&eventType,
			&log.Method,
			&log.Path,
			&log.IPAddress,
			&log.UserAgent,
			&requestHeadersJSON,
			&log.RequestBody,
			&log.ResponseStatus,
			&log.ResponseBody,
			&responseTimeMs,
			&errorMsg,
			&eventDesc,
			&sessionID,
			&log.CreatedAt,
		)
		if err != nil {
			continue
		}

		if eventType.Valid {
			log.EventType = eventType.String
		} else {
			log.EventType = "API_CALL" // Default for old records
		}

		if sessionID.Valid {
			log.SessionID = &sessionID.String
		}

		if responseTimeMs.Valid {
			rtm := int(responseTimeMs.Int64)
			log.ResponseTimeMs = &rtm
		}

		// Parse request headers JSON
		if requestHeadersJSON != "" {
			json.Unmarshal([]byte(requestHeadersJSON), &log.RequestHeaders)
		}

		if errorMsg.Valid {
			log.ErrorMessage = &errorMsg.String
		}

		if eventDesc.Valid {
			log.EventDescription = &eventDesc.String
		}

		logs = append(logs, log)
	}

	// Response
	response := map[string]interface{}{
		"logs":      logs,
		"total":     totalCount,
		"page":      page,
		"pageSize":  pageSize,
		"totalPages": (totalCount + pageSize - 1) / pageSize,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetAPIAuditLogStats retrieves statistics about API audit logs
func GetAPIAuditLogStats(w http.ResponseWriter, r *http.Request) {
	stats := make(map[string]interface{})

	// Total requests
	var totalRequests int
	database.DB.QueryRow("SELECT COUNT(*) FROM api_audit_logs").Scan(&totalRequests)
	stats["totalRequests"] = totalRequests

	// Requests by method
	methodStats := make(map[string]int)
	rows, _ := database.DB.Query(`
		SELECT method, COUNT(*) as count
		FROM api_audit_logs
		GROUP BY method
	`)
	defer rows.Close()
	for rows.Next() {
		var method string
		var count int
		if err := rows.Scan(&method, &count); err == nil {
			methodStats[method] = count
		}
	}
	stats["byMethod"] = methodStats

	// Requests by status code
	statusStats := make(map[string]int)
	rows, _ = database.DB.Query(`
		SELECT response_status, COUNT(*) as count
		FROM api_audit_logs
		GROUP BY response_status
	`)
	defer rows.Close()
	for rows.Next() {
		var status int
		var count int
		if err := rows.Scan(&status, &count); err == nil {
			statusStats[strconv.Itoa(status)] = count
		}
	}
	stats["byStatus"] = statusStats

	// Average response time (only for records with response_time_ms)
	var avgResponseTime sql.NullFloat64
	database.DB.QueryRow("SELECT AVG(response_time_ms) FROM api_audit_logs WHERE response_time_ms IS NOT NULL").Scan(&avgResponseTime)
	if avgResponseTime.Valid {
		stats["avgResponseTime"] = avgResponseTime.Float64
	} else {
		stats["avgResponseTime"] = 0
	}

	// Requests in last 24 hours
	var last24h int
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM api_audit_logs
		WHERE created_at >= datetime('now', '-1 day')
	`).Scan(&last24h)
	stats["last24h"] = last24h

	// Top IP addresses
	ipStats := []map[string]interface{}{}
	rows, _ = database.DB.Query(`
		SELECT ip_address, COUNT(*) as count
		FROM api_audit_logs
		GROUP BY ip_address
		ORDER BY count DESC
		LIMIT 10
	`)
	defer rows.Close()
	for rows.Next() {
		var ip string
		var count int
		if err := rows.Scan(&ip, &count); err == nil {
			ipStats = append(ipStats, map[string]interface{}{
				"ip":    ip,
				"count": count,
			})
		}
	}
	stats["topIPs"] = ipStats

	// Top endpoints
	endpointStats := []map[string]interface{}{}
	rows, _ = database.DB.Query(`
		SELECT method || ' ' || path as endpoint, COUNT(*) as count
		FROM api_audit_logs
		GROUP BY endpoint
		ORDER BY count DESC
		LIMIT 10
	`)
	defer rows.Close()
	for rows.Next() {
		var endpoint string
		var count int
		if err := rows.Scan(&endpoint, &count); err == nil {
			endpointStats = append(endpointStats, map[string]interface{}{
				"endpoint": endpoint,
				"count":    count,
			})
		}
	}
	stats["topEndpoints"] = endpointStats

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// DeleteAPIAuditLogs deletes API audit logs (with optional filters)
func DeleteAPIAuditLogs(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	olderThan := query.Get("olderThan") // Days

	if olderThan != "" {
		days, err := strconv.Atoi(olderThan)
		if err != nil || days < 1 {
			http.Error(w, "Invalid olderThan parameter", http.StatusBadRequest)
			return
		}

		// Delete logs older than specified days
		result, err := database.DB.Exec(`
			DELETE FROM api_audit_logs
			WHERE created_at < datetime('now', '-' || ? || ' days')
		`, days)
		if err != nil {
			http.Error(w, "Failed to delete logs: "+err.Error(), http.StatusInternalServerError)
			return
		}

		rowsAffected, _ := result.RowsAffected()
		response := map[string]interface{}{
			"message":      "Logs deleted successfully",
			"rowsDeleted": rowsAffected,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Delete all logs
	result, err := database.DB.Exec("DELETE FROM api_audit_logs")
	if err != nil {
		http.Error(w, "Failed to delete logs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	response := map[string]interface{}{
		"message":      "All logs deleted successfully",
		"rowsDeleted": rowsAffected,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

