package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"network-script-generator/internal/database"
)

// GetSessions retrieves user sessions with filtering and pagination
func GetSessions(w http.ResponseWriter, r *http.Request) {
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
	status := query.Get("status")
	ipAddress := query.Get("ipAddress")

	// Build WHERE clause
	whereConditions := []string{"1=1"}
	args := []interface{}{}

	if status != "" {
		whereConditions = append(whereConditions, "status = ?")
		args = append(args, status)
	}

	if ipAddress != "" {
		whereConditions = append(whereConditions, "ip_address LIKE ?")
		args = append(args, "%"+ipAddress+"%")
	}

	whereClause := ""
	if len(whereConditions) > 0 {
		whereClause = "WHERE " + whereConditions[0]
		for i := 1; i < len(whereConditions); i++ {
			whereClause += " AND " + whereConditions[i]
		}
	}

	// Get total count
	var totalCount int
	countQuery := "SELECT COUNT(*) FROM user_sessions " + whereClause
	err := database.DB.QueryRow(countQuery, args...).Scan(&totalCount)
	if err != nil {
		http.Error(w, "Failed to get session count: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get sessions
	querySQL := `
		SELECT id, ip_address, user_agent, login_at, logout_at, 
		       last_activity, duration_seconds, status, created_at
		FROM user_sessions
		` + whereClause + `
		ORDER BY login_at DESC
		LIMIT ? OFFSET ?`

	queryArgs := make([]interface{}, len(args))
	copy(queryArgs, args)
	queryArgs = append(queryArgs, pageSize, offset)

	rows, err := database.DB.Query(querySQL, queryArgs...)
	if err != nil {
		http.Error(w, "Failed to query sessions: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type SessionResponse struct {
		ID             string    `json:"id"`
		IPAddress      string    `json:"ipAddress"`
		UserAgent      string    `json:"userAgent"`
		LoginAt        time.Time `json:"loginAt"`
		LogoutAt       *string  `json:"logoutAt,omitempty"`
		LastActivity   time.Time `json:"lastActivity"`
		DurationSeconds *int64  `json:"durationSeconds,omitempty"`
		Status         string    `json:"status"`
		CreatedAt      time.Time `json:"createdAt"`
	}

	sessions := []SessionResponse{}
	for rows.Next() {
		var session SessionResponse
		var logoutAt sql.NullTime
		var durationSeconds sql.NullInt64

		err := rows.Scan(
			&session.ID,
			&session.IPAddress,
			&session.UserAgent,
			&session.LoginAt,
			&logoutAt,
			&session.LastActivity,
			&durationSeconds,
			&session.Status,
			&session.CreatedAt,
		)
		if err != nil {
			continue
		}

		if logoutAt.Valid {
			logoutStr := logoutAt.Time.Format(time.RFC3339)
			session.LogoutAt = &logoutStr
		}

		if durationSeconds.Valid {
			session.DurationSeconds = &durationSeconds.Int64
		}

		sessions = append(sessions, session)
	}

	// Response
	response := map[string]interface{}{
		"sessions":   sessions,
		"total":      totalCount,
		"page":       page,
		"pageSize":   pageSize,
		"totalPages": (totalCount + pageSize - 1) / pageSize,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetSessionStats retrieves statistics about user sessions
func GetSessionStats(w http.ResponseWriter, r *http.Request) {
	stats := make(map[string]interface{})

	// Total sessions
	var totalSessions int
	database.DB.QueryRow("SELECT COUNT(*) FROM user_sessions").Scan(&totalSessions)
	stats["totalSessions"] = totalSessions

	// Active sessions
	var activeSessions int
	database.DB.QueryRow("SELECT COUNT(*) FROM user_sessions WHERE status = 'active'").Scan(&activeSessions)
	stats["activeSessions"] = activeSessions

	// Average session duration
	var avgDuration float64
	database.DB.QueryRow(`
		SELECT AVG(duration_seconds) FROM user_sessions 
		WHERE duration_seconds IS NOT NULL
	`).Scan(&avgDuration)
	stats["avgDurationSeconds"] = avgDuration

	// Sessions in last 24 hours
	var last24h int
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM user_sessions
		WHERE login_at >= datetime('now', '-1 day')
	`).Scan(&last24h)
	stats["last24h"] = last24h

	// Top IP addresses
	ipStats := []map[string]interface{}{}
	rows, _ := database.DB.Query(`
		SELECT ip_address, COUNT(*) as count
		FROM user_sessions
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

