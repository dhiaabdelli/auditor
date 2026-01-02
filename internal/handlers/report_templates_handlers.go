package handlers

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"reflect"
	"regexp"
	"strconv"
	"strings"
	"time"

	"network-script-generator/internal/database"
)

// HandleGetReportTemplates retrieves all report templates
func HandleGetReportTemplates(w http.ResponseWriter, r *http.Request) {
	// Ensure the table exists (this handles migrations automatically)
	if err := database.EnsureReportTemplatesTable(); err != nil {
		log.Printf("Error ensuring report templates table: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	rows, err := database.DB.Query("SELECT id, name, type, data_source, description, content, created_at, updated_at, author, version FROM report_templates ORDER BY updated_at DESC")
	if err != nil {
		log.Printf("Error querying templates: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type TemplateResponse struct {
		ID          string    `json:"id"`
		Name        string    `json:"name"`
		Type        string    `json:"type"`
		DataSource  string    `json:"dataSource"`
		Description string    `json:"description"`
		Content     string    `json:"content"`
		Rules       string    `json:"rules,omitempty"`
		CreatedAt   time.Time `json:"createdAt"`
		UpdatedAt   time.Time `json:"updatedAt"`
		Author      string    `json:"author,omitempty"`
		Version     string    `json:"version,omitempty"`
	}

	var templates []TemplateResponse
	for rows.Next() {
		var t database.ReportTemplate
		if err := rows.Scan(&t.ID, &t.Name, &t.Type, &t.DataSource, &t.Description, &t.Content, &t.CreatedAt, &t.UpdatedAt, &t.Author, &t.Version); err != nil {
			log.Printf("Error scanning template: %v", err)
			continue
		}

		// Convert to response struct
		resp := TemplateResponse{
			ID:          t.ID,
			Name:        t.Name,
			Type:        t.Type,
			DataSource:  t.DataSource,
			Description: t.Description,
			Content:     t.Content,
			Rules:       t.Rules,
			CreatedAt:   t.CreatedAt,
			UpdatedAt:   t.UpdatedAt,
		}

		if t.Author.Valid {
			resp.Author = t.Author.String
		}
		if t.Version.Valid {
			resp.Version = t.Version.String
		}

		templates = append(templates, resp)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(templates)
}

// TemplateRequest represents the incoming JSON request
type TemplateRequest struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	DataSource  string `json:"dataSource"`
	Description string `json:"description"`
	Content     string `json:"content"`
	Author      string `json:"author,omitempty"`
	Version     string `json:"version,omitempty"`
}

// HandleCreateReportTemplate creates a new report template
func HandleCreateReportTemplate(w http.ResponseWriter, r *http.Request) {
	var req TemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Ensure the table exists
	if err := database.EnsureReportTemplatesTable(); err != nil {
		log.Printf("Error ensuring report templates table: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Validate required fields
	if req.Name == "" {
		http.Error(w, "Template name is required", http.StatusBadRequest)
		return
	}

	// Generate ID and timestamps are handled by the database helper if needed,
	// but here we let the frontend generate the ID or use a UUID
	if req.ID == "" {
		req.ID = fmt.Sprintf("%d", r.Context().Value("timestamp")) // Just a placeholder, better use UUID or let DB handle
		// Actually, let's use current timestamp as ID for simplicity if not provided
		// In a real app, use UUID
	}

	stmt, err := database.DB.Prepare("INSERT INTO report_templates (id, name, type, data_source, description, content, created_at, updated_at, author, version) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?)")
	if err != nil {
		log.Printf("Error preparing insert statement: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	// Handle nullable Author and Version
	var authorVal interface{}
	var versionVal interface{}
	if req.Author != "" {
		authorVal = req.Author
	}
	if req.Version != "" {
		versionVal = req.Version
	}

	result, err := stmt.Exec(req.ID, req.Name, req.Type, req.DataSource, req.Description, req.Content, authorVal, versionVal)
	if err != nil {
		log.Printf("Error inserting template: %v", err)
		http.Error(w, "Failed to create template", http.StatusInternalServerError)
		return
	}

	// Verify insertion
	rowsAffected, _ := result.RowsAffected()
	log.Printf("Template inserted successfully: ID=%s, RowsAffected=%d", req.ID, rowsAffected)

	// Double check verification
	var count int
	err = database.DB.QueryRow("SELECT COUNT(*) FROM report_templates WHERE id = ?", req.ID).Scan(&count)
	if err != nil {
		log.Printf("Error verifying template insertion: %v", err)
	} else if count == 0 {
		log.Printf("WARNING: Template inserted but not found in verification step! ID=%s", req.ID)
	} else {
		log.Printf("Template verified in database: ID=%s", req.ID)
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "id": req.ID})
}

// HandleUpdateReportTemplate updates an existing report template
func HandleUpdateReportTemplate(w http.ResponseWriter, r *http.Request) {
	// Extract ID from URL
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	id := pathParts[3]

	var req TemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	stmt, err := database.DB.Prepare("UPDATE report_templates SET name = ?, type = ?, data_source = ?, description = ?, content = ?, updated_at = datetime('now'), author = ?, version = ? WHERE id = ?")
	if err != nil {
		log.Printf("Error preparing update statement: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	// Handle nullable Author and Version
	var authorVal interface{}
	var versionVal interface{}
	if req.Author != "" {
		authorVal = req.Author
	}
	if req.Version != "" {
		versionVal = req.Version
	}

	result, err := stmt.Exec(req.Name, req.Type, req.DataSource, req.Description, req.Content, authorVal, versionVal, id)
	if err != nil {
		log.Printf("Error updating template: %v", err)
		http.Error(w, "Failed to update template", http.StatusInternalServerError)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		// Check if it exists
		var count int
		database.DB.QueryRow("SELECT COUNT(*) FROM report_templates WHERE id = ?", id).Scan(&count)
		if count == 0 {
			http.Error(w, "Template not found", http.StatusNotFound)
			return
		}
	}

	log.Printf("Template updated successfully: ID=%s, RowsAffected=%d", id, rows)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// HandleDeleteReportTemplate deletes a report template
func HandleDeleteReportTemplate(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	id := pathParts[3]

	// Ensure table exists
	if err := database.EnsureReportTemplatesTable(); err != nil {
		log.Printf("Error ensuring report templates table: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	stmt, err := database.DB.Prepare("DELETE FROM report_templates WHERE id = ?")
	if err != nil {
		log.Printf("Error preparing delete statement: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	result, err := stmt.Exec(id)
	if err != nil {
		log.Printf("Error deleting template: %v", err)
		http.Error(w, "Failed to delete template", http.StatusInternalServerError)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		http.Error(w, "Template not found", http.StatusNotFound)
		return
	}

	log.Printf("Template deleted successfully: ID=%s", id)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// HandleGenerateDOCXReport handles the generation of a DOCX report from HTML content
func HandleGenerateDOCXReport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TemplateName string `json:"templateName"`
		HTMLContent  string `json:"htmlContent"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.HTMLContent == "" {
		http.Error(w, "HTML content is required", http.StatusBadRequest)
		return
	}

	// Create a minimal DOCX
	docxContent, err := createFormattedDOCX(req.HTMLContent, req.TemplateName)
	if err != nil {
		log.Printf("Error creating DOCX: %v", err)
		http.Error(w, "Failed to generate DOCX", http.StatusInternalServerError)
		return
	}

	// Set headers for file download
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.docx\"", req.TemplateName))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(docxContent)))

	w.Write(docxContent)
}

// HandleGenerateDOCXWithPlaceholders handles the generation of a DOCX report by replacing placeholders in an uploaded DOCX file
func HandleGenerateDOCXWithPlaceholders(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TemplateName string                 `json:"templateName"`
		DocxContent  string                 `json:"docxContent"` // Base64 encoded DOCX file
		Placeholders map[string]interface{} `json:"placeholders"`
		ReportData   map[string]interface{} `json:"reportData"` // Full report data for loops
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.DocxContent == "" {
		http.Error(w, "DOCX content is required", http.StatusBadRequest)
		return
	}

	// Decode base64 DOCX content
	// Remove data URL prefix if present (data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,)
	docxBase64 := req.DocxContent
	if strings.Contains(docxBase64, ",") {
		docxBase64 = strings.Split(docxBase64, ",")[1]
	}

	docxBytes, err := base64.StdEncoding.DecodeString(docxBase64)
	if err != nil {
		log.Printf("Error decoding base64 DOCX: %v", err)
		http.Error(w, "Invalid DOCX content", http.StatusBadRequest)
		return
	}

	// Replace placeholders and process loops in DOCX
	modifiedDocx, err := replacePlaceholdersInDOCX(docxBytes, req.Placeholders, req.ReportData)
	if err != nil {
		log.Printf("Error replacing placeholders in DOCX: %v", err)
		http.Error(w, "Failed to process DOCX", http.StatusInternalServerError)
		return
	}

	// Set headers for file download
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.docx\"", req.TemplateName))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(modifiedDocx)))

	w.Write(modifiedDocx)
}

// replacePlaceholdersInDOCX replaces placeholders and processes loops in a DOCX file
func replacePlaceholdersInDOCX(docxBytes []byte, placeholders map[string]interface{}, reportData map[string]interface{}) ([]byte, error) {
	// Open the DOCX as a ZIP archive
	zipReader, err := zip.NewReader(bytes.NewReader(docxBytes), int64(len(docxBytes)))
	if err != nil {
		return nil, fmt.Errorf("failed to open DOCX as ZIP: %v", err)
	}

	log.Printf("Opened DOCX ZIP archive with %d files", len(zipReader.File))

	// Create a new ZIP buffer for the modified DOCX
	var buf bytes.Buffer
	zipWriter := zip.NewWriter(&buf)

	// Process each file in the ZIP
	for _, file := range zipReader.File {
		// Read the file content
		fileReader, err := file.Open()
		if err != nil {
			return nil, fmt.Errorf("failed to open file %s: %v", file.Name, err)
		}

		fileContent, err := io.ReadAll(fileReader)
		fileReader.Close()
		if err != nil {
			return nil, fmt.Errorf("failed to read file %s: %v", file.Name, err)
		}

		// Update document metadata (author, etc.)
		if file.Name == "docProps/core.xml" {
			// Update author in core.xml if report.author is in placeholders
			if placeholders != nil {
				if author, ok := placeholders["report.author"].(string); ok && author != "" {
					coreXML := string(fileContent)
					// Replace author in core.xml
					// Find <dc:creator> tag and replace its content
					creatorRegex := regexp.MustCompile(`<dc:creator[^>]*>.*?</dc:creator>`)
					coreXML = creatorRegex.ReplaceAllString(coreXML, fmt.Sprintf(`<dc:creator>%s</dc:creator>`, escapeXML(author)))

					// Also update cp:lastModifiedBy if present
					lastModifiedRegex := regexp.MustCompile(`<cp:lastModifiedBy[^>]*>.*?</cp:lastModifiedBy>`)
					coreXML = lastModifiedRegex.ReplaceAllString(coreXML, fmt.Sprintf(`<cp:lastModifiedBy>%s</cp:lastModifiedBy>`, escapeXML(author)))

					fileContent = []byte(coreXML)
				}
			}
		}

		// Replace placeholders and process loops in document.xml
		if file.Name == "word/document.xml" {
			log.Printf("Processing document.xml: size=%d bytes", len(fileContent))
			xmlContent := string(fileContent)
			originalLength := len(xmlContent)

			// Remove all paragraph spacing (before and after) from the document
			// This removes w:spacing attributes from w:pPr elements
			xmlContent = removeParagraphSpacing(xmlContent)

			// CRITICAL FIX: Add xml:space="preserve" to text nodes safely.
			// Only add it if the tag doesn't already have an xml:space attribute.
			// This prevents invalid XML with duplicate attributes.
			textTagRegex := regexp.MustCompile(`<w:t\b[^>]*>`)
			xmlContent = textTagRegex.ReplaceAllStringFunc(xmlContent, func(match string) string {
				if strings.Contains(match, "xml:space") {
					return match // Already has it, don't touch
				}
				// Insert xml:space="preserve"
				if match == "<w:t>" {
					return `<w:t xml:space="preserve">`
				}
				// For <w:t something...>, insert after <w:t
				return `<w:t xml:space="preserve"` + match[4:]
			})

			// First process loops (they may contain placeholders and conditionals)
			// Only process if there are actually loop markers in the XML
			if reportData != nil && strings.Contains(xmlContent, "{{#each") {
				log.Printf("Found loop markers, processing loops...")
				xmlContent = processLoopsInXML(xmlContent, reportData)
				log.Printf("After loop processing: originalLength=%d, newLength=%d", originalLength, len(xmlContent))
			} else {
				log.Printf("No loop markers found, skipping loop processing")
			}

			// Then process conditionals (they may contain placeholders)
			// Merge placeholders into reportData for conditional evaluation
			conditionalData := make(map[string]interface{})
			if reportData != nil {
				for k, v := range reportData {
					conditionalData[k] = v
				}
			}
			if placeholders != nil {
				// Add placeholders to conditionalData, handling dot notation
				for key, value := range placeholders {
					// If key contains dots, create nested structure
					if strings.Contains(key, ".") {
						setNestedValue(conditionalData, key, value)
					} else {
						conditionalData[key] = value
					}
				}
			}

			if strings.Contains(xmlContent, "{{#if") {
				log.Printf("Found conditional markers, processing conditionals...")
				xmlContent = processConditionalsInXML(xmlContent, conditionalData)
				log.Printf("After conditional processing: size=%d bytes", len(xmlContent))
			}

			// Finally replace simple placeholders
			if placeholders != nil {
				fileContent = replacePlaceholdersInXML(xmlContent, placeholders)
				log.Printf("After placeholder replacement: size=%d bytes", len(fileContent))
			} else {
				fileContent = []byte(xmlContent)
			}
		}

		// Write the file to the new ZIP
		fileWriter, err := zipWriter.Create(file.Name)
		if err != nil {
			return nil, fmt.Errorf("failed to create file %s in ZIP: %v", file.Name, err)
		}

		if _, err := fileWriter.Write(fileContent); err != nil {
			return nil, fmt.Errorf("failed to write file %s: %v", file.Name, err)
		}
	}

	// Close the ZIP writer
	if err := zipWriter.Close(); err != nil {
		return nil, fmt.Errorf("failed to close ZIP writer: %v", err)
	}

	log.Printf("DOCX processing complete: outputSize=%d bytes", buf.Len())
	return buf.Bytes(), nil
}

// removeParagraphSpacing enforces zero spacing (before and after) on all paragraphs
// ensuring a compact layout without extra margins
func removeParagraphSpacing(xmlContent string) string {
	// Instead of removing w:spacing (which reverts to style defaults),
	// we should enforce w:spacing w:before="0" w:after="0"

	// First, replace existing w:spacing tags
	// We use a regex that matches the whole tag
	spacingRegex := regexp.MustCompile(`<w:spacing\b[^>]*/>`)
	xmlContent = spacingRegex.ReplaceAllString(xmlContent, `<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>`)

	// Also handle split tags (rare for self-closing, but possible)
	spacingRegex2 := regexp.MustCompile(`<w:spacing\b[^>]*>[\s\S]*?</w:spacing>`)
	xmlContent = spacingRegex2.ReplaceAllString(xmlContent, `<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>`)

	// Now, we need to ensure every w:pPr has a w:spacing tag
	// This is harder with regex.
	// But we can try to inject it if missing?
	// It's safer to just rely on the style defaults if we modify styles.xml?
	// I previously modified styles.xml to set Normal style to 0 spacing.
	// If styles.xml is modified correctly, removing w:spacing should work.
	// But createAdvancedDOCX creates a NEW styles.xml.
	// However, we are editing an UPLOADED DOCX. We don't touch its styles.xml (unless we parse it).
	// So we rely on document.xml.

	// If the user's Normal style has spacing, removing w:spacing makes it spaced.
	// So we MUST replace/add w:spacing="0".

	// Adding it where it's missing is complex with regex.
	// But replacing existing ones covers most cases where Word explicitly added spacing.

	return xmlContent
}

// replacePlaceholdersInXML replaces placeholders in XML content
func replacePlaceholdersInXML(xmlContent string, placeholders map[string]interface{}) []byte {
	// Replace placeholders like {{key}} with their values
	// Use robust replacement to handle placeholders split across XML tags
	for key, value := range placeholders {
		placeholder := fmt.Sprintf("{{%s}}", key)
		replacement := fmt.Sprintf("%v", value)
		xmlContent = replacePlaceholderRobust(xmlContent, placeholder, replacement)
	}

	return []byte(xmlContent)
}

// processLoopsInXML processes {{#each}} loops in XML content
func processLoopsInXML(xmlContent string, reportData map[string]interface{}) string {
	if reportData == nil {
		return xmlContent
	}

	result := xmlContent

	// Find all {{#each arrayName}}...{{/each}} loops
	// Use a custom finder to handle split tags
	markers := findLoopMarkers(result)

	// Safety limit to prevent infinite loops
	maxIterations := 100
	iteration := 0

	// Process loops from innermost to outermost (by finding all and processing in reverse order)
	// Actually, finding all at once and processing reverse is good IF markers don't overlap in a way that breaks indices.
	// But since we modify the string, we should probably process one at a time or be very careful.
	// The previous regex approach processed in reverse order of matches found.
	// Let's stick to the loop approach where we re-scan after each change.

	for {
		iteration++
		if iteration > maxIterations {
			log.Printf("Warning: processLoopsInXML reached max iterations (%d), stopping to prevent infinite loop", maxIterations)
			break
		}

		markers = findLoopMarkers(result)
		if len(markers) == 0 {
			break // No more loops to process
		}

		// Track if we made any changes in this iteration
		changed := false

		// Process the FIRST marker (outermost) to ensure context is available for nested loops
		// We must find the BALANCED closing tag to skip over nested loops
		match := markers[0]
		startIdx := match.startIdx
		matchEnd := match.endIdx
		arrayName := match.arrayName

		log.Printf("Found valid loop marker: {{#each %s}} at position %d-%d", arrayName, startIdx, matchEnd)

		// Find the matching {{/each}} - search from after the opening tag
		searchStart := matchEnd // Start searching after {{#each arrayName}}

		// Find the balanced closing tag {{/each}}
		endIdxStart, endIdxEnd := findBalancedClosingTag(result, searchStart)

		if endIdxStart == -1 {
			log.Printf("Warning: Unclosed loop found for %s at position %d (searched from %d)",
				arrayName, startIdx, searchStart)
			log.Printf("Sample around loop start: %s", safeSubstring(result, startIdx, 200))
			break
		}

		log.Printf("Found closing tag for %s: start=%d, end=%d", arrayName, endIdxStart, endIdxEnd)

		// Extract loop content
		loopStart := matchEnd // After {{#each arrayName}}
		if loopStart >= endIdxStart {
			log.Printf("Warning: Invalid loop structure for %s: loopStart=%d, endIdxStart=%d", arrayName, loopStart, endIdxStart)
			break
		}
		loopContent := result[loopStart:endIdxStart]
		log.Printf("Extracted loop content for %s: length=%d bytes", arrayName, len(loopContent))

		// Get the array from reportData
		// DEBUG: Check if currentVm exists in reportData when processing vm.* loops
		if strings.HasPrefix(arrayName, "vm.") {
			log.Printf("DEBUG processLoopsInXML: Processing vm.* loop '%s', checking for currentVm in reportData", arrayName)
			if currentVm, ok := reportData["currentVm"].(map[string]interface{}); ok {
				log.Printf("DEBUG processLoopsInXML: Found currentVm in reportData for '%s', VM name: %v", arrayName, currentVm["name"])
			} else {
				log.Printf("DEBUG processLoopsInXML: currentVm NOT found in reportData for '%s', reportData keys: %v", arrayName, getMapKeys(reportData))
			}
		}
		array := getArrayFromData(arrayName, reportData)
		log.Printf("Processing loop %s: found %d items", arrayName, len(array))

		// Build replacement by duplicating loop content for each item
		var replacement strings.Builder
		for idx, item := range array {
			// CRITICAL: Create a deep copy of the item FIRST before using it in context
			// This ensures that nested loops (like {{#each vm.disks}}) get isolated data
			var itemCopy interface{}
			if itemMap, ok := item.(map[string]interface{}); ok {
				// Helper function to deep copy a value
				var deepCopyValue func(interface{}) interface{}
				deepCopyValue = func(val interface{}) interface{} {
					if val == nil {
						return nil
					}
					if valMap, ok := val.(map[string]interface{}); ok {
						// If value is a map, create a deep copy
						valMapCopy := make(map[string]interface{})
						for k2, v2 := range valMap {
							valMapCopy[k2] = deepCopyValue(v2)
						}
						return valMapCopy
					} else if valArray, ok := val.([]interface{}); ok {
						// If value is an array, create a deep copy of each element
						valArrayCopy := make([]interface{}, len(valArray))
						for i, elem := range valArray {
							valArrayCopy[i] = deepCopyValue(elem)
						}
						return valArrayCopy
					} else {
						// For primitive types, just copy the value
						return val
					}
				}
				// Create a new map and deep copy all fields
				itemCopyMap := make(map[string]interface{})
				for k, v := range itemMap {
					itemCopyMap[k] = deepCopyValue(v)
				}
				itemCopy = itemCopyMap
			} else {
				itemCopy = item
			}

			// CRITICAL: Create a fresh copy of loopContent for each iteration
			// This ensures that placeholder replacements don't affect other iterations
			itemContent := loopContent

			// Create a context for nested loops (e.g., set currentHost when processing hosts)
			itemContext := make(map[string]interface{})
			for k, v := range reportData {
				itemContext[k] = v
			}

			// Set context variables for nested loops using the DEEP COPY
			// For hosts loop, set currentHost and host
			if arrayName == "hosts" {
				if itemMap, ok := itemCopy.(map[string]interface{}); ok {
					itemContext["currentHost"] = itemMap
					itemContext["host"] = itemMap
					log.Printf("Setting context for host[%d]: name=%v, totalMemory=%v, osVersion=%v",
						idx, itemMap["name"], itemMap["totalMemory"], itemMap["osVersion"])
				}
			}
			// For vms loop, set currentVm and vm
			// Handle both "vms" and "host.vms" array names
			if arrayName == "vms" || arrayName == "host.vms" || strings.HasSuffix(arrayName, ".vms") {
				if itemMap, ok := itemCopy.(map[string]interface{}); ok {
					itemContext["currentVm"] = itemMap
					itemContext["vm"] = itemMap
					log.Printf("Setting context for VM[%d] (arrayName=%s): name=%v, state=%v",
						idx, arrayName, itemMap["name"], itemMap["state"])

					// DEBUG: Check for disks and networkAdapters in VM
					if disks, ok := itemMap["disks"]; ok {
						log.Printf("DEBUG VM[%d]: Found 'disks' in VM, type: %T", idx, disks)
						if arr, ok := disks.([]interface{}); ok {
							log.Printf("DEBUG VM[%d]: disks is array with %d items", idx, len(arr))
						}
					} else {
						log.Printf("DEBUG VM[%d]: 'disks' NOT found in VM, available keys: %v", idx, getMapKeys(itemMap))
					}
					if networkAdapters, ok := itemMap["networkAdapters"]; ok {
						log.Printf("DEBUG VM[%d]: Found 'networkAdapters' in VM, type: %T", idx, networkAdapters)
						if arr, ok := networkAdapters.([]interface{}); ok {
							log.Printf("DEBUG VM[%d]: networkAdapters is array with %d items", idx, len(arr))
						}
					} else {
						log.Printf("DEBUG VM[%d]: 'networkAdapters' NOT found in VM, available keys: %v", idx, getMapKeys(itemMap))
					}
				}
			}
			// For checkpoint.chain loop, set currentCheckpoint and checkpoint
			if arrayName == "vm.checkpoint.chain" || arrayName == "checkpoint.chain" || arrayName == "chain" || strings.Contains(arrayName, "checkpoint.chain") {
				if itemMap, ok := itemCopy.(map[string]interface{}); ok {
					itemContext["currentCheckpoint"] = itemMap
					itemContext["checkpoint"] = itemMap
					log.Printf("Setting context for checkpoint[%d] (arrayName=%s): name=%v",
						idx, arrayName, itemMap["name"])
				}
			}

			// Process nested loops first (they may contain placeholders)
			// Always process nested loops - check is done inside processLoopsInXML
			// And passing context is important
			// The previous check strings.Contains(itemContent, "{{#each") was fragile with split tags
			itemContent = processLoopsInXML(itemContent, itemContext)

			// Replace item placeholders (e.g., {{host.name}} becomes the item's name)
			// Handle both direct access (host.name) and array item access (hosts.0.name)
			// IMPORTANT: Do this AFTER processing nested loops so nested loops have the correct context
			// But we also need to replace placeholders in the outer content (like {{host.totalMemory}})
			itemName := "unknown"
			if itemMap, ok := item.(map[string]interface{}); ok {
				if name, ok := itemMap["name"]; ok {
					itemName = fmt.Sprintf("%v", name)
				}
			}
			log.Printf("Replacing placeholders for %s[%d] (name=%v), content length: %d",
				arrayName, idx, itemName, len(itemContent))

			// DEBUG: Check if content contains vm.disks.length or vm.networkAdapters.length
			if strings.Contains(itemContent, "{{vm.disks.length}}") {
				log.Printf("DEBUG: Found {{vm.disks.length}} in content for %s[%d]", arrayName, idx)
			}
			if strings.Contains(itemContent, "{{vm.networkAdapters.length}}") {
				log.Printf("DEBUG: Found {{vm.networkAdapters.length}} in content for %s[%d]", arrayName, idx)
			}
			// itemCopy was already created above before setting context, so we can use it directly

			// Get itemMap reference for conditional context (after copy is made)
			var normalizedItemMap map[string]interface{}
			if itemMap, ok := itemCopy.(map[string]interface{}); ok {
				normalizedItemMap = itemMap
			}

			// itemCopy was already created above before setting context, so we can use it directly
			itemContentBeforeReplace := itemContent
			itemContent = replaceItemPlaceholders(itemContent, arrayName, itemCopy, idx)
			log.Printf("After replacing placeholders for %s[%d], content length: %d", arrayName, idx, len(itemContent))

			// DEBUG: Check if placeholders were replaced
			if strings.Contains(itemContent, "{{vm.disks.length}}") {
				log.Printf("DEBUG: {{vm.disks.length}} still present after replaceItemPlaceholders for %s[%d]", arrayName, idx)
			} else if strings.Contains(itemContentBeforeReplace, "{{vm.disks.length}}") {
				log.Printf("DEBUG: {{vm.disks.length}} was successfully replaced for %s[%d]", arrayName, idx)
			}
			if strings.Contains(itemContent, "{{vm.networkAdapters.length}}") {
				log.Printf("DEBUG: {{vm.networkAdapters.length}} still present after replaceItemPlaceholders for %s[%d]", arrayName, idx)
			} else if strings.Contains(itemContentBeforeReplace, "{{vm.networkAdapters.length}}") {
				log.Printf("DEBUG: {{vm.networkAdapters.length}} was successfully replaced for %s[%d]", arrayName, idx)
			}

			// After replaceItemPlaceholders, normalizedItemMap should have normalized values
			// Get the updated map reference (replaceItemPlaceholders modifies it in place)
			if itemMap, ok := itemCopy.(map[string]interface{}); ok {
				normalizedItemMap = itemMap
			}

			// Log the normalized values for debugging
			if normalizedItemMap != nil {
				if arrayName == "localUsers" || arrayName == "users" || strings.HasSuffix(arrayName, ".localUsers") || strings.HasSuffix(arrayName, ".users") {
					log.Printf("Normalized values for %s[%d]: enabled=%v (type: %T), userMayChangePassword=%v (type: %T), passwordRequired=%v (type: %T), passwordExpires=%v (type: %T)",
						arrayName, idx, normalizedItemMap["enabled"], normalizedItemMap["enabled"],
						normalizedItemMap["userMayChangePassword"], normalizedItemMap["userMayChangePassword"],
						normalizedItemMap["passwordRequired"], normalizedItemMap["passwordRequired"],
						normalizedItemMap["passwordExpires"], normalizedItemMap["passwordExpires"])
				} else {
					log.Printf("Normalized values for %s[%d]: isSET=%v (type: %T), isTeamed=%v (type: %T)",
						arrayName, idx, normalizedItemMap["isSET"], normalizedItemMap["isSET"],
						normalizedItemMap["isTeamed"], normalizedItemMap["isTeamed"])
				}
			}

			// Process conditionals AFTER placeholders are replaced (so adapter.isSET, adapter.isTeamed are available)
			// Merge itemContext with normalizedItemMap for conditional evaluation
			conditionalContext := make(map[string]interface{})
			for k, v := range itemContext {
				conditionalContext[k] = v
			}
			if normalizedItemMap != nil {
				// Determine baseName for this array
				baseNameForConditional := "item"
				if arrayName == "physicalDisks" || arrayName == "disks" {
					baseNameForConditional = "disk"
				} else if arrayName == "volumes" {
					baseNameForConditional = "volume"
				} else if arrayName == "networks" || arrayName == "networkAdapters" || arrayName == "adapters" {
					baseNameForConditional = "adapter"
				} else if arrayName == "hosts" {
					baseNameForConditional = "host"
				} else if arrayName == "vms" || strings.HasSuffix(arrayName, ".vms") {
					baseNameForConditional = "vm"
				} else if arrayName == "csvs" || arrayName == "clusterSharedVolumes" {
					baseNameForConditional = "csv"
				} else if arrayName == "quorumDisks" {
					baseNameForConditional = "quorumDisk"
				} else if arrayName == "vswitches" || arrayName == "virtualSwitches" || strings.HasSuffix(arrayName, ".vswitches") || strings.HasSuffix(arrayName, ".virtualSwitches") {
					baseNameForConditional = "vswitch"
				} else if strings.Contains(arrayName, "multipathIO.paths") || strings.HasSuffix(arrayName, ".paths") {
					baseNameForConditional = "path"
				} else if strings.Contains(arrayName, "multipathIO.devices") || strings.HasSuffix(arrayName, ".devices") {
					baseNameForConditional = "device"
				} else if arrayName == "localUsers" || arrayName == "users" || strings.HasSuffix(arrayName, ".localUsers") || strings.HasSuffix(arrayName, ".users") {
					baseNameForConditional = "user"
				} else if arrayName == "localGroups" || arrayName == "groups" || strings.HasSuffix(arrayName, ".localGroups") || strings.HasSuffix(arrayName, ".groups") {
					baseNameForConditional = "group"
				} else if arrayName == "missingUpdates" || arrayName == "updates" || strings.HasSuffix(arrayName, ".missingUpdates") {
					baseNameForConditional = "update"
				} else if arrayName == "windowsFirewall" || arrayName == "firewall" || strings.HasSuffix(arrayName, ".windowsFirewall") {
					baseNameForConditional = "firewall"
				}
				// Add adapter/host/vm/etc. to context for conditionals (using normalized map)
				// CRITICAL: normalizedItemMap is updated by replaceItemPlaceholders, so it has the correct normalized values
				conditionalContext[baseNameForConditional] = normalizedItemMap
				if baseNameForConditional == "adapter" {
					log.Printf("Added %s to conditional context with isSET=%v, isTeamed=%v",
						baseNameForConditional, normalizedItemMap["isSET"], normalizedItemMap["isTeamed"])
				} else if baseNameForConditional == "user" {
					log.Printf("Added %s to conditional context with enabled=%v, userMayChangePassword=%v, passwordRequired=%v",
						baseNameForConditional, normalizedItemMap["enabled"], normalizedItemMap["userMayChangePassword"], normalizedItemMap["passwordRequired"])
				}
			}
			itemContent = processConditionalsInXML(itemContent, conditionalContext)

			replacement.WriteString(itemContent)
		}

		// Replace the entire loop with the processed content
		fullLoop := result[startIdx:endIdxEnd]
		newResult := strings.Replace(result, fullLoop, replacement.String(), 1)
		if newResult != result {
			result = newResult
			changed = true
		}

		// If no changes were made in this iteration, break to prevent infinite loop
		if !changed {
			break
		}
	}

	return result
}

// processConditionalsInXML processes {{#if}}...{{/if}} conditionals in XML content
func processConditionalsInXML(xmlContent string, reportData map[string]interface{}) string {
	if reportData == nil {
		return xmlContent
	}

	result := xmlContent
	maxIterations := 100
	iteration := 0

	for {
		iteration++
		if iteration > maxIterations {
			log.Printf("Warning: processConditionalsInXML reached max iterations (%d), stopping", maxIterations)
			break
		}

		// Find the first {{#if condition}} marker
		ifMarker := findConditionalMarker(result)
		if ifMarker.startIdx == -1 {
			break // No more conditionals
		}

		// Find the matching {{/if}} tag
		endIdxStart, endIdxEnd := findBalancedConditionalClosingTag(result, ifMarker.endIdx)
		if endIdxStart == -1 {
			log.Printf("Warning: Unclosed conditional found at position %d", ifMarker.startIdx)
			break
		}

		// Extract the condition and content
		condition := ifMarker.condition
		content := result[ifMarker.endIdx:endIdxStart]

		// Check for {{else if}} first, then {{else}}
		elseIfStart, elseIfEnd := findSplitTag(content, "{{else if", 0)
		elseStart, elseEnd := findSplitTag(content, "{{else}}", 0)

		// Determine which comes first (else if or else)
		var firstElseStart, firstElseEnd int = -1, -1
		var isElseIf bool = false
		var elseIfCondition string = ""

		if elseIfStart >= 0 && (elseStart == -1 || elseIfStart < elseStart) {
			// Found {{else if}} before {{else}}
			firstElseStart = elseIfStart
			isElseIf = true
			// Find the closing }} for {{else if condition}}
			// Search from elseIfEnd (which is after "{{else if") to find "}}"
			closingIdx, closingEnd := findSplitTag(content[elseIfStart:], "}}", 0)
			if closingIdx >= 0 {
				firstElseEnd = elseIfStart + closingEnd
				// Extract the condition between "{{else if" and "}}"
				conditionStart := elseIfStart + 9 // After "{{else if"
				conditionEnd := elseIfStart + closingIdx
				conditionText := content[conditionStart:conditionEnd]
				// Strip XML tags from condition text (they might be split across tags)
				elseIfCondition = stripXMLTags(conditionText)
				elseIfCondition = strings.TrimSpace(elseIfCondition)
			} else {
				// Fallback: use elseIfEnd if we can't find closing }}
				firstElseEnd = elseIfEnd
			}
		} else if elseStart >= 0 {
			// Found {{else}} (no else if before it)
			firstElseStart = elseStart
			firstElseEnd = elseEnd
		}

		var ifContent, elseContent string
		if firstElseStart >= 0 {
			ifContent = content[:firstElseStart]
			if isElseIf {
				// For {{else if}}, we need to find where it ends (next {{else}} or {{/if}})
				remainingContent := content[firstElseEnd:]
				nextElseStart, _ := findSplitTag(remainingContent, "{{else}}", 0)
				if nextElseStart >= 0 {
					// There's another {{else}} after {{else if}}, so elseContent includes everything after that
					_, nextElseEnd := findSplitTag(remainingContent, "{{else}}", 0)
					elseContent = remainingContent[nextElseEnd:]
				} else {
					// No more {{else}}, so elseContent is empty (the else if content will be handled separately)
					elseContent = ""
				}
			} else {
				elseContent = content[firstElseEnd:]
			}
		} else {
			ifContent = content
			elseContent = ""
		}

		// Evaluate condition
		log.Printf("Evaluating conditional: '%s'", condition)
		conditionResult := evaluateConditional(condition, reportData)
		log.Printf("Conditional '%s' evaluated to: %v", condition, conditionResult)

		// Replace the entire conditional with the appropriate content
		fullConditional := result[ifMarker.startIdx:endIdxEnd]
		var replacement string
		if conditionResult {
			replacement = ifContent
		} else if isElseIf && elseIfCondition != "" {
			// Evaluate the else if condition
			log.Printf("Evaluating else if conditional: '%s'", elseIfCondition)
			elseIfResult := evaluateConditional(elseIfCondition, reportData)
			log.Printf("Else if conditional '%s' evaluated to: %v", elseIfCondition, elseIfResult)
			if elseIfResult {
				// Use the else if content (between {{else if}} and next {{else}} or {{/if}})
				remainingContent := content[firstElseEnd:]
				nextElseStart, _ := findSplitTag(remainingContent, "{{else}}", 0)
				if nextElseStart >= 0 {
					replacement = remainingContent[:nextElseStart]
				} else {
					replacement = remainingContent
				}
			} else {
				// Use the final else content (after the last {{else}})
				remainingContent := content[firstElseEnd:]
				_, nextElseEnd := findSplitTag(remainingContent, "{{else}}", 0)
				if nextElseEnd > 0 {
					replacement = remainingContent[nextElseEnd:]
				} else {
					replacement = ""
				}
			}
		} else {
			replacement = elseContent
		}

		// Process nested conditionals and loops in the replacement
		replacement = processConditionalsInXML(replacement, reportData)
		replacement = processLoopsInXML(replacement, reportData)

		result = strings.Replace(result, fullConditional, replacement, 1)
	}

	return result
}

// ConditionalMarker represents a found {{#if condition}} marker
type ConditionalMarker struct {
	startIdx  int
	endIdx    int
	condition string
}

// findConditionalMarker finds the first {{#if condition}} marker in the content
func findConditionalMarker(content string) ConditionalMarker {
	// Look for {{#if using findSplitTag to handle split tags
	startIdx, _ := findSplitTag(content, "{{#if", 0)
	if startIdx == -1 {
		return ConditionalMarker{startIdx: -1, endIdx: -1, condition: ""}
	}

	// Find the closing }} using findSplitTag to handle split tags
	// Search from after "{{#if" to find the closing "}}"
	searchStart := startIdx + 5 // After "{{#if"
	closingStart, closingEnd := findSplitTag(content[searchStart:], "}}", 0)
	if closingStart == -1 {
		return ConditionalMarker{startIdx: -1, endIdx: -1, condition: ""}
	}
	endIdx := searchStart + closingEnd

	// Extract condition (between {{#if and }})
	conditionStart := startIdx + 5             // After "{{#if"
	conditionEnd := searchStart + closingStart // Before "}}"
	conditionText := content[conditionStart:conditionEnd]
	// Strip XML tags from condition text (they might be split across tags)
	condition := stripXMLTags(conditionText)
	condition = strings.TrimSpace(condition)

	return ConditionalMarker{
		startIdx:  startIdx,
		endIdx:    endIdx,
		condition: condition,
	}
}

// findBalancedConditionalClosingTag finds the matching {{/if}} for a {{#if}}
// Handles tags that may be split across XML elements
func findBalancedConditionalClosingTag(content string, startFrom int) (int, int) {
	depth := 1
	currentIdx := startFrom

	for currentIdx < len(content) {
		// Look for {{#if or {{/if}} (handling split tags)
		nextIfStart, nextIfEnd := findSplitTag(content, "{{#if", currentIdx)
		nextElseStart, nextElseEnd := findSplitTag(content, "{{/if}}", currentIdx)

		// Determine which comes first
		if nextElseStart == -1 {
			// No closing tag found
			return -1, -1
		}

		if nextIfStart >= 0 && nextIfStart < nextElseStart {
			// Found nested {{#if before {{/if}}
			depth++
			currentIdx = nextIfEnd
		} else {
			// Found {{/if}}
			depth--
			if depth == 0 {
				// This is our matching closing tag
				return nextElseStart, nextElseEnd
			}
			currentIdx = nextElseEnd
		}
	}

	return -1, -1
}

// findElseTag finds {{else}} in the content (handles split tags)
func findElseTag(content string) int {
	// Use findSplitTag to handle tags split across XML
	elseStart, _ := findSplitTag(content, "{{else}}", 0)
	if elseStart == -1 {
		return -1
	}

	// Check if there's an unclosed {{#if before this {{else}}
	beforeContent := content[:elseStart]
	ifCount := strings.Count(beforeContent, "{{#if")
	endifCount := strings.Count(beforeContent, "{{/if}}")

	// If there are unclosed ifs, this else belongs to a nested if
	if ifCount > endifCount {
		return -1
	}

	return elseStart
}

// evaluateConditional evaluates a conditional expression
func evaluateConditional(condition string, reportData map[string]interface{}) bool {
	condition = strings.TrimSpace(condition)
	if condition == "" {
		return false
	}

	// Decode HTML entities (e.g., &gt; -> >, &lt; -> <, &amp; -> &)
	condition = strings.ReplaceAll(condition, "&gt;", ">")
	condition = strings.ReplaceAll(condition, "&lt;", "<")
	condition = strings.ReplaceAll(condition, "&amp;", "&")
	condition = strings.ReplaceAll(condition, "&quot;", "\"")
	condition = strings.ReplaceAll(condition, "&#39;", "'")

	// Handle different condition types
	// 1. Simple existence check: "key" or "key.property"
	if !strings.Contains(condition, " ") && !strings.Contains(condition, "==") &&
		!strings.Contains(condition, "!=") && !strings.Contains(condition, ">") &&
		!strings.Contains(condition, "<") && !strings.Contains(condition, "contains") &&
		!strings.Contains(condition, "startsWith") && !strings.Contains(condition, "endsWith") {
		value := resolveNestedPathValue(condition, reportData)
		return isTruthy(value)
	}

	// 2. Comparison operators: "value1 == value2", "value1 != value2", etc.
	parts := strings.Fields(condition)
	if len(parts) >= 3 {
		left := strings.Join(parts[:len(parts)-2], " ")
		operator := parts[len(parts)-2]
		right := strings.Join(parts[len(parts)-1:], " ")

		leftValue := resolveConditionalValue(left, reportData)
		rightValue := resolveConditionalValue(right, reportData)

		switch operator {
		case "==", "===":
			return fmt.Sprintf("%v", leftValue) == fmt.Sprintf("%v", rightValue)
		case "!=", "!==":
			return fmt.Sprintf("%v", leftValue) != fmt.Sprintf("%v", rightValue)
		case ">":
			return compareValues(leftValue, rightValue) > 0
		case "<":
			return compareValues(leftValue, rightValue) < 0
		case ">=":
			return compareValues(leftValue, rightValue) >= 0
		case "<=":
			return compareValues(leftValue, rightValue) <= 0
		case "contains":
			leftStr := fmt.Sprintf("%v", leftValue)
			rightStr := fmt.Sprintf("%v", rightValue)
			return strings.Contains(leftStr, rightStr)
		case "startsWith":
			leftStr := fmt.Sprintf("%v", leftValue)
			rightStr := fmt.Sprintf("%v", rightValue)
			return strings.HasPrefix(leftStr, rightStr)
		case "endsWith":
			leftStr := fmt.Sprintf("%v", leftValue)
			rightStr := fmt.Sprintf("%v", rightValue)
			return strings.HasSuffix(leftStr, rightStr)
		}
	}

	// 3. Try to evaluate as a single value
	value := resolveConditionalValue(condition, reportData)
	return isTruthy(value)
}

// resolveConditionalValue resolves a value from reportData, handling quotes and nested paths
func resolveConditionalValue(value string, reportData map[string]interface{}) interface{} {
	value = strings.TrimSpace(value)

	// Remove quotes if present
	if (strings.HasPrefix(value, `"`) && strings.HasSuffix(value, `"`)) ||
		(strings.HasPrefix(value, `'`) && strings.HasSuffix(value, `'`)) {
		return value[1 : len(value)-1]
	}

	// Try to parse as number
	if num, err := strconv.ParseFloat(value, 64); err == nil {
		return num
	}

	// Try to parse as boolean
	if value == "true" {
		return true
	}
	if value == "false" {
		return false
	}

	// Resolve from reportData
	return resolveNestedPathValue(value, reportData)
}

// resolveNestedPathValue resolves a nested path like "host.name" or "cluster.nodes"
// Also handles array length checks like "host.missingUpdates.length"
func resolveNestedPathValue(path string, reportData map[string]interface{}) interface{} {
	parts := strings.Split(path, ".")
	current := reportData

	log.Printf("resolveNestedPathValue: resolving path '%s' with %d parts", path, len(parts))
	if len(parts) > 0 && parts[0] == "adapter" {
		log.Printf("resolveNestedPathValue: DEBUG - Looking for adapter path, reportData keys: %v", getMapKeys(reportData))
	}

	for i, part := range parts {
		log.Printf("resolveNestedPathValue: step %d, looking for '%s' in map with keys: %v", i, part, getMapKeys(current))

		// Check if this is the last part and it's "length" - handle array length
		if i == len(parts)-1 && part == "length" && i > 0 {
			// Get the array from the previous part
			prevPart := parts[i-1]
			if val, ok := current[prevPart]; ok {
				if arr, ok := val.([]interface{}); ok {
					length := len(arr)
					log.Printf("resolveNestedPathValue: found array length %d for path '%s' (array: %s)", length, path, prevPart)
					return length
				}
			}
			log.Printf("resolveNestedPathValue: 'length' requested but previous part '%s' is not an array or not found", prevPart)
			return 0
		}

		if val, ok := current[part]; ok {
			// If this is not the last part and the next part is "length", check if current value is an array
			if i < len(parts)-1 {
				nextPart := parts[i+1]
				log.Printf("resolveNestedPathValue: at part '%s', next part is '%s'", part, nextPart)
				if nextPart == "length" {
					if arr, ok := val.([]interface{}); ok {
						length := len(arr)
						log.Printf("resolveNestedPathValue: found array length %d for '%s.length' (path: %s)", length, part, path)
						return length
					} else {
						log.Printf("resolveNestedPathValue: '%s' is not an array (type: %T), cannot get length for path '%s'", part, val, path)
						return 0
					}
				}
			}

			if i == len(parts)-1 {
				log.Printf("resolveNestedPathValue: found value '%v' (type: %T) for path '%s'", val, val, path)
				return val
			}

			// Check if value is an array - arrays can't be navigated further (except for .length which is handled above)
			if arr, ok := val.([]interface{}); ok {
				log.Printf("resolveNestedPathValue: value at '%s' is an array (length: %d), cannot navigate to '%s' (path: %s)", part, len(arr), parts[i+1], path)
				return nil
			}

			if nextMap, ok := val.(map[string]interface{}); ok {
				current = nextMap
			} else {
				log.Printf("resolveNestedPathValue: value at '%s' is not a map (type: %T, value: %v) for path '%s'", part, val, val, path)
				return nil
			}
		} else {
			log.Printf("resolveNestedPathValue: key '%s' not found in map (path: %s)", part, path)
			return nil
		}
	}

	log.Printf("resolveNestedPathValue: path '%s' not found, returning nil", path)
	return nil
}

// setNestedValue sets a nested value in a map using dot notation (e.g., "cluster.name" -> map["cluster"]["name"])
func setNestedValue(data map[string]interface{}, path string, value interface{}) {
	parts := strings.Split(path, ".")
	current := data

	for i, part := range parts {
		if i == len(parts)-1 {
			// Last part, set the value
			current[part] = value
		} else {
			// Intermediate part, create nested map if needed
			if nextMap, ok := current[part].(map[string]interface{}); ok {
				current = nextMap
			} else {
				// Create new nested map
				newMap := make(map[string]interface{})
				current[part] = newMap
				current = newMap
			}
		}
	}
}

// isTruthy checks if a value is truthy
func isTruthy(value interface{}) bool {
	if value == nil {
		return false
	}

	switch v := value.(type) {
	case bool:
		return v
	case string:
		return v != "" && v != "false" && v != "0"
	case int, int8, int16, int32, int64:
		return v != 0
	case uint, uint8, uint16, uint32, uint64:
		return v != 0
	case float32, float64:
		return v != 0.0
	case []interface{}:
		return len(v) > 0
	case map[string]interface{}:
		return len(v) > 0
	default:
		return true
	}
}

// compareValues compares two values numerically
func compareValues(a, b interface{}) int {
	// Try to convert both to float64
	var aFloat, bFloat float64
	var ok bool

	if aFloat, ok = toFloat64(a); !ok {
		return 0
	}
	if bFloat, ok = toFloat64(b); !ok {
		return 0
	}

	if aFloat > bFloat {
		return 1
	} else if aFloat < bFloat {
		return -1
	}
	return 0
}

// toFloat64 converts a value to float64
func toFloat64(v interface{}) (float64, bool) {
	switch val := v.(type) {
	case float64:
		return val, true
	case float32:
		return float64(val), true
	case int:
		return float64(val), true
	case int8:
		return float64(val), true
	case int16:
		return float64(val), true
	case int32:
		return float64(val), true
	case int64:
		return float64(val), true
	case uint:
		return float64(val), true
	case uint8:
		return float64(val), true
	case uint16:
		return float64(val), true
	case uint32:
		return float64(val), true
	case uint64:
		return float64(val), true
	case string:
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			return f, true
		}
	}
	return 0, false
}

// safeSubstring safely extracts a substring with bounds checking
func safeSubstring(s string, start, length int) string {
	if start < 0 {
		start = 0
	}
	if start >= len(s) {
		return ""
	}
	end := start + length
	if end > len(s) {
		end = len(s)
	}
	return s[start:end]
}

// getArrayFromData extracts an array from reportData based on the array name
func getArrayFromData(arrayName string, reportData map[string]interface{}) []interface{} {
	log.Printf("getArrayFromData: looking for array '%s'", arrayName)

	var target interface{}
	found := false

	// Map common array name aliases to actual field names
	arrayNameMap := map[string]string{
		"csvs":            "clusterSharedVolumes",
		"quorumDisks":     "quorumDisks",
		"networks":        "networkAdapters", // Alias for networkAdapters
		"physicalDisks":   "physicalDisks",   // Alias for physical disks
		"disks":           "physicalDisks",   // Alias for physical disks
		"volumes":         "volumes",         // Alias for volumes
		"vswitches":       "virtualSwitches", // Alias for virtual switches
		"virtualSwitches": "virtualSwitches", // Alias for virtual switches
		"localUsers":      "localUsers",      // Alias for local users
		"users":           "localUsers",      // Alias for local users
		"localGroups":     "localGroups",     // Alias for local groups
		"groups":          "localGroups",     // Alias for local groups
		"missingUpdates":  "missingUpdates",  // Alias for missing updates
		"updates":         "missingUpdates",  // Alias for missing updates
		"windowsFirewall": "windowsFirewall", // Alias for Windows Firewall
		"firewall":        "windowsFirewall", // Alias for Windows Firewall
	}
	if mappedName, ok := arrayNameMap[arrayName]; ok {
		if val, ok := reportData[mappedName]; ok {
			target = val
			found = true
			log.Printf("getArrayFromData: mapped '%s' to '%s'", arrayName, mappedName)
		} else if mappedName == "quorumDisks" {
			// Also check in clusterInfo
			if clusterInfo, ok := reportData["clusterInfo"].(map[string]interface{}); ok {
				if val, ok := clusterInfo["quorumDisks"]; ok {
					target = val
					found = true
					log.Printf("getArrayFromData: found '%s' in clusterInfo", arrayName)
				}
			}
		} else if mappedName == "physicalDisks" {
			// Check if we're inside a host loop (currentHost exists)
			if currentHost, ok := reportData["currentHost"].(map[string]interface{}); ok {
				// Inside a host loop - only return disks from current host
				if disks, ok := currentHost["disks"].([]interface{}); ok {
					var hostDisks []interface{}
					for _, diskInterface := range disks {
						if disk, ok := diskInterface.(map[string]interface{}); ok {
							// Add host name to disk for reference
							diskMap := make(map[string]interface{})
							for k, v := range disk {
								diskMap[k] = v
							}
							if hostName, ok := currentHost["name"].(string); ok {
								diskMap["hostName"] = hostName
							}
							hostDisks = append(hostDisks, diskMap)
						}
					}
					if len(hostDisks) > 0 {
						target = hostDisks
						found = true
						log.Printf("getArrayFromData: found %d physical disks from currentHost", len(hostDisks))
					}
				}
			} else {
				// Not inside a host loop - extract all physical disks from all hosts
				if hosts, ok := reportData["hosts"].([]interface{}); ok {
					var allDisks []interface{}
					for _, hostInterface := range hosts {
						if host, ok := hostInterface.(map[string]interface{}); ok {
							if disks, ok := host["disks"].([]interface{}); ok {
								for _, diskInterface := range disks {
									if disk, ok := diskInterface.(map[string]interface{}); ok {
										// Add host name to disk for reference
										diskMap := make(map[string]interface{})
										for k, v := range disk {
											diskMap[k] = v
										}
										if hostName, ok := host["name"].(string); ok {
											diskMap["hostName"] = hostName
										}
										allDisks = append(allDisks, diskMap)
									}
								}
							}
						}
					}
					if len(allDisks) > 0 {
						target = allDisks
						found = true
						log.Printf("getArrayFromData: found %d physical disks from all hosts", len(allDisks))
					}
				}
			}
		} else if mappedName == "volumes" {
			// Check if we're inside a host loop (currentHost exists)
			if currentHost, ok := reportData["currentHost"].(map[string]interface{}); ok {
				// Inside a host loop - only return volumes from current host
				if volumes, ok := currentHost["volumes"].([]interface{}); ok {
					var hostVolumes []interface{}
					for _, volumeInterface := range volumes {
						if volume, ok := volumeInterface.(map[string]interface{}); ok {
							// Add host name to volume for reference
							volumeMap := make(map[string]interface{})
							for k, v := range volume {
								volumeMap[k] = v
							}
							if hostName, ok := currentHost["name"].(string); ok {
								volumeMap["hostName"] = hostName
							}
							hostVolumes = append(hostVolumes, volumeMap)
						}
					}
					if len(hostVolumes) > 0 {
						target = hostVolumes
						found = true
						log.Printf("getArrayFromData: found %d volumes from currentHost", len(hostVolumes))
					}
				}
			} else {
				// Not inside a host loop - extract all volumes from all hosts
				if hosts, ok := reportData["hosts"].([]interface{}); ok {
					var allVolumes []interface{}
					for _, hostInterface := range hosts {
						if host, ok := hostInterface.(map[string]interface{}); ok {
							if volumes, ok := host["volumes"].([]interface{}); ok {
								for _, volumeInterface := range volumes {
									if volume, ok := volumeInterface.(map[string]interface{}); ok {
										// Add host name to volume for reference
										volumeMap := make(map[string]interface{})
										for k, v := range volume {
											volumeMap[k] = v
										}
										if hostName, ok := host["name"].(string); ok {
											volumeMap["hostName"] = hostName
										}
										allVolumes = append(allVolumes, volumeMap)
									}
								}
							}
						}
					}
					if len(allVolumes) > 0 {
						target = allVolumes
						found = true
						log.Printf("getArrayFromData: found %d volumes from all hosts", len(allVolumes))
					}
				}
			}
		} else if mappedName == "virtualSwitches" {
			// Check if we're inside a host loop (currentHost exists)
			if currentHost, ok := reportData["currentHost"].(map[string]interface{}); ok {
				// Inside a host loop - only return virtual switches from current host
				if vswitches, ok := currentHost["virtualSwitches"].([]interface{}); ok {
					var hostVSwitches []interface{}
					for _, vswitchInterface := range vswitches {
						if vswitch, ok := vswitchInterface.(map[string]interface{}); ok {
							// Add host name to vswitch for reference
							vswitchMap := make(map[string]interface{})
							for k, v := range vswitch {
								vswitchMap[k] = v
							}
							if hostName, ok := currentHost["name"].(string); ok {
								vswitchMap["hostName"] = hostName
							}
							hostVSwitches = append(hostVSwitches, vswitchMap)
						}
					}
					if len(hostVSwitches) > 0 {
						target = hostVSwitches
						found = true
						log.Printf("getArrayFromData: found %d virtual switches from currentHost", len(hostVSwitches))
					}
				}
			} else {
				// Not inside a host loop - extract all virtual switches from all hosts
				if hosts, ok := reportData["hosts"].([]interface{}); ok {
					var allVSwitches []interface{}
					for _, hostInterface := range hosts {
						if host, ok := hostInterface.(map[string]interface{}); ok {
							if vswitches, ok := host["virtualSwitches"].([]interface{}); ok {
								for _, vswitchInterface := range vswitches {
									if vswitch, ok := vswitchInterface.(map[string]interface{}); ok {
										// Add host name to vswitch for reference
										vswitchMap := make(map[string]interface{})
										for k, v := range vswitch {
											vswitchMap[k] = v
										}
										if hostName, ok := host["name"].(string); ok {
											vswitchMap["hostName"] = hostName
										}
										allVSwitches = append(allVSwitches, vswitchMap)
									}
								}
							}
						}
					}
					if len(allVSwitches) > 0 {
						target = allVSwitches
						found = true
						log.Printf("getArrayFromData: found %d virtual switches from all hosts", len(allVSwitches))
					}
				}
			}
		} else if mappedName == "localUsers" {
			// Check if we're inside a host loop (currentHost exists)
			if currentHost, ok := reportData["currentHost"].(map[string]interface{}); ok {
				// Inside a host loop - only return local users from current host
				if localUsers, ok := currentHost["localUsers"].([]interface{}); ok {
					var hostUsers []interface{}
					for _, userInterface := range localUsers {
						if user, ok := userInterface.(map[string]interface{}); ok {
							// Add host name to user for reference
							userMap := make(map[string]interface{})
							for k, v := range user {
								userMap[k] = v
							}
							if hostName, ok := currentHost["name"].(string); ok {
								userMap["hostName"] = hostName
							}
							hostUsers = append(hostUsers, userMap)
						}
					}
					if len(hostUsers) > 0 {
						target = hostUsers
						found = true
						log.Printf("getArrayFromData: found %d local users from currentHost", len(hostUsers))
					}
				}
			} else {
				// Not inside a host loop - extract all local users from all hosts
				if hosts, ok := reportData["hosts"].([]interface{}); ok {
					var allUsers []interface{}
					for _, hostInterface := range hosts {
						if host, ok := hostInterface.(map[string]interface{}); ok {
							if localUsers, ok := host["localUsers"].([]interface{}); ok {
								for _, userInterface := range localUsers {
									if user, ok := userInterface.(map[string]interface{}); ok {
										// Add host name to user for reference
										userMap := make(map[string]interface{})
										for k, v := range user {
											userMap[k] = v
										}
										if hostName, ok := host["name"].(string); ok {
											userMap["hostName"] = hostName
										}
										allUsers = append(allUsers, userMap)
									}
								}
							}
						}
					}
					if len(allUsers) > 0 {
						target = allUsers
						found = true
						log.Printf("getArrayFromData: found %d local users from all hosts", len(allUsers))
					}
				}
			}
		} else if mappedName == "localGroups" {
			// Check if we're inside a host loop (currentHost exists)
			if currentHost, ok := reportData["currentHost"].(map[string]interface{}); ok {
				// Inside a host loop - only return local groups from current host
				if localGroups, ok := currentHost["localGroups"].([]interface{}); ok {
					var hostGroups []interface{}
					for _, groupInterface := range localGroups {
						if group, ok := groupInterface.(map[string]interface{}); ok {
							// Add host name to group for reference
							groupMap := make(map[string]interface{})
							for k, v := range group {
								groupMap[k] = v
							}
							if hostName, ok := currentHost["name"].(string); ok {
								groupMap["hostName"] = hostName
							}
							hostGroups = append(hostGroups, groupMap)
						}
					}
					if len(hostGroups) > 0 {
						target = hostGroups
						found = true
						log.Printf("getArrayFromData: found %d local groups from currentHost", len(hostGroups))
					}
				}
			} else {
				// Not inside a host loop - extract all local groups from all hosts
				if hosts, ok := reportData["hosts"].([]interface{}); ok {
					var allGroups []interface{}
					for _, hostInterface := range hosts {
						if host, ok := hostInterface.(map[string]interface{}); ok {
							if localGroups, ok := host["localGroups"].([]interface{}); ok {
								for _, groupInterface := range localGroups {
									if group, ok := groupInterface.(map[string]interface{}); ok {
										// Add host name to group for reference
										groupMap := make(map[string]interface{})
										for k, v := range group {
											groupMap[k] = v
										}
										if hostName, ok := host["name"].(string); ok {
											groupMap["hostName"] = hostName
										}
										allGroups = append(allGroups, groupMap)
									}
								}
							}
						}
					}
					if len(allGroups) > 0 {
						target = allGroups
						found = true
						log.Printf("getArrayFromData: found %d local groups from all hosts", len(allGroups))
					}
				}
			}
		} else if mappedName == "missingUpdates" || strings.HasSuffix(arrayName, ".missingUpdates") {
			// Check if we're inside a host loop (currentHost exists)
			if currentHost, ok := reportData["currentHost"].(map[string]interface{}); ok {
				// Inside a host loop - only return missing updates from current host
				if missingUpdatesRaw, exists := currentHost["missingUpdates"]; exists && missingUpdatesRaw != nil {
					if missingUpdates, ok := missingUpdatesRaw.([]interface{}); ok {
						var hostUpdates []interface{}
						for _, updateInterface := range missingUpdates {
							if update, ok := updateInterface.(map[string]interface{}); ok {
								// Add host name to update for reference
								updateMap := make(map[string]interface{})
								for k, v := range update {
									updateMap[k] = v
								}
								if hostName, ok := currentHost["name"].(string); ok {
									updateMap["hostName"] = hostName
								}
								hostUpdates = append(hostUpdates, updateMap)
							}
						}
						if len(hostUpdates) > 0 {
							target = hostUpdates
							found = true
							log.Printf("getArrayFromData: found %d missing updates from currentHost", len(hostUpdates))
						} else {
							// Return empty array if no updates found
							target = []interface{}{}
							found = true
							log.Printf("getArrayFromData: missingUpdates exists but is empty for currentHost")
						}
					} else {
						// missingUpdates exists but is not an array - return empty array
						target = []interface{}{}
						found = true
						log.Printf("getArrayFromData: missingUpdates exists but is not an array for currentHost, returning empty array")
					}
				} else {
					// missingUpdates doesn't exist or is nil - return empty array
					target = []interface{}{}
					found = true
					log.Printf("getArrayFromData: missingUpdates not found or nil for currentHost, returning empty array")
				}
			} else {
				// Not inside a host loop - extract all missing updates from all hosts
				if hosts, ok := reportData["hosts"].([]interface{}); ok {
					var allUpdates []interface{}
					for _, hostInterface := range hosts {
						if host, ok := hostInterface.(map[string]interface{}); ok {
							if missingUpdatesRaw, exists := host["missingUpdates"]; exists && missingUpdatesRaw != nil {
								if missingUpdates, ok := missingUpdatesRaw.([]interface{}); ok {
									for _, updateInterface := range missingUpdates {
										if update, ok := updateInterface.(map[string]interface{}); ok {
											// Add host name to update for reference
											updateMap := make(map[string]interface{})
											for k, v := range update {
												updateMap[k] = v
											}
											if hostName, ok := host["name"].(string); ok {
												updateMap["hostName"] = hostName
											}
											allUpdates = append(allUpdates, updateMap)
										}
									}
								}
							}
						}
					}
					if len(allUpdates) > 0 {
						target = allUpdates
						found = true
						log.Printf("getArrayFromData: found %d missing updates from all hosts", len(allUpdates))
					} else {
						// Return empty array if no updates found
						target = []interface{}{}
						found = true
						log.Printf("getArrayFromData: no missing updates found in any host, returning empty array")
					}
				} else {
					// No hosts array found - return empty array
					target = []interface{}{}
					found = true
					log.Printf("getArrayFromData: hosts array not found, returning empty array for missingUpdates")
				}
			}
		} else if mappedName == "windowsFirewall" || strings.HasSuffix(arrayName, ".windowsFirewall") {
			// Check if we're inside a host loop (currentHost exists)
			if currentHost, ok := reportData["currentHost"].(map[string]interface{}); ok {
				// Inside a host loop - only return firewall profiles from current host
				if windowsFirewallRaw, exists := currentHost["windowsFirewall"]; exists && windowsFirewallRaw != nil {
					if windowsFirewall, ok := windowsFirewallRaw.([]interface{}); ok {
						var hostFirewall []interface{}
						for _, firewallInterface := range windowsFirewall {
							if firewall, ok := firewallInterface.(map[string]interface{}); ok {
								// Add host name to firewall profile for reference
								firewallMap := make(map[string]interface{})
								for k, v := range firewall {
									firewallMap[k] = v
								}
								if hostName, ok := currentHost["name"].(string); ok {
									firewallMap["hostName"] = hostName
								}
								hostFirewall = append(hostFirewall, firewallMap)
							}
						}
						if len(hostFirewall) > 0 {
							target = hostFirewall
							found = true
							log.Printf("getArrayFromData: found %d firewall profiles from currentHost", len(hostFirewall))
						} else {
							target = []interface{}{}
							found = true
							log.Printf("getArrayFromData: windowsFirewall exists but is empty for currentHost, returning empty array")
						}
					} else {
						target = []interface{}{}
						found = true
						log.Printf("getArrayFromData: windowsFirewall exists but is not an array for currentHost, returning empty array")
					}
				} else {
					target = []interface{}{}
					found = true
					log.Printf("getArrayFromData: windowsFirewall not found or nil for currentHost, returning empty array")
				}
			} else {
				// Not inside a host loop - extract all firewall profiles from all hosts
				if hosts, ok := reportData["hosts"].([]interface{}); ok {
					var allFirewall []interface{}
					for _, hostInterface := range hosts {
						if host, ok := hostInterface.(map[string]interface{}); ok {
							if windowsFirewallRaw, exists := host["windowsFirewall"]; exists && windowsFirewallRaw != nil {
								if windowsFirewall, ok := windowsFirewallRaw.([]interface{}); ok {
									for _, firewallInterface := range windowsFirewall {
										if firewall, ok := firewallInterface.(map[string]interface{}); ok {
											// Add host name to firewall profile for reference
											firewallMap := make(map[string]interface{})
											for k, v := range firewall {
												firewallMap[k] = v
											}
											if hostName, ok := host["name"].(string); ok {
												firewallMap["hostName"] = hostName
											}
											allFirewall = append(allFirewall, firewallMap)
										}
									}
								}
							}
						}
					}
					if len(allFirewall) > 0 {
						target = allFirewall
						found = true
						log.Printf("getArrayFromData: found %d firewall profiles from all hosts", len(allFirewall))
					} else {
						target = []interface{}{}
						found = true
						log.Printf("getArrayFromData: no firewall profiles found in any host, returning empty array")
					}
				} else {
					target = []interface{}{}
					found = true
					log.Printf("getArrayFromData: hosts array not found, returning empty array for windowsFirewall")
				}
			}
		}
	}

	// Handle simple array names (e.g., "hosts", "vms")
	if !found {
		if val, ok := reportData[arrayName]; ok {
			target = val
			found = true
		} else if strings.Contains(arrayName, ".") {
			// Handle nested access (e.g., "host.vms", "host.multipathIO.paths")
			parts := strings.Split(arrayName, ".")
			if len(parts) >= 2 {
				parentName := parts[0]
				childName := parts[len(parts)-1] // Last part is the array name

				log.Printf("getArrayFromData: nested access - parent='%s', child='%s', full path='%s'", parentName, childName, arrayName)

				// Helper to look in a map
				checkMap := func(m map[string]interface{}, key string) (interface{}, bool) {
					val, ok := m[key]
					return val, ok
				}

				// Helper to navigate nested maps (e.g., host.multipathIO.paths)
				navigateNested := func(m map[string]interface{}, keys []string) (interface{}, bool) {
					current := m
					for i := 0; i < len(keys)-1; i++ {
						if next, ok := current[keys[i]].(map[string]interface{}); ok {
							current = next
						} else {
							return nil, false
						}
					}
					val, ok := current[keys[len(keys)-1]]
					return val, ok
				}

				if parentName == "host" {
					// Handle 2-level nesting (host.vms, host.volumes, host.virtualSwitches, etc.)
					if len(parts) == 2 {
						// Map aliases for childName (e.g., "vswitches" -> "virtualSwitches")
						actualChildName := childName
						if childName == "vswitches" {
							actualChildName = "virtualSwitches"
						}

						if host, ok := reportData["currentHost"].(map[string]interface{}); ok {
							// Try the actual name first
							target, found = checkMap(host, actualChildName)
							if !found && actualChildName != childName {
								// Try the alias if actual name not found
								target, found = checkMap(host, childName)
							}
							if found {
								log.Printf("getArrayFromData: found '%s' (mapped from '%s') in currentHost", actualChildName, childName)
							}
						}
						if !found {
							if host, ok := reportData["host"].(map[string]interface{}); ok {
								// Try the actual name first
								target, found = checkMap(host, actualChildName)
								if !found && actualChildName != childName {
									// Try the alias if actual name not found
									target, found = checkMap(host, childName)
								}
								if found {
									log.Printf("getArrayFromData: found '%s' (mapped from '%s') in host", actualChildName, childName)
								}
							}
						}
					} else if len(parts) > 2 {
						// Handle 3+ level nesting (host.multipathIO.paths, host.multipathIO.devices, etc.)
						// Skip the first part (host) and navigate the rest
						nestedKeys := parts[1:] // e.g., ["multipathIO", "paths"]
						if host, ok := reportData["currentHost"].(map[string]interface{}); ok {
							target, found = navigateNested(host, nestedKeys)
							if found {
								log.Printf("getArrayFromData: found '%s' in currentHost via nested path", arrayName)
							}
						}
						if !found {
							if host, ok := reportData["host"].(map[string]interface{}); ok {
								target, found = navigateNested(host, nestedKeys)
								if found {
									log.Printf("getArrayFromData: found '%s' in host via nested path", arrayName)
								}
							}
						}
					}
				} else if parentName == "vm" {
					log.Printf("getArrayFromData: Processing VM nested array - parentName='%s', childName='%s', parts=%v", parentName, childName, parts)
					if vm, ok := reportData["currentVm"].(map[string]interface{}); ok {
						log.Printf("getArrayFromData: Found currentVm (name=%v), checking for '%s'", vm["name"], childName)
						if len(parts) == 2 {
							// Handle vm.disks, vm.networkAdapters, etc.
							target, found = checkMap(vm, childName)
							if found {
								log.Printf("getArrayFromData: Found '%s' in currentVm", childName)
							} else {
								log.Printf("getArrayFromData: '%s' not found in currentVm, available keys: %v", childName, getMapKeys(vm))
							}
						} else if len(parts) > 2 {
							nestedKeys := parts[1:]
							target, found = navigateNested(vm, nestedKeys)
							if found {
								log.Printf("getArrayFromData: Found '%s' in currentVm via nested path", arrayName)
							}
						}
					} else {
						log.Printf("getArrayFromData: currentVm not found in reportData")
					}
					if !found {
						if vm, ok := reportData["vm"].(map[string]interface{}); ok {
							log.Printf("getArrayFromData: Found vm (not currentVm), checking for '%s'", childName)
							if len(parts) == 2 {
								target, found = checkMap(vm, childName)
								if found {
									log.Printf("getArrayFromData: Found '%s' in vm", childName)
								}
							} else if len(parts) > 2 {
								nestedKeys := parts[1:]
								target, found = navigateNested(vm, nestedKeys)
								if found {
									log.Printf("getArrayFromData: Found '%s' in vm via nested path", arrayName)
								}
							}
						} else {
							log.Printf("getArrayFromData: vm not found in reportData")
						}
					}
				}
			}
		}
	}

	if found && target != nil {
		// Try to convert to []interface{}
		if arr, ok := target.([]interface{}); ok {
			log.Printf("getArrayFromData: found array '%s' with %d items (direct cast)", arrayName, len(arr))
			return arr
		}

		// Use reflection for other slice types
		val := reflect.ValueOf(target)
		if val.Kind() == reflect.Slice {
			len := val.Len()
			result := make([]interface{}, len)
			for i := 0; i < len; i++ {
				result[i] = val.Index(i).Interface()
			}
			log.Printf("getArrayFromData: found array '%s' with %d items (reflection)", arrayName, len)
			return result
		}

		log.Printf("getArrayFromData: found '%s' but it is not a slice: %T", arrayName, target)
	}

	// Handle special cases: extract from hosts array
	if !found {
		if arrayName == "networks" || arrayName == "networkAdapters" || arrayName == "adapters" {
			// Extract all network adapters from all hosts
			if hosts, ok := reportData["hosts"].([]interface{}); ok {
				var allAdapters []interface{}
				for _, hostInterface := range hosts {
					if host, ok := hostInterface.(map[string]interface{}); ok {
						if adapters, ok := host["networkAdapters"].([]interface{}); ok {
							allAdapters = append(allAdapters, adapters...)
						}
					}
				}
				if len(allAdapters) > 0 {
					log.Printf("getArrayFromData: found %d network adapters from hosts", len(allAdapters))
					return allAdapters
				}
			}
		}
	}

	// Final fallback: if arrayName contains "vm." and we have currentVm, try direct extraction
	if !found && strings.Contains(arrayName, "vm.") {
		parts := strings.Split(arrayName, ".")
		if len(parts) == 2 && parts[0] == "vm" {
			childName := parts[1]
			log.Printf("getArrayFromData: Fallback check for vm.%s", childName)
			log.Printf("getArrayFromData: reportData keys in fallback: %v", getMapKeys(reportData))
			if vm, ok := reportData["currentVm"].(map[string]interface{}); ok {
				log.Printf("getArrayFromData: currentVm exists in fallback, checking for '%s', available keys: %v", childName, getMapKeys(vm))
				if val, ok := vm[childName]; ok && val != nil {
					log.Printf("getArrayFromData: Found '%s' in currentVm, type: %T", childName, val)
					if arr, ok := val.([]interface{}); ok {
						log.Printf("getArrayFromData: Found '%s' in currentVm via direct check (fallback), %d items", childName, len(arr))
						return arr
					}
					// Try reflection for other slice types
					val := reflect.ValueOf(val)
					if val.Kind() == reflect.Slice {
						len := val.Len()
						result := make([]interface{}, len)
						for i := 0; i < len; i++ {
							result[i] = val.Index(i).Interface()
						}
						log.Printf("getArrayFromData: Found '%s' in currentVm via reflection (fallback), %d items", childName, len)
						return result
					}
					log.Printf("getArrayFromData: '%s' found in currentVm but is not a slice: %T", childName, val)
				} else {
					log.Printf("getArrayFromData: '%s' not found in currentVm, available keys: %v", childName, getMapKeys(vm))
				}
			} else {
				log.Printf("getArrayFromData: currentVm not found in reportData for fallback check")
			}

			// Also try vm (alternative name for currentVm)
			if vm, ok := reportData["vm"].(map[string]interface{}); ok {
				log.Printf("getArrayFromData: vm exists in fallback, checking for '%s'", childName)
				if val, ok := vm[childName]; ok && val != nil {
					log.Printf("getArrayFromData: Found '%s' in vm, type: %T", childName, val)
					if arr, ok := val.([]interface{}); ok {
						log.Printf("getArrayFromData: Found '%s' in vm via direct check (fallback), %d items", childName, len(arr))
						return arr
					}
					// Try reflection for other slice types
					val := reflect.ValueOf(val)
					if val.Kind() == reflect.Slice {
						len := val.Len()
						result := make([]interface{}, len)
						for i := 0; i < len; i++ {
							result[i] = val.Index(i).Interface()
						}
						log.Printf("getArrayFromData: Found '%s' in vm via reflection (fallback), %d items", childName, len)
						return result
					}
				}
			} else {
				log.Printf("getArrayFromData: vm not found in reportData for fallback check")
				// If we're inside a host.vms loop, try to get the VM from the current host's vms array
				// This happens when processLoopsInXML processes nested loops before the VM loop sets currentVm
				if currentHost, ok := reportData["currentHost"].(map[string]interface{}); ok {
					log.Printf("getArrayFromData: Found currentHost, checking if we're inside a host.vms loop")
					if vms, ok := currentHost["vms"].([]interface{}); ok && len(vms) > 0 {
						// We're inside a host.vms loop, use the first VM (or find the current one if vm exists in reportData)
						var targetVM map[string]interface{}
						if vm, ok := reportData["vm"].(map[string]interface{}); ok {
							// Find the matching VM by name
							for _, vmInterface := range vms {
								if vmMap, ok := vmInterface.(map[string]interface{}); ok {
									if vmMap["name"] == vm["name"] {
										targetVM = vmMap
										break
									}
								}
							}
						}
						// If no match found, use the first VM
						if targetVM == nil && len(vms) > 0 {
							if vmMap, ok := vms[0].(map[string]interface{}); ok {
								targetVM = vmMap
							}
						}
						if targetVM != nil {
							log.Printf("getArrayFromData: Found VM in currentHost.vms, checking for '%s'", childName)
							if val, ok := targetVM[childName]; ok && val != nil {
								log.Printf("getArrayFromData: Found '%s' in VM from currentHost.vms, type: %T", childName, val)
								if arr, ok := val.([]interface{}); ok {
									log.Printf("getArrayFromData: Found '%s' in VM from currentHost.vms (fallback), %d items", childName, len(arr))
									return arr
								}
								// Try reflection for other slice types
								val := reflect.ValueOf(val)
								if val.Kind() == reflect.Slice {
									len := val.Len()
									result := make([]interface{}, len)
									for i := 0; i < len; i++ {
										result[i] = val.Index(i).Interface()
									}
									log.Printf("getArrayFromData: Found '%s' in VM from currentHost.vms via reflection (fallback), %d items", childName, len)
									return result
								}
							}
						}
					}
				}
				log.Printf("getArrayFromData: reportData keys: %v", getMapKeys(reportData))
			}
		}
	}

	log.Printf("getArrayFromData: array '%s' not found, returning empty array", arrayName)
	return []interface{}{}
}

// replaceItemPlaceholders replaces placeholders within a loop item
func replaceItemPlaceholders(content, arrayName string, item interface{}, index int) string {
	result := content

	// Convert item to map if possible
	itemMap, ok := item.(map[string]interface{})
	if !ok {
		// If item is not a map, try to convert it
		return result
	}

	// Replace placeholders like {{host.name}}, {{vm.name}}, etc.
	// Extract the base name (e.g., "host" from "hosts", "vm" from "vms")
	baseName := arrayName
	if strings.Contains(arrayName, ".") {
		// Handle nested array names like "host.vms", "host.virtualSwitches"
		parts := strings.Split(arrayName, ".")
		lastPart := parts[len(parts)-1] // e.g., "vms", "virtualSwitches"

		// Special handling for known array types
		if lastPart == "virtualSwitches" || lastPart == "vswitches" {
			baseName = "vswitch"
		} else if lastPart == "networkAdapters" || lastPart == "networks" || lastPart == "adapters" {
			baseName = "adapter"
		} else if lastPart == "physicalDisks" || lastPart == "disks" {
			baseName = "disk"
		} else if lastPart == "localUsers" || lastPart == "users" {
			baseName = "user"
		} else if lastPart == "localGroups" || lastPart == "groups" {
			baseName = "group"
		} else if lastPart == "missingUpdates" || lastPart == "updates" {
			baseName = "update"
		} else if lastPart == "windowsFirewall" || lastPart == "firewall" {
			baseName = "firewall"
		} else if lastPart == "chain" && strings.Contains(arrayName, "checkpoint") {
			// For checkpoint.chain, use "checkpoint" as baseName so {{checkpoint.name}} works
			baseName = "checkpoint"
		} else {
			// Remove 's' from plural to get singular
			if strings.HasSuffix(lastPart, "s") && len(lastPart) > 1 {
				baseName = lastPart[:len(lastPart)-1] // e.g., "vm" from "vms"
			} else {
				baseName = lastPart
			}
		}
	} else {
		// Handle simple array names like "hosts", "vms"
		if arrayName == "virtualSwitches" || arrayName == "vswitches" {
			baseName = "vswitch"
		} else if arrayName == "networkAdapters" || arrayName == "networks" || arrayName == "adapters" {
			baseName = "adapter"
		} else if arrayName == "physicalDisks" || arrayName == "disks" {
			baseName = "disk"
		} else if arrayName == "localUsers" || arrayName == "users" {
			baseName = "user"
		} else if arrayName == "localGroups" || arrayName == "groups" {
			baseName = "group"
		} else if arrayName == "missingUpdates" || arrayName == "updates" {
			baseName = "update"
		} else if arrayName == "windowsFirewall" || arrayName == "firewall" {
			baseName = "firewall"
		} else if strings.HasSuffix(arrayName, "s") && len(arrayName) > 1 {
			baseName = arrayName[:len(arrayName)-1] // Remove 's' from plural
		}
	}

	// Special handling for physical disks and VM disks
	// Check if this is a VM disk by checking if arrayName contains "vm.disks" or if we're in a nested VM context
	// IMPORTANT: Check this BEFORE the physical disk check to ensure VM disks are handled correctly
	isVMDisk := false
	if strings.Contains(arrayName, "vm.disks") {
		isVMDisk = true
		log.Printf("replaceItemPlaceholders: Detected VM disk from arrayName='%s' (contains 'vm.disks')", arrayName)
	} else if strings.HasSuffix(arrayName, ".disks") && strings.Contains(arrayName, "vm") {
		isVMDisk = true
		log.Printf("replaceItemPlaceholders: Detected VM disk from arrayName='%s' (ends with '.disks' and contains 'vm')", arrayName)
	} else if arrayName == "disks" {
		// If arrayName is just "disks", check if this is a VM disk by looking at the item structure
		// VM disks have "controller", "controllerNumber", "controllerLocation", "path" fields
		// Physical disks have "number", "model", "serialNumber", "size" fields
		// Also check if we have a currentVm context (we're inside a VM loop)
		hasVMFields := false
		if controller, ok := itemMap["controller"]; ok && controller != nil {
			if controllerNumber, ok := itemMap["controllerNumber"]; ok && controllerNumber != nil {
				// This looks like a VM disk
				hasVMFields = true
			}
		}
		hasPhysicalFields := false
		if number, ok := itemMap["number"]; ok && number != nil {
			if model, ok := itemMap["model"]; ok && model != nil {
				hasPhysicalFields = true
			}
		}
		// If it has VM disk fields and not physical disk fields, it's a VM disk
		if hasVMFields && !hasPhysicalFields {
			isVMDisk = true
			log.Printf("replaceItemPlaceholders: Detected VM disk from item structure (has controller/controllerNumber, no number/model)")
		} else if hasPhysicalFields && !hasVMFields {
			// It's a physical disk
			isVMDisk = false
			log.Printf("replaceItemPlaceholders: Detected physical disk from item structure (has number/model, no controller/controllerNumber)")
		} else {
			// If it has both or neither, check if it has path (VM disks usually have path, physical disks don't)
			if path, ok := itemMap["path"].(string); ok && path != "" {
				// Has a path - likely a VM disk
				isVMDisk = true
				log.Printf("replaceItemPlaceholders: Detected VM disk from item structure (has path field)")
			}
		}
	}

	// Process physical disks ONLY if it's explicitly "physicalDisks" or "disks" that is NOT a VM disk
	// IMPORTANT: Check isVMDisk FIRST - if it's a VM disk, skip physical disk processing entirely
	// Also check: if arrayName contains "vm", it's definitely a VM disk, not a physical disk
	if strings.Contains(arrayName, "vm") && strings.Contains(arrayName, "disk") {
		isVMDisk = true
		log.Printf("replaceItemPlaceholders: Force-detected VM disk from arrayName='%s' (contains 'vm' and 'disk')", arrayName)
	}

	if !isVMDisk && (arrayName == "physicalDisks" || arrayName == "disks") {
		baseName = "disk" // Use "disk" as the base name for physical disks

		// Ensure disk name is set - prefer friendlyName (even if Controller/Boot), then name, then model, then serialNumber
		if diskName, ok := itemMap["name"]; !ok || diskName == nil || diskName == "" {
			// Priority: friendlyName (even if contains Controller/Boot) > model > serialNumber > number
			if friendlyName, ok := itemMap["friendlyName"].(string); ok && friendlyName != "" {
				if number, ok := itemMap["number"]; ok {
					itemMap["name"] = fmt.Sprintf("%s (Disk %v)", friendlyName, number)
				} else {
					itemMap["name"] = friendlyName
				}
			} else if model, ok := itemMap["model"].(string); ok && model != "" {
				if number, ok := itemMap["number"]; ok {
					itemMap["name"] = fmt.Sprintf("%s (Disk %v)", model, number)
				} else {
					itemMap["name"] = model
				}
			} else if serialNumber, ok := itemMap["serialNumber"].(string); ok && serialNumber != "" {
				if number, ok := itemMap["number"]; ok {
					itemMap["name"] = fmt.Sprintf("Disk %v - %s", number, serialNumber)
				} else {
					itemMap["name"] = fmt.Sprintf("Disk - %s", serialNumber)
				}
			} else if number, ok := itemMap["number"]; ok {
				itemMap["name"] = fmt.Sprintf("Physical Disk %v", number)
			} else {
				itemMap["name"] = "Physical Disk"
			}
		}
		// Also ensure friendlyName is set if name exists but friendlyName doesn't
		if _, ok := itemMap["friendlyName"]; !ok || itemMap["friendlyName"] == nil || itemMap["friendlyName"] == "" {
			if name, ok := itemMap["name"].(string); ok {
				itemMap["friendlyName"] = name
			}
		}

		// Calculate unallocated size (size - allocatedSize)
		var size, allocatedSize float64
		if sizeVal, ok := itemMap["size"]; ok && sizeVal != nil {
			if sizeFloat, ok := sizeVal.(float64); ok {
				size = sizeFloat
			} else if sizeStr, ok := sizeVal.(string); ok {
				if parsed, err := strconv.ParseFloat(strings.TrimSpace(strings.ReplaceAll(sizeStr, " GB", "")), 64); err == nil {
					size = parsed
				}
			} else if sizeInt, ok := sizeVal.(int); ok {
				size = float64(sizeInt)
			}
		}
		if allocatedVal, ok := itemMap["allocatedSize"]; ok && allocatedVal != nil {
			if allocatedFloat, ok := allocatedVal.(float64); ok {
				allocatedSize = allocatedFloat
			} else if allocatedStr, ok := allocatedVal.(string); ok {
				if parsed, err := strconv.ParseFloat(strings.TrimSpace(strings.ReplaceAll(allocatedStr, " GB", "")), 64); err == nil {
					allocatedSize = parsed
				}
			} else if allocatedInt, ok := allocatedVal.(int); ok {
				allocatedSize = float64(allocatedInt)
			}
		}
		// Calculate unallocated size (size - allocatedSize)
		unallocated := size - allocatedSize
		if unallocated < 0 {
			unallocated = 0
		}
		// Format as number without "GB" suffix (user can add it in template: {{disk.unallocated}} GB)
		itemMap["unallocated"] = fmt.Sprintf("%.2f", unallocated)
	} else if arrayName == "volumes" {
		baseName = "volume" // Use "volume" as the base name for volumes

		// Check if this is a CSVFS volume - CSVFS volumes don't have meaningful drive letters
		fileSystem, _ := itemMap["fileSystem"].(string)
		isCSVFS := strings.ToUpper(fileSystem) == "CSVFS"

		// For CSVFS volumes, clear the driveLetter as it's not meaningful
		if isCSVFS {
			itemMap["driveLetter"] = ""
		}

		// Calculate used size (size - sizeRemaining) and percentage
		var size, sizeRemaining float64
		if sizeVal, ok := itemMap["size"]; ok && sizeVal != nil {
			if sizeFloat, ok := sizeVal.(float64); ok {
				size = sizeFloat
			} else if sizeStr, ok := sizeVal.(string); ok {
				if parsed, err := strconv.ParseFloat(strings.TrimSpace(strings.ReplaceAll(sizeStr, " GB", "")), 64); err == nil {
					size = parsed
				}
			} else if sizeInt, ok := sizeVal.(int); ok {
				size = float64(sizeInt)
			}
		}
		if remainingVal, ok := itemMap["sizeRemaining"]; ok && remainingVal != nil {
			if remainingFloat, ok := remainingVal.(float64); ok {
				sizeRemaining = remainingFloat
			} else if remainingStr, ok := remainingVal.(string); ok {
				if parsed, err := strconv.ParseFloat(strings.TrimSpace(strings.ReplaceAll(remainingStr, " GB", "")), 64); err == nil {
					sizeRemaining = parsed
				}
			} else if remainingInt, ok := remainingVal.(int); ok {
				sizeRemaining = float64(remainingInt)
			}
		}
		used := size - sizeRemaining
		if used < 0 {
			used = 0
		}
		// Format as number without "GB" suffix (user can add it in template: {{volume.used}} GB)
		itemMap["used"] = fmt.Sprintf("%.2f", used)
		itemMap["free"] = fmt.Sprintf("%.2f", sizeRemaining)

		// Calculate percentages
		if size > 0 {
			usedPercent := (used / size) * 100
			freePercent := (sizeRemaining / size) * 100
			itemMap["usedPercent"] = fmt.Sprintf("%.1f", usedPercent)
			itemMap["freePercent"] = fmt.Sprintf("%.1f", freePercent)
		} else {
			itemMap["usedPercent"] = "0.0"
			itemMap["freePercent"] = "0.0"
		}

		// Ensure volume name is set (handle CSVFS differently - they don't have drive letters)
		if volumeName, ok := itemMap["name"]; !ok || volumeName == nil || volumeName == "" {
			fileSystem, _ := itemMap["fileSystem"].(string)
			isCSVFS := strings.ToUpper(fileSystem) == "CSVFS"

			if isCSVFS {
				// CSVFS volumes: prioritize path, then fileSystemLabel (no drive letter)
				if path, ok := itemMap["path"].(string); ok && path != "" {
					if fileSystemLabel, ok := itemMap["fileSystemLabel"].(string); ok && fileSystemLabel != "" {
						itemMap["name"] = fmt.Sprintf("%s (%s)", fileSystemLabel, path)
					} else {
						itemMap["name"] = path
					}
				} else if fileSystemLabel, ok := itemMap["fileSystemLabel"].(string); ok && fileSystemLabel != "" {
					itemMap["name"] = fileSystemLabel
				} else {
					itemMap["name"] = "CSV Volume"
				}
			} else {
				// Regular volumes: prioritize fileSystemLabel + driveLetter, then driveLetter, then path
				if fileSystemLabel, ok := itemMap["fileSystemLabel"].(string); ok && fileSystemLabel != "" {
					if driveLetter, ok := itemMap["driveLetter"].(string); ok && driveLetter != "" {
						itemMap["name"] = fmt.Sprintf("%s (%s)", fileSystemLabel, driveLetter)
					} else {
						itemMap["name"] = fileSystemLabel
					}
				} else if driveLetter, ok := itemMap["driveLetter"].(string); ok && driveLetter != "" {
					itemMap["name"] = driveLetter
				} else if path, ok := itemMap["path"].(string); ok && path != "" {
					itemMap["name"] = path
				} else {
					itemMap["name"] = "Volume"
				}
			}
		}
	} else if arrayName == "networks" || arrayName == "networkAdapters" || arrayName == "adapters" || strings.HasSuffix(arrayName, ".networkAdapters") {
		baseName = "adapter" // Use "adapter" as the base name for network adapters

		// Check if this is a VM network adapter (has connection/switch fields) or host network adapter
		isVMAdapter := false
		if _, ok := itemMap["connection"]; ok {
			isVMAdapter = true
		}
		if _, ok := itemMap["switch"]; ok {
			isVMAdapter = true
		}

		// Normalize VM network adapter fields
		if isVMAdapter {
			// Ensure connection/status is set (convert to string if it's an enum/object)
			if connection, ok := itemMap["connection"]; !ok || connection == nil || connection == "" {
				itemMap["connection"] = "Unknown"
			} else {
				log.Printf("DEBUG normalize VM adapter connection: type=%T, value=%v", connection, connection)
				// Convert connection to string (it might be an enum/object/array from PowerShell)
				if connStr, ok := connection.(string); ok {
					// Check if it's already a string representation of an array like "[2]"
					if strings.HasPrefix(connStr, "[") && strings.HasSuffix(connStr, "]") {
						// Extract number from [2] format
						connStr = strings.TrimPrefix(strings.TrimSuffix(connStr, "]"), "[")
						if connNum, err := strconv.Atoi(strings.TrimSpace(connStr)); err == nil {
							switch connNum {
							case 0:
								itemMap["connection"] = "Disconnected"
							case 1:
								itemMap["connection"] = "Disconnecting"
							case 2:
								itemMap["connection"] = "Connected"
							case 3:
								itemMap["connection"] = "Connecting"
							default:
								itemMap["connection"] = fmt.Sprintf("Unknown (%d)", connNum)
							}
						} else {
							itemMap["connection"] = connStr
						}
					} else if connStr == "" {
						itemMap["connection"] = "Unknown"
					} else {
						itemMap["connection"] = connStr
					}
				} else if connArray, ok := connection.([]interface{}); ok && len(connArray) > 0 {
					// Handle array case (e.g., [2])
					firstVal := connArray[0]
					if connNum, ok := firstVal.(float64); ok {
						switch int(connNum) {
						case 0:
							itemMap["connection"] = "Disconnected"
						case 1:
							itemMap["connection"] = "Disconnecting"
						case 2:
							itemMap["connection"] = "Connected"
						case 3:
							itemMap["connection"] = "Connecting"
						default:
							itemMap["connection"] = fmt.Sprintf("Unknown (%d)", int(connNum))
						}
					} else if connNum, ok := firstVal.(int); ok {
						switch connNum {
						case 0:
							itemMap["connection"] = "Disconnected"
						case 1:
							itemMap["connection"] = "Disconnecting"
						case 2:
							itemMap["connection"] = "Connected"
						case 3:
							itemMap["connection"] = "Connecting"
						default:
							itemMap["connection"] = fmt.Sprintf("Unknown (%d)", connNum)
						}
					} else {
						itemMap["connection"] = fmt.Sprintf("%v", firstVal)
					}
				} else {
					// Convert enum/object/number to string
					// Hyper-V VMNetworkAdapter Status enum values:
					// 0 = Disconnected, 1 = Disconnecting, 2 = Connected, 3 = Connecting
					if connNum, ok := connection.(float64); ok {
						switch int(connNum) {
						case 0:
							itemMap["connection"] = "Disconnected"
						case 1:
							itemMap["connection"] = "Disconnecting"
						case 2:
							itemMap["connection"] = "Connected"
						case 3:
							itemMap["connection"] = "Connecting"
						default:
							itemMap["connection"] = fmt.Sprintf("Unknown (%d)", int(connNum))
						}
					} else if connNum, ok := connection.(int); ok {
						switch connNum {
						case 0:
							itemMap["connection"] = "Disconnected"
						case 1:
							itemMap["connection"] = "Disconnecting"
						case 2:
							itemMap["connection"] = "Connected"
						case 3:
							itemMap["connection"] = "Connecting"
						default:
							itemMap["connection"] = fmt.Sprintf("Unknown (%d)", connNum)
						}
					} else {
						// Fallback: convert to string, but try to parse if it looks like [2]
						connStr := fmt.Sprintf("%v", connection)
						if strings.HasPrefix(connStr, "[") && strings.HasSuffix(connStr, "]") {
							// Try to extract number from [2] format
							connStr = strings.TrimPrefix(strings.TrimSuffix(connStr, "]"), "[")
							if connNum, err := strconv.Atoi(strings.TrimSpace(connStr)); err == nil {
								switch connNum {
								case 0:
									itemMap["connection"] = "Disconnected"
								case 1:
									itemMap["connection"] = "Disconnecting"
								case 2:
									itemMap["connection"] = "Connected"
								case 3:
									itemMap["connection"] = "Connecting"
								default:
									itemMap["connection"] = fmt.Sprintf("Unknown (%d)", connNum)
								}
							} else {
								itemMap["connection"] = connStr
							}
						} else {
							itemMap["connection"] = connStr
						}
					}
				}
			}
			// Ensure switch is set
			if switchName, ok := itemMap["switch"]; !ok || switchName == nil || switchName == "" {
				itemMap["switch"] = ""
			} else {
				// Convert switch to string if needed
				if switchStr, ok := switchName.(string); ok {
					itemMap["switch"] = switchStr
				} else {
					itemMap["switch"] = fmt.Sprintf("%v", switchName)
				}
			}
			// Ensure vlan is set (convert from number to string if needed)
			if vlan, ok := itemMap["vlan"]; ok && vlan != nil {
				if vlanStr, ok := vlan.(string); ok {
					if vlanStr == "N/A" || vlanStr == "" {
						itemMap["vlan"] = ""
					} else {
						itemMap["vlan"] = vlanStr
					}
				} else if vlanNum, ok := vlan.(float64); ok {
					if vlanNum > 0 {
						itemMap["vlan"] = fmt.Sprintf("%.0f", vlanNum)
					} else {
						itemMap["vlan"] = ""
					}
				} else if vlanNum, ok := vlan.(int); ok {
					if vlanNum > 0 {
						itemMap["vlan"] = fmt.Sprintf("%d", vlanNum)
					} else {
						itemMap["vlan"] = ""
					}
				}
			} else {
				itemMap["vlan"] = ""
			}
			// Ensure macAddress is set
			if macAddress, ok := itemMap["macAddress"]; !ok || macAddress == nil || macAddress == "" {
				itemMap["macAddress"] = ""
			}
			// Ensure ip is set (comma-separated IP addresses)
			if ip, ok := itemMap["ip"]; !ok || ip == nil || ip == "" || ip == "N/A" {
				// Try to get from ipAddresses array
				if ipAddresses, ok := itemMap["ipAddresses"].([]interface{}); ok && len(ipAddresses) > 0 {
					var ipStrings []string
					for _, ipAddr := range ipAddresses {
						if ipStr, ok := ipAddr.(string); ok && ipStr != "" && !strings.HasPrefix(ipStr, "169.254") {
							ipStrings = append(ipStrings, ipStr)
						} else if ipStr := fmt.Sprintf("%v", ipAddr); ipStr != "" && !strings.HasPrefix(ipStr, "169.254") {
							ipStrings = append(ipStrings, ipStr)
						}
					}
					if len(ipStrings) > 0 {
						itemMap["ip"] = strings.Join(ipStrings, ", ")
					} else {
						itemMap["ip"] = ""
					}
				} else {
					itemMap["ip"] = ""
				}
			} else {
				// Convert ip to string if needed and filter out link-local addresses
				if ipStr, ok := ip.(string); ok {
					if ipStr != "" && ipStr != "N/A" && !strings.HasPrefix(ipStr, "169.254") {
						itemMap["ip"] = ipStr
					} else {
						itemMap["ip"] = ""
					}
				} else {
					ipStr := fmt.Sprintf("%v", ip)
					if ipStr != "" && ipStr != "N/A" && !strings.HasPrefix(ipStr, "169.254") {
						itemMap["ip"] = ipStr
					} else {
						itemMap["ip"] = ""
					}
				}
			}
		}

		// Ensure dnsServers is formatted as comma-separated string if it's an array (empty if not set or "Unknown")
		if dnsServers, ok := itemMap["dnsServers"]; ok && dnsServers != nil && dnsServers != "" && dnsServers != "Unknown" && dnsServers != "N/A" {
			if dnsArray, ok := dnsServers.([]interface{}); ok && len(dnsArray) > 0 {
				var dnsStrings []string
				for _, dns := range dnsArray {
					dnsStrings = append(dnsStrings, fmt.Sprintf("%v", dns))
				}
				itemMap["dnsServers"] = strings.Join(dnsStrings, ", ")
			} else if dnsArray, ok := dnsServers.([]string); ok && len(dnsArray) > 0 {
				itemMap["dnsServers"] = strings.Join(dnsArray, ", ")
			} else if dnsStr, ok := dnsServers.(string); ok && dnsStr != "" && dnsStr != "Unknown" && dnsStr != "N/A" {
				itemMap["dnsServers"] = dnsStr
			} else {
				itemMap["dnsServers"] = ""
			}
		} else {
			itemMap["dnsServers"] = ""
		}

		// Ensure ipAddress is empty string instead of "Unknown"
		if ipAddress, ok := itemMap["ipAddress"]; !ok || ipAddress == nil || ipAddress == "" || ipAddress == "Unknown" || ipAddress == "N/A" {
			itemMap["ipAddress"] = ""
		}

		// Ensure vlanMode is set (default to 'Untagged' if not set)
		if vlanMode, ok := itemMap["vlanMode"]; !ok || vlanMode == nil || vlanMode == "" {
			itemMap["vlanMode"] = "Untagged"
		}

		// Ensure vlanId is set (default to 0 if not set)
		if vlanId, ok := itemMap["vlanId"]; !ok || vlanId == nil {
			itemMap["vlanId"] = 0
		}

		// Ensure dhcpEnabled is boolean
		if dhcpEnabled, ok := itemMap["dhcpEnabled"]; !ok || dhcpEnabled == nil {
			itemMap["dhcpEnabled"] = false
		}

		// Ensure isVirtual is boolean
		if isVirtual, ok := itemMap["isVirtual"]; !ok || isVirtual == nil {
			itemMap["isVirtual"] = false
		}

		// Ensure subnetMask, defaultGateway, virtualSwitch are strings (empty if not set)
		if subnetMask, ok := itemMap["subnetMask"]; !ok || subnetMask == nil || subnetMask == "" {
			itemMap["subnetMask"] = ""
		}
		if defaultGateway, ok := itemMap["defaultGateway"]; !ok || defaultGateway == nil || defaultGateway == "" {
			itemMap["defaultGateway"] = ""
		}
		if virtualSwitch, ok := itemMap["virtualSwitch"]; !ok || virtualSwitch == nil || virtualSwitch == "" {
			itemMap["virtualSwitch"] = ""
		}

		// Ensure teaming fields are set (empty strings instead of "N/A")
		// Convert string "true"/"false" to boolean for conditionals
		if isTeamed, ok := itemMap["isTeamed"]; !ok || isTeamed == nil {
			itemMap["isTeamed"] = false
		} else {
			// Normalize boolean values
			if str, ok := isTeamed.(string); ok {
				itemMap["isTeamed"] = (str == "true" || str == "1")
			} else if num, ok := isTeamed.(float64); ok {
				itemMap["isTeamed"] = num != 0
			} else if num, ok := isTeamed.(int); ok {
				itemMap["isTeamed"] = num != 0
			}
		}
		if teamName, ok := itemMap["teamName"]; !ok || teamName == nil || teamName == "" || teamName == "N/A" {
			itemMap["teamName"] = ""
		}
		if teamLoadBalancingAlgorithm, ok := itemMap["teamLoadBalancingAlgorithm"]; !ok || teamLoadBalancingAlgorithm == nil || teamLoadBalancingAlgorithm == "" || teamLoadBalancingAlgorithm == "N/A" || teamLoadBalancingAlgorithm == "Unknown" {
			itemMap["teamLoadBalancingAlgorithm"] = ""
		}
		if teamTeamingMode, ok := itemMap["teamTeamingMode"]; !ok || teamTeamingMode == nil || teamTeamingMode == "" || teamTeamingMode == "N/A" || teamTeamingMode == "Unknown" {
			itemMap["teamTeamingMode"] = ""
		}
		if teamStatus, ok := itemMap["teamStatus"]; !ok || teamStatus == nil || teamStatus == "" || teamStatus == "N/A" || teamStatus == "Unknown" {
			itemMap["teamStatus"] = ""
		}

		// Ensure SET fields are set (empty strings instead of "N/A")
		// Convert string "true"/"false" to boolean for conditionals
		if isSET, ok := itemMap["isSET"]; !ok || isSET == nil {
			itemMap["isSET"] = false
		} else {
			// Normalize boolean values
			if str, ok := isSET.(string); ok {
				itemMap["isSET"] = (str == "true" || str == "1")
			} else if num, ok := isSET.(float64); ok {
				itemMap["isSET"] = num != 0
			} else if num, ok := isSET.(int); ok {
				itemMap["isSET"] = num != 0
			}
		}
		if setSwitchName, ok := itemMap["setSwitchName"]; !ok || setSwitchName == nil || setSwitchName == "" || setSwitchName == "N/A" {
			itemMap["setSwitchName"] = ""
		}
		if setLoadBalancingAlgorithm, ok := itemMap["setLoadBalancingAlgorithm"]; !ok || setLoadBalancingAlgorithm == nil || setLoadBalancingAlgorithm == "" || setLoadBalancingAlgorithm == "N/A" || setLoadBalancingAlgorithm == "Unknown" {
			itemMap["setLoadBalancingAlgorithm"] = ""
		}
	} else if arrayName == "vswitches" || arrayName == "virtualSwitches" || strings.HasSuffix(arrayName, ".vswitches") || strings.HasSuffix(arrayName, ".virtualSwitches") {
		baseName = "vswitch" // Use "vswitch" as the base name

		// Normalize boolean values for virtual switches
		// PowerShell returns booleans as strings "True"/"False" (capitalized) or actual booleans
		if iovEnabled, ok := itemMap["iovEnabled"]; ok && iovEnabled != nil {
			if iovBool, ok := iovEnabled.(bool); ok {
				// Already a boolean, keep it
				itemMap["iovEnabled"] = iovBool
			} else if iovStr, ok := iovEnabled.(string); ok {
				// Handle PowerShell boolean strings: "True", "False", "true", "false"
				iovStrLower := strings.ToLower(strings.TrimSpace(iovStr))
				itemMap["iovEnabled"] = iovStrLower == "true" || iovStr == "1" || iovStr == "True"
			} else if iovNum, ok := iovEnabled.(float64); ok {
				itemMap["iovEnabled"] = iovNum != 0
			} else {
				itemMap["iovEnabled"] = false
			}
		} else {
			itemMap["iovEnabled"] = false
		}

		if packetDirectEnabled, ok := itemMap["packetDirectEnabled"]; ok && packetDirectEnabled != nil {
			if pdBool, ok := packetDirectEnabled.(bool); ok {
				// Already a boolean, keep it
				itemMap["packetDirectEnabled"] = pdBool
			} else if pdStr, ok := packetDirectEnabled.(string); ok {
				// Handle PowerShell boolean strings: "True", "False", "true", "false"
				pdStrLower := strings.ToLower(strings.TrimSpace(pdStr))
				itemMap["packetDirectEnabled"] = pdStrLower == "true" || pdStr == "1" || pdStr == "True"
			} else if pdNum, ok := packetDirectEnabled.(float64); ok {
				itemMap["packetDirectEnabled"] = pdNum != 0
			} else {
				itemMap["packetDirectEnabled"] = false
			}
		} else {
			itemMap["packetDirectEnabled"] = false
		}

		// Ensure bandwidthReservationMode is a string
		if bandwidthMode, ok := itemMap["bandwidthReservationMode"]; !ok || bandwidthMode == nil || bandwidthMode == "" {
			itemMap["bandwidthReservationMode"] = ""
		} else {
			// Convert to string if it's not already
			if modeStr, ok := bandwidthMode.(string); ok {
				itemMap["bandwidthReservationMode"] = modeStr
			} else {
				itemMap["bandwidthReservationMode"] = fmt.Sprintf("%v", bandwidthMode)
			}
		}

		// Ensure id is a string (GUID)
		if switchId, ok := itemMap["id"]; ok && switchId != nil {
			// Convert to string if it's not already
			if idStr, ok := switchId.(string); ok {
				itemMap["id"] = idStr
			} else {
				itemMap["id"] = fmt.Sprintf("%v", switchId)
			}
		} else {
			itemMap["id"] = ""
		}

		// Ensure switchType is a string (not "None" or empty)
		if switchType, ok := itemMap["switchType"]; ok && switchType != nil {
			if typeStr, ok := switchType.(string); ok {
				typeStr = strings.TrimSpace(typeStr)
				if typeStr != "" && typeStr != "None" && typeStr != "0" {
					itemMap["switchType"] = typeStr
				} else {
					// If it's empty, "None", or "0", try to get from the actual value or set default
					if typeStr == "0" || typeStr == "None" {
						itemMap["switchType"] = "Unknown"
					} else {
						itemMap["switchType"] = fmt.Sprintf("%v", switchType)
					}
				}
			} else {
				// Not a string, convert it
				typeVal := fmt.Sprintf("%v", switchType)
				if typeVal == "0" || typeVal == "None" || typeVal == "" {
					itemMap["switchType"] = "Unknown"
				} else {
					itemMap["switchType"] = typeVal
				}
			}
		} else {
			itemMap["switchType"] = "Unknown"
		}

		// Normalize allowManagementOS to boolean
		if allowMgmtOS, ok := itemMap["allowManagementOS"]; ok {
			if mgmtBool, ok := allowMgmtOS.(bool); ok {
				itemMap["allowManagementOS"] = mgmtBool
			} else if mgmtStr, ok := allowMgmtOS.(string); ok {
				itemMap["allowManagementOS"] = strings.ToLower(mgmtStr) == "true" || mgmtStr == "1" || strings.ToLower(mgmtStr) == "yes"
			} else if mgmtNum, ok := allowMgmtOS.(float64); ok {
				itemMap["allowManagementOS"] = mgmtNum != 0
			} else if allowMgmtOS == nil {
				itemMap["allowManagementOS"] = false
			}
		} else {
			itemMap["allowManagementOS"] = false
		}

		// Ensure setEnabled is set (alias for embeddedTeamingEnabled)
		if setEnabled, ok := itemMap["setEnabled"]; !ok || setEnabled == nil {
			if embeddedTeaming, ok := itemMap["embeddedTeamingEnabled"]; ok {
				if etBool, ok := embeddedTeaming.(bool); ok {
					itemMap["setEnabled"] = etBool
				} else if etStr, ok := embeddedTeaming.(string); ok {
					itemMap["setEnabled"] = strings.ToLower(etStr) == "true" || etStr == "1"
				} else if etNum, ok := embeddedTeaming.(float64); ok {
					itemMap["setEnabled"] = etNum != 0
				} else {
					itemMap["setEnabled"] = false
				}
			} else {
				itemMap["setEnabled"] = false
			}
		}

		// Ensure setLoadBalancingAlgorithm is set (empty string if not available)
		if setLBA, ok := itemMap["setLoadBalancingAlgorithm"]; !ok || setLBA == nil || setLBA == "" || setLBA == "Unknown" {
			itemMap["setLoadBalancingAlgorithm"] = ""
		}
	} else if arrayName == "localUsers" || arrayName == "users" || strings.HasSuffix(arrayName, ".localUsers") || strings.HasSuffix(arrayName, ".users") {
		baseName = "user" // Use "user" as the base name for local users

		// Normalize boolean values for local users
		// PowerShell returns booleans as strings "True"/"False" (capitalized) or actual booleans
		if enabled, ok := itemMap["enabled"]; ok && enabled != nil {
			if enabledBool, ok := enabled.(bool); ok {
				itemMap["enabled"] = enabledBool
			} else if enabledStr, ok := enabled.(string); ok {
				enabledStrLower := strings.ToLower(strings.TrimSpace(enabledStr))
				itemMap["enabled"] = enabledStrLower == "true" || enabledStr == "1" || enabledStr == "True"
			} else if enabledNum, ok := enabled.(float64); ok {
				itemMap["enabled"] = enabledNum != 0
			} else {
				itemMap["enabled"] = false
			}
		} else {
			itemMap["enabled"] = false
		}

		if userMayChangePassword, ok := itemMap["userMayChangePassword"]; ok && userMayChangePassword != nil {
			if umcpBool, ok := userMayChangePassword.(bool); ok {
				itemMap["userMayChangePassword"] = umcpBool
			} else if umcpStr, ok := userMayChangePassword.(string); ok {
				umcpStrLower := strings.ToLower(strings.TrimSpace(umcpStr))
				itemMap["userMayChangePassword"] = umcpStrLower == "true" || umcpStr == "1" || umcpStr == "True"
			} else if umcpNum, ok := userMayChangePassword.(float64); ok {
				itemMap["userMayChangePassword"] = umcpNum != 0
			} else {
				itemMap["userMayChangePassword"] = false
			}
		} else {
			itemMap["userMayChangePassword"] = false
		}

		if passwordRequired, ok := itemMap["passwordRequired"]; ok && passwordRequired != nil {
			if prBool, ok := passwordRequired.(bool); ok {
				itemMap["passwordRequired"] = prBool
			} else if prStr, ok := passwordRequired.(string); ok {
				prStrLower := strings.ToLower(strings.TrimSpace(prStr))
				itemMap["passwordRequired"] = prStrLower == "true" || prStr == "1" || prStr == "True"
			} else if prNum, ok := passwordRequired.(float64); ok {
				itemMap["passwordRequired"] = prNum != 0
			} else {
				itemMap["passwordRequired"] = false
			}
		} else {
			itemMap["passwordRequired"] = false
		}

		// Ensure string fields are set
		if name, ok := itemMap["name"]; !ok || name == nil || name == "" {
			itemMap["name"] = ""
		}
		if fullName, ok := itemMap["fullName"]; !ok || fullName == nil || fullName == "" {
			itemMap["fullName"] = ""
		}
		if description, ok := itemMap["description"]; !ok || description == nil || description == "" {
			itemMap["description"] = ""
		}
		// Handle passwordExpires - can be DateTime, null, empty, or boolean false
		if passwordExpires, ok := itemMap["passwordExpires"]; ok && passwordExpires != nil {
			// Check if it's a boolean false (PowerShell might return $false)
			if passExpBool, ok := passwordExpires.(bool); ok {
				if !passExpBool {
					itemMap["passwordExpires"] = "" // false means never expires or not set
				} else {
					itemMap["passwordExpires"] = "" // true as date doesn't make sense, treat as empty
				}
			} else if passExpStr, ok := passwordExpires.(string); ok {
				// If it's a string, check if it's "false", "False", or empty
				passExpStrLower := strings.ToLower(strings.TrimSpace(passExpStr))
				if passExpStrLower == "false" || passExpStrLower == "" {
					itemMap["passwordExpires"] = ""
				} else {
					itemMap["passwordExpires"] = passExpStr // Keep the date string
				}
			} else {
				// For other types (DateTime objects), convert to string
				itemMap["passwordExpires"] = fmt.Sprintf("%v", passwordExpires)
			}
		} else {
			itemMap["passwordExpires"] = ""
		}
	} else if arrayName == "localGroups" || arrayName == "groups" || strings.HasSuffix(arrayName, ".localGroups") || strings.HasSuffix(arrayName, ".groups") {
		baseName = "group" // Use "group" as the base name for local groups

		// Ensure string fields are set
		if name, ok := itemMap["name"]; !ok || name == nil || name == "" {
			itemMap["name"] = ""
		}
		if groupDescription, ok := itemMap["description"]; !ok || groupDescription == nil || groupDescription == "" {
			itemMap["description"] = ""
		}
		// Ensure members is an array (even if empty)
		if members, ok := itemMap["members"]; !ok || members == nil {
			itemMap["members"] = []interface{}{}
		} else if membersArray, ok := members.([]interface{}); ok {
			// Format members as comma-separated string for display
			if len(membersArray) > 0 {
				memberStrings := make([]string, 0, len(membersArray))
				for _, member := range membersArray {
					if memberStr, ok := member.(string); ok {
						memberStrings = append(memberStrings, memberStr)
					} else {
						memberStrings = append(memberStrings, fmt.Sprintf("%v", member))
					}
				}
				itemMap["members"] = strings.Join(memberStrings, ", ")
			} else {
				itemMap["members"] = ""
			}
		} else {
			// If members is not an array, convert it
			itemMap["members"] = fmt.Sprintf("%v", members)
		}
	} else if arrayName == "missingUpdates" || arrayName == "updates" || strings.HasSuffix(arrayName, ".missingUpdates") {
		baseName = "update" // Use "update" as the base name for missing updates

		// Ensure string fields are set with defaults
		if title, ok := itemMap["title"]; !ok || title == nil || title == "" {
			itemMap["title"] = ""
		}
		if kbNumber, ok := itemMap["kbNumber"]; !ok || kbNumber == nil || kbNumber == "" || kbNumber == "N/A" {
			itemMap["kbNumber"] = ""
		}
		if size, ok := itemMap["size"]; !ok || size == nil || size == "" || size == "N/A" {
			itemMap["size"] = ""
		}
		if date, ok := itemMap["date"]; !ok || date == nil || date == "" || date == "N/A" {
			itemMap["date"] = ""
		}
		if updateId, ok := itemMap["updateId"]; !ok || updateId == nil || updateId == "" {
			itemMap["updateId"] = ""
		}
		// hostName is added during extraction, ensure it exists
		if hostName, ok := itemMap["hostName"]; !ok || hostName == nil || hostName == "" {
			itemMap["hostName"] = ""
		}
	} else if arrayName == "windowsFirewall" || arrayName == "firewall" || strings.HasSuffix(arrayName, ".windowsFirewall") {
		baseName = "firewall" // Use "firewall" as the base name for Windows Firewall profiles

		// Ensure string fields are set with defaults
		if profile, ok := itemMap["profile"]; !ok || profile == nil || profile == "" {
			itemMap["profile"] = ""
		}
		// Normalize profileEnabled to boolean
		if profileEnabled, ok := itemMap["profileEnabled"]; ok && profileEnabled != nil {
			if peBool, ok := profileEnabled.(bool); ok {
				itemMap["profileEnabled"] = peBool
			} else if peStr, ok := profileEnabled.(string); ok {
				peStrLower := strings.ToLower(strings.TrimSpace(peStr))
				itemMap["profileEnabled"] = peStrLower == "true" || peStr == "1" || peStr == "True" || peStr == "Enabled"
			} else if peNum, ok := profileEnabled.(float64); ok {
				itemMap["profileEnabled"] = peNum != 0
			} else {
				itemMap["profileEnabled"] = false
			}
		} else {
			itemMap["profileEnabled"] = false
		}
		if inboundAction, ok := itemMap["inboundAction"]; !ok || inboundAction == nil || inboundAction == "" {
			itemMap["inboundAction"] = ""
		}
		if outboundAction, ok := itemMap["outboundAction"]; !ok || outboundAction == nil || outboundAction == "" {
			itemMap["outboundAction"] = ""
		}
		// hostName is added during extraction, ensure it exists
		if hostName, ok := itemMap["hostName"]; !ok || hostName == nil || hostName == "" {
			itemMap["hostName"] = ""
		}
	} else if arrayName == "vms" || strings.HasSuffix(arrayName, ".vms") {
		baseName = "vm" // Use "vm" as the base name for virtual machines

		// Ensure string fields are set with defaults
		if name, ok := itemMap["name"]; !ok || name == nil || name == "" {
			itemMap["name"] = ""
		}
		if state, ok := itemMap["state"]; !ok || state == nil || state == "" {
			itemMap["state"] = "Unknown"
		}
		if uptime, ok := itemMap["uptime"]; !ok || uptime == nil || uptime == "" {
			itemMap["uptime"] = "N/A"
		}
		if host, ok := itemMap["host"]; !ok || host == nil || host == "" {
			itemMap["host"] = ""
		}
		// Ensure generation and version are numbers
		if generation, ok := itemMap["generation"]; !ok || generation == nil {
			itemMap["generation"] = 2
		}
		if version, ok := itemMap["version"]; !ok || version == nil {
			itemMap["version"] = "10.0"
		}
		// Ensure vCPU is a number
		if vCPU, ok := itemMap["vCPU"]; !ok || vCPU == nil {
			itemMap["vCPU"] = 0
		}
		// Normalize memory object
		if memory, ok := itemMap["memory"]; ok && memory != nil {
			if memoryMap, ok := memory.(map[string]interface{}); ok {
				// Ensure memory fields are strings
				if startup, ok := memoryMap["startup"]; !ok || startup == nil || startup == "" {
					memoryMap["startup"] = "0 GB"
				}
				if min, ok := memoryMap["min"]; !ok || min == nil || min == "" {
					memoryMap["min"] = ""
				}
				if max, ok := memoryMap["max"]; !ok || max == nil || max == "" {
					memoryMap["max"] = ""
				}
				// Also check for minimum/maximum (alternative field names)
				if minimum, ok := memoryMap["minimum"]; !ok || minimum == nil || minimum == "" {
					memoryMap["minimum"] = ""
				}
				if maximum, ok := memoryMap["maximum"]; !ok || maximum == nil || maximum == "" {
					memoryMap["maximum"] = ""
				}
				itemMap["memory"] = memoryMap
			}
		} else {
			itemMap["memory"] = map[string]interface{}{
				"startup": "0 GB",
				"min":     "",
				"max":     "",
				"minimum": "",
				"maximum": "",
			}
		}
		// Normalize checkpoint object
		if checkpoint, ok := itemMap["checkpoint"]; ok && checkpoint != nil {
			if checkpointMap, ok := checkpoint.(map[string]interface{}); ok {
				// Ensure checkpoint.exists is boolean
				if exists, ok := checkpointMap["exists"]; ok && exists != nil {
					if existsBool, ok := exists.(bool); ok {
						checkpointMap["exists"] = existsBool
					} else if existsStr, ok := exists.(string); ok {
						checkpointMap["exists"] = strings.ToLower(strings.TrimSpace(existsStr)) == "true" || existsStr == "1" || existsStr == "Yes"
					} else {
						checkpointMap["exists"] = false
					}
				} else {
					checkpointMap["exists"] = false
				}
				// Ensure checkpoint.count is a number
				if count, ok := checkpointMap["count"]; !ok || count == nil {
					checkpointMap["count"] = 0
				}
				itemMap["checkpoint"] = checkpointMap
			}
		} else {
			itemMap["checkpoint"] = map[string]interface{}{
				"exists": false,
				"count":  0,
			}
		}
		// Normalize replica object
		if replica, ok := itemMap["replica"]; ok && replica != nil {
			if replicaMap, ok := replica.(map[string]interface{}); ok {
				if state, ok := replicaMap["state"]; !ok || state == nil || state == "" {
					replicaMap["state"] = "Disabled"
				}
				if health, ok := replicaMap["health"]; !ok || health == nil || health == "" {
					replicaMap["health"] = "N/A"
				}
				if mode, ok := replicaMap["mode"]; !ok || mode == nil || mode == "" {
					replicaMap["mode"] = "N/A"
				}
				// Owner might be in replica (for replica VMs)
				if owner, ok := replicaMap["owner"]; !ok || owner == nil || owner == "" {
					replicaMap["owner"] = ""
				}
				itemMap["replica"] = replicaMap
			}
		} else {
			itemMap["replica"] = map[string]interface{}{
				"state":  "Disabled",
				"health": "N/A",
				"mode":   "N/A",
				"owner":  "",
			}
		}
		// Ensure disks array exists
		if disks, ok := itemMap["disks"]; !ok || disks == nil {
			itemMap["disks"] = []interface{}{}
		}
		// Ensure networkAdapters array exists
		if networkAdapters, ok := itemMap["networkAdapters"]; !ok || networkAdapters == nil {
			itemMap["networkAdapters"] = []interface{}{}
		}
		// Ensure disks array exists and normalize disk fields
		if disks, ok := itemMap["disks"]; ok && disks != nil {
			if disksArray, ok := disks.([]interface{}); ok {
				for _, diskInterface := range disksArray {
					if diskMap, ok := diskInterface.(map[string]interface{}); ok {
						// Normalize VM disk fields
						if name, ok := diskMap["name"]; !ok || name == nil || name == "" {
							// Prefer using path/filename for unique identification
							if path, ok := diskMap["path"].(string); ok && path != "" {
								// Extract filename from path for a cleaner name
								fileName := path
								if lastSlash := strings.LastIndex(path, "\\"); lastSlash >= 0 && lastSlash < len(path)-1 {
									fileName = path[lastSlash+1:]
								} else if lastSlash := strings.LastIndex(path, "/"); lastSlash >= 0 && lastSlash < len(path)-1 {
									fileName = path[lastSlash+1:]
								}
								diskMap["name"] = fileName
							} else {
								// Fallback: Create name from controller info
								controller := ""
								if ctrl, ok := diskMap["controller"].(string); ok && ctrl != "" {
									controller = ctrl
								}
								controllerNumber := ""
								if ctrlNum, ok := diskMap["controllerNumber"]; ok && ctrlNum != nil {
									controllerNumber = fmt.Sprintf("%v", ctrlNum)
								}
								controllerLocation := ""
								if ctrlLoc, ok := diskMap["controllerLocation"]; ok && ctrlLoc != nil {
									controllerLocation = fmt.Sprintf("%v", ctrlLoc)
								}
								if controller != "" && controllerNumber != "" && controllerLocation != "" {
									diskMap["name"] = fmt.Sprintf("Disque dur on %s controller number %s at location %s", controller, controllerNumber, controllerLocation)
								} else {
									diskMap["name"] = "Disk"
								}
							}
						}
						// Ensure path is set
						if path, ok := diskMap["path"]; !ok || path == nil || path == "" {
							diskMap["path"] = ""
						}
						// Ensure controller fields are strings
						if controller, ok := diskMap["controller"]; !ok || controller == nil || controller == "" {
							diskMap["controller"] = "N/A"
						}
						if controllerNumber, ok := diskMap["controllerNumber"]; !ok || controllerNumber == nil {
							diskMap["controllerNumber"] = 0
						}
						if controllerLocation, ok := diskMap["controllerLocation"]; !ok || controllerLocation == nil {
							diskMap["controllerLocation"] = 0
						}
						// Format size fields
						if currentSize, ok := diskMap["currentSize"]; ok && currentSize != nil {
							if currentSizeFloat, ok := currentSize.(float64); ok && currentSizeFloat > 0 {
								diskMap["currentSize"] = fmt.Sprintf("%.2f", currentSizeFloat)
							} else if currentSizeInt, ok := currentSize.(int); ok && currentSizeInt > 0 {
								diskMap["currentSize"] = fmt.Sprintf("%.2f", float64(currentSizeInt))
							} else if currentSizeStr, ok := currentSize.(string); ok && currentSizeStr != "" && currentSizeStr != "N/A" && currentSizeStr != "0" {
								diskMap["currentSize"] = currentSizeStr
							} else {
								diskMap["currentSize"] = "N/A"
							}
						} else {
							diskMap["currentSize"] = "N/A"
						}
						if maxSize, ok := diskMap["maxSize"]; ok && maxSize != nil {
							if maxSizeFloat, ok := maxSize.(float64); ok && maxSizeFloat > 0 {
								diskMap["maxSize"] = fmt.Sprintf("%.2f", maxSizeFloat)
							} else if maxSizeInt, ok := maxSize.(int); ok && maxSizeInt > 0 {
								diskMap["maxSize"] = fmt.Sprintf("%.2f", float64(maxSizeInt))
							} else if maxSizeStr, ok := maxSize.(string); ok && maxSizeStr != "" && maxSizeStr != "N/A" && maxSizeStr != "0" {
								diskMap["maxSize"] = maxSizeStr
							} else {
								diskMap["maxSize"] = "N/A"
							}
						} else {
							diskMap["maxSize"] = "N/A"
						}
						// Create size display string
						currentSizeStr := "N/A"
						if cs, ok := diskMap["currentSize"].(string); ok && cs != "" && cs != "N/A" && cs != "0" {
							currentSizeStr = cs
						}
						maxSizeStr := "N/A"
						if ms, ok := diskMap["maxSize"].(string); ok && ms != "" && ms != "N/A" && ms != "0" {
							maxSizeStr = ms
						}
						if currentSizeStr != "N/A" || maxSizeStr != "N/A" {
							diskMap["sizeDisplay"] = fmt.Sprintf("%s / %s", currentSizeStr, maxSizeStr)
						} else {
							diskMap["sizeDisplay"] = "N/A / N/A"
						}
						// Ensure type and format are strings (don't overwrite if already set, even if "N/A")
						if diskType, ok := diskMap["type"]; !ok || diskType == nil || diskType == "" {
							diskMap["type"] = "N/A"
						} else {
							// Convert to string if needed
							if typeStr, ok := diskType.(string); ok {
								diskMap["type"] = typeStr
							} else {
								diskMap["type"] = fmt.Sprintf("%v", diskType)
							}
						}
						if format, ok := diskMap["format"]; !ok || format == nil || format == "" {
							diskMap["format"] = "N/A"
						} else {
							// Convert to string if needed
							if formatStr, ok := format.(string); ok {
								diskMap["format"] = formatStr
							} else {
								diskMap["format"] = fmt.Sprintf("%v", format)
							}
						}
						// Create controller location display (e.g., "0 (0:1)")
						controllerNum := 0
						controllerLoc := 0
						if ctrlNum, ok := diskMap["controllerNumber"]; ok && ctrlNum != nil {
							if ctrlNumFloat, ok := ctrlNum.(float64); ok {
								controllerNum = int(ctrlNumFloat)
							} else if ctrlNumInt, ok := ctrlNum.(int); ok {
								controllerNum = ctrlNumInt
							}
						}
						if ctrlLoc, ok := diskMap["controllerLocation"]; ok && ctrlLoc != nil {
							if ctrlLocFloat, ok := ctrlLoc.(float64); ok {
								controllerLoc = int(ctrlLocFloat)
							} else if ctrlLocInt, ok := ctrlLoc.(int); ok {
								controllerLoc = ctrlLocInt
							}
						}
						diskMap["controllerLocationDisplay"] = fmt.Sprintf("%d (%d:%d)", controllerNum, controllerNum, controllerLoc)
					}
				}
			}
		} else {
			itemMap["disks"] = []interface{}{}
		}
		// Owner field - check if it exists, otherwise use host or replica.owner
		if owner, ok := itemMap["owner"]; !ok || owner == nil || owner == "" {
			// Try to get owner from replica
			if replica, ok := itemMap["replica"].(map[string]interface{}); ok {
				if replicaOwner, ok := replica["owner"].(string); ok && replicaOwner != "" {
					itemMap["owner"] = replicaOwner
				} else {
					// Fallback to host name
					if host, ok := itemMap["host"].(string); ok && host != "" {
						itemMap["owner"] = host
					} else {
						itemMap["owner"] = ""
					}
				}
			} else {
				// Fallback to host name
				if host, ok := itemMap["host"].(string); ok && host != "" {
					itemMap["owner"] = host
				} else {
					itemMap["owner"] = ""
				}
			}
		}
		// vRAM - create a simplified field from memory.startup
		if memory, ok := itemMap["memory"].(map[string]interface{}); ok {
			if startup, ok := memory["startup"].(string); ok && startup != "" {
				itemMap["vRAM"] = startup
			} else {
				itemMap["vRAM"] = "0 GB"
			}
		} else {
			itemMap["vRAM"] = "0 GB"
		}
		// Gen/Ver - create a combined field
		generation := 2
		if gen, ok := itemMap["generation"]; ok && gen != nil {
			if genFloat, ok := gen.(float64); ok {
				generation = int(genFloat)
			} else if genInt, ok := gen.(int); ok {
				generation = genInt
			}
		}
		version := "10.0"
		if ver, ok := itemMap["version"]; ok && ver != nil {
			if verStr, ok := ver.(string); ok {
				version = verStr
			} else {
				version = fmt.Sprintf("%v", ver)
			}
		}
		itemMap["genVer"] = fmt.Sprintf("Gen %d / Ver %s", generation, version)
	} else if isVMDisk || strings.Contains(arrayName, "vm.disks") || strings.HasSuffix(arrayName, ".disks") || (arrayName == "disks" && itemMap["controller"] != nil) {
		// This is a VM disk being processed in a nested loop (e.g., {{#each vm.disks}})
		// Note: arrayName might be "vm.disks" or just "disks" if we're inside a VM loop
		// Final check: if arrayName is "disks" but item has "controller" field, it's a VM disk
		if !isVMDisk && arrayName == "disks" && itemMap["controller"] != nil {
			isVMDisk = true
			log.Printf("replaceItemPlaceholders: Force-detected VM disk (arrayName='disks' but has controller field)")
		}
		baseName = "disk"

		log.Printf("replaceItemPlaceholders: Processing VM disk with arrayName='%s', isVMDisk=%v, has controller=%v, has path=%v",
			arrayName, isVMDisk, itemMap["controller"] != nil, itemMap["path"] != nil)

		// Normalize VM disk fields (same as above but for nested loop context)
		if name, ok := itemMap["name"]; !ok || name == nil || name == "" {
			// Prefer using path/filename for unique identification
			if path, ok := itemMap["path"].(string); ok && path != "" {
				// Extract filename from path for a cleaner name
				fileName := path
				if lastSlash := strings.LastIndex(path, "\\"); lastSlash >= 0 && lastSlash < len(path)-1 {
					fileName = path[lastSlash+1:]
				} else if lastSlash := strings.LastIndex(path, "/"); lastSlash >= 0 && lastSlash < len(path)-1 {
					fileName = path[lastSlash+1:]
				}
				itemMap["name"] = fileName
			} else {
				// Fallback: Create name from controller info
				controller := ""
				if ctrl, ok := itemMap["controller"].(string); ok && ctrl != "" {
					controller = ctrl
				}
				controllerNumber := ""
				if ctrlNum, ok := itemMap["controllerNumber"]; ok && ctrlNum != nil {
					controllerNumber = fmt.Sprintf("%v", ctrlNum)
				}
				controllerLocation := ""
				if ctrlLoc, ok := itemMap["controllerLocation"]; ok && ctrlLoc != nil {
					controllerLocation = fmt.Sprintf("%v", ctrlLoc)
				}
				if controller != "" && controllerNumber != "" && controllerLocation != "" {
					itemMap["name"] = fmt.Sprintf("Disque dur on %s controller number %s at location %s", controller, controllerNumber, controllerLocation)
				} else {
					itemMap["name"] = "Disk"
				}
			}
		}
		// Ensure path is set
		if path, ok := itemMap["path"]; !ok || path == nil || path == "" {
			itemMap["path"] = ""
		}
		// Ensure controller fields are strings
		if controller, ok := itemMap["controller"]; !ok || controller == nil || controller == "" {
			itemMap["controller"] = "N/A"
		}
		if controllerNumber, ok := itemMap["controllerNumber"]; !ok || controllerNumber == nil {
			itemMap["controllerNumber"] = 0
		}
		if controllerLocation, ok := itemMap["controllerLocation"]; !ok || controllerLocation == nil {
			itemMap["controllerLocation"] = 0
		}
		// Format size fields
		if currentSize, ok := itemMap["currentSize"]; ok && currentSize != nil {
			if currentSizeFloat, ok := currentSize.(float64); ok && currentSizeFloat > 0 {
				itemMap["currentSize"] = fmt.Sprintf("%.2f", currentSizeFloat)
			} else if currentSizeInt, ok := currentSize.(int); ok && currentSizeInt > 0 {
				itemMap["currentSize"] = fmt.Sprintf("%.2f", float64(currentSizeInt))
			} else if currentSizeStr, ok := currentSize.(string); ok && currentSizeStr != "" && currentSizeStr != "N/A" && currentSizeStr != "0" {
				itemMap["currentSize"] = currentSizeStr
			} else {
				itemMap["currentSize"] = "N/A"
			}
		} else {
			itemMap["currentSize"] = "N/A"
		}
		if maxSize, ok := itemMap["maxSize"]; ok && maxSize != nil {
			if maxSizeFloat, ok := maxSize.(float64); ok && maxSizeFloat > 0 {
				itemMap["maxSize"] = fmt.Sprintf("%.2f", maxSizeFloat)
			} else if maxSizeInt, ok := maxSize.(int); ok && maxSizeInt > 0 {
				itemMap["maxSize"] = fmt.Sprintf("%.2f", float64(maxSizeInt))
			} else if maxSizeStr, ok := maxSize.(string); ok && maxSizeStr != "" && maxSizeStr != "N/A" && maxSizeStr != "0" {
				itemMap["maxSize"] = maxSizeStr
			} else {
				itemMap["maxSize"] = "N/A"
			}
		} else {
			itemMap["maxSize"] = "N/A"
		}
		// Create size display string
		currentSizeStr := "N/A"
		if cs, ok := itemMap["currentSize"].(string); ok && cs != "" && cs != "N/A" && cs != "0" {
			currentSizeStr = cs
		}
		maxSizeStr := "N/A"
		if ms, ok := itemMap["maxSize"].(string); ok && ms != "" && ms != "N/A" && ms != "0" {
			maxSizeStr = ms
		}
		if currentSizeStr != "N/A" || maxSizeStr != "N/A" {
			itemMap["sizeDisplay"] = fmt.Sprintf("%s / %s", currentSizeStr, maxSizeStr)
		} else {
			itemMap["sizeDisplay"] = "N/A / N/A"
		}
		// Ensure type and format are strings (don't overwrite if already set, even if "N/A")
		if diskType, ok := itemMap["type"]; !ok || diskType == nil || diskType == "" {
			itemMap["type"] = "N/A"
		} else {
			// Convert to string if needed
			if typeStr, ok := diskType.(string); ok {
				itemMap["type"] = typeStr
			} else {
				itemMap["type"] = fmt.Sprintf("%v", diskType)
			}
		}
		if format, ok := itemMap["format"]; !ok || format == nil || format == "" {
			itemMap["format"] = "N/A"
		} else {
			// Convert to string if needed
			if formatStr, ok := format.(string); ok {
				itemMap["format"] = formatStr
			} else {
				itemMap["format"] = fmt.Sprintf("%v", format)
			}
		}
		// Create controller location display
		controllerNum := 0
		controllerLoc := 0
		if ctrlNum, ok := itemMap["controllerNumber"]; ok && ctrlNum != nil {
			if ctrlNumFloat, ok := ctrlNum.(float64); ok {
				controllerNum = int(ctrlNumFloat)
			} else if ctrlNumInt, ok := ctrlNum.(int); ok {
				controllerNum = ctrlNumInt
			}
		}
		if ctrlLoc, ok := itemMap["controllerLocation"]; ok && ctrlLoc != nil {
			if ctrlLocFloat, ok := ctrlLoc.(float64); ok {
				controllerLoc = int(ctrlLocFloat)
			} else if ctrlLocInt, ok := ctrlLoc.(int); ok {
				controllerLoc = ctrlLocInt
			}
		}
		itemMap["controllerLocationDisplay"] = fmt.Sprintf("%d (%d:%d)", controllerNum, controllerNum, controllerLoc)
	}

	// Calculate usedPercent and freePercent for CSV items
	if baseName == "csv" {
		// Check if percentages are already calculated (from frontend processing)
		if usedPercent, ok := itemMap["usedPercent"]; ok {
			// Already has usedPercent, ensure it's a string
			if str, ok := usedPercent.(string); ok && str != "" {
				// Already formatted, keep it
			} else {
				// Convert to string if needed
				itemMap["usedPercent"] = fmt.Sprintf("%.1f", usedPercent)
			}
		}
		if freePercent, ok := itemMap["freePercent"]; ok {
			// Already has freePercent, ensure it's a string
			if str, ok := freePercent.(string); ok && str != "" {
				// Already formatted, keep it
			} else {
				// Convert to string if needed
				itemMap["freePercent"] = fmt.Sprintf("%.1f", freePercent)
			}
		}

		// Check if percentages are already calculated (from frontend processing)
		hasUsedPercent := false
		hasFreePercent := false
		if up, ok := itemMap["usedPercent"]; ok && up != nil {
			hasUsedPercent = true
			// Ensure it's a string
			if str, ok := up.(string); ok && str != "" {
				// Already formatted, keep it
			} else {
				// Convert to string if needed
				itemMap["usedPercent"] = fmt.Sprintf("%.1f", up)
			}
		}
		if fp, ok := itemMap["freePercent"]; ok && fp != nil {
			hasFreePercent = true
			// Ensure it's a string
			if str, ok := fp.(string); ok && str != "" {
				// Already formatted, keep it
			} else {
				// Convert to string if needed
				itemMap["freePercent"] = fmt.Sprintf("%.1f", fp)
			}
		}

		// If percentages are not already set, calculate them
		if !hasUsedPercent || !hasFreePercent {
			// Need to calculate percentages
			// Try to get size, used, and free values
			var size, used, free float64

			// Helper function to parse a value (string or float)
			parseValue := func(val interface{}) float64 {
				if val == nil {
					return 0
				}
				if str, ok := val.(string); ok {
					// Remove common suffixes and whitespace
					str = strings.TrimSpace(str)
					str = strings.TrimSuffix(str, " GB")
					str = strings.TrimSuffix(str, "GB")
					str = strings.TrimSuffix(str, " MB")
					str = strings.TrimSuffix(str, "MB")
					if parsed, err := strconv.ParseFloat(str, 64); err == nil {
						return parsed
					}
				} else if f, ok := val.(float64); ok {
					return f
				} else if i, ok := val.(int); ok {
					return float64(i)
				}
				return 0
			}

			// Try to parse size from various possible fields
			if sizeVal, ok := itemMap["size"]; ok {
				size = parseValue(sizeVal)
			}
			if size == 0 {
				if sizeVal, ok := itemMap["totalSize"]; ok {
					size = parseValue(sizeVal)
				}
			}

			// Try to parse free from various possible fields (sizeRemaining is the primary field)
			if freeVal, ok := itemMap["sizeRemaining"]; ok {
				free = parseValue(freeVal)
			}
			if free == 0 {
				if freeVal, ok := itemMap["free"]; ok {
					free = parseValue(freeVal)
				}
			}
			if free == 0 {
				if freeVal, ok := itemMap["freeSpace"]; ok {
					free = parseValue(freeVal)
				}
			}

			// Try to parse used from various possible fields
			if usedVal, ok := itemMap["used"]; ok {
				used = parseValue(usedVal)
			}

			// If used is not available but we have size and sizeRemaining, calculate it
			if used == 0 && size > 0 && free > 0 {
				used = size - free
			}

			// If size is not available, try to calculate from used + free
			if size == 0 && (used > 0 || free > 0) {
				size = used + free
			}

			// Calculate percentages and format used/free if size is available
			if size > 0 {
				usedPercent := (used / size) * 100
				freePercent := (free / size) * 100
				if !hasUsedPercent {
					itemMap["usedPercent"] = fmt.Sprintf("%.1f", usedPercent)
				}
				if !hasFreePercent {
					itemMap["freePercent"] = fmt.Sprintf("%.1f", freePercent)
				}

				// Format used and free as "X.XX GB" if they're not already formatted strings
				if usedVal, ok := itemMap["used"]; !ok || usedVal == nil {
					itemMap["used"] = fmt.Sprintf("%.2f GB", used)
				} else if str, ok := usedVal.(string); !ok || !strings.Contains(str, "GB") {
					// If it's not a formatted string, format it
					itemMap["used"] = fmt.Sprintf("%.2f GB", used)
				}

				if freeVal, ok := itemMap["free"]; !ok || freeVal == nil {
					itemMap["free"] = fmt.Sprintf("%.2f GB", free)
				} else if str, ok := freeVal.(string); !ok || !strings.Contains(str, "GB") {
					// If it's not a formatted string, format it
					itemMap["free"] = fmt.Sprintf("%.2f GB", free)
				}

				// Also ensure size is formatted
				if sizeVal, ok := itemMap["size"]; !ok || sizeVal == nil {
					itemMap["size"] = fmt.Sprintf("%.2f GB", size)
				} else if str, ok := sizeVal.(string); !ok || !strings.Contains(str, "GB") {
					// If it's not a formatted string, format it
					itemMap["size"] = fmt.Sprintf("%.2f GB", size)
				}

				log.Printf("CSV values calculated: size=%.2f GB, used=%.2f GB, free=%.2f GB, usedPercent=%s, freePercent=%s",
					size, used, free, itemMap["usedPercent"], itemMap["freePercent"])
			} else {
				if !hasUsedPercent {
					itemMap["usedPercent"] = "0.0"
				}
				if !hasFreePercent {
					itemMap["freePercent"] = "0.0"
				}
				// Set default formatted values
				if _, ok := itemMap["used"]; !ok {
					itemMap["used"] = "0 B"
				}
				if _, ok := itemMap["free"]; !ok {
					itemMap["free"] = "0 B"
				}
				log.Printf("CSV size is 0, setting percentages to 0.0")
			}
		}

		// Ensure id field exists (check for id, guid, uniqueId)
		if _, hasId := itemMap["id"]; !hasId {
			if guid, ok := itemMap["guid"]; ok {
				itemMap["id"] = guid
			} else if uniqueId, ok := itemMap["uniqueId"]; ok {
				itemMap["id"] = uniqueId
			}
		}
	} else if baseName == "quorumDisk" {
		// Calculate allocatedPercent and freePercent for quorum disk items
		// Check if percentages are already calculated (from frontend processing)
		hasAllocatedPercent := false
		hasFreePercent := false
		if up, ok := itemMap["allocatedPercent"]; ok && up != nil {
			hasAllocatedPercent = true
			if str, ok := up.(string); ok && str != "" {
				// Already formatted, keep it
			} else {
				itemMap["allocatedPercent"] = fmt.Sprintf("%.1f", up)
			}
		}
		if fp, ok := itemMap["freePercent"]; ok && fp != nil {
			hasFreePercent = true
			if str, ok := fp.(string); ok && str != "" {
				// Already formatted, keep it
			} else {
				itemMap["freePercent"] = fmt.Sprintf("%.1f", fp)
			}
		}

		// If percentages are not already set, calculate them
		if !hasAllocatedPercent || !hasFreePercent {
			var size, used, free float64

			// Helper function to parse a value (string or float)
			parseValue := func(val interface{}) float64 {
				if val == nil {
					return 0
				}
				if str, ok := val.(string); ok {
					str = strings.TrimSpace(str)
					str = strings.TrimSuffix(str, " GB")
					str = strings.TrimSuffix(str, "GB")
					str = strings.TrimSuffix(str, " MB")
					str = strings.TrimSuffix(str, "MB")
					if parsed, err := strconv.ParseFloat(str, 64); err == nil {
						return parsed
					}
				} else if f, ok := val.(float64); ok {
					return f
				} else if i, ok := val.(int); ok {
					return float64(i)
				}
				return 0
			}

			// Try to parse size from various possible fields
			// For quorum disks, check diskSize first (raw field from PowerShell)
			if sizeVal, ok := itemMap["diskSize"]; ok {
				size = parseValue(sizeVal)
			}
			if size == 0 {
				if sizeVal, ok := itemMap["size"]; ok {
					size = parseValue(sizeVal)
				}
			}
			if size == 0 {
				if sizeVal, ok := itemMap["totalSize"]; ok {
					size = parseValue(sizeVal)
				}
			}

			// Try to parse free from various possible fields (sizeRemaining is the primary field)
			if freeVal, ok := itemMap["sizeRemaining"]; ok {
				free = parseValue(freeVal)
			}
			if free == 0 {
				if freeVal, ok := itemMap["free"]; ok {
					free = parseValue(freeVal)
				}
			}
			if free == 0 {
				if freeVal, ok := itemMap["freeSpace"]; ok {
					free = parseValue(freeVal)
				}
			}
			if free == 0 {
				if freeVal, ok := itemMap["diskFreeSpace"]; ok {
					free = parseValue(freeVal)
				}
			}

			// For quorum disks, always calculate allocated as size - free if both are available
			// This ensures accuracy even if the frontend sent incorrect values
			if size > 0 && free > 0 {
				used = size - free
			} else {
				// Fallback: try to parse from various fields if calculation isn't possible
				if usedVal, ok := itemMap["diskAllocatedSize"]; ok {
					used = parseValue(usedVal)
				}
				if used == 0 {
					if usedVal, ok := itemMap["allocated"]; ok {
						used = parseValue(usedVal)
					}
				}
				if used == 0 {
					if usedVal, ok := itemMap["used"]; ok {
						used = parseValue(usedVal)
					}
				}
			}

			// If size is not available, try to calculate from used + free
			if size == 0 && (used > 0 || free > 0) {
				size = used + free
			}

			// Calculate percentages and format allocated/free if size is available
			if size > 0 {
				allocatedPercent := (used / size) * 100
				freePercent := (free / size) * 100
				if !hasAllocatedPercent {
					itemMap["allocatedPercent"] = fmt.Sprintf("%.1f", allocatedPercent)
				}
				if !hasFreePercent {
					itemMap["freePercent"] = fmt.Sprintf("%.1f", freePercent)
				}

				// Always recalculate and format allocated from the calculated value
				// This ensures accuracy even if the frontend sent incorrect values
				itemMap["allocated"] = fmt.Sprintf("%.2f GB", used)

				if freeVal, ok := itemMap["free"]; !ok || freeVal == nil {
					itemMap["free"] = fmt.Sprintf("%.2f GB", free)
				} else if str, ok := freeVal.(string); !ok || !strings.Contains(str, "GB") {
					itemMap["free"] = fmt.Sprintf("%.2f GB", free)
				}

				// Also ensure size is formatted
				if sizeVal, ok := itemMap["size"]; !ok || sizeVal == nil {
					itemMap["size"] = fmt.Sprintf("%.2f GB", size)
				} else if str, ok := sizeVal.(string); !ok || !strings.Contains(str, "GB") {
					itemMap["size"] = fmt.Sprintf("%.2f GB", size)
				}

				log.Printf("Quorum disk values calculated: size=%.2f GB, allocated=%.2f GB, free=%.2f GB, allocatedPercent=%s, freePercent=%s",
					size, used, free, itemMap["allocatedPercent"], itemMap["freePercent"])
			} else {
				if !hasAllocatedPercent {
					itemMap["allocatedPercent"] = "0.0"
				}
				if !hasFreePercent {
					itemMap["freePercent"] = "0.0"
				}
				if _, ok := itemMap["allocated"]; !ok {
					itemMap["allocated"] = "0 B"
				}
				if _, ok := itemMap["free"]; !ok {
					itemMap["free"] = "0 B"
				}
				log.Printf("Quorum disk size is 0, setting percentages to 0.0")
			}
		}

		// Ensure id field exists (check for id, guid, uniqueId)
		if _, hasId := itemMap["id"]; !hasId {
			if guid, ok := itemMap["guid"]; ok {
				itemMap["id"] = guid
			} else if uniqueId, ok := itemMap["uniqueId"]; ok {
				itemMap["id"] = uniqueId
			}
		}

		// Ensure resourceType field exists
		if _, hasResourceType := itemMap["resourceType"]; !hasResourceType {
			if resType, ok := itemMap["type"]; ok {
				itemMap["resourceType"] = resType
			} else {
				itemMap["resourceType"] = "Physical Disk"
			}
		}

		// Ensure fileSystem field exists (check for diskFileSystem, fileSystem)
		if _, hasFileSystem := itemMap["fileSystem"]; !hasFileSystem {
			if fs, ok := itemMap["diskFileSystem"]; ok {
				itemMap["fileSystem"] = fs
			}
		}

		// Ensure state field exists (check for diskOperationalStatus, status, state)
		if _, hasState := itemMap["state"]; !hasState {
			if status, ok := itemMap["diskOperationalStatus"]; ok {
				itemMap["state"] = status
			} else if status, ok := itemMap["status"]; ok {
				itemMap["state"] = status
			}
		}
	}

	// Log the item being processed
	itemName := "unknown"
	if name, ok := itemMap["name"].(string); ok {
		itemName = name
	} else if name, ok := itemMap["name"].(float64); ok {
		itemName = fmt.Sprintf("%.0f", name)
	}
	log.Printf("replaceItemPlaceholders: processing %s[%d] with name='%s', baseName='%s'", arrayName, index, itemName, baseName)

	// Replace all item properties, including nested paths
	// This handles both direct properties ({{host.name}}) and nested paths ({{host.os.version}})
	replaceNestedPlaceholders(&result, baseName, itemMap, "")

	// Also handle direct array access (e.g., {{hosts.0.name}})
	placeholder := fmt.Sprintf("{{%s.%d}}", arrayName, index)
	replacement := fmt.Sprintf("%v", item)
	result = replacePlaceholderRobust(result, placeholder, replacement)

	// Log if we found any placeholders
	if strings.Contains(result, "{{") {
		log.Printf("replaceItemPlaceholders: WARNING - still contains placeholders after replacement for %s[%d]", arrayName, index)
	}

	return result
}

// replaceNestedPlaceholders recursively replaces placeholders for nested map structures
func replaceNestedPlaceholders(content *string, baseName string, itemMap map[string]interface{}, prefix string) {
	for key, value := range itemMap {
		// Skip arrays and complex types that should be handled by loops
		if value == nil {
			continue
		}

		// Check if value is a slice/array - handle .length placeholders, but skip arrays for normal replacement
		valType := reflect.TypeOf(value)
		if valType != nil && valType.Kind() == reflect.Slice {
			// Handle array.length placeholders (e.g., {{host.missingUpdates.length}}, {{vm.disks.length}})
			var placeholder string
			if prefix == "" {
				placeholder = fmt.Sprintf("{{%s.%s.length}}", baseName, key)
			} else {
				placeholder = fmt.Sprintf("{{%s.%s.%s.length}}", baseName, prefix, key)
			}

			log.Printf("DEBUG replaceNestedPlaceholders: Checking for placeholder '%s' (baseName='%s', key='%s', prefix='%s')", placeholder, baseName, key, prefix)

			// Check if this placeholder exists in the content (may be split across XML tags)
			// Use findSplitTag to check if placeholder exists, even if split
			placeholderKey := strings.TrimSuffix(strings.TrimPrefix(placeholder, "{{"), "}}")
			_, endIdx := findSplitTag(*content, placeholderKey, 0)
			placeholderFound := strings.Contains(*content, placeholder) || endIdx != -1

			if placeholderFound {
				log.Printf("DEBUG replaceNestedPlaceholders: Found placeholder '%s' in content (may be split)", placeholder)
				if arr, ok := value.([]interface{}); ok {
					length := len(arr)
					replacement := fmt.Sprintf("%d", length)
					oldContent := *content
					*content = replacePlaceholderRobust(*content, placeholder, replacement)
					if oldContent != *content {
						log.Printf("Replaced placeholder %s with %s (array length)", placeholder, replacement)
					} else {
						log.Printf("DEBUG replaceNestedPlaceholders: Placeholder '%s' found but replacement failed (content unchanged)", placeholder)
					}
				} else {
					log.Printf("DEBUG replaceNestedPlaceholders: Value for '%s' is slice but not []interface{}, type: %T", key, value)
					// Try reflection for other slice types
					val := reflect.ValueOf(value)
					if val.Kind() == reflect.Slice {
						length := val.Len()
						replacement := fmt.Sprintf("%d", length)
						oldContent := *content
						*content = replacePlaceholderRobust(*content, placeholder, replacement)
						if oldContent != *content {
							log.Printf("Replaced placeholder %s with %d (array length via reflection)", placeholder, length)
						} else {
							log.Printf("DEBUG replaceNestedPlaceholders: Placeholder '%s' found but replacement failed (content unchanged, reflection)", placeholder)
						}
					}
				}
			} else {
				log.Printf("DEBUG replaceNestedPlaceholders: Placeholder '%s' NOT found in content", placeholder)
			}
			// Skip arrays for normal replacement (loops handle arrays)
			continue
		}

		var placeholder string
		if prefix == "" {
			placeholder = fmt.Sprintf("{{%s.%s}}", baseName, key)
		} else {
			placeholder = fmt.Sprintf("{{%s.%s.%s}}", baseName, prefix, key)
		}

		// Convert value to string
		var replacement string
		// Handle boolean values specially - convert to "true"/"false"
		if boolVal, ok := value.(bool); ok {
			if boolVal {
				replacement = "true"
			} else {
				replacement = "false"
			}
		} else {
			replacement = fmt.Sprintf("%v", value)
		}

		// DEBUG: Log adapter connection placeholder replacement
		if baseName == "adapter" && key == "connection" {
			log.Printf("DEBUG replaceNestedPlaceholders: Looking for placeholder '%s' with value '%s' (type: %T)", placeholder, replacement, value)
			if strings.Contains(*content, placeholder) {
				log.Printf("DEBUG replaceNestedPlaceholders: Found '%s' in content (direct match)", placeholder)
			} else {
				// Check if it's split across XML tags
				placeholderKey := strings.TrimSuffix(strings.TrimPrefix(placeholder, "{{"), "}}")
				_, endIdx := findSplitTag(*content, placeholderKey, 0)
				if endIdx != -1 {
					log.Printf("DEBUG replaceNestedPlaceholders: Found '%s' in content (split across XML tags)", placeholder)
				} else {
					log.Printf("DEBUG replaceNestedPlaceholders: '%s' NOT found in content", placeholder)
				}
			}
		}

		// Use robust replacement that handles split tags
		oldContent := *content
		*content = replacePlaceholderRobust(*content, placeholder, replacement)

		// Log if replacement happened (only for debugging, can be removed later)
		if oldContent != *content {
			log.Printf("Replaced placeholder %s with %s (length changed: %d -> %d)",
				placeholder, replacement, len(oldContent), len(*content))
		} else if baseName == "adapter" && key == "connection" {
			log.Printf("DEBUG replaceNestedPlaceholders: Placeholder '%s' NOT replaced (content unchanged)", placeholder)
		}

		// If value is a nested map, recurse to handle deeper nesting
		if nestedMap, ok := value.(map[string]interface{}); ok {
			newPrefix := key
			if prefix != "" {
				newPrefix = prefix + "." + key
			}
			replaceNestedPlaceholders(content, baseName, nestedMap, newPrefix)
		}
	}
}

// replacePlaceholderRobust replaces a placeholder string even if it is split by XML tags
func replacePlaceholderRobust(content, placeholder, replacement string) string {
	// First try simple replacement for clean placeholders
	if strings.Contains(content, placeholder) {
		return strings.ReplaceAll(content, placeholder, escapeXML(replacement))
	}

	// If not found, try to find it split across tags
	// Placeholder is like "{{host.name}}"
	// We look for "{{" then the content inside, then "}}" ignoring XML tags

	// Remove brackets from placeholder to get the key
	key := strings.TrimSuffix(strings.TrimPrefix(placeholder, "{{"), "}}")

	return replaceSplitVariable(content, key, escapeXML(replacement))
}

// replaceSplitVariable finds {{key}} even if split by tags and replaces it
func replaceSplitVariable(content, key, replacement string) string {
	// Simple state machine to find {{...key...}} ignoring tags
	// This is expensive so we only do it if simple replacement failed

	// We iterate through the content looking for "{{"
	startIdx := 0
	replacedCount := 0
	maxReplacements := 1000 // Safety limit

	for replacedCount < maxReplacements {
		openIdx := strings.Index(content[startIdx:], "{{")
		if openIdx == -1 {
			break
		}

		realOpenIdx := startIdx + openIdx

		// Now we look for "}}" and extract the text in between (ignoring tags)
		// We'll scan forward from realOpenIdx + 2

		currentIdx := realOpenIdx + 2
		extractedText := ""
		inTag := false

		// Track indices of all characters that are part of the placeholder (brackets + key)
		// We will use this to surgically replace/remove only the text parts
		var placeholderIndices []int

		// Add the opening brackets {{
		placeholderIndices = append(placeholderIndices, realOpenIdx, realOpenIdx+1)

		foundClose := false

		for i := currentIdx; i < len(content); i++ {
			// Check for "}}" if not in tag
			if !inTag && i+1 < len(content) && content[i:i+2] == "}}" {
				foundClose = true
				// Add the closing brackets }}
				placeholderIndices = append(placeholderIndices, i, i+1)
				break
			}

			if inTag {
				if content[i] == '>' {
					inTag = false
				}
				continue
			}

			if content[i] == '<' {
				inTag = true
				continue
			}

			// It's a text character part of the key
			extractedText += string(content[i])
			placeholderIndices = append(placeholderIndices, i)

			// Safety limit
			if len(extractedText) > 500 {
				break
			}
		}

		if foundClose {
			// Check if extracted text matches key (trim whitespace)
			trimmed := strings.TrimSpace(extractedText)
			if trimmed == key {
				// Match found!
				// We have a list of indices in placeholderIndices that correspond to {{ + key + }}
				// We need to group these into contiguous ranges to perform replacements

				var ranges [][]int
				if len(placeholderIndices) > 0 {
					start := placeholderIndices[0]
					last := placeholderIndices[0]
					for j := 1; j < len(placeholderIndices); j++ {
						if placeholderIndices[j] != last+1 {
							// Gap found (likely a tag), close current range
							ranges = append(ranges, []int{start, last + 1}) // [inclusive, exclusive)
							start = placeholderIndices[j]
						}
						last = placeholderIndices[j]
					}
					ranges = append(ranges, []int{start, last + 1})
				}

				// Apply replacements in reverse order to preserve indices
				for j := len(ranges) - 1; j >= 0; j-- {
					rng := ranges[j]
					rStart, rEnd := rng[0], rng[1]

					if j == 0 {
						// This is the first segment (contains {{ and maybe start of key)
						// Replace it with the actual value
						content = content[:rStart] + replacement + content[rEnd:]
					} else {
						// Subsequent segments (rest of key and }})
						// Remove them (replace with empty string)
						// The tags in between ranges remain untouched!
						content = content[:rStart] + content[rEnd:]
					}
				}

				replacedCount++
				// Reset search from start since we modified the string
				startIdx = 0
				continue
			}
		}

		// Move past this "{{"
		startIdx = realOpenIdx + 2
	}

	if replacedCount > 0 {
		log.Printf("replaceSplitVariable: replaced %d instances of {{%s}}", replacedCount, key)
	}

	return content
}

// createFormattedDOCX creates a DOCX file trying to preserve some HTML structure
func createFormattedDOCX(htmlContent, title string) ([]byte, error) {
	// 1. Extract body content
	bodyContent := htmlContent
	if strings.Contains(htmlContent, "<body") {
		parts := strings.Split(htmlContent, "<body")
		if len(parts) > 1 {
			parts = strings.Split(parts[1], "</body>")
			if len(parts) > 0 {
				bodyContent = parts[0]
				// Remove attributes from body tag if any
				if idx := strings.Index(bodyContent, ">"); idx != -1 {
					bodyContent = bodyContent[idx+1:]
				}
			}
		}
	}

	// 2. Pre-process common block elements to adding newlines for better text extraction
	bodyContent = strings.ReplaceAll(bodyContent, "</h1>", "</h1>\n")
	bodyContent = strings.ReplaceAll(bodyContent, "</h2>", "</h2>\n")
	bodyContent = strings.ReplaceAll(bodyContent, "</h3>", "</h3>\n")
	bodyContent = strings.ReplaceAll(bodyContent, "</h4>", "</h4>\n")
	bodyContent = strings.ReplaceAll(bodyContent, "</p>", "</p>\n")
	bodyContent = strings.ReplaceAll(bodyContent, "</div>", "</div>\n")
	bodyContent = strings.ReplaceAll(bodyContent, "</tr>", "</tr>\n")
	bodyContent = strings.ReplaceAll(bodyContent, "<br>", "\n")
	bodyContent = strings.ReplaceAll(bodyContent, "<br/>", "\n")

	// 3. Convert to formatted WordXML content
	wordXMLContent := convertHTMLToWordXML(bodyContent)

	return createAdvancedDOCX(title, wordXMLContent, strings.Contains(htmlContent, "class=\"cover-page\""))
}

// convertHTMLToWordXML converts HTML content to WordXML paragraphs and tables
func convertHTMLToWordXML(html string) string {
	var sb strings.Builder

	// Normalize line breaks
	html = strings.ReplaceAll(html, "\r\n", "\n")
	html = strings.ReplaceAll(html, "\r", "\n")

	// Remove comments
	reComment := regexp.MustCompile(`<!--[\s\S]*?-->`)
	html = reComment.ReplaceAllString(html, "")

	// Split by table tags to handle tables separately
	// This is a naive parser but works for structured reports
	parts := splitByTag(html, "table")

	for _, part := range parts {
		if part.isTag {
			// Process table
			sb.WriteString(processHTMLTable(part.content))
		} else {
			// Process regular content (paragraphs, headings, etc.)
			sb.WriteString(processHTMLContent(part.content))
		}
	}

	return sb.String()
}

type htmlPart struct {
	content string
	isTag   bool
}

// splitByTag splits string by outer tags (e.g. <table>...</table>)
func splitByTag(s, tagName string) []htmlPart {
	var parts []htmlPart
	startTag := "<" + tagName
	endTag := "</" + tagName + ">"

	current := s
	for {
		startIdx := strings.Index(strings.ToLower(current), startTag)
		if startIdx == -1 {
			if len(current) > 0 {
				parts = append(parts, htmlPart{content: current, isTag: false})
			}
			break
		}

		// Add content before tag
		if startIdx > 0 {
			parts = append(parts, htmlPart{content: current[:startIdx], isTag: false})
		}

		// Find end of tag
		remaining := current[startIdx:]
		endIdx := strings.Index(strings.ToLower(remaining), endTag)

		if endIdx == -1 {
			// Malformed HTML, treat rest as text
			parts = append(parts, htmlPart{content: remaining, isTag: false})
			break
		}

		// Add tag content including tags
		tagContent := remaining[:endIdx+len(endTag)]
		parts = append(parts, htmlPart{content: tagContent, isTag: true})

		// Move to next part
		current = remaining[endIdx+len(endTag):]
	}

	return parts
}

// processHTMLContent processes non-table HTML content
func processHTMLContent(html string) string {
	var sb strings.Builder

	// Check for page breaks or specific page divs
	// Basic implementation: if we see <div class="page"> and it's not the start, add break
	// We do this by regex finding the div tags

	// Pre-process common block elements to adding newlines for better text extraction
	// But keep the tags for regex matching

	lines := strings.Split(html, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Detect Page Break (div class="page" or "cover-page")
		// Not perfect as it depends on exact string, but works for the template
		if (strings.Contains(line, "class=\"page\"") || strings.Contains(line, "class=\"cover-page\"")) && sb.Len() > 0 {
			sb.WriteString(`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`)
		}

		// Detect Styles
		style := getStyleAttributes(line)

		// Detect Heading levels
		isH1 := strings.Contains(strings.ToLower(line), "<h1")
		isH2 := strings.Contains(strings.ToLower(line), "<h2")
		isH3 := strings.Contains(strings.ToLower(line), "<h3")
		isH4 := strings.Contains(strings.ToLower(line), "<h4")

		// Detect Classes for Cover Page
		isCoverTitle := strings.Contains(line, "class=\"cover-title\"")
		isCoverSubtitle := strings.Contains(line, "class=\"cover-subtitle\"")
		isCoverLogo := strings.Contains(line, "class=\"cover-logo\"")

		// Clean tags for text content
		text := htmlToPlainText(line)
		if text == "" {
			continue
		}

		// Build Paragraph Properties
		sb.WriteString(`<w:p>`)
		sb.WriteString(`<w:pPr>`)

		// Styles
		if isH1 || isCoverTitle {
			sb.WriteString(`<w:pStyle w:val="Heading1"/>`)
		} else if isH2 {
			sb.WriteString(`<w:pStyle w:val="Heading2"/>`)
		} else if isH3 {
			sb.WriteString(`<w:pStyle w:val="Heading3"/>`)
		} else if isH4 {
			sb.WriteString(`<w:pStyle w:val="Heading4"/>`)
		}

		// Alignment
		if val, ok := style["text-align"]; ok {
			sb.WriteString(fmt.Sprintf(`<w:jc w:val="%s"/>`, val))
		} else if strings.Contains(line, "class=\"cover-page\"") || strings.Contains(line, "center") || isCoverTitle || isCoverSubtitle || isCoverLogo {
			// Basic heuristic for centering
			sb.WriteString(`<w:jc w:val="center"/>`)
		}

		sb.WriteString(`</w:pPr>`)

		// Run (Text) Properties
		sb.WriteString(`<w:r>`)
		sb.WriteString(`<w:rPr>`)

		// Bold
		if strings.Contains(line, "<strong>") || strings.Contains(line, "<b>") || isH1 || isH2 || isH3 || isH4 || isCoverTitle {
			sb.WriteString(`<w:b/>`)
		}

		// Color
		if val, ok := style["color"]; ok {
			colorHex := cssColorToHex(val)
			if colorHex != "auto" {
				sb.WriteString(fmt.Sprintf(`<w:color w:val="%s"/>`, colorHex))
			}
		} else if isCoverTitle || isCoverLogo {
			// Default Blue for cover elements if no specific color
			sb.WriteString(`<w:color w:val="0078D4"/>`)
		} else if isCoverSubtitle {
			sb.WriteString(`<w:color w:val="555555"/>`)
		}

		// Font Size
		if val, ok := style["font-size"]; ok {
			// Extract number
			re := regexp.MustCompile(`(\d+)`)
			match := re.FindString(val)
			if match != "" {
				size, _ := strconv.Atoi(match)
				// HTML px/pt to Word half-points roughly
				// Let's assume standard point size, Word needs 2x
				if strings.Contains(val, "rem") {
					size = size * 24 // 1rem ~= 16px -> 12pt -> 24 half-points
				} else {
					size = size * 2
				}
				sb.WriteString(fmt.Sprintf(`<w:sz w:val="%d"/>`, size))
			}
		} else if isH1 {
			sb.WriteString(`<w:sz w:val="32"/>`) // 16pt
		} else if isH2 {
			sb.WriteString(`<w:sz w:val="28"/>`) // 14pt
		} else if isH3 {
			sb.WriteString(`<w:sz w:val="24"/>`) // 12pt
		} else if isH4 {
			sb.WriteString(`<w:sz w:val="22"/>`) // 11pt
		} else if isCoverTitle {
			sb.WriteString(`<w:sz w:val="72"/>`) // 36pt
		} else if isCoverSubtitle {
			sb.WriteString(`<w:sz w:val="36"/>`) // 18pt
		} else if isCoverLogo {
			sb.WriteString(`<w:sz w:val="96"/>`) // 48pt
		}

		sb.WriteString(`</w:rPr>`)
		sb.WriteString(fmt.Sprintf(`<w:t>%s</w:t>`, escapeXML(text)))
		sb.WriteString(`</w:r>`)
		sb.WriteString(`</w:p>`)
	}

	return sb.String()
}

// processHTMLTable converts an HTML table to WordXML table
func processHTMLTable(html string) string {
	var sb strings.Builder

	// Start Word Table
	sb.WriteString(`<w:tbl>
		<w:tblPr>
			<w:tblStyle w:val="TableGrid"/>
			<w:tblW w:w="5000" w:type="pct"/>
			<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
			<w:tblBorders>
				<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
				<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
				<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
				<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
				<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
				<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
			</w:tblBorders>
		</w:tblPr>`)

	// Extract rows (tr)
	rows := splitByTag(html, "tr")

	for _, rowPart := range rows {
		if !rowPart.isTag {
			continue
		}

		sb.WriteString(`<w:tr>`)

		// Extract cells (td or th)
		cells := splitByTag(rowPart.content, "td")
		if len(cells) <= 1 { // Check for th
			cells = splitByTag(rowPart.content, "th")
		}

		for _, cellPart := range cells {
			if !cellPart.isTag {
				continue
			}

			// Is Header?
			isHeader := strings.Contains(strings.ToLower(cellPart.content), "<th")

			// Clean text
			text := htmlToPlainText(cellPart.content)

			sb.WriteString(`<w:tc>`)

			// Style processing
			style := getStyleAttributes(cellPart.content)

			// Build cell properties (background color, width, etc.)
			sb.WriteString(`<w:tcPr>`)

			// Background color
			bgColor := "auto"
			if val, ok := style["background-color"]; ok {
				bgColor = cssColorToHex(val)
			} else if isHeader {
				bgColor = "D9D9D9" // Default header color
			}

			if bgColor != "auto" {
				sb.WriteString(fmt.Sprintf(`<w:shd w:val="clear" w:color="auto" w:fill="%s"/>`, bgColor))
			}

			// Cell width if specified
			if val, ok := style["width"]; ok {
				// Naive width conversion, assuming %
				widthStr := strings.TrimSuffix(val, "%")
				width, _ := strconv.Atoi(widthStr)
				if width > 0 {
					// Word usually uses twips or 50ths of percent.
					// w:w type="pct" value is 50ths of a percent (so 100% = 5000)
					sb.WriteString(fmt.Sprintf(`<w:tcW w:w="%d" w:type="pct"/>`, width*50))
				}
			}

			sb.WriteString(`</w:tcPr>`)

			// Paragraph properties
			sb.WriteString(`<w:p>`)

			// Run properties (bold, color, etc.)
			sb.WriteString(`<w:r>`)

			sb.WriteString(`<w:rPr>`)
			if isHeader || style["font-weight"] == "bold" || strings.Contains(cellPart.content, "<strong>") || strings.Contains(cellPart.content, "<b>") {
				sb.WriteString(`<w:b/>`)
			}

			// Text color
			if val, ok := style["color"]; ok {
				colorHex := cssColorToHex(val)
				if colorHex != "auto" {
					sb.WriteString(fmt.Sprintf(`<w:color w:val="%s"/>`, colorHex))
				}
			}
			sb.WriteString(`</w:rPr>`)

			sb.WriteString(fmt.Sprintf(`<w:t>%s</w:t>`, escapeXML(text)))
			sb.WriteString(`</w:r>`)
			sb.WriteString(`</w:p>`)
			sb.WriteString(`</w:tc>`)
		}

		sb.WriteString(`</w:tr>`)
	}

	sb.WriteString(`</w:tbl>`)
	return sb.String()
}

// Helper to extract style attributes from a tag string
func getStyleAttributes(tagContent string) map[string]string {
	styles := make(map[string]string)

	// Simple regex to find style="..."
	re := regexp.MustCompile(`style="([^"]+)"`)
	matches := re.FindStringSubmatch(tagContent)
	if len(matches) > 1 {
		styleStr := matches[1]
		parts := strings.Split(styleStr, ";")
		for _, part := range parts {
			kv := strings.Split(part, ":")
			if len(kv) == 2 {
				key := strings.TrimSpace(kv[0])
				val := strings.TrimSpace(kv[1])
				styles[key] = val
			}
		}
	}
	return styles
}

// Helper to convert CSS color to Word hex (RRGGBB)
func cssColorToHex(color string) string {
	// Remove #
	hex := strings.TrimPrefix(color, "#")

	// Handle short hex (e.g. F00 -> FF0000)
	if len(hex) == 3 {
		r := hex[0:1]
		g := hex[1:2]
		b := hex[2:3]
		hex = r + r + g + g + b + b
	}

	// Map common names
	colorMap := map[string]string{
		"red": "FF0000", "blue": "0000FF", "green": "008000",
		"black": "000000", "white": "FFFFFF", "gray": "808080",
		"lightgray": "D3D3D3", "darkgray": "A9A9A9",
	}

	if val, ok := colorMap[strings.ToLower(color)]; ok {
		return val
	}

	// Validate hex chars
	if matched, _ := regexp.MatchString(`^[0-9A-Fa-f]{6}$`, hex); matched {
		return hex
	}

	return "auto"
}

// createSimpleDOCX creates a simple DOCX file structure
func createSimpleDOCX(content, title string) ([]byte, error) {
	// Reused for compatibility if needed elsewhere
	return createMinimalDOCX(title, content)
}

// htmlToPlainText converts HTML to plain text
func htmlToPlainText(html string) string {
	// Simple HTML tag removal
	text := html
	// Remove script and style tags with their content
	text = regexp.MustCompile(`(?i)<script[^>]*>.*?</script>`).ReplaceAllString(text, "")
	text = regexp.MustCompile(`(?i)<style[^>]*>.*?</style>`).ReplaceAllString(text, "")
	// Remove HTML tags
	text = regexp.MustCompile(`<[^>]+>`).ReplaceAllString(text, " ")
	// Decode HTML entities
	text = strings.ReplaceAll(text, "&nbsp;", " ")
	text = strings.ReplaceAll(text, "&amp;", "&")
	text = strings.ReplaceAll(text, "&lt;", "<")
	text = strings.ReplaceAll(text, "&gt;", ">")
	text = strings.ReplaceAll(text, "&quot;", "\"")
	text = strings.ReplaceAll(text, "&#39;", "'")
	// Clean up whitespace
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")
	text = strings.TrimSpace(text)
	return text
}

// createAdvancedDOCX creates a DOCX file with styles and footer
func createAdvancedDOCX(title, wordXMLContent string, hasCoverPage bool) ([]byte, error) {
	buf := new(bytes.Buffer)
	zipWriter := zip.NewWriter(buf)

	// --- [Content_Types].xml ---
	ct, _ := zipWriter.Create("[Content_Types].xml")
	ct.Write([]byte(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
	<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
	<Default Extension="xml" ContentType="application/xml"/>
	<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
	<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
	<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
</Types>`))

	// --- _rels/.rels ---
	rels, _ := zipWriter.Create("_rels/.rels")
	rels.Write([]byte(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`))

	// --- word/_rels/document.xml.rels ---
	docRels, _ := zipWriter.Create("word/_rels/document.xml.rels")
	docRels.Write([]byte(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
	<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`))

	// --- word/styles.xml (Microsoft Blue Theme) ---
	styles, _ := zipWriter.Create("word/styles.xml")
	styles.Write([]byte(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
	<w:docDefaults>
		<w:rPrDefault>
			<w:rPr>
				<w:rFonts w:asciiTheme="minorHAnsi" w:eastAsiaTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorBidi"/>
				<w:sz w:val="22"/>
				<w:szCs w:val="22"/>
				<w:lang w:val="en-US" w:eastAsia="en-US" w:bidi="ar-SA"/>
			</w:rPr>
		</w:rPrDefault>
	</w:docDefaults>
	<w:style w:type="paragraph" w:styleId="Normal" w:default="1">
		<w:name w:val="Normal"/>
		<w:qFormat/>
		<w:pPr>
			<w:spacing w:before="0" w:after="0"/>
		</w:pPr>
	</w:style>
	<w:style w:type="paragraph" w:styleId="Heading1">
		<w:name w:val="heading 1"/>
		<w:basedOn w:val="Normal"/>
		<w:next w:val="Normal"/>
		<w:qFormat/>
		<w:pPr>
			<w:keepNext/>
			<w:keepLines/>
			<w:spacing w:before="0" w:after="0"/>
			<w:outlineLvl w:val="0"/>
		</w:pPr>
		<w:rPr>
			<w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/>
			<w:b/>
			<w:color w:val="0078D4"/>
			<w:sz w:val="32"/>
		</w:rPr>
	</w:style>
	<w:style w:type="paragraph" w:styleId="Heading2">
		<w:name w:val="heading 2"/>
		<w:basedOn w:val="Normal"/>
		<w:next w:val="Normal"/>
		<w:qFormat/>
		<w:pPr>
			<w:keepNext/>
			<w:keepLines/>
			<w:spacing w:before="0" w:after="0"/>
			<w:outlineLvl w:val="1"/>
		</w:pPr>
		<w:rPr>
			<w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/>
			<w:b/>
			<w:color w:val="0078D4"/>
			<w:sz w:val="28"/>
		</w:rPr>
	</w:style>
	<w:style w:type="paragraph" w:styleId="Heading3">
		<w:name w:val="heading 3"/>
		<w:basedOn w:val="Normal"/>
		<w:next w:val="Normal"/>
		<w:qFormat/>
		<w:pPr>
			<w:keepNext/>
			<w:keepLines/>
			<w:spacing w:before="0" w:after="0"/>
			<w:outlineLvl w:val="2"/>
		</w:pPr>
		<w:rPr>
			<w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/>
			<w:b/>
			<w:color w:val="0078D4"/>
			<w:sz w:val="24"/>
		</w:rPr>
	</w:style>
	<w:style w:type="paragraph" w:styleId="Heading4">
		<w:name w:val="heading 4"/>
		<w:basedOn w:val="Normal"/>
		<w:next w:val="Normal"/>
		<w:qFormat/>
		<w:pPr>
			<w:keepNext/>
			<w:keepLines/>
			<w:spacing w:before="0" w:after="0"/>
			<w:outlineLvl w:val="3"/>
		</w:pPr>
		<w:rPr>
			<w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/>
			<w:b/>
			<w:color w:val="0078D4"/>
			<w:sz w:val="22"/>
		</w:rPr>
	</w:style>
	<w:style w:type="paragraph" w:styleId="Title">
		<w:name w:val="Title"/>
		<w:basedOn w:val="Normal"/>
		<w:next w:val="Normal"/>
		<w:qFormat/>
		<w:pPr>
			<w:spacing w:before="0" w:after="0"/>
			<w:jc w:val="center"/>
		</w:pPr>
		<w:rPr>
			<w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/>
			<w:b/>
			<w:color w:val="0078D4"/>
			<w:sz w:val="56"/>
		</w:rPr>
	</w:style>
</w:styles>`))

	// --- word/footer1.xml ---
	footer, _ := zipWriter.Create("word/footer1.xml")
	footer.Write([]byte(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
	<w:p>
		<w:pPr>
			<w:pStyle w:val="Footer"/>
			<w:jc w:val="center"/>
		</w:pPr>
		<w:r>
			<w:t xml:space="preserve">Page </w:t>
		</w:r>
		<w:r>
			<w:fldChar w:fldCharType="begin"/>
		</w:r>
		<w:r>
			<w:instrText>PAGE</w:instrText>
		</w:r>
		<w:r>
			<w:fldChar w:fldCharType="separate"/>
		</w:r>
		<w:r>
			<w:t>1</w:t>
		</w:r>
		<w:r>
			<w:fldChar w:fldCharType="end"/>
		</w:r>
	</w:p>
</w:ftr>`))

	// --- word/document.xml ---
	titleXML := ""
	if !hasCoverPage {
		// Only add default title if we don't have a cover page
		titleXML = fmt.Sprintf(`<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>%s</w:t></w:r></w:p>`, escapeXML(title))
	}

	docXML := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
	<w:body>
		%s
		%s
		<w:sectPr>
			<w:footerReference w:type="default" r:id="rId2"/>
			<w:pgSz w:w="11906" w:h="16838"/>
			<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
		</w:sectPr>
	</w:body>
</w:document>`, titleXML, wordXMLContent)

	docFile, _ := zipWriter.Create("word/document.xml")
	docFile.Write([]byte(docXML))

	zipWriter.Close()
	return buf.Bytes(), nil
}

// createMinimalDOCX creates a minimal valid DOCX file
func createMinimalDOCX(title, wordXMLContent string) ([]byte, error) {
	return createAdvancedDOCX(title, wordXMLContent, false)
}

// escapeXML escapes XML special characters
func escapeXML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	s = strings.ReplaceAll(s, "'", "&apos;")
	return s
}

// stripXMLTags removes XML tags from a string, keeping only the text content
func stripXMLTags(s string) string {
	var result strings.Builder
	inTag := false

	for i := 0; i < len(s); i++ {
		if s[i] == '<' {
			inTag = true
			continue
		}
		if s[i] == '>' {
			inTag = false
			continue
		}
		if !inTag {
			result.WriteByte(s[i])
		}
	}

	return result.String()
}

// findSplitTag searches for a tag like {{/each}} that might be split by XML tags
// It returns the start and end index of the tag in the content
func findSplitTag(content string, tag string, startFrom int) (int, int) {
	tagBytes := []byte(tag)
	tagLen := len(tagBytes)
	tagIdx := 0
	matchStart := -1
	inTag := false

	for i := startFrom; i < len(content); i++ {
		b := content[i]

		if inTag {
			if b == '>' {
				inTag = false
			}
			continue
		}

		if b == '<' {
			inTag = true
			continue
		}

		if b == tagBytes[tagIdx] {
			if tagIdx == 0 {
				matchStart = i
			}
			tagIdx++
			if tagIdx == tagLen {
				return matchStart, i + 1
			}
		} else {
			if tagIdx > 0 {
				// Mismatch, reset. Check if current byte matches start of tag.
				tagIdx = 0
				matchStart = -1
				if b == tagBytes[0] {
					matchStart = i
					tagIdx = 1
				}
			}
		}
	}
	return -1, -1
}

// findBalancedClosingTag finds the matching {{/each}} for the loop starting before startFrom
// It handles nested loops and split tags
func findBalancedClosingTag(content string, startFrom int) (int, int) {
	// We assume we are just after {{#each ...}}
	// We need to scan forward, counting {{#each ...}} as +1 and {{/each}} as -1
	// We start with depth = 1 (the current loop)

	depth := 1
	currentIdx := startFrom

	// Scan char by char to handle split {{
	for i := currentIdx; i < len(content); i++ {
		// Optimization: Check for '{'
		if content[i] != '{' {
			continue
		}

		// Found '{', check if it's start of "{{", potentially split
		// Use a local scanner to find the second '{' ignoring XML tags
		secondBraceIdx := -1
		inTag := false

		for j := i + 1; j < len(content); j++ {
			if inTag {
				if content[j] == '>' {
					inTag = false
				}
				continue
			}
			if content[j] == '<' {
				inTag = true
				continue
			}

			if content[j] == '{' {
				secondBraceIdx = j
				break
			} else {
				// Found something else before second '{', not a {{
				break
			}
		}

		if secondBraceIdx == -1 {
			// Not a {{ start, continue main loop
			continue
		}

		// We found {{, real start is i
		realOpenIdx := i

		// Check what this tag is
		// Scan content of tag ignoring XML
		tagContent, closeTagIdx := extractTagContent(content, realOpenIdx)
		if closeTagIdx == -1 {
			// Malformed tag, skip
			// We continue from secondBraceIdx to avoid reprocessing the second {
			i = secondBraceIdx
			continue
		}

		// Check if it's a start or end loop tag
		// Normalize tag content to handle spacing issues like "{{ /each }}" or "{{/ each}}"
		normalized := strings.TrimSpace(tagContent)
		// Fix common spacing issues
		if strings.HasPrefix(normalized, "/ ") {
			normalized = "/" + strings.TrimSpace(normalized[2:])
		}
		if strings.HasPrefix(normalized, "# ") {
			normalized = "#" + strings.TrimSpace(normalized[2:])
		}

		if strings.HasPrefix(normalized, "#each") {
			depth++
		} else if strings.HasPrefix(normalized, "/each") {
			depth--
		}

		if depth == 0 {
			// Found our closing tag!
			return realOpenIdx, closeTagIdx
		}

		// Move past this tag
		i = closeTagIdx - 1 // -1 because loop increments i
	}

	return -1, -1
}

// extractTagContent extracts the content inside {{...}} ignoring XML tags
// Returns the content and the index AFTER the closing }}
// Handles split }} like }<xml>}
func extractTagContent(content string, openIdx int) (string, int) {
	// Start scanning from openIdx + 2 (assuming {{ is already handled/skipped)
	// Actually, the caller passes openIdx as the start of {{.
	// But finding {{ might have involved skipping tags.
	// The caller logic in findBalancedClosingTag finds the *first* { at realOpenIdx.
	// But it doesn't tell us where the *second* { is!
	// findBalancedClosingTag's new logic finds the second brace to confirm it is {{.
	// But then calls extractTagContent(content, realOpenIdx).

	// We need to find the second { again to start extracting correctly?
	// Or we can just scan for it.

	currentIdx := openIdx + 1
	foundSecondOpen := false

	// Find the second {
	for i := currentIdx; i < len(content); i++ {
		if content[i] == '<' {
			// Skip tag
			endTag := strings.Index(content[i:], ">")
			if endTag != -1 {
				i += endTag
				continue
			}
		}
		if content[i] == '{' {
			currentIdx = i + 1
			foundSecondOpen = true
			break
		}
	}

	if !foundSecondOpen {
		return "", -1
	}

	extractedText := ""
	inTag := false

	for i := currentIdx; i < len(content); i++ {
		// Check for first }
		if !inTag && content[i] == '}' {
			// Check for second }
			// Scan forward ignoring tags
			secondCloseFound := false
			secondCloseIdx := -1

			for j := i + 1; j < len(content); j++ {
				if content[j] == '<' {
					// Skip tag
					endTag := strings.Index(content[j:], ">")
					if endTag != -1 {
						j += endTag
						continue
					}
				}

				if content[j] == '}' {
					secondCloseFound = true
					secondCloseIdx = j + 1
					break
				} else {
					// Found non-tag content that is not }, so it's not }}
					break
				}
			}

			if secondCloseFound {
				return extractedText, secondCloseIdx
			}
		}

		if inTag {
			if content[i] == '>' {
				inTag = false
			}
			continue
		}

		if content[i] == '<' {
			inTag = true
			continue
		}

		extractedText += string(content[i])

		// Safety - Word XML can be very verbose
		if len(extractedText) > 10000 {
			break
		}
	}

	return "", -1
}

// LoopMarker represents a found loop start tag
type LoopMarker struct {
	startIdx  int
	endIdx    int
	arrayName string
}

// findLoopMarkers finds all {{#each ...}} markers even if split across XML tags
func findLoopMarkers(content string) []LoopMarker {
	var markers []LoopMarker

	// We look for "{{" then "#each" then whitespace, then arrayName then "}}"
	// We ignore XML tags in between

	startIdx := 0
	for {
		// Find start of potential tag
		openIdx := strings.Index(content[startIdx:], "{{")
		if openIdx == -1 {
			break
		}
		realOpenIdx := startIdx + openIdx

		// Scan forward to see if it matches #each pattern
		currentIdx := realOpenIdx + 2
		extractedText := ""
		inTag := false
		foundClose := false
		closeIdx := -1

		for i := currentIdx; i < len(content); i++ {
			// Check for "}}" if not in tag
			if !inTag && i+1 < len(content) && content[i:i+2] == "}}" {
				foundClose = true
				closeIdx = i
				break
			}

			if inTag {
				if content[i] == '>' {
					inTag = false
				}
				continue
			}

			if content[i] == '<' {
				inTag = true
				continue
			}

			extractedText += string(content[i])

			// Optimization: Check prefix early
			// We need to be careful with normalization here too
			// But for extracting the array name, we'll validate fully after extracting

			// Safety limit for extracted text length (array names shouldn't be massive)
			if len(extractedText) > 200 {
				break
			}
		}

		if foundClose {
			trimmed := strings.TrimSpace(extractedText)

			// Fix common spacing issues for detection
			checkStr := trimmed
			if strings.HasPrefix(checkStr, "# ") {
				checkStr = "#" + strings.TrimSpace(checkStr[2:])
			}

			if strings.HasPrefix(checkStr, "#each") {
				// Extract array name
				// Use the normalized checkStr for splitting
				parts := strings.Fields(checkStr)
				if len(parts) >= 2 {
					arrayName := parts[1] // The second part is the array name
					// Note: parts[0] is "#each"

					markers = append(markers, LoopMarker{
						startIdx:  realOpenIdx,
						endIdx:    closeIdx + 2,
						arrayName: arrayName,
					})
				}
			}
		}

		// Move search forward
		startIdx = realOpenIdx + 2
	}

	return markers
}
