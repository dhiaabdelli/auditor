package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"

	_ "github.com/go-sql-driver/mysql"
	_ "github.com/lib/pq"
	_ "github.com/denisenkom/go-mssqldb"
)

// DatabaseConnection represents a database connection
type DatabaseConnection struct {
	DB       *sql.DB
	Type     string // "mysql", "postgres", "mssql"
	Host     string
	Port     int
	Database string
	User     string
	Password string
	mu       sync.Mutex
	isClosed bool
}

// DatabaseConnectRequest represents a database connection request
type DatabaseConnectRequest struct {
	Type     string `json:"type"`     // "mysql", "postgres", "mssql"
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Database string `json:"database"`
	User     string `json:"user"`
	Password string `json:"password"`
	SSLMode  string `json:"sslMode"` // For PostgreSQL
}

var (
	DatabaseConnections = make(map[string]*DatabaseConnection)
	DatabaseConnMu      sync.RWMutex
)

// HandleDatabaseConnect handles database connection requests
func HandleDatabaseConnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req DatabaseConnectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Set default ports
	if req.Port == 0 {
		switch strings.ToLower(req.Type) {
		case "mysql":
			req.Port = 3306
		case "postgres", "postgresql":
			req.Port = 5432
		case "mssql", "sqlserver":
			req.Port = 1433
		default:
			http.Error(w, "Unsupported database type", http.StatusBadRequest)
			return
		}
	}

	connID := fmt.Sprintf("%s@%s:%d/%s", req.User, req.Host, req.Port, req.Database)

	// Check if connection already exists
	DatabaseConnMu.RLock()
	if _, exists := DatabaseConnections[connID]; exists {
		DatabaseConnMu.RUnlock()
		response := map[string]interface{}{
			"success": true,
			"connId":  connID,
			"message": "Connection already exists",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}
	DatabaseConnMu.RUnlock()

	// Build connection string based on database type
	var connStr string
	dbType := strings.ToLower(req.Type)

	switch dbType {
	case "mysql":
		connStr = fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true", req.User, req.Password, req.Host, req.Port, req.Database)
	case "postgres", "postgresql":
		sslMode := req.SSLMode
		if sslMode == "" {
			sslMode = "disable"
		}
		connStr = fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s", req.Host, req.Port, req.User, req.Password, req.Database, sslMode)
	case "mssql", "sqlserver":
		connStr = fmt.Sprintf("server=%s;port=%d;user id=%s;password=%s;database=%s", req.Host, req.Port, req.User, req.Password, req.Database)
	default:
		http.Error(w, "Unsupported database type: "+req.Type, http.StatusBadRequest)
		return
	}

	// Open database connection
	var db *sql.DB
	var err error
	switch dbType {
	case "mysql":
		db, err = sql.Open("mysql", connStr)
	case "postgres", "postgresql":
		db, err = sql.Open("postgres", connStr)
	case "mssql", "sqlserver":
		db, err = sql.Open("mssql", connStr)
	}

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to open database: %v", err), http.StatusInternalServerError)
		return
	}

	// Test connection
	if err := db.Ping(); err != nil {
		db.Close()
		http.Error(w, fmt.Sprintf("Failed to connect: %v", err), http.StatusInternalServerError)
		return
	}

	dbConn := &DatabaseConnection{
		DB:       db,
		Type:     dbType,
		Host:     req.Host,
		Port:     req.Port,
		Database: req.Database,
		User:     req.User,
		Password: req.Password,
	}

	DatabaseConnMu.Lock()
	DatabaseConnections[connID] = dbConn
	DatabaseConnMu.Unlock()

	response := map[string]interface{}{
		"success": true,
		"connId":  connID,
		"message": "Connected successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleDatabaseQuery handles database query execution
func HandleDatabaseQuery(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ConnID string `json:"connId"`
		Query  string `json:"query"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	DatabaseConnMu.RLock()
	dbConn, exists := DatabaseConnections[req.ConnID]
	DatabaseConnMu.RUnlock()

	if !exists {
		http.Error(w, "Connection not found", http.StatusNotFound)
		return
	}

	// Execute query
	rows, err := dbConn.DB.Query(req.Query)
	if err != nil {
		http.Error(w, fmt.Sprintf("Query execution error: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Get column names
	columns, err := rows.Columns()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get columns: %v", err), http.StatusInternalServerError)
		return
	}

	// Read rows
	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		row := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			if val != nil {
				// Convert []byte to string for better JSON encoding
				if b, ok := val.([]byte); ok {
					row[col] = string(b)
				} else {
					row[col] = val
				}
			} else {
				row[col] = nil
			}
		}
		results = append(results, row)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, fmt.Sprintf("Row iteration error: %v", err), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"columns": columns,
		"rows":    results,
		"count":   len(results),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleDatabaseExecute handles database execute (INSERT, UPDATE, DELETE)
func HandleDatabaseExecute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ConnID string `json:"connId"`
		Query  string `json:"query"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	DatabaseConnMu.RLock()
	dbConn, exists := DatabaseConnections[req.ConnID]
	DatabaseConnMu.RUnlock()

	if !exists {
		http.Error(w, "Connection not found", http.StatusNotFound)
		return
	}

	// Execute query
	result, err := dbConn.DB.Exec(req.Query)
	if err != nil {
		http.Error(w, fmt.Sprintf("Execution error: %v", err), http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	lastInsertID, _ := result.LastInsertId()

	response := map[string]interface{}{
		"success":      true,
		"rowsAffected": rowsAffected,
		"lastInsertId": lastInsertID,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleDatabaseTables handles database table listing
func HandleDatabaseTables(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ConnID string `json:"connId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	DatabaseConnMu.RLock()
	dbConn, exists := DatabaseConnections[req.ConnID]
	DatabaseConnMu.RUnlock()

	if !exists {
		http.Error(w, "Connection not found", http.StatusNotFound)
		return
	}

	var query string
	switch dbConn.Type {
	case "mysql":
		query = "SHOW TABLES"
	case "postgres", "postgresql":
		query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
	case "mssql", "sqlserver":
		query = "SELECT name FROM sys.tables"
	default:
		http.Error(w, "Unsupported database type", http.StatusBadRequest)
		return
	}

	rows, err := dbConn.DB.Query(query)
	if err != nil {
		http.Error(w, fmt.Sprintf("Query error: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			log.Printf("Error scanning table name: %v", err)
			continue
		}
		tables = append(tables, tableName)
	}

	response := map[string]interface{}{
		"success": true,
		"tables":  tables,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleDatabaseDisconnect handles database disconnection
func HandleDatabaseDisconnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ConnID string `json:"connId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	DatabaseConnMu.Lock()
	if conn, exists := DatabaseConnections[req.ConnID]; exists {
		conn.Close()
		delete(DatabaseConnections, req.ConnID)
	}
	DatabaseConnMu.Unlock()

	response := map[string]interface{}{
		"success": true,
		"message": "Disconnected successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Close closes the database connection
func (dc *DatabaseConnection) Close() {
	dc.mu.Lock()
	defer dc.mu.Unlock()

	if dc.isClosed {
		return
	}

	dc.isClosed = true

	if dc.DB != nil {
		dc.DB.Close()
	}
}

