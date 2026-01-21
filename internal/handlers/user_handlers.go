package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"network-script-generator/internal/database"
)

// User represents a user for the administration dashboard
type User struct {
	ID        int    `json:"id"`
	Username  string `json:"username"`
	Role      string `json:"role"`
	Status    string `json:"status"`
	Quota     string `json:"quota"`
	Usage     string `json:"usage"`
	IsLocked  bool   `json:"is_locked"`
	CreatedAt string `json:"createdAt"`
}

// HandleGetUsers handles request to list all users
func HandleGetUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := database.DB.Query("SELECT id, username, role, status, quota, usage, is_locked, created_at FROM users")
	if err != nil {
		log.Printf("Error fetching users: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		var isLocked int
		if err := rows.Scan(&u.ID, &u.Username, &u.Role, &u.Status, &u.Quota, &u.Usage, &isLocked, &u.CreatedAt); err != nil {
			log.Printf("Error scanning user: %v", err)
			continue
		}
		u.IsLocked = isLocked == 1
		users = append(users, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}
