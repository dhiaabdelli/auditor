package handlers

import (
	// Standard library - database
	"database/sql"
	
	// Standard library - encoding
	"encoding/json"
	
	// Standard library - io
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	
	// Internal packages
	"network-script-generator/internal/database"
)

// DeviceTemplate represents a device template structure
type DeviceTemplate struct {
	ID         int                    `json:"id"`
	Name       string                 `json:"name"`
	Category   string                 `json:"category"` // "server", "san", "others"
	Type       string                 `json:"type"`
	Vendor     string                 `json:"vendor"`
	ImagePath  string                 `json:"imagePath"`
	Width      int                    `json:"width"`
	Height     int                    `json:"height"`
	Ports      []map[string]interface{} `json:"ports"`
	Connectors []map[string]interface{} `json:"connectors"`
	Metadata   map[string]interface{} `json:"metadata"`
}

// HandleGetInfrastructureDiagrams handles getting all infrastructure diagrams
func HandleGetInfrastructureDiagrams(w http.ResponseWriter, r *http.Request) {
	// Ensure table exists
	_, err := database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS infrastructure_diagrams (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			diagram_data TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		log.Printf("Error creating infrastructure_diagrams table: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rows, err := database.DB.Query(`
		SELECT id, name, created_at, updated_at 
		FROM infrastructure_diagrams 
		ORDER BY created_at DESC
	`)
	if err != nil {
		log.Printf("Error querying infrastructure_diagrams: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var diagrams []map[string]interface{}
	for rows.Next() {
		var id int
		var name, createdAt, updatedAt string

		err := rows.Scan(&id, &name, &createdAt, &updatedAt)
		if err != nil {
			continue
		}

		diagrams = append(diagrams, map[string]interface{}{
			"id":        id,
			"name":      name,
			"createdAt": createdAt,
			"updatedAt": updatedAt,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(diagrams)
}

// HandleCreateInfrastructureDiagram handles creating a new infrastructure diagram
func HandleCreateInfrastructureDiagram(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID          *int                    `json:"id,omitempty"`
		Name        string                   `json:"name"`
		Components  []map[string]interface{} `json:"components"`
		Connections []map[string]interface{} `json:"connections"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "Diagram name is required", http.StatusBadRequest)
		return
	}

	diagramData := map[string]interface{}{
		"components":  req.Components,
		"connections": req.Connections,
	}

	diagramDataJSON, err := json.Marshal(diagramData)
	if err != nil {
		http.Error(w, "Error encoding diagram data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// If ID is provided, update existing diagram
	if req.ID != nil && *req.ID > 0 {
		_, err = database.DB.Exec(`
			UPDATE infrastructure_diagrams
			SET name = ?, diagram_data = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = ?
		`, req.Name, string(diagramDataJSON), *req.ID)

		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"id": *req.ID, "success": true})
		return
	}

	// Otherwise, create new diagram
	result, err := database.DB.Exec(`
		INSERT INTO infrastructure_diagrams (name, diagram_data)
		VALUES (?, ?)
	`, req.Name, string(diagramDataJSON))

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"id": id, "success": true})
}

// HandleGetInfrastructureDiagram handles getting a single infrastructure diagram
func HandleGetInfrastructureDiagram(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "ID required", http.StatusBadRequest)
		return
	}

	var name, diagramData sql.NullString
	var createdAt, updatedAt string

	err := database.DB.QueryRow(`
		SELECT name, diagram_data, created_at, updated_at
		FROM infrastructure_diagrams
		WHERE id = ?
	`, id).Scan(&name, &diagramData, &createdAt, &updatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Diagram not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	var data map[string]interface{}
	if diagramData.Valid && diagramData.String != "" {
		if err := json.Unmarshal([]byte(diagramData.String), &data); err != nil {
			http.Error(w, "Error parsing diagram data: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	diagram := map[string]interface{}{
		"id":          id,
		"name":        name.String,
		"components":  data["components"],
		"connections": data["connections"],
		"createdAt":   createdAt,
		"updatedAt":   updatedAt,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(diagram)
}

// HandleDeleteInfrastructureDiagram handles deleting an infrastructure diagram
func HandleDeleteInfrastructureDiagram(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ID int `json:"id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	_, err := database.DB.Exec(`DELETE FROM infrastructure_diagrams WHERE id = ?`, req.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}


// HandleGetDeviceTemplates handles getting all device templates
func HandleGetDeviceTemplates(w http.ResponseWriter, r *http.Request) {
	// Ensure table exists with category column
	_, err := database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS device_templates (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			category TEXT DEFAULT 'others',
			type TEXT NOT NULL,
			vendor TEXT NOT NULL,
			image_path TEXT NOT NULL,
			width INTEGER DEFAULT 120,
			height INTEGER DEFAULT 80,
			ports TEXT, -- JSON array of ports
			connectors TEXT, -- JSON array of connectors
			metadata TEXT, -- JSON object for additional metadata
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		log.Printf("Error creating device_templates table: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Add category column if it doesn't exist (migration)
	_, _ = database.DB.Exec(`ALTER TABLE device_templates ADD COLUMN category TEXT DEFAULT 'others'`)

	rows, err := database.DB.Query(`
		SELECT id, name, category, type, vendor, image_path, width, height, ports, connectors, metadata
		FROM device_templates
		ORDER BY category, type, vendor, name
	`)
	if err != nil {
		log.Printf("Error querying device_templates: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var templates []DeviceTemplate
	for rows.Next() {
		var template DeviceTemplate
		var portsJSON, connectorsJSON, metadataJSON sql.NullString

		err := rows.Scan(
			&template.ID,
			&template.Name,
			&template.Category,
			&template.Type,
			&template.Vendor,
			&template.ImagePath,
			&template.Width,
			&template.Height,
			&portsJSON,
			&connectorsJSON,
			&metadataJSON,
		)
		if err != nil {
			continue
		}

		// Set default category if empty
		if template.Category == "" {
			if template.Type == "server" {
				template.Category = "server"
			} else if template.Type == "san" {
				template.Category = "san"
			} else {
				template.Category = "others"
			}
		}

		// Parse ports
		if portsJSON.Valid && portsJSON.String != "" {
			json.Unmarshal([]byte(portsJSON.String), &template.Ports)
		}

		// Parse connectors
		if connectorsJSON.Valid && connectorsJSON.String != "" {
			json.Unmarshal([]byte(connectorsJSON.String), &template.Connectors)
		}

		// Parse metadata
		if metadataJSON.Valid && metadataJSON.String != "" {
			json.Unmarshal([]byte(metadataJSON.String), &template.Metadata)
		}

		templates = append(templates, template)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(templates)
}

// HandleCreateDeviceTemplate handles creating a new device template
func HandleCreateDeviceTemplate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var template DeviceTemplate
	if err := json.NewDecoder(r.Body).Decode(&template); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if template.Name == "" || template.Type == "" || template.Vendor == "" || template.ImagePath == "" {
		http.Error(w, "Name, type, vendor, and image_path are required", http.StatusBadRequest)
		return
	}

	// Ensure table exists
	_, err := database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS device_templates (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			type TEXT NOT NULL,
			vendor TEXT NOT NULL,
			image_path TEXT NOT NULL,
			width INTEGER DEFAULT 120,
			height INTEGER DEFAULT 80,
			ports TEXT,
			connectors TEXT,
			metadata TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		log.Printf("Error creating device_templates table: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Convert ports, connectors, and metadata to JSON
	portsJSON, _ := json.Marshal(template.Ports)
	connectorsJSON, _ := json.Marshal(template.Connectors)
	metadataJSON, _ := json.Marshal(template.Metadata)

	result, err := database.DB.Exec(`
		INSERT INTO device_templates (name, category, type, vendor, image_path, width, height, ports, connectors, metadata)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, template.Name, template.Category, template.Type, template.Vendor, template.ImagePath, template.Width, template.Height,
		string(portsJSON), string(connectorsJSON), string(metadataJSON))

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"id": id, "success": true})
}

// HandleGetDeviceTemplate handles getting a single device template
func HandleGetDeviceTemplate(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "ID required", http.StatusBadRequest)
		return
	}

	var template DeviceTemplate
	var portsJSON, connectorsJSON, metadataJSON sql.NullString

	err := database.DB.QueryRow(`
		SELECT id, name, category, type, vendor, image_path, width, height, ports, connectors, metadata
		FROM device_templates
		WHERE id = ?
	`, id).Scan(
		&template.ID,
		&template.Name,
		&template.Category,
		&template.Type,
		&template.Vendor,
		&template.ImagePath,
		&template.Width,
		&template.Height,
		&portsJSON,
		&connectorsJSON,
		&metadataJSON,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Template not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	// Parse JSON fields
	if portsJSON.Valid && portsJSON.String != "" {
		json.Unmarshal([]byte(portsJSON.String), &template.Ports)
	}
	if connectorsJSON.Valid && connectorsJSON.String != "" {
		json.Unmarshal([]byte(connectorsJSON.String), &template.Connectors)
	}
	if metadataJSON.Valid && metadataJSON.String != "" {
		json.Unmarshal([]byte(metadataJSON.String), &template.Metadata)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(template)
}

// HandleUpdateDeviceTemplate handles updating an existing device template
func HandleUpdateDeviceTemplate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var template DeviceTemplate
	if err := json.NewDecoder(r.Body).Decode(&template); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if template.ID == 0 {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	// Convert ports, connectors, and metadata to JSON
	portsJSON, _ := json.Marshal(template.Ports)
	connectorsJSON, _ := json.Marshal(template.Connectors)
	metadataJSON, _ := json.Marshal(template.Metadata)

	_, err := database.DB.Exec(`
		UPDATE device_templates
		SET name = ?, type = ?, vendor = ?, image_path = ?, width = ?, height = ?, ports = ?, connectors = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, template.Name, template.Type, template.Vendor, template.ImagePath, template.Width, template.Height,
		string(portsJSON), string(connectorsJSON), string(metadataJSON), template.ID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

// HandleDeleteDeviceTemplate handles deleting a device template
func HandleDeleteDeviceTemplate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ID int `json:"id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	_, err := database.DB.Exec(`DELETE FROM device_templates WHERE id = ?`, req.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

// HandleGetDeviceImages handles listing available device images
func HandleGetDeviceImages(w http.ResponseWriter, r *http.Request) {
	// Look for images in static/images/devices directory
	imageDir := "static/images/devices"
	
	// Check if directory exists
	if _, err := os.Stat(imageDir); os.IsNotExist(err) {
		// Create directory if it doesn't exist
		os.MkdirAll(imageDir, 0755)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]string{})
		return
	}

	var images []string
	imageExtensions := map[string]bool{
		".png":  true,
		".jpg":  true,
		".jpeg": true,
		".gif":  true,
		".svg":  true,
		".webp": true,
	}

	files, err := ioutil.ReadDir(imageDir)
	if err != nil {
		log.Printf("Error reading device images directory: %v", err)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]string{})
		return
	}

	for _, file := range files {
		if !file.IsDir() {
			ext := strings.ToLower(filepath.Ext(file.Name()))
			if imageExtensions[ext] {
				// Return path relative to static folder
				imagePath := "/images/devices/" + file.Name()
				images = append(images, imagePath)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(images)
}
