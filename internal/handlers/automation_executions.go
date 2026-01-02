package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"network-script-generator/internal/database"
)

// HandleGetExecutions returns executions for a workflow
func HandleGetExecutions(w http.ResponseWriter, r *http.Request) {
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
		SELECT id, workflow_id, trigger_type, trigger_id, status, started_at, finished_at, data
		FROM automation_executions
		WHERE workflow_id = ?
		ORDER BY started_at DESC
		LIMIT 100
	`, workflowID)
	if err != nil {
		log.Printf("Error fetching executions: %v", err)
		http.Error(w, "Failed to fetch executions", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var executions []database.AutomationExecution
	for rows.Next() {
		var exec database.AutomationExecution
		var finishedAt sql.NullTime
		var dataStr sql.NullString
		
		err := rows.Scan(&exec.ID, &exec.WorkflowID, &exec.TriggerType, &exec.TriggerID, &exec.Status, &exec.StartedAt, &finishedAt, &dataStr)
		if err != nil {
			log.Printf("Error scanning execution: %v", err)
			continue
		}
		
		if finishedAt.Valid {
			exec.FinishedAt = &finishedAt.Time
		}
		
		if dataStr.Valid {
			exec.Data = dataStr.String
		}
		
		executions = append(executions, exec)
	}
	
	if err = rows.Err(); err != nil {
		log.Printf("Error iterating executions: %v", err)
		http.Error(w, "Failed to fetch executions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(executions)
}

// HandleGetExecutionStats returns statistics for a workflow
func HandleGetExecutionStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	workflowID := r.URL.Query().Get("workflowId")
	if workflowID == "" {
		http.Error(w, "Workflow ID is required", http.StatusBadRequest)
		return
	}

	// Get total executions
	var totalExecutions int
	err := database.DB.QueryRow(`
		SELECT COUNT(*) FROM automation_executions WHERE workflow_id = ?
	`, workflowID).Scan(&totalExecutions)
	if err != nil {
		log.Printf("Error counting executions: %v", err)
		totalExecutions = 0
	}

	// Get webhook executions count
	var webhookExecutions int
	err = database.DB.QueryRow(`
		SELECT COUNT(*) FROM automation_executions 
		WHERE workflow_id = ? AND trigger_type = 'webhook'
	`, workflowID).Scan(&webhookExecutions)
	if err != nil {
		log.Printf("Error counting webhook executions: %v", err)
		webhookExecutions = 0
	}

	// Get scheduler executions count
	var schedulerExecutions int
	err = database.DB.QueryRow(`
		SELECT COUNT(*) FROM automation_executions 
		WHERE workflow_id = ? AND trigger_type = 'scheduler'
	`, workflowID).Scan(&schedulerExecutions)
	if err != nil {
		log.Printf("Error counting scheduler executions: %v", err)
		schedulerExecutions = 0
	}

	// Get success count
	var successCount int
	err = database.DB.QueryRow(`
		SELECT COUNT(*) FROM automation_executions 
		WHERE workflow_id = ? AND status = 'success'
	`, workflowID).Scan(&successCount)
	if err != nil {
		log.Printf("Error counting success: %v", err)
		successCount = 0
	}

	// Get error count
	var errorCount int
	err = database.DB.QueryRow(`
		SELECT COUNT(*) FROM automation_executions 
		WHERE workflow_id = ? AND status = 'error'
	`, workflowID).Scan(&errorCount)
	if err != nil {
		log.Printf("Error counting errors: %v", err)
		errorCount = 0
	}

	stats := map[string]interface{}{
		"totalExecutions":    totalExecutions,
		"webhookExecutions":  webhookExecutions,
		"schedulerExecutions": schedulerExecutions,
		"successCount":      successCount,
		"errorCount":         errorCount,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

