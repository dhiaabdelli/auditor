package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"network-script-generator/internal/database"

	"golang.org/x/crypto/bcrypt"
)

// User represents a user for the administration dashboard
type User struct {
	ID        int    `json:"id"`
	Username  string `json:"username"`
	Role      string `json:"role"`
	Status    string `json:"status"`
	Quota     string `json:"quota"`
	Usage     string `json:"usage"`
	Email     string `json:"email"`
	IsLocked  bool   `json:"is_locked"`
	CreatedAt string `json:"createdAt"`
}

// HandleGetUsers handles request to list all users
func HandleGetUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := database.DB.Query("SELECT id, username, role, status, quota, usage, COALESCE(email, ''), is_locked, created_at FROM users")
	if err != nil {
		log.Printf("Error fetching users: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users = []User{}
	for rows.Next() {
		var u User
		var isLocked int
		if err := rows.Scan(&u.ID, &u.Username, &u.Role, &u.Status, &u.Quota, &u.Usage, &u.Email, &isLocked, &u.CreatedAt); err != nil {
			log.Printf("Error scanning user: %v", err)
			continue
		}
		u.IsLocked = isLocked == 1
		users = append(users, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// HandleCreateUser handles request to create a new user
func HandleCreateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Role     string `json:"role"`
		Status   string `json:"status"`
		Email    string `json:"email"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Username == "" || req.Password == "" {
		http.Error(w, "Username and password are required", http.StatusBadRequest)
		return
	}

	// Generate salt
	saltBytes := make([]byte, 16)
	if _, err := rand.Read(saltBytes); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	salt := base64.URLEncoding.EncodeToString(saltBytes)

	// Hash password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	_, err = database.DB.Exec(
		"INSERT INTO users (username, password_hash, salt, role, status, email) VALUES (?, ?, ?, ?, ?, ?)",
		req.Username, string(passwordHash), salt, req.Role, req.Status, req.Email,
	)
	if err != nil {
		log.Printf("Error creating user: %v", err)
		http.Error(w, "Username already exists or database error", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User created successfully"})
}

// HandleUpdateUser handles request to update an existing user
func HandleUpdateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ID       int    `json:"id"`
		Username string `json:"username"`
		Role     string `json:"role"`
		Status   string `json:"status"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Update basic info
	_, err := database.DB.Exec(
		"UPDATE users SET role = ?, status = ?, email = ? WHERE id = ? OR username = ?",
		req.Role, req.Status, req.Email, req.ID, req.Username,
	)
	if err != nil {
		log.Printf("Error updating user: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Update password if provided
	if req.Password != "" {
		passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		_, err = database.DB.Exec(
			"UPDATE users SET password_hash = ? WHERE id = ? OR username = ?",
			string(passwordHash), req.ID, req.Username,
		)
		if err != nil {
			log.Printf("Error updating user password: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "User updated successfully"})
}

// HandleDeleteUser handles request to delete a user
func HandleDeleteUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	username := r.URL.Query().Get("username")
	if username == "" {
		http.Error(w, "Username is required", http.StatusBadRequest)
		return
	}

	// Prevent deleting the last admin
	if username == "admin" {
		http.Error(w, "Cannot delete primary administrator", http.StatusForbidden)
		return
	}

	_, err := database.DB.Exec("DELETE FROM users WHERE username = ?", username)
	if err != nil {
		log.Printf("Error deleting user: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "User deleted successfully"})
}
