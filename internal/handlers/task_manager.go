package handlers

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
)

// TaskStatus represents the status of a task
type TaskStatus string

const (
	TaskStatusPending   TaskStatus = "pending"
	TaskStatusRunning   TaskStatus = "running"
	TaskStatusCompleted TaskStatus = "completed"
	TaskStatusFailed    TaskStatus = "failed"
	TaskStatusCancelled TaskStatus = "cancelled"
)

// Task represents a background task
type Task struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Status      TaskStatus             `json:"status"`
	Progress    int                    `json:"progress"` // 0-100
	Message     string                 `json:"message"`
	CreatedAt   time.Time              `json:"createdAt"`
	StartedAt   *time.Time             `json:"startedAt,omitempty"`
	FinishedAt  *time.Time             `json:"finishedAt,omitempty"`
	Error       string                 `json:"error,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	cancelChan  chan struct{}
	mu          sync.RWMutex
}

// TaskManager manages background tasks
type TaskManager struct {
	tasks map[string]*Task
	mu    sync.RWMutex
	wsHub *WebSocketHub
}

var (
	taskManagerInstance *TaskManager
	taskManagerOnce     sync.Once
)

// GetTaskManager returns the singleton task manager instance
func GetTaskManager() *TaskManager {
	taskManagerOnce.Do(func() {
		// Use the workflow WebSocket hub or create a new one
		execManager := GetExecutionManager()
		taskManagerInstance = &TaskManager{
			tasks: make(map[string]*Task),
			wsHub: execManager.wsHub, // Reuse workflow hub
		}
	})
	return taskManagerInstance
}

// CreateTask creates a new task
func (tm *TaskManager) CreateTask(name, description string, metadata map[string]interface{}) *Task {
	task := &Task{
		ID:          uuid.New().String(),
		Name:        name,
		Description: description,
		Status:      TaskStatusPending,
		Progress:    0,
		Message:     "Task created",
		CreatedAt:   time.Now(),
		Metadata:    metadata,
		cancelChan:  make(chan struct{}),
	}

	tm.mu.Lock()
	tm.tasks[task.ID] = task
	tm.mu.Unlock()

	// Broadcast task creation
	tm.broadcastTaskUpdate(task)

	return task
}

// GetTask retrieves a task by ID
func (tm *TaskManager) GetTask(id string) (*Task, bool) {
	tm.mu.RLock()
	defer tm.mu.RUnlock()
	task, exists := tm.tasks[id]
	return task, exists
}

// GetAllTasks returns all tasks
func (tm *TaskManager) GetAllTasks() []*Task {
	tm.mu.RLock()
	defer tm.mu.RUnlock()
	tasks := make([]*Task, 0, len(tm.tasks))
	for _, task := range tm.tasks {
		tasks = append(tasks, task)
	}
	return tasks
}

// GetActiveTasks returns only active (pending or running) tasks
func (tm *TaskManager) GetActiveTasks() []*Task {
	tm.mu.RLock()
	defer tm.mu.RUnlock()
	tasks := make([]*Task, 0)
	for _, task := range tm.tasks {
		if task.Status == TaskStatusPending || task.Status == TaskStatusRunning {
			tasks = append(tasks, task)
		}
	}
	return tasks
}

// UpdateProgress updates the progress of a task
func (tm *TaskManager) UpdateProgress(id string, progress int, message string) error {
	tm.mu.Lock()
	task, exists := tm.tasks[id]
	if !exists {
		tm.mu.Unlock()
		return fmt.Errorf("task not found")
	}
	tm.mu.Unlock()

	task.mu.Lock()
	// Allow progress updates for running or pending tasks
	if task.Status == TaskStatusRunning || task.Status == TaskStatusPending {
		task.Progress = progress
		if message != "" {
			task.Message = message
		}
	} else {
		// Log if trying to update a task that's not in the right state
		log.Printf("Warning: Attempted to update progress for task %s with status %s (progress: %d, message: %s)", id, task.Status, progress, message)
	}
	task.mu.Unlock()

	tm.broadcastTaskUpdate(task)
	return nil
}

// StartTask starts a task
func (tm *TaskManager) StartTask(id string) error {
	tm.mu.Lock()
	task, exists := tm.tasks[id]
	if !exists {
		tm.mu.Unlock()
		return fmt.Errorf("task not found")
	}
	tm.mu.Unlock()

	task.mu.Lock()
	if task.Status != TaskStatusPending {
		task.mu.Unlock()
		return fmt.Errorf("task cannot be started from status: %s", task.Status)
	}
	now := time.Now()
	task.Status = TaskStatusRunning
	task.StartedAt = &now
	// Keep existing progress if already set
	if task.Progress == 0 {
		task.Progress = 0
		task.Message = "Task started"
	}
	task.mu.Unlock()

	tm.broadcastTaskUpdate(task)
	return nil
}

// CompleteTask marks a task as completed
func (tm *TaskManager) CompleteTask(id string, message string) error {
	tm.mu.Lock()
	task, exists := tm.tasks[id]
	if !exists {
		tm.mu.Unlock()
		return fmt.Errorf("task not found")
	}
	tm.mu.Unlock()

	task.mu.Lock()
	if task.Status != TaskStatusRunning {
		task.mu.Unlock()
		return fmt.Errorf("task cannot be completed from status: %s", task.Status)
	}
	now := time.Now()
	task.Status = TaskStatusCompleted
	task.FinishedAt = &now
	task.Progress = 100
	if message != "" {
		task.Message = message
	} else {
		task.Message = "Task completed successfully"
	}
	task.mu.Unlock()

	tm.broadcastTaskUpdate(task)
	
	return nil
}

// FailTask marks a task as failed
func (tm *TaskManager) FailTask(id string, errorMsg string) error {
	tm.mu.Lock()
	task, exists := tm.tasks[id]
	if !exists {
		tm.mu.Unlock()
		return fmt.Errorf("task not found")
	}
	tm.mu.Unlock()

	task.mu.Lock()
	now := time.Now()
	task.Status = TaskStatusFailed
	task.FinishedAt = &now
	task.Error = errorMsg
	if errorMsg != "" {
		task.Message = fmt.Sprintf("Task failed: %s", errorMsg)
	} else {
		task.Message = "Task failed"
	}
	task.mu.Unlock()

	tm.broadcastTaskUpdate(task)
	
	return nil
}

// CancelTask cancels a task
func (tm *TaskManager) CancelTask(id string) error {
	tm.mu.Lock()
	task, exists := tm.tasks[id]
	if !exists {
		tm.mu.Unlock()
		return fmt.Errorf("task not found")
	}
	tm.mu.Unlock()

	task.mu.Lock()
	if task.Status != TaskStatusPending && task.Status != TaskStatusRunning {
		task.mu.Unlock()
		return fmt.Errorf("task cannot be cancelled from status: %s", task.Status)
	}
	
	// Signal cancellation
	select {
	case task.cancelChan <- struct{}{}:
	default:
	}
	
	now := time.Now()
	task.Status = TaskStatusCancelled
	task.FinishedAt = &now
	task.Message = "Task cancelled"
	task.mu.Unlock()

	tm.broadcastTaskUpdate(task)
	return nil
}

// IsCancelled checks if a task has been cancelled
func (t *Task) IsCancelled() bool {
	select {
	case <-t.cancelChan:
		return true
	default:
		return false
	}
}

// WaitForCancellation waits for cancellation signal
func (t *Task) WaitForCancellation() {
	<-t.cancelChan
}

// broadcastTaskUpdate broadcasts task update to all WebSocket clients
func (tm *TaskManager) broadcastTaskUpdate(task *Task) {
	task.mu.RLock()
	update := map[string]interface{}{
		"type":        "task_update",
		"taskId":      task.ID,
		"name":        task.Name,
		"description": task.Description,
		"status":      task.Status,
		"progress":    task.Progress,
		"message":     task.Message,
		"createdAt":   task.CreatedAt.Format(time.RFC3339),
	}
	if task.StartedAt != nil {
		update["startedAt"] = task.StartedAt.Format(time.RFC3339)
	}
	if task.FinishedAt != nil {
		update["finishedAt"] = task.FinishedAt.Format(time.RFC3339)
	}
	if task.Error != "" {
		update["error"] = task.Error
	}
	if task.Metadata != nil {
		update["metadata"] = task.Metadata
	}
	task.mu.RUnlock()

	if tm.wsHub != nil {
		tm.wsHub.Broadcast(update)
	}
}

// RunTask executes a task function with progress updates
func (tm *TaskManager) RunTask(task *Task, taskFunc func(*Task) error) {
	// Start the task
	if err := tm.StartTask(task.ID); err != nil {
		log.Printf("Error starting task %s: %v", task.ID, err)
		return
	}

	// Run the task function in a goroutine
	go func() {
		defer func() {
			if r := recover(); r != nil {
				tm.FailTask(task.ID, fmt.Sprintf("Task panicked: %v", r))
			}
		}()

		err := taskFunc(task)
		if err != nil {
			if task.IsCancelled() {
				tm.CancelTask(task.ID)
			} else {
				tm.FailTask(task.ID, err.Error())
			}
		} else if !task.IsCancelled() {
			// Get the current task message to preserve it if it was set
			task.mu.RLock()
			message := task.Message
			task.mu.RUnlock()
			
			// Use the existing message if it's meaningful, otherwise use default
			if message == "" || message == "Task started" {
				message = "Task completed successfully"
			}
			
			tm.CompleteTask(task.ID, message)
		}
	}()
}
















