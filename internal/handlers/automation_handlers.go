package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"network-script-generator/internal/database"

	"github.com/google/uuid"
)

// AutomationWorkflowRequest represents the workflow data from frontend
type AutomationWorkflowRequest struct {
	Name          string                        `json:"name"`
	Nodes         []AutomationNodeRequest       `json:"nodes"`
	Connections   []AutomationConnectionRequest `json:"connections"`
	CanvasOffsetX float64                       `json:"canvasOffsetX"`
	CanvasOffsetY float64                       `json:"canvasOffsetY"`
	Zoom          float64                       `json:"zoom"`
}

type AutomationNodeRequest struct {
	ID       string                  `json:"id"`
	Type     string                  `json:"type"`
	Category string                  `json:"category"`
	X        float64                 `json:"x"`
	Y        float64                 `json:"y"`
	Width    float64                 `json:"width"`
	Height   float64                 `json:"height"`
	Data     map[string]interface{}  `json:"data"`
	Inputs   []AutomationPortRequest `json:"inputs"`
	Outputs  []AutomationPortRequest `json:"outputs"`
}

type AutomationPortRequest struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type AutomationConnectionRequest struct {
	ID           string `json:"id"`
	SourceNodeID string `json:"sourceNodeId"`
	SourcePortID string `json:"sourcePortId"`
	TargetNodeID string `json:"targetNodeId"`
	TargetPortID string `json:"targetPortId"`
}

// HandleGetWorkflows returns all workflows for the authenticated user
func HandleGetWorkflows(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := database.RetryQuery(`
		SELECT id, name, canvas_offset_x, canvas_offset_y, zoom, created_at, updated_at
		FROM automation_workflows
		ORDER BY updated_at DESC
	`)
	if err != nil {
		log.Printf("Error fetching workflows: %v", err)
		http.Error(w, "Failed to fetch workflows", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type WorkflowResponse struct {
		database.AutomationWorkflow
		NodeCount       int `json:"nodeCount"`
		ConnectionCount int `json:"connectionCount"`
	}

	var workflowsList []WorkflowResponse
	for rows.Next() {
		var w database.AutomationWorkflow
		err := rows.Scan(&w.ID, &w.Name, &w.CanvasOffsetX, &w.CanvasOffsetY, &w.Zoom, &w.CreatedAt, &w.UpdatedAt)
		if err != nil {
			log.Printf("Error scanning workflow: %v", err)
			continue
		}

		// Get counts
		var nodeCount int
		err = database.DB.QueryRow(`SELECT COUNT(*) FROM automation_nodes WHERE workflow_id = ?`, w.ID).Scan(&nodeCount)
		if err != nil {
			log.Printf("Error counting nodes: %v", err)
		}

		var connCount int
		err = database.DB.QueryRow(`SELECT COUNT(*) FROM automation_connections WHERE workflow_id = ?`, w.ID).Scan(&connCount)
		if err != nil {
			log.Printf("Error counting connections: %v", err)
		}

		workflowsList = append(workflowsList, WorkflowResponse{
			AutomationWorkflow: w,
			NodeCount:          nodeCount,
			ConnectionCount:    connCount,
		})
	}
	if err = rows.Err(); err != nil {
		log.Printf("Error iterating workflows: %v", err)
		http.Error(w, "Failed to fetch workflows", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(workflowsList)
}

// HandleGetWorkflow returns a single workflow with all its nodes and connections
func HandleGetWorkflow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	workflowID := r.URL.Query().Get("id")
	if workflowID == "" {
		http.Error(w, "Workflow ID is required", http.StatusBadRequest)
		return
	}

	// Get workflow
	var workflow database.AutomationWorkflow
	err := database.RetryQueryRow(`
		SELECT id, name, canvas_offset_x, canvas_offset_y, zoom, created_at, updated_at
		FROM automation_workflows
		WHERE id = ?
	`, workflowID).Scan(&workflow.ID, &workflow.Name, &workflow.CanvasOffsetX, &workflow.CanvasOffsetY, &workflow.Zoom, &workflow.CreatedAt, &workflow.UpdatedAt)

	if err == sql.ErrNoRows {
		http.Error(w, "Workflow not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("Error fetching workflow: %v", err)
		http.Error(w, "Failed to fetch workflow", http.StatusInternalServerError)
		return
	}

	// Get nodes
	nodes, err := getWorkflowNodes(workflowID)
	if err != nil {
		log.Printf("Error fetching nodes: %v", err)
		http.Error(w, "Failed to fetch nodes", http.StatusInternalServerError)
		return
	}

	// Get connections
	connections, err := getWorkflowConnections(workflowID)
	if err != nil {
		log.Printf("Error fetching connections: %v", err)
		http.Error(w, "Failed to fetch connections", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"workflow":    workflow,
		"nodes":       nodes,
		"connections": connections,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleCreateWorkflow creates a new workflow
func HandleCreateWorkflow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req AutomationWorkflowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	workflowID := uuid.New().String()
	now := time.Now()

	_, err := database.RetryExec(`
		INSERT INTO automation_workflows (id, name, canvas_offset_x, canvas_offset_y, zoom, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, workflowID, req.Name, req.CanvasOffsetX, req.CanvasOffsetY, req.Zoom, now, now)

	if err != nil {
		log.Printf("Error creating workflow: %v", err)
		http.Error(w, "Failed to create workflow", http.StatusInternalServerError)
		return
	}

	// Save nodes and connections if provided
	if len(req.Nodes) > 0 || len(req.Connections) > 0 {
		if err := saveWorkflowData(workflowID, req.Nodes, req.Connections); err != nil {
			log.Printf("Error saving workflow data: %v", err)
			// Don't fail the request, just log the error
		}
	}

	workflow := database.AutomationWorkflow{
		ID:            workflowID,
		Name:          req.Name,
		CanvasOffsetX: req.CanvasOffsetX,
		CanvasOffsetY: req.CanvasOffsetY,
		Zoom:          req.Zoom,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(workflow)
}

// HandleUpdateWorkflow updates an existing workflow
func HandleUpdateWorkflow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	workflowID := r.URL.Query().Get("id")
	if workflowID == "" {
		http.Error(w, "Workflow ID is required", http.StatusBadRequest)
		return
	}

	// Verify workflow exists before updating
	var exists bool
	err := database.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM automation_workflows WHERE id = ?)`, workflowID).Scan(&exists)
	if err != nil {
		log.Printf("Error checking workflow existence: %v", err)
		http.Error(w, "Failed to verify workflow", http.StatusInternalServerError)
		return
	}
	if !exists {
		http.Error(w, fmt.Sprintf("Workflow %s does not exist", workflowID), http.StatusNotFound)
		return
	}

	var req AutomationWorkflowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	now := time.Now()

	_, err = database.RetryExec(`
		UPDATE automation_workflows
		SET name = ?, canvas_offset_x = ?, canvas_offset_y = ?, zoom = ?, updated_at = ?
		WHERE id = ?
	`, req.Name, req.CanvasOffsetX, req.CanvasOffsetY, req.Zoom, now, workflowID)

	if err != nil {
		log.Printf("Error updating workflow: %v", err)
		http.Error(w, "Failed to update workflow", http.StatusInternalServerError)
		return
	}

	// Update nodes and connections
	if err := saveWorkflowData(workflowID, req.Nodes, req.Connections); err != nil {
		log.Printf("Error saving workflow data: %v", err)
		// Return more detailed error message
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": fmt.Sprintf("Failed to save workflow data: %v", err),
		})
		return
	}

	workflow := database.AutomationWorkflow{
		ID:            workflowID,
		Name:          req.Name,
		CanvasOffsetX: req.CanvasOffsetX,
		CanvasOffsetY: req.CanvasOffsetY,
		Zoom:          req.Zoom,
		UpdatedAt:     now,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(workflow)
}

// HandleDeleteWorkflow deletes a workflow
func HandleDeleteWorkflow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	workflowID := r.URL.Query().Get("id")
	if workflowID == "" {
		http.Error(w, "Workflow ID is required", http.StatusBadRequest)
		return
	}

	_, err := database.RetryExec(`DELETE FROM automation_workflows WHERE id = ?`, workflowID)

	if err != nil {
		log.Printf("Error deleting workflow: %v", err)
		http.Error(w, "Failed to delete workflow", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Helper functions

func getWorkflowNodes(workflowID string) ([]database.AutomationNode, error) {
	rows, err := database.DB.Query(`
		SELECT id, workflow_id, type, category, x, y, width, height, data, created_at, updated_at
		FROM automation_nodes
		WHERE workflow_id = ?
		ORDER BY created_at ASC
	`, workflowID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var nodes []database.AutomationNode
	for rows.Next() {
		var node database.AutomationNode
		var dataStr sql.NullString
		err := rows.Scan(&node.ID, &node.WorkflowID, &node.Type, &node.Category, &node.X, &node.Y, &node.Width, &node.Height, &dataStr, &node.CreatedAt, &node.UpdatedAt)
		if err != nil {
			return nil, err
		}
		if dataStr.Valid {
			node.Data = dataStr.String
		}

		// Get ports
		ports, err := getNodePorts(node.ID)
		if err != nil {
			log.Printf("Error fetching ports for node %s: %v", node.ID, err)
		} else {
			for _, port := range ports {
				if port.Type == "input" {
					node.Inputs = append(node.Inputs, port)
				} else {
					node.Outputs = append(node.Outputs, port)
				}
			}
		}

		nodes = append(nodes, node)
	}
	return nodes, rows.Err()
}

func getNodePorts(nodeID string) ([]database.AutomationPort, error) {
	rows, err := database.DB.Query(`
		SELECT id, node_id, port_id, name, type, position
		FROM automation_node_ports
		WHERE node_id = ?
		ORDER BY type, position ASC
	`, nodeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ports []database.AutomationPort
	for rows.Next() {
		var port database.AutomationPort
		// Use a temporary variable for the PK
		var pk string
		err := rows.Scan(&pk, &port.NodeID, &port.PortID, &port.Name, &port.Type, &port.Position)
		if err != nil {
			return nil, err
		}
		// Use stable PortID as ID for frontend to prevent ID rotation on save/load
		port.ID = port.PortID
		ports = append(ports, port)
	}
	return ports, rows.Err()
}

func getWorkflowConnections(workflowID string) ([]database.AutomationConnection, error) {
	rows, err := database.DB.Query(`
		SELECT id, workflow_id, source_node_id, source_port_id, target_node_id, target_port_id, created_at
		FROM automation_connections
		WHERE workflow_id = ?
	`, workflowID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var connections []database.AutomationConnection
	for rows.Next() {
		var conn database.AutomationConnection
		err := rows.Scan(&conn.ID, &conn.WorkflowID, &conn.SourceNodeID, &conn.SourcePortID, &conn.TargetNodeID, &conn.TargetPortID, &conn.CreatedAt)
		if err != nil {
			return nil, err
		}
		connections = append(connections, conn)
	}
	return connections, rows.Err()
}

func saveWorkflowData(workflowID string, nodes []AutomationNodeRequest, connections []AutomationConnectionRequest) error {
	// Verify workflow exists first
	var exists bool
	err := database.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM automation_workflows WHERE id = ?)`, workflowID).Scan(&exists)
	if err != nil {
		return fmt.Errorf("error checking workflow existence: %w", err)
	}
	if !exists {
		return fmt.Errorf("workflow %s does not exist", workflowID)
	}

	// Delete existing connections first (they reference nodes)
	_, err = database.RetryExec(`DELETE FROM automation_connections WHERE workflow_id = ?`, workflowID)
	if err != nil {
		return fmt.Errorf("error deleting connections: %w", err)
	}

	// Delete existing nodes (cascade will handle ports)
	_, err = database.RetryExec(`DELETE FROM automation_nodes WHERE workflow_id = ?`, workflowID)
	if err != nil {
		return fmt.Errorf("error deleting nodes: %w", err)
	}

	// Insert nodes
	for _, nodeReq := range nodes {
		var dataJSON string
		if nodeReq.Data != nil && len(nodeReq.Data) > 0 {
			jsonBytes, err := json.Marshal(nodeReq.Data)
			if err != nil {
				log.Printf("Warning: Failed to marshal node data for node %s: %v", nodeReq.ID, err)
				dataJSON = "{}"
			} else {
				dataJSON = string(jsonBytes)
			}
		} else {
			dataJSON = "{}"
		}

		// Use INSERT OR REPLACE to handle case where node might still exist
		// Preserve created_at if node already exists
		_, err := database.RetryExec(`
			INSERT OR REPLACE INTO automation_nodes (id, workflow_id, type, category, x, y, width, height, data, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 
				COALESCE((SELECT created_at FROM automation_nodes WHERE id = ?), ?),
				?)
		`, nodeReq.ID, workflowID, nodeReq.Type, nodeReq.Category, nodeReq.X, nodeReq.Y, nodeReq.Width, nodeReq.Height, dataJSON, nodeReq.ID, time.Now(), time.Now())
		if err != nil {
			// Check if it's a foreign key constraint violation
			if strings.Contains(err.Error(), "FOREIGN KEY constraint") {
				return fmt.Errorf("error inserting node %s: workflow %s does not exist or was deleted: %w", nodeReq.ID, workflowID, err)
			}
			return fmt.Errorf("error inserting node %s: %w", nodeReq.ID, err)
		}

		// Delete existing ports for this node before inserting new ones
		_, err = database.DB.Exec(`DELETE FROM automation_node_ports WHERE node_id = ?`, nodeReq.ID)
		if err != nil {
			log.Printf("Warning: Failed to delete ports for node %s: %v", nodeReq.ID, err)
		}

		// Insert ports
		if nodeReq.Inputs != nil {
			for i, input := range nodeReq.Inputs {
				if input.ID == "" || input.Name == "" {
					continue // Skip invalid ports
				}
				// Use the ID from frontend as the PK to keep it stable
				// If it's a legacy ID (like "input-1"), it might cause PK collision if multiple nodes use it
				// But we assume frontend now generates UUIDs
				portID := input.ID

				// Fallback if ID is not suitable for PK (e.g. duplicate in batch)?
				// DB constraint will catch it.

				// Check if it's a valid UUID, if not (legacy), maybe generate new one?
				// But if we generate new one, we lose stability.
				// So we trust frontend to send unique IDs.

				_, err := database.DB.Exec(`
					INSERT INTO automation_node_ports (id, node_id, port_id, name, type, position)
					VALUES (?, ?, ?, ?, 'input', ?)
				`, portID, nodeReq.ID, input.ID, input.Name, i)
				if err != nil {
					log.Printf("Warning: Failed to insert input port for node %s: %v", nodeReq.ID, err)
					// Continue with other ports instead of failing
				}
			}
		}

		if nodeReq.Outputs != nil {
			for i, output := range nodeReq.Outputs {
				if output.ID == "" || output.Name == "" {
					continue // Skip invalid ports
				}
				// Use the ID from frontend as the PK
				portID := output.ID

				_, err := database.DB.Exec(`
					INSERT INTO automation_node_ports (id, node_id, port_id, name, type, position)
					VALUES (?, ?, ?, ?, 'output', ?)
				`, portID, nodeReq.ID, output.ID, output.Name, i)
				if err != nil {
					log.Printf("Warning: Failed to insert output port for node %s: %v", nodeReq.ID, err)
					// Continue with other ports instead of failing
				}
			}
		}
	}

	// Insert connections (only if we have nodes)
	if len(nodes) > 0 {
		for _, connReq := range connections {
			connID := connReq.ID
			if connID == "" {
				connID = uuid.New().String()
			}
			// Use INSERT OR REPLACE to handle duplicates
			_, err := database.RetryExec(`
				INSERT OR REPLACE INTO automation_connections (id, workflow_id, source_node_id, source_port_id, target_node_id, target_port_id, created_at)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`, connID, workflowID, connReq.SourceNodeID, connReq.SourcePortID, connReq.TargetNodeID, connReq.TargetPortID, time.Now())
			if err != nil {
				// Check if it's a foreign key constraint violation (node doesn't exist)
				if strings.Contains(err.Error(), "FOREIGN KEY constraint") || strings.Contains(err.Error(), "no such table") {
					log.Printf("Warning: Skipping connection %s - referenced node may not exist: %v", connID, err)
					continue
				}
				return fmt.Errorf("error inserting connection: %w", err)
			}
		}
	}

	return nil
}
