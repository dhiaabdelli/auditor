package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"network-script-generator/internal/database"
)

// WebhookRequest represents webhook creation/update request
type WebhookRequest struct {
	Name        string `json:"name"`
	Path        string `json:"path"`
	Method      string `json:"method"`
	Active      bool   `json:"active"`
	ResponseMode string `json:"responseMode"`
}

// HandleGetWebhooks returns all webhooks for a workflow
func HandleGetWebhooks(w http.ResponseWriter, r *http.Request) {
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
		SELECT id, workflow_id, name, path, method, active, response_mode, created_at, updated_at
		FROM automation_webhooks
		WHERE workflow_id = ?
		ORDER BY created_at DESC
	`, workflowID)

	if err != nil {
		log.Printf("Error fetching webhooks: %v", err)
		http.Error(w, "Failed to fetch webhooks", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var webhooks []database.AutomationWebhook
	for rows.Next() {
		var wh database.AutomationWebhook
		err := rows.Scan(&wh.ID, &wh.WorkflowID, &wh.Name, &wh.Path, &wh.Method, &wh.Active, &wh.ResponseMode, &wh.CreatedAt, &wh.UpdatedAt)
		if err != nil {
			log.Printf("Error scanning webhook: %v", err)
			continue
		}
		webhooks = append(webhooks, wh)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(webhooks)
}

// HandleCreateWebhook creates a new webhook
func HandleCreateWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		WorkflowID   string `json:"workflowId"`
		WebhookRequest
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.WorkflowID == "" {
		http.Error(w, "Workflow ID is required", http.StatusBadRequest)
		return
	}

	// Validate path
	if req.Path == "" {
		http.Error(w, "Path is required", http.StatusBadRequest)
		return
	}
	// Remove leading / if present (path should not start with /)
	req.Path = strings.TrimPrefix(req.Path, "/")
	// Remove leading /webhook/ if present (we'll add it in the route)
	req.Path = strings.TrimPrefix(req.Path, "webhook/")

	// Validate method
	if req.Method == "" {
		req.Method = "POST"
	}
	req.Method = strings.ToUpper(req.Method)

	// Validate response mode
	if req.ResponseMode == "" {
		req.ResponseMode = "responseNode"
	}

	webhookID := uuid.New().String()
	now := time.Now()

	_, err := database.RetryExec(`
		INSERT INTO automation_webhooks (id, workflow_id, name, path, method, active, response_mode, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, webhookID, req.WorkflowID, req.Name, req.Path, req.Method, req.Active, req.ResponseMode, now, now)

	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint") {
			http.Error(w, "A webhook with this path already exists", http.StatusConflict)
			return
		}
		log.Printf("Error creating webhook: %v", err)
		http.Error(w, "Failed to create webhook", http.StatusInternalServerError)
		return
	}

	webhook := database.AutomationWebhook{
		ID:          webhookID,
		WorkflowID:  req.WorkflowID,
		Name:        req.Name,
		Path:        req.Path,
		Method:      req.Method,
		Active:      req.Active,
		ResponseMode: req.ResponseMode,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(webhook)
}

// HandleUpdateWebhook updates an existing webhook
func HandleUpdateWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	webhookID := r.URL.Query().Get("id")
	if webhookID == "" {
		http.Error(w, "Webhook ID is required", http.StatusBadRequest)
		return
	}

	var req WebhookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate path
	if req.Path != "" {
		// Remove leading / if present (path should not start with /)
		req.Path = strings.TrimPrefix(req.Path, "/")
		// Remove leading /webhook/ if present (we'll add it in the route)
		req.Path = strings.TrimPrefix(req.Path, "webhook/")
	}

	// Validate method
	if req.Method != "" {
		req.Method = strings.ToUpper(req.Method)
	}

	now := time.Now()

	// Build update query dynamically
	updates := []string{"updated_at = ?"}
	args := []interface{}{now}

	if req.Name != "" {
		updates = append(updates, "name = ?")
		args = append(args, req.Name)
	}
	if req.Path != "" {
		updates = append(updates, "path = ?")
		args = append(args, req.Path)
	}
	if req.Method != "" {
		updates = append(updates, "method = ?")
		args = append(args, req.Method)
	}
	updates = append(updates, "active = ?")
	args = append(args, req.Active)
	if req.ResponseMode != "" {
		updates = append(updates, "response_mode = ?")
		args = append(args, req.ResponseMode)
	}

	args = append(args, webhookID)

	query := fmt.Sprintf("UPDATE automation_webhooks SET %s WHERE id = ?", strings.Join(updates, ", "))
	_, err := database.RetryExec(query, args...)

	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint") {
			http.Error(w, "A webhook with this path already exists", http.StatusConflict)
			return
		}
		log.Printf("Error updating webhook: %v", err)
		http.Error(w, "Failed to update webhook", http.StatusInternalServerError)
		return
	}

	// Fetch updated webhook
	var webhook database.AutomationWebhook
	err = database.RetryQueryRow(`
		SELECT id, workflow_id, name, path, method, active, response_mode, created_at, updated_at
		FROM automation_webhooks
		WHERE id = ?
	`, webhookID).Scan(&webhook.ID, &webhook.WorkflowID, &webhook.Name, &webhook.Path, &webhook.Method, &webhook.Active, &webhook.ResponseMode, &webhook.CreatedAt, &webhook.UpdatedAt)

	if err != nil {
		log.Printf("Error fetching updated webhook: %v", err)
		http.Error(w, "Failed to fetch updated webhook", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(webhook)
}

// HandleDeleteWebhook deletes a webhook
func HandleDeleteWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	webhookID := r.URL.Query().Get("id")
	if webhookID == "" {
		http.Error(w, "Webhook ID is required", http.StatusBadRequest)
		return
	}

	_, err := database.RetryExec(`DELETE FROM automation_webhooks WHERE id = ?`, webhookID)
	if err != nil {
		log.Printf("Error deleting webhook: %v", err)
		http.Error(w, "Failed to delete webhook", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// HandleTriggerWebhook triggers a workflow via webhook
func HandleTriggerWebhook(w http.ResponseWriter, r *http.Request) {
	// Extract path from URL (e.g., /webhook/my-path)
	path := strings.TrimPrefix(r.URL.Path, "/api/webhook/")
	if path == "" {
		http.Error(w, "Webhook path not found", http.StatusNotFound)
		return
	}
	// Normalize path: remove leading slash if present (paths are stored without leading slash)
	path = strings.TrimPrefix(path, "/")

	// Find webhook by path and method
	var webhook database.AutomationWebhook
	err := database.RetryQueryRow(`
		SELECT id, workflow_id, name, path, method, active, response_mode
		FROM automation_webhooks
		WHERE path = ? AND method = ? AND active = 1
	`, path, r.Method).Scan(&webhook.ID, &webhook.WorkflowID, &webhook.Name, &webhook.Path, &webhook.Method, &webhook.Active, &webhook.ResponseMode)

	if err == sql.ErrNoRows {
		// Check if webhook exists but is inactive (try both with and without leading slash for backward compatibility)
		var inactiveWebhook database.AutomationWebhook
		inactiveErr := database.RetryQueryRow(`
			SELECT id, name, path, method, active
			FROM automation_webhooks
			WHERE (path = ? OR path = ?) AND method = ?
		`, path, "/"+path, r.Method).Scan(&inactiveWebhook.ID, &inactiveWebhook.Name, &inactiveWebhook.Path, &inactiveWebhook.Method, &inactiveWebhook.Active)
		
		if inactiveErr == nil && !inactiveWebhook.Active {
			http.Error(w, "Webhook is inactive. Please start it to enable triggering.", http.StatusForbidden)
			return
		}
		
		http.Error(w, "Webhook not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("Error finding webhook: %v", err)
		http.Error(w, "Failed to find webhook", http.StatusInternalServerError)
		return
	}

	// Read request body
	var bodyData map[string]interface{}
	if r.Body != nil {
		decoder := json.NewDecoder(r.Body)
		decoder.Decode(&bodyData)
	}

	// Read headers
	headers := make(map[string]string)
	for k, v := range r.Header {
		if len(v) > 0 {
			headers[k] = v[0]
		}
	}

	// Read query parameters
	queryParams := make(map[string]string)
	for k, v := range r.URL.Query() {
		if len(v) > 0 {
			queryParams[k] = v[0]
		}
	}

	// Create execution data
	executionData := map[string]interface{}{
		"trigger": "webhook",
		"webhookId": webhook.ID,
		"webhookName": webhook.Name,
		"webhookPath": webhook.Path,
		"body":    bodyData,
		"headers": headers,
		"query":   queryParams,
		"method":  r.Method,
		"path":    r.URL.Path,
	}

	// Get workflow name
	var workflowName string
	err = database.RetryQueryRow(`SELECT name FROM automation_workflows WHERE id = ?`, webhook.WorkflowID).Scan(&workflowName)
	if err != nil {
		workflowName = "Unknown Workflow"
	}

	// Execute workflow using execution manager (async with dedicated goroutine)
	manager := GetExecutionManager()
	executionID := manager.ExecuteWorkflowAsync(webhook.WorkflowID, workflowName, "webhook", webhook.ID, executionData)

	// Return response based on response mode
	if webhook.ResponseMode == "responseNode" {
		// Wait for workflow execution to complete (with timeout)
		// For now, return immediate response
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"executionId": executionID,
			"message": "Workflow execution started",
		})
	} else {
		// Return immediate response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"executionId": executionID,
			"message": "Workflow execution started",
		})
	}
}

