package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"network-script-generator/internal/database"
)

// SFTPConnection represents a saved SFTP connection.
type SFTPConnection struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
}

// HandleSFTPConnections handles CRUD operations for saved SFTP connections.
// - GET: returns all saved connections
// - POST: creates or updates a connection
// - DELETE: deletes a connection by id (query param: id)
func HandleSFTPConnections(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		rows, err := database.DB.Query(`SELECT id, name, host, port, username, password FROM sftp_connections ORDER BY updated_at DESC`)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"%v"}`, err), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		conns := []SFTPConnection{}
		for rows.Next() {
			var c SFTPConnection
			if err := rows.Scan(&c.ID, &c.Name, &c.Host, &c.Port, &c.User, &c.Password); err != nil {
				continue
			}
			conns = append(conns, c)
		}

		json.NewEncoder(w).Encode(map[string]interface{}{"connections": conns})

	case http.MethodPost:
		var req struct {
			Connection SFTPConnection `json:"connection"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
			return
		}

		c := req.Connection
		if c.ID == "" || c.Name == "" || c.Host == "" || c.User == "" {
			http.Error(w, `{"error":"id, name, host, and user are required"}`, http.StatusBadRequest)
			return
		}
		if c.Port == 0 {
			c.Port = 22
		}

		_, err := database.DB.Exec(`
			INSERT INTO sftp_connections (id, name, host, port, username, password, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			ON CONFLICT(id) DO UPDATE SET
				name=excluded.name,
				host=excluded.host,
				port=excluded.port,
				username=excluded.username,
				password=excluded.password,
				updated_at=CURRENT_TIMESTAMP
		`, c.ID, c.Name, c.Host, c.Port, c.User, c.Password)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"%v"}`, err), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"connection": c,
		})

	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, `{"error":"id is required"}`, http.StatusBadRequest)
			return
		}
		_, err := database.DB.Exec(`DELETE FROM sftp_connections WHERE id = ?`, id)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"%v"}`, err), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(map[string]interface{}{"success": true})

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{"error": "method not allowed"})
	}
}

