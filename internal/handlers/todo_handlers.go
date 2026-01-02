package handlers

import (
	// Standard library - database
	"database/sql"
	
	// Standard library - encoding
	"encoding/json"
	
	// Standard library - net
	"net/http"
	
	// Standard library - other
	"log"
	
	// Internal packages
	"network-script-generator/internal/database"
)

// Todo handlers
func HandleGetTodos(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	
	var rows *sql.Rows
	var err error
	
	if status != "" {
		rows, err = database.DB.Query(
			"SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.position, COALESCE(tt.id, t.tab) as tab, t.created_at, t.updated_at FROM todos t LEFT JOIN todo_tabs tt ON t.tab_id = tt.id WHERE t.status = ? ORDER BY t.position ASC, t.created_at DESC",
			status,
		)
	} else {
		rows, err = database.DB.Query(
			"SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.position, COALESCE(tt.id, t.tab) as tab, t.created_at, t.updated_at FROM todos t LEFT JOIN todo_tabs tt ON t.tab_id = tt.id ORDER BY t.status, t.position ASC, t.created_at DESC",
		)
	}
	
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var todos []map[string]interface{}
	for rows.Next() {
		var id, position int
		var title, description, status, priority, tab sql.NullString
		var dueDate, createdAt, updatedAt sql.NullString

		err := rows.Scan(&id, &title, &description, &status, &priority, &dueDate, &position, &tab, &createdAt, &updatedAt)
		if err != nil {
			continue
		}

		tabValue := ""
		if tab.Valid {
			tabValue = tab.String
		}

		// Get subtask counts
		var totalSubtasks, completedSubtasks int
		database.DB.QueryRow("SELECT COUNT(*), SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) FROM todo_subtasks WHERE todo_id = ?", id).Scan(&totalSubtasks, &completedSubtasks)

		todo := map[string]interface{}{
			"id":                id,
			"title":             title.String,
			"description":       description.String,
			"status":            status.String,
			"priority":          priority.String,
			"dueDate":           dueDate.String,
			"position":          position,
			"tab":               tabValue,
			"createdAt":         createdAt.String,
			"updatedAt":         updatedAt.String,
			"subtasksTotal":     totalSubtasks,
			"subtasksCompleted": completedSubtasks,
		}
		todos = append(todos, todo)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(todos)
}

func HandleCreateTodo(w http.ResponseWriter, r *http.Request) {
	var todo map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&todo); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	title, ok := todo["title"].(string)
	if !ok || title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}
	
	description := ""
	if d, ok := todo["description"].(string); ok {
		description = d
	}
	status := "todo"
	if s, ok := todo["status"].(string); ok && s != "" {
		status = s
	}
	priority := "medium"
	if p, ok := todo["priority"].(string); ok && p != "" {
		priority = p
	}
	
	var dueDate sql.NullString
	if dd, ok := todo["dueDate"].(string); ok && dd != "" {
		dueDate.String = dd
		dueDate.Valid = true
	}

	var tab sql.NullString
	if t, ok := todo["tab"].(string); ok && t != "" {
		tab.String = t
		tab.Valid = true
	}

	// Get max position for this status
	var maxPos int
	database.DB.QueryRow("SELECT COALESCE(MAX(position), 0) FROM todos WHERE status = ?", status).Scan(&maxPos)
	position := maxPos + 1

	result, err := database.DB.Exec(
		"INSERT INTO todos (title, description, status, priority, due_date, position, tab) VALUES (?, ?, ?, ?, ?, ?, ?)",
		title, description, status, priority, dueDate, position, tab,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, err := result.LastInsertId()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	response := map[string]interface{}{
		"id":      id,
		"success": true,
	}
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %v", err)
		return
	}
}

func HandleUpdateTodo(w http.ResponseWriter, r *http.Request) {
	var todo map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&todo); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	idFloat, ok := todo["id"].(float64)
	if !ok {
		http.Error(w, "Invalid todo ID", http.StatusBadRequest)
		return
	}
	id := int(idFloat)
	
	title, ok := todo["title"].(string)
	if !ok || title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}
	
	description := ""
	if d, ok := todo["description"].(string); ok {
		description = d
	}
	status := "todo"
	if s, ok := todo["status"].(string); ok && s != "" {
		status = s
	}
	priority := "medium"
	if p, ok := todo["priority"].(string); ok && p != "" {
		priority = p
	}
	
	var dueDate sql.NullString
	if dd, ok := todo["dueDate"].(string); ok && dd != "" {
		dueDate.String = dd
		dueDate.Valid = true
	}

	var tab sql.NullString
	// Handle tab field - can be string, null, or missing
	// If tab is provided (even if null), use it. Otherwise preserve existing value.
	if tabVal, exists := todo["tab"]; exists {
		if tabVal == nil {
			// Explicitly set to NULL
			tab.Valid = false
		} else if t, ok := tabVal.(string); ok && t != "" {
			tab.String = t
			tab.Valid = true
		} else {
			// Empty string or invalid type - set to NULL
			tab.Valid = false
		}
	} else {
		// Tab field not provided - preserve existing value by getting it from database
		var currentTab sql.NullString
		err := database.DB.QueryRow("SELECT tab FROM todos WHERE id = ?", id).Scan(&currentTab)
		if err == nil {
			tab = currentTab
		} else {
			// If we can't get current value, set to NULL
			tab.Valid = false
		}
	}

	position := 0
	if p, ok := todo["position"].(float64); ok {
		position = int(p)
	}

	_, err := database.DB.Exec(
		"UPDATE todos SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, position = ?, tab = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		title, description, status, priority, dueDate, position, tab, id,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func HandleDeleteTodo(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "ID required", http.StatusBadRequest)
		return
	}

	_, err := database.DB.Exec("DELETE FROM todos WHERE id = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func HandleReorderTodos(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var updates []map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	for _, update := range updates {
		idFloat, ok := update["id"].(float64)
		if !ok {
			tx.Rollback()
			http.Error(w, "Invalid todo ID in update", http.StatusBadRequest)
			return
		}
		id := int(idFloat)
		
		status, ok := update["status"].(string)
		if !ok {
			tx.Rollback()
			http.Error(w, "Invalid status in update", http.StatusBadRequest)
			return
		}
		
		positionFloat, ok := update["position"].(float64)
		if !ok {
			tx.Rollback()
			http.Error(w, "Invalid position in update", http.StatusBadRequest)
			return
		}
		position := int(positionFloat)
		
		var tab sql.NullString
		if t, ok := update["tab"].(string); ok && t != "" {
			tab.String = t
			tab.Valid = true
		} else if update["tab"] == nil {
			// Explicitly set to NULL if tab is null
			tab.Valid = false
		}
		
		_, err := tx.Exec(
			"UPDATE todos SET status = ?, position = ?, tab = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
			status, position, tab, id,
		)
		if err != nil {
			tx.Rollback()
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	tx.Commit()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

// Todo Tabs API handlers
func HandleGetTodoTabs(w http.ResponseWriter, r *http.Request) {
	// Check if table exists, if not create it
	_, err := database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS todo_tabs (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			icon TEXT NOT NULL,
			position INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		log.Printf("Error creating todo_tabs table: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Initialize default tabs if table is empty
	var count int
	err = database.DB.QueryRow("SELECT COUNT(*) FROM todo_tabs").Scan(&count)
	if err == nil && count == 0 {
		database.InitDefaultTodoTabs()
	}

	rows, err := database.DB.Query("SELECT id, name, icon, position FROM todo_tabs ORDER BY position, name")
	if err != nil {
		log.Printf("Error querying todo_tabs: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tabs []map[string]interface{}
	for rows.Next() {
		var id, name, icon string
		var position int
		err := rows.Scan(&id, &name, &icon, &position)
		if err != nil {
			log.Printf("Error scanning tab row: %v", err)
			continue
		}
		tabs = append(tabs, map[string]interface{}{
			"id":       id,
			"name":     name,
			"icon":     icon,
			"position": position,
		})
	}

	// If still no tabs, return defaults
	if len(tabs) == 0 {
		tabs = []map[string]interface{}{
			{"id": "all", "name": "All Tasks", "icon": "fa-list", "position": 0},
			{"id": "personal", "name": "Personal", "icon": "fa-user", "position": 1},
			{"id": "work", "name": "Work", "icon": "fa-briefcase", "position": 2},
			{"id": "projects", "name": "Projects", "icon": "fa-folder", "position": 3},
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tabs)
}

func HandleCreateTodoTab(w http.ResponseWriter, r *http.Request) {
	var tab map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&tab); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id, ok := tab["id"].(string)
	if !ok || id == "" {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	name, ok := tab["name"].(string)
	if !ok || name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	icon := "fa-star"
	if i, ok := tab["icon"].(string); ok && i != "" {
		icon = i
	}

	// Get max position
	var maxPos int
	database.DB.QueryRow("SELECT COALESCE(MAX(position), 0) FROM todo_tabs").Scan(&maxPos)
	position := maxPos + 1

	_, err := database.DB.Exec(
		"INSERT INTO todo_tabs (id, name, icon, position) VALUES (?, ?, ?, ?)",
		id, name, icon, position,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":       id,
		"name":     name,
		"icon":     icon,
		"position": position,
		"success":  true,
	})
}

func HandleDeleteTodoTab(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "ID required", http.StatusBadRequest)
		return
	}

	// Prevent deleting the "all" tab
	if id == "all" {
		http.Error(w, "Cannot delete the 'All Tasks' tab", http.StatusBadRequest)
		return
	}

	// Start transaction
	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Delete the tab
	_, err = tx.Exec("DELETE FROM todo_tabs WHERE id = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Set todos in this tab to NULL (unassigned)
	_, err = tx.Exec("UPDATE todos SET tab = NULL WHERE tab = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Commit transaction
	err = tx.Commit()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

// Todo Subtasks API handlers
func HandleGetSubtasks(w http.ResponseWriter, r *http.Request) {
	todoID := r.URL.Query().Get("todo_id")
	if todoID == "" {
		http.Error(w, "todo_id required", http.StatusBadRequest)
		return
	}

	rows, err := database.DB.Query(
		"SELECT id, title, completed, position FROM todo_subtasks WHERE todo_id = ? ORDER BY position ASC, created_at ASC",
		todoID,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var subtasks []map[string]interface{}
	for rows.Next() {
		var id, position int
		var title string
		var completed int

		err := rows.Scan(&id, &title, &completed, &position)
		if err != nil {
			continue
		}

		subtasks = append(subtasks, map[string]interface{}{
			"id":        id,
			"todoId":    todoID,
			"title":     title,
			"completed": completed == 1,
			"position":  position,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(subtasks)
}

func HandleCreateSubtask(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var subtask map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&subtask); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	todoIDFloat, ok := subtask["todoId"].(float64)
	if !ok {
		http.Error(w, "todoId is required", http.StatusBadRequest)
		return
	}
	todoID := int(todoIDFloat)

	title, ok := subtask["title"].(string)
	if !ok || title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}

	// Get max position for this todo
	var maxPos int
	database.DB.QueryRow("SELECT COALESCE(MAX(position), 0) FROM todo_subtasks WHERE todo_id = ?", todoID).Scan(&maxPos)
	position := maxPos + 1

	result, err := database.DB.Exec(
		"INSERT INTO todo_subtasks (todo_id, title, position) VALUES (?, ?, ?)",
		todoID, title, position,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, err := result.LastInsertId()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":      id,
		"success": true,
	})
}

func HandleUpdateSubtask(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var subtask map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&subtask); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	idFloat, ok := subtask["id"].(float64)
	if !ok {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}
	id := int(idFloat)

	title, ok := subtask["title"].(string)
	if !ok || title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}

	_, err := database.DB.Exec(
		"UPDATE todo_subtasks SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		title, id,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func HandleToggleSubtask(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var subtask map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&subtask); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	idFloat, ok := subtask["id"].(float64)
	if !ok {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}
	id := int(idFloat)

	completed, ok := subtask["completed"].(bool)
	if !ok {
		http.Error(w, "completed is required", http.StatusBadRequest)
		return
	}

	completedInt := 0
	if completed {
		completedInt = 1
	}

	_, err := database.DB.Exec(
		"UPDATE todo_subtasks SET completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		completedInt, id,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func HandleDeleteSubtask(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "ID required", http.StatusBadRequest)
		return
	}

	_, err := database.DB.Exec("DELETE FROM todo_subtasks WHERE id = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

