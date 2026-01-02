package handlers

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"network-script-generator/internal/database"
)

// WorkflowExecution represents a running workflow execution
type WorkflowExecution struct {
	ID          string
	WorkflowID  string
	WorkflowName string
	TriggerType string
	TriggerID   string
	Status      string // "running", "success", "error"
	StartedAt   time.Time
	FinishedAt  *time.Time
	Progress    int    // 0-100
	Message     string
	mu          sync.RWMutex
}

// WorkflowExecutionManager manages concurrent workflow executions
type WorkflowExecutionManager struct {
	runningExecutions map[string]*WorkflowExecution
	mu                sync.RWMutex
	WorkerPool        chan struct{} // Semaphore for limiting concurrent executions (exported for health checks)
	wsHub             *WebSocketHub
	shutdownChan      chan struct{}
	wg                sync.WaitGroup
	ctx               context.Context
	cancel            context.CancelFunc
}

var (
	executionManager *WorkflowExecutionManager
	executionManagerOnce sync.Once
)

// GetExecutionManager returns the singleton execution manager
func GetExecutionManager() *WorkflowExecutionManager {
	executionManagerOnce.Do(func() {
		ctx, cancel := context.WithCancel(context.Background())
		executionManager = &WorkflowExecutionManager{
			runningExecutions: make(map[string]*WorkflowExecution),
			WorkerPool:        make(chan struct{}, 10), // Allow up to 10 concurrent executions
			wsHub:             NewWebSocketHub(),
			shutdownChan:      make(chan struct{}),
			ctx:               ctx,
			cancel:            cancel,
		}
		// Start WebSocket hub
		go executionManager.wsHub.Run()
	})
	return executionManager
}

// ExecuteWorkflowAsync executes a workflow asynchronously in a goroutine
func (m *WorkflowExecutionManager) ExecuteWorkflowAsync(workflowID, workflowName, triggerType, triggerID string, triggerData map[string]interface{}) string {
	executionID := uuid.New().String()
	
	// Create execution record
	exec := &WorkflowExecution{
		ID:           executionID,
		WorkflowID:   workflowID,
		WorkflowName: workflowName,
		TriggerType:  triggerType,
		TriggerID:    triggerID,
		Status:       "running",
		StartedAt:    time.Now(),
		Progress:    0,
		Message:      "Starting workflow execution...",
	}

	// Add to running executions
	m.mu.Lock()
	m.runningExecutions[executionID] = exec
	m.mu.Unlock()

	// Broadcast execution started
	m.broadcastExecutionUpdate(exec)

	// Create execution record in database
	executionDataJSON, _ := json.Marshal(triggerData)
	_, err := database.RetryExec(`
		INSERT INTO automation_executions (id, workflow_id, trigger_type, trigger_id, status, started_at, data)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, executionID, workflowID, triggerType, triggerID, "running", time.Now(), string(executionDataJSON))

	if err != nil {
		log.Printf("Error creating execution record: %v", err)
	}

	// Execute in goroutine with worker pool
	m.wg.Add(1)
	go func() {
		defer m.wg.Done()
		
		// Acquire worker slot
		m.WorkerPool <- struct{}{}
		defer func() { <-m.WorkerPool }()

		// Check if we're shutting down
		select {
		case <-m.ctx.Done():
			exec.mu.Lock()
			exec.Status = "cancelled"
			exec.Message = "Workflow cancelled due to shutdown"
			exec.FinishedAt = timePtr(time.Now())
			exec.mu.Unlock()
			m.broadcastExecutionUpdate(exec)
			return
		default:
		}

		// Update progress
		exec.mu.Lock()
		exec.Progress = 10
		exec.Message = "Executing workflow nodes..."
		exec.mu.Unlock()
		m.broadcastExecutionUpdate(exec)

		// Execute workflow
		executionContext, err := executeWorkflow(workflowID, executionID, triggerData)
		
		now := time.Now()
		exec.mu.Lock()
		exec.FinishedAt = &now
		
		if err != nil {
			log.Printf("Error executing workflow %s: %v", workflowID, err)
			exec.Status = "error"
			exec.Message = "Workflow execution failed: " + err.Error()
			exec.Progress = 0
		} else {
			exec.Status = "success"
			exec.Message = "Workflow completed successfully"
			exec.Progress = 100
			
			// Save full execution context
			executionDataJSON, _ := json.Marshal(executionContext)
			database.RetryExec(`
				UPDATE automation_executions SET status = ?, finished_at = ?, data = ? WHERE id = ?
			`, "success", now, string(executionDataJSON), executionID)
		}
		exec.mu.Unlock()

		// Broadcast final update
		m.broadcastExecutionUpdate(exec)

		// Remove from running executions after a delay (to allow UI to see completion)
		go func() {
			time.Sleep(5 * time.Second)
			m.mu.Lock()
			delete(m.runningExecutions, executionID)
			m.mu.Unlock()
			// Broadcast removal
			m.broadcastExecutionRemoved(executionID)
		}()

		// Update database
		if err != nil {
			database.RetryExec(`
				UPDATE automation_executions SET status = ?, finished_at = ? WHERE id = ?
			`, "error", now, executionID)
		}
	}()

	return executionID
}

// GetRunningExecutions returns all currently running executions
func (m *WorkflowExecutionManager) GetRunningExecutions() []*WorkflowExecution {
	m.mu.RLock()
	defer m.mu.RUnlock()

	executions := make([]*WorkflowExecution, 0, len(m.runningExecutions))
	for _, exec := range m.runningExecutions {
		execCopy := &WorkflowExecution{
			ID:           exec.ID,
			WorkflowID:   exec.WorkflowID,
			WorkflowName: exec.WorkflowName,
			TriggerType:  exec.TriggerType,
			TriggerID:    exec.TriggerID,
		}
		exec.mu.RLock()
		execCopy.Status = exec.Status
		execCopy.StartedAt = exec.StartedAt
		execCopy.FinishedAt = exec.FinishedAt
		execCopy.Progress = exec.Progress
		execCopy.Message = exec.Message
		exec.mu.RUnlock()
		executions = append(executions, execCopy)
	}
	return executions
}

// GetExecution returns a specific execution by ID
func (m *WorkflowExecutionManager) GetExecution(executionID string) *WorkflowExecution {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	exec, exists := m.runningExecutions[executionID]
	if !exists {
		return nil
	}
	
	execCopy := &WorkflowExecution{
		ID:           exec.ID,
		WorkflowID:   exec.WorkflowID,
		WorkflowName: exec.WorkflowName,
		TriggerType:  exec.TriggerType,
		TriggerID:    exec.TriggerID,
	}
	exec.mu.RLock()
	execCopy.Status = exec.Status
	execCopy.StartedAt = exec.StartedAt
	execCopy.FinishedAt = exec.FinishedAt
	execCopy.Progress = exec.Progress
	execCopy.Message = exec.Message
	exec.mu.RUnlock()
	return execCopy
}

// broadcastExecutionUpdate broadcasts execution update to all WebSocket clients
func (m *WorkflowExecutionManager) broadcastExecutionUpdate(exec *WorkflowExecution) {
	exec.mu.RLock()
	update := map[string]interface{}{
		"type":        "workflow_update",
		"executionId": exec.ID,
		"workflowId":  exec.WorkflowID,
		"workflowName": exec.WorkflowName,
		"triggerType": exec.TriggerType,
		"status":      exec.Status,
		"progress":    exec.Progress,
		"message":     exec.Message,
		"startedAt":   exec.StartedAt.Format(time.RFC3339),
	}
	if exec.FinishedAt != nil {
		update["finishedAt"] = exec.FinishedAt.Format(time.RFC3339)
	}
	exec.mu.RUnlock()

	m.wsHub.Broadcast(update)
}

// broadcastExecutionRemoved broadcasts execution removal to all WebSocket clients
func (m *WorkflowExecutionManager) broadcastExecutionRemoved(executionID string) {
	update := map[string]interface{}{
		"type":        "workflow_removed",
		"executionId": executionID,
	}
	m.wsHub.Broadcast(update)
}

// Shutdown gracefully shuts down the execution manager, waiting for all workflows to complete
func (m *WorkflowExecutionManager) Shutdown(timeout time.Duration) error {
	log.Println("Shutting down workflow execution manager...")
	
	// Cancel context to stop new executions
	m.cancel()
	
	// Wait for all running workflows with timeout
	done := make(chan struct{})
	go func() {
		m.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		log.Println("All workflows completed")
	case <-time.After(timeout):
		log.Printf("Timeout waiting for workflows to complete after %v", timeout)
		// Force close WebSocket hub
		m.wsHub.Shutdown()
		return nil
	}

	// Close WebSocket hub
	m.wsHub.Shutdown()
	
	log.Println("Workflow execution manager shut down complete")
	return nil
}

// Helper function
func timePtr(t time.Time) *time.Time {
	return &t
}

