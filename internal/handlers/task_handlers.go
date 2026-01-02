package handlers

import (
	"encoding/json"
	"net/http"
	"time"
)

// HandleCreateTask handles task creation requests
func HandleCreateTask(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name        string                 `json:"name"`
		Description string                 `json:"description"`
		Metadata    map[string]interface{} `json:"metadata,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "Task name is required", http.StatusBadRequest)
		return
	}

	tm := GetTaskManager()
	task := tm.CreateTask(req.Name, req.Description, req.Metadata)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(task)
}

// HandleGetTask handles getting a single task
func HandleGetTask(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	taskID := r.URL.Query().Get("id")
	if taskID == "" {
		http.Error(w, "Task ID is required", http.StatusBadRequest)
		return
	}

	tm := GetTaskManager()
	task, exists := tm.GetTask(taskID)
	if !exists {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(task)
}

// HandleGetAllTasks handles getting all tasks
func HandleGetAllTasks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tm := GetTaskManager()
	activeOnly := r.URL.Query().Get("active") == "true"

	var tasks []*Task
	if activeOnly {
		tasks = tm.GetActiveTasks()
	} else {
		tasks = tm.GetAllTasks()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"tasks":   tasks,
	})
}

// HandleUpdateTaskProgress handles updating task progress
func HandleUpdateTaskProgress(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TaskID   string `json:"taskId"`
		Progress int    `json:"progress"`
		Message  string `json:"message,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if req.Progress < 0 || req.Progress > 100 {
		http.Error(w, "Progress must be between 0 and 100", http.StatusBadRequest)
		return
	}

	tm := GetTaskManager()
	if err := tm.UpdateProgress(req.TaskID, req.Progress, req.Message); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

// HandleCompleteTask handles completing a task
func HandleCompleteTask(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TaskID  string `json:"taskId"`
		Message string `json:"message,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	tm := GetTaskManager()
	if err := tm.CompleteTask(req.TaskID, req.Message); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

// HandleFailTask handles failing a task
func HandleFailTask(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TaskID string `json:"taskId"`
		Error  string `json:"error"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	tm := GetTaskManager()
	if err := tm.FailTask(req.TaskID, req.Error); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

// HandleCancelTask handles cancelling a task
func HandleCancelTask(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TaskID string `json:"taskId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	tm := GetTaskManager()
	if err := tm.CancelTask(req.TaskID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

// Example task function for Windows ISO building
func ExampleISOBuildTask(task *Task) error {
	tm := GetTaskManager()

	// Simulate ISO building progress
	steps := []struct {
		progress int
		message  string
		delay    time.Duration
	}{
		{10, "Extracting ISO...", 2 * time.Second},
		{25, "Mounting Windows image...", 3 * time.Second},
		{40, "Applying customizations...", 5 * time.Second},
		{60, "Enabling Windows features...", 4 * time.Second},
		{80, "Rebuilding ISO...", 6 * time.Second},
		{95, "Finalizing...", 2 * time.Second},
		{100, "ISO build completed", 0},
	}

	for _, step := range steps {
		if task.IsCancelled() {
			return nil
		}

		tm.UpdateProgress(task.ID, step.progress, step.message)
		if step.delay > 0 {
			time.Sleep(step.delay)
		}
	}

	return nil
}