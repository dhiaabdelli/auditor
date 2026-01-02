package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/smtp"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

// executeWorkflow executes a workflow by running its nodes
// Returns the execution context containing all node outputs
func executeWorkflow(workflowID, executionID string, triggerData map[string]interface{}) (map[string]interface{}, error) {
	log.Printf("Executing workflow %s (execution: %s)", workflowID, executionID)

	// Get workflow nodes and connections
	nodes, err := getWorkflowNodes(workflowID)
	if err != nil {
		return nil, err
	}

	connections, err := getWorkflowConnections(workflowID)
	if err != nil {
		return nil, err
	}

	if len(nodes) == 0 {
		log.Printf("Workflow %s has no nodes", workflowID)
		return nil, nil
	}

	// Convert database nodes to request format
	nodeRequests := make([]AutomationNodeRequest, len(nodes))
	for i, node := range nodes {
		var data map[string]interface{}
		if node.Data != "" {
			json.Unmarshal([]byte(node.Data), &data)
		}

		// Convert ports from database format to request format
		inputs := make([]AutomationPortRequest, len(node.Inputs))
		for j, port := range node.Inputs {
			inputs[j] = AutomationPortRequest{
				ID:   port.ID,
				Name: port.Name,
			}
		}

		outputs := make([]AutomationPortRequest, len(node.Outputs))
		for j, port := range node.Outputs {
			outputs[j] = AutomationPortRequest{
				ID:   port.ID,
				Name: port.Name,
			}
		}

		nodeRequests[i] = AutomationNodeRequest{
			ID:       node.ID,
			Type:     node.Type,
			Category: node.Category,
			X:        node.X,
			Y:        node.Y,
			Width:    node.Width,
			Height:   node.Height,
			Data:     data,
			Inputs:   inputs,
			Outputs:  outputs,
		}
	}

	// Build node map for quick lookup
	nodeMap := make(map[string]*AutomationNodeRequest)
	for i := range nodeRequests {
		nodeMap[nodeRequests[i].ID] = &nodeRequests[i]
	}

	// Convert database connections to request format
	connectionRequests := make([]AutomationConnectionRequest, len(connections))
	for i, conn := range connections {
		connectionRequests[i] = AutomationConnectionRequest{
			ID:           conn.ID,
			SourceNodeID: conn.SourceNodeID,
			SourcePortID: conn.SourcePortID,
			TargetNodeID: conn.TargetNodeID,
			TargetPortID: conn.TargetPortID,
		}
	}

	// Build connection map: target_node_id -> []source_node_id
	connectionMap := make(map[string][]string)
	// Build port-aware connection map: source_node_id -> []{target_node_id, source_port_id, target_port_id}
	portConnectionMap := make(map[string][]struct {
		targetNodeID string
		sourcePortID string
		targetPortID string
	})
	for _, conn := range connectionRequests {
		connectionMap[conn.TargetNodeID] = append(connectionMap[conn.TargetNodeID], conn.SourceNodeID)
		portConnectionMap[conn.SourceNodeID] = append(portConnectionMap[conn.SourceNodeID], struct {
			targetNodeID string
			sourcePortID string
			targetPortID string
		}{
			targetNodeID: conn.TargetNodeID,
			sourcePortID: conn.SourcePortID,
			targetPortID: conn.TargetPortID,
		})
	}

	// Find trigger nodes (webhook, scheduler, manual)
	var triggerNodes []*AutomationNodeRequest

	// Determine trigger type and ID
	triggerType, _ := triggerData["trigger"].(string)
	webhookId, _ := triggerData["webhookId"].(string)
	schedulerId, _ := triggerData["schedulerId"].(string)

	for i := range nodeRequests {
		node := &nodeRequests[i]

		if node.Type == "webhook" {
			// Only execute webhook nodes if triggered by a webhook
			if triggerType == "webhook" {
				// Check if the webhookId matches
				if webhookId != "" {
					nodeWebhookId, _ := node.Data["webhookId"].(string)
					if nodeWebhookId == webhookId {
						triggerNodes = append(triggerNodes, node)
					}
				} else {
					// If no webhookId in trigger data, include all webhook nodes (for backward compatibility)
					triggerNodes = append(triggerNodes, node)
				}
			}
		} else if node.Type == "schedule" {
			// Only execute scheduler nodes if triggered by a scheduler
			if triggerType == "scheduler" {
				// Check if the schedulerId matches
				if schedulerId != "" {
					nodeSchedulerId, _ := node.Data["schedulerId"].(string)
					if nodeSchedulerId == schedulerId {
						triggerNodes = append(triggerNodes, node)
					}
				} else {
					// Fallback: execute all scheduler nodes if no ID provided
					triggerNodes = append(triggerNodes, node)
				}
			}
		} else if node.Type == "manual" {
			// Only execute manual triggers if triggered manually?
			// Or should manual triggers run regardless?
			// Assuming "manual" trigger type for now
			if triggerType == "manual" || triggerType == "" {
				triggerNodes = append(triggerNodes, node)
			}
		}
	}

	if len(triggerNodes) == 0 {
		log.Printf("Workflow %s has no trigger nodes", workflowID)
		return nil, nil
	}

	// Execute workflow starting from trigger nodes
	executedNodes := make(map[string]bool)
	executionContext := map[string]interface{}{
		"trigger":       triggerData,
		"nodes":         make(map[string]interface{}),
		"executedNodes": make([]string, 0), // Track order of execution
		"totalNodes":    len(nodes),        // Save total nodes count at execution time
	}

	// Execute each trigger node
	for _, triggerNode := range triggerNodes {
		err := executeNodeRecursive(triggerNode, nodeMap, connectionMap, portConnectionMap, executedNodes, executionContext)
		if err != nil {
			log.Printf("Error executing trigger node %s: %v", triggerNode.ID, err)
			// Continue with other trigger nodes
		}
	}

	log.Printf("Workflow %s execution completed", workflowID)
	return executionContext, nil
}

// executeNodeRecursive executes a node and all its connected nodes recursively
func executeNodeRecursive(
	node *AutomationNodeRequest,
	nodeMap map[string]*AutomationNodeRequest,
	connectionMap map[string][]string,
	portConnectionMap map[string][]struct {
		targetNodeID string
		sourcePortID string
		targetPortID string
	},
	executedNodes map[string]bool,
	executionContext map[string]interface{},
) error {
	// Skip if already executed
	if executedNodes[node.ID] {
		return nil
	}

	// Check if at least one source node is executed (OR logic for multiple inputs)
	// IMPORTANT: For trigger nodes (webhook, schedule, manual), we ignore them if they are not the active trigger
	sourceNodes := connectionMap[node.ID]
	hasExecutedSource := false

	// If node has no source nodes, it can execute (it's a trigger node)
	if len(sourceNodes) == 0 {
		hasExecutedSource = true
	} else {
		// Check if at least one source node is executed (OR logic)
		for _, sourceID := range sourceNodes {
			if executedNodes[sourceID] {
				// At least one source is executed, we can proceed
				hasExecutedSource = true
				break
			}
		}
	}

	if !hasExecutedSource {
		// No source nodes are executed yet, skip for now
		return nil
	}

	// Mark as executing
	executedNodes[node.ID] = true

	// Track execution order in execution context
	executedNodesList, ok := executionContext["executedNodes"].([]string)
	if !ok {
		// Try to convert from []interface{} (might happen after JSON round-trip)
		if listInterface, ok2 := executionContext["executedNodes"].([]interface{}); ok2 {
			executedNodesList = make([]string, 0, len(listInterface))
			for _, v := range listInterface {
				if str, ok3 := v.(string); ok3 {
					executedNodesList = append(executedNodesList, str)
				}
			}
		} else {
			// Initialize if not present
			executedNodesList = make([]string, 0)
		}
	}
	executedNodesList = append(executedNodesList, node.ID)
	executionContext["executedNodes"] = executedNodesList

	log.Printf("Executing node %s (type: %s)", node.ID, node.Type)

	// Get input data BEFORE execution (so we can store it with the output)
	inputData := getNodeInputData(node, connectionMap, executionContext)

	// Execute node based on type
	var outputData interface{}
	var err error

	switch node.Type {
	case "webhook":
		outputData = executionContext["trigger"]
	case "schedule", "scheduler":
		outputData = executionContext["trigger"]
	case "manual":
		outputData = executionContext["trigger"]
	case "httpRequest":
		outputData, err = executeHTTPRequestNode(node, connectionMap, executionContext)
	case "code":
		outputData, err = executeCodeNode(node, connectionMap, executionContext)
	case "set":
		outputData, err = executeSetNode(node, connectionMap, executionContext)
	case "condition":
		outputData, err = executeConditionNode(node, connectionMap, executionContext)
		if err == nil {
			// Store condition result for port-based routing
			if conditionResults, ok := executionContext["conditionResult"].(map[string]interface{}); ok {
				conditionResults[node.ID] = outputData
			} else {
				executionContext["conditionResult"] = map[string]interface{}{
					node.ID: outputData,
				}
			}
		}
	case "email":
		outputData, err = executeEmailNode(node, connectionMap, executionContext)
	case "execute-command":
		outputData, err = executeCommandNode(node, connectionMap, executionContext)
	default:
		// For other node types, pass through input data but filter out condition-specific fields
		// Only condition nodes should have activePort and result in their output
		if inputMap, ok := inputData.(map[string]interface{}); ok {
			// Create a copy without activePort and result
			filteredOutput := make(map[string]interface{})
			for k, v := range inputMap {
				// Filter out fields that are specific to condition nodes
				if k != "activePort" && k != "result" {
					filteredOutput[k] = v
				}
			}
			outputData = filteredOutput
		} else {
			outputData = inputData
		}
	}

	if err != nil {
		log.Printf("Error executing node %s: %v", node.ID, err)
		return err
	}

	// Store output in execution context
	// Also store the input data that this node received for visibility
	nodesData := executionContext["nodes"].(map[string]interface{})

	// Wrap output data to include input for visibility
	outputWithInput := make(map[string]interface{})
	if outputMap, ok := outputData.(map[string]interface{}); ok {
		// If output is already a map, merge it and add input
		for k, v := range outputMap {
			// Filter out condition-specific fields from non-condition nodes
			// Only condition nodes should have activePort and result in their output
			if node.Type != "condition" && (k == "activePort" || k == "result") {
				continue // Skip these fields for non-condition nodes
			}
			outputWithInput[k] = v
		}
		// Add input field to show what this node received (only if not already present)
		if _, exists := outputWithInput["input"]; !exists {
			outputWithInput["input"] = inputData
		}
	} else {
		// If output is not a map, wrap it
		outputWithInput["output"] = outputData
		outputWithInput["input"] = inputData
	}

	nodesData[node.ID] = outputWithInput

	// Execute connected target nodes based on node type
	if node.Type == "condition" {
		// For condition nodes, only execute nodes connected to the active output port
		activePorts := getActiveOutputPorts(node, outputData, executionContext)
		connections := portConnectionMap[node.ID]

		// Build a map of port ID to port name for this node
		portIDToName := make(map[string]string)
		for _, output := range node.Outputs {
			portIDToName[output.ID] = output.Name
		}

		for _, conn := range connections {
			// Get the port name from the port ID
			portName, hasPort := portIDToName[conn.sourcePortID]
			if !hasPort {
				// Try to extract port name from port ID (e.g., "port-xxx-true" -> "true")
				if strings.Contains(conn.sourcePortID, "-true") {
					portName = "true"
				} else if strings.Contains(conn.sourcePortID, "-false") {
					portName = "false"
				} else {
					log.Printf("Warning: Could not determine port name for port ID %s on node %s", conn.sourcePortID, node.ID)
					continue
				}
			}

			// Check if this port name is in the active ports list
			isActive := false
			for _, activePort := range activePorts {
				if portName == activePort {
					isActive = true
					break
				}
			}

			if isActive {
				log.Printf("Executing node %s connected to active port %s (portID: %s) from condition node %s", conn.targetNodeID, portName, conn.sourcePortID, node.ID)
				targetNode := nodeMap[conn.targetNodeID]
				if targetNode != nil {
					err := executeNodeRecursive(targetNode, nodeMap, connectionMap, portConnectionMap, executedNodes, executionContext)
					if err != nil {
						log.Printf("Error executing connected node %s: %v", conn.targetNodeID, err)
					}
				} else {
					log.Printf("Warning: Target node %s not found in nodeMap", conn.targetNodeID)
				}
			} else {
				log.Printf("Skipping node %s connected to inactive port %s (portID: %s) from condition node %s", conn.targetNodeID, portName, conn.sourcePortID, node.ID)
			}
		}
	} else {
		// For other nodes, execute all connected target nodes
		// Use portConnectionMap to find connections from this node
		connections := portConnectionMap[node.ID]
		if len(connections) > 0 {
			log.Printf("Node %s (type: %s) has %d connections", node.ID, node.Type, len(connections))
			for _, conn := range connections {
				targetNode := nodeMap[conn.targetNodeID]
				if targetNode != nil {
					log.Printf("Executing connected node %s (type: %s) from node %s", conn.targetNodeID, targetNode.Type, node.ID)
					err := executeNodeRecursive(targetNode, nodeMap, connectionMap, portConnectionMap, executedNodes, executionContext)
					if err != nil {
						log.Printf("Error executing connected node %s: %v", conn.targetNodeID, err)
					}
				} else {
					log.Printf("Warning: Target node %s not found in nodeMap", conn.targetNodeID)
				}
			}
		} else {
			// Fallback: use connectionMap (for backward compatibility)
			for targetID, targetNode := range nodeMap {
				// Check if this node is connected to target
				isConnected := false
				for _, sourceID := range connectionMap[targetID] {
					if sourceID == node.ID {
						isConnected = true
						break
					}
				}

				if isConnected {
					log.Printf("Executing connected node %s (type: %s) from node %s (fallback method)", targetID, targetNode.Type, node.ID)
					err := executeNodeRecursive(targetNode, nodeMap, connectionMap, portConnectionMap, executedNodes, executionContext)
					if err != nil {
						log.Printf("Error executing connected node %s: %v", targetID, err)
					}
				}
			}
		}
	}

	return nil
}

// getNodeInputData gets input data for a node from its source nodes
// Each node receives ONLY the output from its immediate predecessor node
// Trigger data is always available via variables ({{trigger.field}} or {{body.field}})
func getNodeInputData(
	node *AutomationNodeRequest,
	connectionMap map[string][]string,
	executionContext map[string]interface{},
) interface{} {
	// Get data from the immediate predecessor node ONLY
	// Find the source node that actually executed (not just any source node)
	sourceNodes := connectionMap[node.ID]
	nodesData := executionContext["nodes"].(map[string]interface{})
	executedNodesList, _ := executionContext["executedNodes"].([]string)

	// Find the most recently executed source node (the immediate predecessor)
	var immediatePredecessorID string
	for i := len(executedNodesList) - 1; i >= 0; i-- {
		nodeID := executedNodesList[i]
		// Check if this executed node is a source for the current node
		for _, sourceID := range sourceNodes {
			if sourceID == nodeID {
				immediatePredecessorID = nodeID
				break
			}
		}
		if immediatePredecessorID != "" {
			break
		}
	}

	// If no executed predecessor found, use the first source node (fallback)
	if immediatePredecessorID == "" && len(sourceNodes) > 0 {
		immediatePredecessorID = sourceNodes[0]
	}

	// Get data from the immediate predecessor node
	if immediatePredecessorID != "" {
		if data, exists := nodesData[immediatePredecessorID]; exists {
			if dataMap, ok := data.(map[string]interface{}); ok {
				// Extract the actual output (not the input field if it exists)
				result := make(map[string]interface{})
				for k, v := range dataMap {
					// Skip "input" field to avoid nesting input data
					if k != "input" {
						result[k] = v
					}
				}
				// Return only the predecessor's output
				if len(result) > 0 {
					return result
				}
			} else {
				// If source data is not a map, return it directly
				return data
			}
		}
	}

	// If no predecessor, return empty map (node will have no input data)
	// Trigger nodes (webhook, scheduler) will handle this case
	return make(map[string]interface{})
}

// executeHTTPRequestNode executes an HTTP Request node
func executeHTTPRequestNode(node *AutomationNodeRequest, connectionMap map[string][]string, executionContext map[string]interface{}) (interface{}, error) {
	// Extract node data
	var nodeData map[string]interface{}
	if node.Data != nil {
		nodeData = node.Data
	} else {
		nodeData = make(map[string]interface{})
	}

	// Get input data (includes trigger data)
	inputData := getNodeInputData(node, connectionMap, executionContext)

	// TODO: Implement actual HTTP request execution
	// For now, return mock data
	log.Printf("HTTP Request node executed with data: %v", nodeData)
	return map[string]interface{}{
		"status": 200,
		"body":   inputData,
	}, nil
}

// executeCodeNode executes a Code node
func executeCodeNode(node *AutomationNodeRequest, connectionMap map[string][]string, executionContext map[string]interface{}) (interface{}, error) {
	// Extract node data
	var nodeData map[string]interface{}
	if node.Data != nil {
		nodeData = node.Data
	} else {
		nodeData = make(map[string]interface{})
	}

	// Get input data (includes trigger data)
	inputData := getNodeInputData(node, connectionMap, executionContext)

	// TODO: Implement actual code execution (sandboxed)
	// For now, return input data
	log.Printf("Code node executed with data: %v", nodeData)
	return inputData, nil
}

// executeSetNode executes a Set node
func executeSetNode(node *AutomationNodeRequest, connectionMap map[string][]string, executionContext map[string]interface{}) (interface{}, error) {
	// Extract node data
	var nodeData map[string]interface{}
	if node.Data != nil {
		nodeData = node.Data
	} else {
		nodeData = make(map[string]interface{})
	}

	// Get input data (includes trigger data)
	inputData := getNodeInputData(node, connectionMap, executionContext)

	// Set values from node data
	result := make(map[string]interface{})
	if inputDataMap, ok := inputData.(map[string]interface{}); ok {
		// Copy input data
		for k, v := range inputDataMap {
			result[k] = v
		}
	}

	// Apply set operations from node data
	if values, ok := nodeData["values"].(map[string]interface{}); ok {
		for k, v := range values {
			result[k] = v
		}
	}

	return result, nil
}

// executeConditionNode executes a Condition node
func executeConditionNode(node *AutomationNodeRequest, connectionMap map[string][]string, executionContext map[string]interface{}) (interface{}, error) {
	// Get input data
	inputData := getNodeInputData(node, connectionMap, executionContext)

	// Extract condition configuration from node data
	var nodeData map[string]interface{}
	if node.Data != nil {
		nodeData = node.Data
	} else {
		nodeData = make(map[string]interface{})
	}

	// Get condition values
	value1, _ := nodeData["value1"].(string)
	value2, _ := nodeData["value2"].(string)
	operator, _ := nodeData["operator"].(string)

	// Evaluate condition if we have operator and values, or if we have a condition string
	if operator != "" && value1 != "" && value2 != "" {
		// Resolve values from input data and execution context if they're variable references
		resolvedValue1 := resolveValue(value1, inputData, executionContext)
		resolvedValue2 := resolveValue(value2, inputData, executionContext)

		// Evaluate condition based on operator
		result := evaluateCondition(resolvedValue1, operator, resolvedValue2)

		// Return result with port information
		// Only include the active port (the one that is true)
		activePort := map[string]bool{}
		if result {
			activePort["true"] = true
		} else {
			activePort["false"] = true
		}

		return map[string]interface{}{
			"result":     result,
			"activePort": activePort,
			"input":      inputData,
		}, nil
	}

	// Default: condition node is not configured - return structure with no active ports
	// This prevents connected nodes from executing, which is correct behavior for an unconfigured condition
	log.Printf("WARNING: Condition node %s is not configured (operator=%q, value1=%q, value2=%q). No ports will be active, and connected nodes will not execute.", node.ID, operator, value1, value2)

	// Return a structure that indicates no ports are active
	// This ensures getActiveOutputPorts returns an empty list
	return map[string]interface{}{
		"input":      inputData,
		"configured": false,
		"error":      "Condition node is not configured. Please configure value1, operator, and value2.",
	}, nil
}

// executeEmailNode executes an Email node
func executeEmailNode(node *AutomationNodeRequest, connectionMap map[string][]string, executionContext map[string]interface{}) (interface{}, error) {
	// Get input data
	inputData := getNodeInputData(node, connectionMap, executionContext)

	// Extract email configuration from node data
	var nodeData map[string]interface{}
	if node.Data != nil {
		nodeData = node.Data
	} else {
		nodeData = make(map[string]interface{})
	}

	// Get email fields (supporting variable resolution)
	to, _ := nodeData["to"].(string)
	from, _ := nodeData["from"].(string)
	subject, _ := nodeData["subject"].(string)
	body, _ := nodeData["body"].(string)
	smtpHost, _ := nodeData["smtpHost"].(string)
	smtpPort, _ := nodeData["smtpPort"].(string)
	smtpUser, _ := nodeData["smtpUser"].(string)
	smtpPassword, _ := nodeData["smtpPassword"].(string)

	// Resolve variables in email fields
	if to != "" {
		to = resolveValue(to, inputData, executionContext)
	}
	if from != "" {
		from = resolveValue(from, inputData, executionContext)
	}
	if subject != "" {
		subject = resolveValue(subject, inputData, executionContext)
	}
	if body != "" {
		body = resolveValue(body, inputData, executionContext)
	}

	// Validate required fields
	if to == "" || from == "" || subject == "" || body == "" {
		return map[string]interface{}{
			"success": false,
			"error":   "Missing required email fields (to, from, subject, body)",
			"input":   inputData,
		}, fmt.Errorf("missing required email fields")
	}

	// Default SMTP settings if not provided
	if smtpHost == "" {
		smtpHost = "smtp.gmail.com"
	}
	if smtpPort == "" {
		smtpPort = "587"
	}

	// Prepare email message
	message := fmt.Sprintf("From: %s\r\n", from)
	message += fmt.Sprintf("To: %s\r\n", to)
	message += fmt.Sprintf("Subject: %s\r\n", subject)
	message += "MIME-Version: 1.0\r\n"
	message += "Content-Type: text/html; charset=UTF-8\r\n"
	message += "\r\n"
	message += body

	// Send email
	var err error
	if smtpUser != "" && smtpPassword != "" {
		// Authenticated SMTP
		auth := smtp.PlainAuth("", smtpUser, smtpPassword, smtpHost)
		addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)
		err = smtp.SendMail(addr, auth, from, []string{to}, []byte(message))
	} else {
		// Unauthenticated SMTP (less common, but some local servers support it)
		addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)
		err = smtp.SendMail(addr, nil, from, []string{to}, []byte(message))
	}

	if err != nil {
		log.Printf("Error sending email from node %s: %v", node.ID, err)
		return map[string]interface{}{
			"success": false,
			"error":   err.Error(),
			"input":   inputData,
		}, err
	}

	log.Printf("Email sent successfully from node %s: to=%s, subject=%s", node.ID, to, subject)
	return map[string]interface{}{
		"success": true,
		"to":      to,
		"from":    from,
		"subject": subject,
		"sent":    true,
		"input":   inputData,
	}, nil
}

// getActiveOutputPorts returns the list of active output ports for a condition node
func getActiveOutputPorts(_ *AutomationNodeRequest, outputData interface{}, _ map[string]interface{}) []string {
	activePorts := []string{}

	if outputMap, ok := outputData.(map[string]interface{}); ok {
		activePortValue, hasActivePort := outputMap["activePort"]
		if !hasActivePort {
			return activePorts
		}

		// Try map[string]bool first
		if activePortMap, ok := activePortValue.(map[string]bool); ok {
			for port, active := range activePortMap {
				if active {
					activePorts = append(activePorts, port)
				}
			}
		} else if activePortMap, ok := activePortValue.(map[string]interface{}); ok {
			for port, active := range activePortMap {
				if activeBool, ok := active.(bool); ok && activeBool {
					activePorts = append(activePorts, port)
				}
			}
		}
	}

	return activePorts
}

// Helper function to get map keys for logging
func getMapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

// isPortActive checks if a port is in the list of active ports
func isPortActive(portID string, activePorts []string) bool {
	// Port IDs might be like "output-true", "output-false", or just "true", "false"
	// Check if portID matches any active port or contains it
	for _, activePort := range activePorts {
		if portID == activePort || strings.Contains(portID, activePort) {
			return true
		}
	}
	return false
}

// resolveValue resolves a value from input data and execution context if it's a variable reference, otherwise returns as-is
// Supports nested paths like {{body.status}}, {{headers.Content-Type}}, or {{nodeId.field}} to access previous node outputs
func resolveValue(value string, inputData interface{}, executionContext map[string]interface{}) string {
	if value == "" {
		return ""
	}

	var varName string
	var isVariable bool

	// Check if value is a template variable: {{variable}}
	if strings.HasPrefix(value, "{{") && strings.HasSuffix(value, "}}") {
		varName = strings.TrimSpace(strings.TrimPrefix(strings.TrimSuffix(value, "}}"), "{{"))
		isVariable = true
	} else if strings.HasPrefix(value, "$") {
		// Variable reference: $variable
		varName = strings.TrimPrefix(value, "$")
		isVariable = true
	}

	if !isVariable {
		// Return as-is if not a variable reference
		return value
	}

	// Check if this is a node reference: {{nodeId.field}} or {{nodes.nodeId.field}}
	parts := strings.Split(varName, ".")
	if len(parts) >= 2 {
		// Check if first part is "nodes" or if it's a node ID
		if parts[0] == "nodes" && len(parts) >= 3 {
			// Format: {{nodes.nodeId.field}}
			nodeID := parts[1]
			fieldPath := strings.Join(parts[2:], ".")
			if nodesData, ok := executionContext["nodes"].(map[string]interface{}); ok {
				if nodeOutput, exists := nodesData[nodeID]; exists {
					if nodeMap, ok := nodeOutput.(map[string]interface{}); ok {
						resolved := resolveNestedPath(nodeMap, fieldPath)
						if resolved != nil {
							return fmt.Sprintf("%v", resolved)
						}
					} else {
						// Node output is not a map, return it directly if fieldPath is empty or matches
						if fieldPath == "" {
							return fmt.Sprintf("%v", nodeOutput)
						}
					}
				}
			}
		} else {
			// Check if first part might be a node ID (try to find it in nodes)
			if nodesData, ok := executionContext["nodes"].(map[string]interface{}); ok {
				if nodeOutput, exists := nodesData[parts[0]]; exists {
					// Format: {{nodeId.field}}
					fieldPath := strings.Join(parts[1:], ".")
					if nodeMap, ok := nodeOutput.(map[string]interface{}); ok {
						resolved := resolveNestedPath(nodeMap, fieldPath)
						if resolved != nil {
							return fmt.Sprintf("%v", resolved)
						}
					} else {
						// Node output is not a map, return it directly if fieldPath is empty
						if fieldPath == "" {
							return fmt.Sprintf("%v", nodeOutput)
						}
					}
				}
			}
		}
	}

	// Resolve from input data (trigger data and immediate predecessor)
	if inputMap, ok := inputData.(map[string]interface{}); ok {
		resolved := resolveNestedPath(inputMap, varName)
		if resolved != nil {
			return fmt.Sprintf("%v", resolved)
		}
	}

	// Also check trigger data directly from execution context
	if triggerData, ok := executionContext["trigger"].(map[string]interface{}); ok {
		resolved := resolveNestedPath(triggerData, varName)
		if resolved != nil {
			return fmt.Sprintf("%v", resolved)
		}
	}

	// Return empty string if variable not found
	return ""
}

// resolveNestedPath resolves a nested path like "body.status" or "headers.Content-Type" from a map
func resolveNestedPath(data map[string]interface{}, path string) interface{} {
	parts := strings.Split(path, ".")
	current := interface{}(data)

	for _, part := range parts {
		if currentMap, ok := current.(map[string]interface{}); ok {
			if val, exists := currentMap[part]; exists {
				current = val
			} else {
				return nil // Path not found
			}
		} else {
			return nil // Can't traverse further
		}
	}

	return current
}

// Helper function to get map keys from interface{} for logging
func getMapKeysFromInterface(data interface{}) []string {
	if dataMap, ok := data.(map[string]interface{}); ok {
		return getMapKeys(dataMap)
	}
	return []string{}
}

// evaluateCondition evaluates a condition based on operator
func evaluateCondition(value1 interface{}, operator string, value2 interface{}) bool {
	val1Str := fmt.Sprintf("%v", value1)
	val2Str := fmt.Sprintf("%v", value2)

	switch operator {
	case "==", "equals":
		return val1Str == val2Str
	case "!=", "not equals":
		return val1Str != val2Str
	case ">", "greater than":
		return compareNumbers(val1Str, val2Str) > 0
	case ">=", "greater than or equal":
		return compareNumbers(val1Str, val2Str) >= 0
	case "<", "less than":
		return compareNumbers(val1Str, val2Str) < 0
	case "<=", "less than or equal":
		return compareNumbers(val1Str, val2Str) <= 0
	case "contains":
		return strings.Contains(val1Str, val2Str)
	case "starts with":
		return strings.HasPrefix(val1Str, val2Str)
	case "ends with":
		return strings.HasSuffix(val1Str, val2Str)
	default:
		return false
	}
}

// compareNumbers compares two string values as numbers
func compareNumbers(val1, val2 string) int {
	// Try to parse as float64
	var num1, num2 float64
	var err1, err2 error

	num1, err1 = parseNumber(val1)
	num2, err2 = parseNumber(val2)

	if err1 != nil || err2 != nil {
		// If either can't be parsed as number, do string comparison
		if val1 < val2 {
			return -1
		} else if val1 > val2 {
			return 1
		}
		return 0
	}

	if num1 < num2 {
		return -1
	} else if num1 > num2 {
		return 1
	}
	return 0
}

// parseNumber attempts to parse a string as a number
func parseNumber(s string) (float64, error) {
	// Try float64 first
	var f float64
	_, err := fmt.Sscanf(s, "%f", &f)
	if err == nil {
		return f, nil
	}
	return 0, err
}

// executeCommandNode executes a command on a host
func executeCommandNode(node *AutomationNodeRequest, connectionMap map[string][]string, executionContext map[string]interface{}) (interface{}, error) {
	log.Printf("Executing command node %s", node.ID)

	// Get node data
	host, _ := node.Data["host"].(string)
	command, _ := node.Data["command"].(string)
	shell, _ := node.Data["shell"].(string) // "powershell", "cmd", "bash", "sh"
	timeout, _ := node.Data["timeout"].(float64)
	if timeout == 0 {
		timeout = 30 // Default 30 seconds
	}

	// Get input data to resolve variables in command
	inputData := getNodeInputData(node, connectionMap, executionContext)
	
	// Resolve variables in command (e.g., {{input.field}})
	resolvedCommand := resolveVariablesInString(command, inputData, executionContext)
	
	// Resolve variables in host
	resolvedHost := resolveVariablesInString(host, inputData, executionContext)

	if resolvedCommand == "" {
		return nil, fmt.Errorf("command is required")
	}

	// Determine shell based on OS and command type if not specified
	if shell == "" {
		// Try to detect shell from command syntax
		detectedShell := detectShellFromCommand(resolvedCommand)
		if detectedShell != "" {
			shell = detectedShell
		} else {
			// Fallback to OS default
			if runtime.GOOS == "windows" {
				shell = "powershell"
			} else {
				shell = "bash"
			}
		}
	}

	// Prepare command execution
	var cmd *exec.Cmd
	var cmdName string
	var cmdArgs []string

	switch shell {
	case "powershell":
		if resolvedHost != "" && resolvedHost != "localhost" && resolvedHost != "127.0.0.1" {
			// Remote PowerShell execution
			cmdName = "powershell.exe"
			cmdArgs = []string{"-Command", fmt.Sprintf("Invoke-Command -ComputerName %s -ScriptBlock { %s }", resolvedHost, resolvedCommand)}
		} else {
			// Local PowerShell execution
			cmdName = "powershell.exe"
			cmdArgs = []string{"-Command", resolvedCommand}
		}
	case "cmd":
		if resolvedHost != "" && resolvedHost != "localhost" && resolvedHost != "127.0.0.1" {
			// Remote CMD execution (requires psexec or similar)
			return nil, fmt.Errorf("remote CMD execution not directly supported, use PowerShell or SSH")
		}
		cmdName = "cmd.exe"
		cmdArgs = []string{"/c", resolvedCommand}
	case "bash", "sh":
		if resolvedHost != "" && resolvedHost != "localhost" && resolvedHost != "127.0.0.1" {
			// Remote SSH execution
			cmdName = "ssh"
			cmdArgs = []string{resolvedHost, resolvedCommand}
		} else {
			// Local bash execution
			cmdName = "bash"
			cmdArgs = []string{"-c", resolvedCommand}
		}
	default:
		return nil, fmt.Errorf("unsupported shell: %s", shell)
	}

	// Create command with or without timeout
	if timeout > 0 {
		ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeout)*time.Second)
		defer cancel()
		cmd = exec.CommandContext(ctx, cmdName, cmdArgs...)
	} else {
		cmd = exec.Command(cmdName, cmdArgs...)
	}

	// Execute command
	output, err := cmd.CombinedOutput()
	
	result := map[string]interface{}{
		"command":    resolvedCommand,
		"host":       resolvedHost,
		"shell":      shell,
		"exitCode":   0,
		"output":     string(output),
		"success":    err == nil,
	}

	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			result["exitCode"] = exitError.ExitCode()
		}
		result["error"] = err.Error()
		result["success"] = false
		log.Printf("Command execution failed: %v", err)
		return result, nil // Return result with error info, don't fail the workflow
	}

	log.Printf("Command executed successfully on %s", resolvedHost)
	return result, nil
}

// detectShellFromCommand attempts to detect the shell type from command syntax
func detectShellFromCommand(command string) string {
	command = strings.TrimSpace(command)
	if command == "" {
		return ""
	}

	// Common bash/Linux commands
	bashCommands := []string{
		"ls", "grep", "find", "cat", "echo", "awk", "sed", "cut", "sort", "uniq",
		"head", "tail", "wc", "ps", "top", "kill", "killall", "chmod", "chown",
		"tar", "gzip", "gunzip", "zip", "unzip", "curl", "wget", "scp", "rsync",
		"ssh", "sudo", "su", "df", "du", "mount", "umount", "ifconfig", "netstat",
		"ping", "traceroute", "dig", "nslookup", "systemctl", "service", "journalctl",
	}

	// Check if command starts with a bash command
	firstWord := strings.Fields(command)[0]
	for _, cmd := range bashCommands {
		if firstWord == cmd || strings.HasPrefix(firstWord, cmd+" ") {
			return "bash"
		}
	}

	// Check for bash-specific flags (like -la, -lh, etc.)
	bashFlags := []string{"-la", "-lh", "-al", "-ah", "-R", "-r", "-t", "-S"}
	for _, flag := range bashFlags {
		if strings.Contains(command, flag) {
			return "bash"
		}
	}

	// PowerShell cmdlets typically start with Verb-Noun pattern (Get-, Set-, New-, etc.)
	powershellVerbs := []string{"Get-", "Set-", "New-", "Remove-", "Add-", "Clear-", "Copy-", "Move-", "Rename-", "Select-", "Where-", "ForEach-", "Invoke-", "Start-", "Stop-", "Restart-", "Test-", "Import-", "Export-"}
	for _, verb := range powershellVerbs {
		if strings.HasPrefix(command, verb) {
			return "powershell"
		}
	}

	// Check for PowerShell-specific syntax
	if strings.Contains(command, "$") && (strings.Contains(command, "foreach") || strings.Contains(command, "if") || strings.Contains(command, "switch")) {
		return "powershell"
	}

	// Check for CMD-specific commands
	cmdCommands := []string{"dir", "copy", "move", "del", "ren", "type", "cls", "cd", "md", "rd"}
	for _, cmd := range cmdCommands {
		if firstWord == cmd || strings.HasPrefix(firstWord, cmd+" ") {
			return "cmd"
		}
	}

	return "" // Could not detect, will use OS default
}

// resolveVariablesInString resolves variables like {{variable}} or {{input.field}} in a string
func resolveVariablesInString(s string, inputData interface{}, executionContext map[string]interface{}) string {
	// Simple variable resolution - replace {{variable}} with values
	result := s
	
	// Resolve {{input.field}} patterns
	if inputMap, ok := inputData.(map[string]interface{}); ok {
		for key, value := range inputMap {
			placeholder := fmt.Sprintf("{{input.%s}}", key)
			if strings.Contains(result, placeholder) {
				result = strings.ReplaceAll(result, placeholder, fmt.Sprintf("%v", value))
			}
		}
	}
	
	// Resolve {{trigger.field}} patterns
	if triggerData, ok := executionContext["trigger"].(map[string]interface{}); ok {
		for key, value := range triggerData {
			placeholder := fmt.Sprintf("{{trigger.%s}}", key)
			if strings.Contains(result, placeholder) {
				result = strings.ReplaceAll(result, placeholder, fmt.Sprintf("%v", value))
			}
		}
	}
	
	// Resolve simple {{variable}} patterns from execution context
	for key, value := range executionContext {
		if key == "trigger" || key == "nodes" || key == "executedNodes" || key == "conditionResult" {
			continue // Skip special keys
		}
		placeholder := fmt.Sprintf("{{%s}}", key)
		if strings.Contains(result, placeholder) {
			result = strings.ReplaceAll(result, placeholder, fmt.Sprintf("%v", value))
		}
	}
	
	return result
}
