package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/robfig/cron/v3"
	"network-script-generator/internal/database"
)

var (
	cronScheduler *cron.Cron
	schedulerEntries map[string]cron.EntryID
	cronParser cron.Parser
)

func init() {
	// Initialize cron scheduler with seconds support
	cronScheduler = cron.New(cron.WithSeconds())
	cronScheduler.Start()
	schedulerEntries = make(map[string]cron.EntryID)
	// Create parser with seconds support for validation
	cronParser = cron.NewParser(cron.Second | cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow | cron.Descriptor)
	// Note: loadActiveSchedulers() is called after database initialization in main.go
}

// InitSchedulers loads active schedulers from database
// This should be called after database initialization
func InitSchedulers() {
	loadActiveSchedulers()
}

// StopSchedulers stops all cron jobs gracefully
// This should be called before closing the database
func StopSchedulers() {
	if cronScheduler != nil {
		log.Println("Stopping cron scheduler...")
		ctx := cronScheduler.Stop()
		<-ctx.Done()
		log.Println("Cron scheduler stopped")
	}
}

// SchedulerRequest represents scheduler creation/update request
type SchedulerRequest struct {
	Name          string `json:"name"`
	CronExpression string `json:"cronExpression"`
	Active        bool   `json:"active"`
	Timezone      string `json:"timezone"`
}

// HandleGetSchedulers returns all schedulers for a workflow
func HandleGetSchedulers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	workflowID := r.URL.Query().Get("workflowId")
	if workflowID == "" {
		http.Error(w, "Workflow ID is required", http.StatusBadRequest)
		return
	}

	rows, err := database.RetryQuery(`
		SELECT id, workflow_id, name, cron_expression, active, timezone, created_at, updated_at
		FROM automation_schedulers
		WHERE workflow_id = ?
		ORDER BY created_at DESC
	`, workflowID)

	if err != nil {
		log.Printf("Error fetching schedulers: %v", err)
		http.Error(w, "Failed to fetch schedulers", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var schedulers []database.AutomationScheduler
	for rows.Next() {
		var sched database.AutomationScheduler
		err := rows.Scan(&sched.ID, &sched.WorkflowID, &sched.Name, &sched.CronExpression, &sched.Active, &sched.Timezone, &sched.CreatedAt, &sched.UpdatedAt)
		if err != nil {
			log.Printf("Error scanning scheduler: %v", err)
			continue
		}
		schedulers = append(schedulers, sched)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(schedulers)
}

// HandleCreateScheduler creates a new scheduler
func HandleCreateScheduler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		WorkflowID string `json:"workflowId"`
		SchedulerRequest
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkflowID == "" {
		http.Error(w, "Workflow ID is required", http.StatusBadRequest)
		return
	}

	if req.CronExpression == "" {
		http.Error(w, "Cron expression is required", http.StatusBadRequest)
		return
	}

	// Validate cron expression (6 fields with seconds support)
	_, err := cronParser.Parse(req.CronExpression)
	if err != nil {
		http.Error(w, fmt.Sprintf("Invalid cron expression: %v", err), http.StatusBadRequest)
		return
	}

	if req.Timezone == "" {
		req.Timezone = "UTC"
	}

	schedulerID := uuid.New().String()
	now := time.Now()

	_, err = database.RetryExec(`
		INSERT INTO automation_schedulers (id, workflow_id, name, cron_expression, active, timezone, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, schedulerID, req.WorkflowID, req.Name, req.CronExpression, req.Active, req.Timezone, now, now)

	if err != nil {
		log.Printf("Error creating scheduler: %v", err)
		http.Error(w, "Failed to create scheduler", http.StatusInternalServerError)
		return
	}

	scheduler := database.AutomationScheduler{
		ID:            schedulerID,
		WorkflowID:    req.WorkflowID,
		Name:          req.Name,
		CronExpression: req.CronExpression,
		Active:        req.Active,
		Timezone:      req.Timezone,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	// If active, add to cron scheduler
	if req.Active {
		addSchedulerToCron(scheduler)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(scheduler)
}

// HandleUpdateScheduler updates an existing scheduler
func HandleUpdateScheduler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	schedulerID := r.URL.Query().Get("id")
	if schedulerID == "" {
		http.Error(w, "Scheduler ID is required", http.StatusBadRequest)
		return
	}

	var req SchedulerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate cron expression if provided (6 fields with seconds support)
	if req.CronExpression != "" {
		_, err := cronParser.Parse(req.CronExpression)
		if err != nil {
			http.Error(w, fmt.Sprintf("Invalid cron expression: %v", err), http.StatusBadRequest)
			return
		}
	}

	// Get current scheduler to check if it was active
	var wasActive bool
	var workflowID string
	err := database.RetryQueryRow(`
		SELECT active, workflow_id FROM automation_schedulers WHERE id = ?
	`, schedulerID).Scan(&wasActive, &workflowID)
	if err != nil {
		log.Printf("Error fetching scheduler: %v", err)
		http.Error(w, "Scheduler not found", http.StatusNotFound)
		return
	}

	// Remove from cron if it was active
	if wasActive {
		removeSchedulerFromCron(schedulerID)
	}

	now := time.Now()

	// Build update query dynamically
	updates := []string{"updated_at = ?"}
	args := []interface{}{now}

	if req.Name != "" {
		updates = append(updates, "name = ?")
		args = append(args, req.Name)
	}
	if req.CronExpression != "" {
		updates = append(updates, "cron_expression = ?")
		args = append(args, req.CronExpression)
	}
	updates = append(updates, "active = ?")
	args = append(args, req.Active)
	if req.Timezone != "" {
		updates = append(updates, "timezone = ?")
		args = append(args, req.Timezone)
	}

	args = append(args, schedulerID)

	query := fmt.Sprintf("UPDATE automation_schedulers SET %s WHERE id = ?", strings.Join(updates, ", "))
	_, err = database.RetryExec(query, args...)

	if err != nil {
		log.Printf("Error updating scheduler: %v", err)
		http.Error(w, "Failed to update scheduler", http.StatusInternalServerError)
		return
	}

	// Fetch updated scheduler
	var scheduler database.AutomationScheduler
	err = database.RetryQueryRow(`
		SELECT id, workflow_id, name, cron_expression, active, timezone, created_at, updated_at
		FROM automation_schedulers
		WHERE id = ?
	`, schedulerID).Scan(&scheduler.ID, &scheduler.WorkflowID, &scheduler.Name, &scheduler.CronExpression, &scheduler.Active, &scheduler.Timezone, &scheduler.CreatedAt, &scheduler.UpdatedAt)

	if err != nil {
		log.Printf("Error fetching updated scheduler: %v", err)
		http.Error(w, "Failed to fetch updated scheduler", http.StatusInternalServerError)
		return
	}

	// Add to cron if now active
	if scheduler.Active {
		addSchedulerToCron(scheduler)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(scheduler)
}

// HandleDeleteScheduler deletes a scheduler
func HandleDeleteScheduler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	schedulerID := r.URL.Query().Get("id")
	if schedulerID == "" {
		http.Error(w, "Scheduler ID is required", http.StatusBadRequest)
		return
	}

	// Remove from cron scheduler
	removeSchedulerFromCron(schedulerID)

	_, err := database.RetryExec(`DELETE FROM automation_schedulers WHERE id = ?`, schedulerID)
	if err != nil {
		log.Printf("Error deleting scheduler: %v", err)
		http.Error(w, "Failed to delete scheduler", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// addSchedulerToCron adds a scheduler to the cron runner
func addSchedulerToCron(scheduler database.AutomationScheduler) {
	// Remove existing entry if any
	if entryID, exists := schedulerEntries[scheduler.ID]; exists {
		cronScheduler.Remove(entryID)
		delete(schedulerEntries, scheduler.ID)
	}

	// Add new entry
	entryID, err := cronScheduler.AddFunc(scheduler.CronExpression, func() {
		triggerScheduledWorkflow(scheduler.WorkflowID, scheduler.ID)
	})

	if err != nil {
		log.Printf("Error adding scheduler to cron: %v", err)
		return
	}

	schedulerEntries[scheduler.ID] = entryID
	log.Printf("Added scheduler %s (%s) to cron", scheduler.ID, scheduler.CronExpression)
}

// removeSchedulerFromCron removes a scheduler from the cron runner
func removeSchedulerFromCron(schedulerID string) {
	if entryID, exists := schedulerEntries[schedulerID]; exists {
		cronScheduler.Remove(entryID)
		delete(schedulerEntries, schedulerID)
		log.Printf("Removed scheduler %s from cron", schedulerID)
	}
}

// triggerScheduledWorkflow triggers a workflow execution
func triggerScheduledWorkflow(workflowID, schedulerID string) {
	// Check if database is still available
	if database.DB == nil {
		log.Printf("Database is closed, skipping scheduled workflow execution for scheduler %s", schedulerID)
		return
	}

	// Verify database connection is still valid
	if err := database.DB.Ping(); err != nil {
		log.Printf("Database connection is invalid, skipping scheduled workflow execution for scheduler %s: %v", schedulerID, err)
		return
	}

	// Get workflow name
	var workflowName string
	err := database.RetryQueryRow(`SELECT name FROM automation_workflows WHERE id = ?`, workflowID).Scan(&workflowName)
	if err != nil {
		workflowName = "Unknown Workflow"
	}

	executionData := map[string]interface{}{
		"trigger": "scheduler",
		"schedulerId": schedulerID,
		"time":    time.Now().Format(time.RFC3339),
	}

	// Execute workflow using execution manager (async with dedicated goroutine)
	manager := GetExecutionManager()
	manager.ExecuteWorkflowAsync(workflowID, workflowName, "scheduler", schedulerID, executionData)
}

// loadActiveSchedulers loads all active schedulers from database
func loadActiveSchedulers() {
	rows, err := database.RetryQuery(`
		SELECT id, workflow_id, name, cron_expression, active, timezone
		FROM automation_schedulers
		WHERE active = 1
	`)

	if err != nil {
		log.Printf("Error loading active schedulers: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var sched database.AutomationScheduler
		err := rows.Scan(&sched.ID, &sched.WorkflowID, &sched.Name, &sched.CronExpression, &sched.Active, &sched.Timezone)
		if err != nil {
			log.Printf("Error scanning scheduler: %v", err)
			continue
		}
		addSchedulerToCron(sched)
	}

	log.Printf("Loaded %d active schedulers", len(schedulerEntries))
}

