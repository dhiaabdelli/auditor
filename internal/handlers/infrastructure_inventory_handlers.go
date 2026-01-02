package handlers

import (
	// Standard library
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	// Third-party packages
	"github.com/xuri/excelize/v2"
	
	// Internal packages
	"network-script-generator/internal/database"
)

// InfrastructureData represents the infrastructure inventory data
type InfrastructureData struct {
	ClientName    string           `json:"clientName"`
	ClientContact string           `json:"clientContact"`
	Date          string           `json:"date"`
	Servers       []ServerInfo     `json:"servers"`
	Networks      []NetworkInfo    `json:"networks"`
	Storage       []StorageInfo    `json:"storage"`
	Virtualization VirtualizationInfo `json:"virtualization"`
	DNS           []DNSInfo        `json:"dns"`
}

// ServerInfo represents server information
type ServerInfo struct {
	Name        string `json:"name"`
	IP          string `json:"ip"`
	Role        string `json:"role"`
	OS          string `json:"os"`
	CPU         string `json:"cpu"`
	RAM         string `json:"ram"`
	Storage     string `json:"storage"`
	Status      string `json:"status"`
	Location    string `json:"location"`
	Notes       string `json:"notes"`
}

// NetworkInfo represents network information
type NetworkInfo struct {
	Name        string `json:"name"`
	Subnet      string `json:"subnet"`
	Gateway     string `json:"gateway"`
	VLAN        string `json:"vlan"`
	Purpose     string `json:"purpose"`
	Notes       string `json:"notes"`
}

// StorageInfo represents SAN/storage information
type StorageInfo struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Capacity    string `json:"capacity"`
	Used        string `json:"used"`
	LUN         string `json:"lun"`
	WWN         string `json:"wwn"`
	Status      string `json:"status"`
	Notes       string `json:"notes"`
}

// VirtualizationInfo represents virtualization platform information
type VirtualizationInfo struct {
	Platform    string `json:"platform"`
	Version     string `json:"version"`
	Hosts       []HostInfo `json:"hosts"`
	Clusters    []ClusterInfo `json:"clusters"`
	VMs         []VMInfo `json:"vms"`
}

// HostInfo represents virtualization host information
type HostInfo struct {
	Name        string `json:"name"`
	IP          string `json:"ip"`
	CPU         string `json:"cpu"`
	RAM         string `json:"ram"`
	Storage     string `json:"storage"`
	Status      string `json:"status"`
}

// ClusterInfo represents cluster information
type ClusterInfo struct {
	Name        string `json:"name"`
	Nodes       string `json:"nodes"`
	Quorum      string `json:"quorum"`
	Status      string `json:"status"`
}

// VMInfo represents virtual machine information
type VMInfo struct {
	Name        string `json:"name"`
	Host        string `json:"host"`
	CPU         string `json:"cpu"`
	RAM         string `json:"ram"`
	Storage     string `json:"storage"`
	Status      string `json:"status"`
	OS          string `json:"os"`
}

// DNSInfo represents DNS information
type DNSInfo struct {
	Domain      string `json:"domain"`
	PrimaryDNS  string `json:"primaryDNS"`
	SecondaryDNS string `json:"secondaryDNS"`
	Purpose     string `json:"purpose"`
}

// HandleGenerateInfrastructureExcel handles generating Excel file from infrastructure data
func HandleGenerateInfrastructureExcel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var data InfrastructureData
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		log.Printf("Error decoding infrastructure data: %v", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Create Excel file
	f := excelize.NewFile()
	defer f.Close()

	// Set default sheet name
	sheetName := "Infrastructure Inventory"
	index, err := f.NewSheet(sheetName)
	if err != nil {
		log.Printf("Error creating sheet: %v", err)
		http.Error(w, "Failed to create Excel sheet", http.StatusInternalServerError)
		return
	}
	f.DeleteSheet("Sheet1")
	f.SetActiveSheet(index)

	// Set column widths
	f.SetColWidth(sheetName, "A", "Z", 15)

	// Header style
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 12, Color: "FFFFFF"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#4472C4"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})

	// Title style
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 16},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})

	row := 1

	// Title
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Infrastructure Inventory Report")
	f.MergeCell(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("H%d", row))
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), titleStyle)
	row++

	// Client Information
	row++
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Client Information")
	f.MergeCell(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("H%d", row))
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), headerStyle)
	row++

	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Client Name:")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), data.ClientName)
	row++
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Contact:")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), data.ClientContact)
	row++
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Date:")
	f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), data.Date)
	row += 2

	// Servers Section
	if len(data.Servers) > 0 {
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Servers")
		f.MergeCell(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("I%d", row))
		f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), headerStyle)
		row++

		// Server headers
		headers := []string{"Name", "IP Address", "Role", "OS", "CPU", "RAM", "Storage", "Status", "Location", "Notes"}
		for col, header := range headers {
			cell := fmt.Sprintf("%c%d", 'A'+col, row)
			f.SetCellValue(sheetName, cell, header)
			f.SetCellStyle(sheetName, cell, cell, headerStyle)
		}
		row++

		// Server data
		for _, server := range data.Servers {
			f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), server.Name)
			f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), server.IP)
			f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), server.Role)
			f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), server.OS)
			f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), server.CPU)
			f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), server.RAM)
			f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), server.Storage)
			f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), server.Status)
			f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), server.Location)
			f.SetCellValue(sheetName, fmt.Sprintf("J%d", row), server.Notes)
			row++
		}
		row++
	}

	// Networks Section
	if len(data.Networks) > 0 {
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Networks")
		f.MergeCell(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("F%d", row))
		f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), headerStyle)
		row++

		headers := []string{"Name", "Subnet", "Gateway", "VLAN", "Purpose", "Notes"}
		for col, header := range headers {
			cell := fmt.Sprintf("%c%d", 'A'+col, row)
			f.SetCellValue(sheetName, cell, header)
			f.SetCellStyle(sheetName, cell, cell, headerStyle)
		}
		row++

		for _, network := range data.Networks {
			f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), network.Name)
			f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), network.Subnet)
			f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), network.Gateway)
			f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), network.VLAN)
			f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), network.Purpose)
			f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), network.Notes)
			row++
		}
		row++
	}

	// Storage/SAN Section
	if len(data.Storage) > 0 {
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Storage / SAN")
		f.MergeCell(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("H%d", row))
		f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), headerStyle)
		row++

		headers := []string{"Name", "Type", "Capacity", "Used", "LUN", "WWN", "Status", "Notes"}
		for col, header := range headers {
			cell := fmt.Sprintf("%c%d", 'A'+col, row)
			f.SetCellValue(sheetName, cell, header)
			f.SetCellStyle(sheetName, cell, cell, headerStyle)
		}
		row++

		for _, storage := range data.Storage {
			f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), storage.Name)
			f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), storage.Type)
			f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), storage.Capacity)
			f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), storage.Used)
			f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), storage.LUN)
			f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), storage.WWN)
			f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), storage.Status)
			f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), storage.Notes)
			row++
		}
		row++
	}

	// Virtualization Section
	if data.Virtualization.Platform != "" {
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Virtualization")
		f.MergeCell(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("H%d", row))
		f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), headerStyle)
		row++

		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Platform:")
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), data.Virtualization.Platform)
		row++
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Version:")
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), data.Virtualization.Version)
		row++

		// Virtualization Hosts
		if len(data.Virtualization.Hosts) > 0 {
			row++
			f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Virtualization Hosts")
			f.MergeCell(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("F%d", row))
			f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), headerStyle)
			row++

			headers := []string{"Name", "IP Address", "CPU", "RAM", "Storage", "Status"}
			for col, header := range headers {
				cell := fmt.Sprintf("%c%d", 'A'+col, row)
				f.SetCellValue(sheetName, cell, header)
				f.SetCellStyle(sheetName, cell, cell, headerStyle)
			}
			row++

			for _, host := range data.Virtualization.Hosts {
				f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), host.Name)
				f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), host.IP)
				f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), host.CPU)
				f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), host.RAM)
				f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), host.Storage)
				f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), host.Status)
				row++
			}
		}

		// Clusters
		if len(data.Virtualization.Clusters) > 0 {
			row++
			f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Clusters")
			f.MergeCell(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("D%d", row))
			f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), headerStyle)
			row++

			headers := []string{"Name", "Nodes", "Quorum", "Status"}
			for col, header := range headers {
				cell := fmt.Sprintf("%c%d", 'A'+col, row)
				f.SetCellValue(sheetName, cell, header)
				f.SetCellStyle(sheetName, cell, cell, headerStyle)
			}
			row++

			for _, cluster := range data.Virtualization.Clusters {
				f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), cluster.Name)
				f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), cluster.Nodes)
				f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), cluster.Quorum)
				f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), cluster.Status)
				row++
			}
		}

		// Virtual Machines
		if len(data.Virtualization.VMs) > 0 {
			row++
			f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "Virtual Machines")
			f.MergeCell(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("G%d", row))
			f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), headerStyle)
			row++

			headers := []string{"Name", "Host", "CPU", "RAM", "Storage", "Status", "OS"}
			for col, header := range headers {
				cell := fmt.Sprintf("%c%d", 'A'+col, row)
				f.SetCellValue(sheetName, cell, header)
				f.SetCellStyle(sheetName, cell, cell, headerStyle)
			}
			row++

			for _, vm := range data.Virtualization.VMs {
				f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), vm.Name)
				f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), vm.Host)
				f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), vm.CPU)
				f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), vm.RAM)
				f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), vm.Storage)
				f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), vm.Status)
				f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), vm.OS)
				row++
			}
		}
		row++
	}

	// DNS Section
	if len(data.DNS) > 0 {
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), "DNS Configuration")
		f.MergeCell(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("D%d", row))
		f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), headerStyle)
		row++

		headers := []string{"Domain", "Primary DNS", "Secondary DNS", "Purpose"}
		for col, header := range headers {
			cell := fmt.Sprintf("%c%d", 'A'+col, row)
			f.SetCellValue(sheetName, cell, header)
			f.SetCellStyle(sheetName, cell, cell, headerStyle)
		}
		row++

		for _, dns := range data.DNS {
			f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), dns.Domain)
			f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), dns.PrimaryDNS)
			f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), dns.SecondaryDNS)
			f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), dns.Purpose)
			row++
		}
	}

	// Generate filename
	filename := fmt.Sprintf("Infrastructure_%s_%s.xlsx", 
		data.ClientName, 
		time.Now().Format("20060102-150405"))

	// Set response headers
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	// Write Excel file to response
	if err := f.Write(w); err != nil {
		log.Printf("Error writing Excel file: %v", err)
		http.Error(w, "Failed to generate Excel file", http.StatusInternalServerError)
		return
	}
}

// InfrastructureInventoryRecord represents a saved infrastructure inventory
type InfrastructureInventoryRecord struct {
	ID           int    `json:"id"`
	ClientName   string `json:"clientName"`
	ClientContact string `json:"clientContact"`
	Date         string `json:"date"`
	Data         InfrastructureData `json:"data"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

// HandleGetInfrastructureInventories handles getting all infrastructure inventories
func HandleGetInfrastructureInventories(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Ensure table exists
	if err := database.EnsureInfrastructureInventoriesTable(); err != nil {
		log.Printf("Error ensuring infrastructure_inventories table exists: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	rows, err := database.DB.Query("SELECT id, client_name, client_contact, date, data, created_at, updated_at FROM infrastructure_inventories ORDER BY updated_at DESC")
	if err != nil {
		log.Printf("Error querying infrastructure_inventories: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var inventories []InfrastructureInventoryRecord
	for rows.Next() {
		var record InfrastructureInventoryRecord
		var dataJSON string
		err := rows.Scan(&record.ID, &record.ClientName, &record.ClientContact, &record.Date, &dataJSON, &record.CreatedAt, &record.UpdatedAt)
		if err != nil {
			log.Printf("Error scanning inventory row: %v", err)
			continue
		}

		// Parse JSON data
		if err := json.Unmarshal([]byte(dataJSON), &record.Data); err != nil {
			log.Printf("Error parsing inventory data: %v", err)
			continue
		}

		inventories = append(inventories, record)
	}

	if inventories == nil {
		inventories = []InfrastructureInventoryRecord{}
	}

	if err := json.NewEncoder(w).Encode(inventories); err != nil {
		log.Printf("Error encoding inventories response: %v", err)
	}
}

// HandleGetInfrastructureInventory handles getting a single infrastructure inventory
func HandleGetInfrastructureInventory(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Missing inventory ID", http.StatusBadRequest)
		return
	}

	var record InfrastructureInventoryRecord
	var dataJSON string
	err := database.DB.QueryRow("SELECT id, client_name, client_contact, date, data, created_at, updated_at FROM infrastructure_inventories WHERE id = ?", id).
		Scan(&record.ID, &record.ClientName, &record.ClientContact, &record.Date, &dataJSON, &record.CreatedAt, &record.UpdatedAt)

	if err != nil {
		log.Printf("Error querying inventory: %v", err)
		http.Error(w, "Inventory not found", http.StatusNotFound)
		return
	}

	// Parse JSON data
	if err := json.Unmarshal([]byte(dataJSON), &record.Data); err != nil {
		log.Printf("Error parsing inventory data: %v", err)
		http.Error(w, "Invalid inventory data", http.StatusInternalServerError)
		return
	}

	if err := json.NewEncoder(w).Encode(record); err != nil {
		log.Printf("Error encoding inventory response: %v", err)
	}
}

// HandleCreateInfrastructureInventory handles creating a new infrastructure inventory
func HandleCreateInfrastructureInventory(w http.ResponseWriter, r *http.Request) {
	var data InfrastructureData
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		log.Printf("Error decoding infrastructure data: %v", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Ensure table exists
	if err := database.EnsureInfrastructureInventoriesTable(); err != nil {
		log.Printf("Error ensuring infrastructure_inventories table exists: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Convert data to JSON
	dataJSON, err := json.Marshal(data)
	if err != nil {
		log.Printf("Error marshaling inventory data: %v", err)
		http.Error(w, "Failed to process data", http.StatusInternalServerError)
		return
	}

	// Insert into database
	result, err := database.DB.Exec(`INSERT INTO infrastructure_inventories (client_name, client_contact, date, data) 
		VALUES (?, ?, ?, ?)`,
		data.ClientName, data.ClientContact, data.Date, string(dataJSON))

	if err != nil {
		log.Printf("Error inserting inventory: %v", err)
		http.Error(w, fmt.Sprintf("Failed to create inventory: %v", err), http.StatusInternalServerError)
		return
	}

	// Get the inserted ID
	id, err := result.LastInsertId()
	if err != nil {
		log.Printf("Error getting last insert ID: %v", err)
		http.Error(w, "Failed to get inventory ID", http.StatusInternalServerError)
		return
	}

	// Return the created inventory
	record := InfrastructureInventoryRecord{
		ID:           int(id),
		ClientName:   data.ClientName,
		ClientContact: data.ClientContact,
		Date:         data.Date,
		Data:         data,
		CreatedAt:    time.Now().Format(time.RFC3339),
		UpdatedAt:    time.Now().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(record); err != nil {
		log.Printf("Error encoding inventory response: %v", err)
	}
}

// HandleUpdateInfrastructureInventory handles updating an existing infrastructure inventory
func HandleUpdateInfrastructureInventory(w http.ResponseWriter, r *http.Request) {
	var record InfrastructureInventoryRecord
	if err := json.NewDecoder(r.Body).Decode(&record); err != nil {
		log.Printf("Error decoding inventory data: %v", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if record.ID == 0 {
		http.Error(w, "Missing inventory ID", http.StatusBadRequest)
		return
	}

	// Convert data to JSON
	dataJSON, err := json.Marshal(record.Data)
	if err != nil {
		log.Printf("Error marshaling inventory data: %v", err)
		http.Error(w, "Failed to process data", http.StatusInternalServerError)
		return
	}

	// Update in database
	result, err := database.DB.Exec(`UPDATE infrastructure_inventories 
		SET client_name=?, client_contact=?, date=?, data=?, updated_at=CURRENT_TIMESTAMP 
		WHERE id=?`,
		record.Data.ClientName, record.Data.ClientContact, record.Data.Date, string(dataJSON), record.ID)

	if err != nil {
		log.Printf("Error updating inventory: %v", err)
		http.Error(w, fmt.Sprintf("Failed to update inventory: %v", err), http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
	} else if rowsAffected == 0 {
		http.Error(w, "Inventory not found", http.StatusNotFound)
		return
	}

	// Get updated record
	var updatedRecord InfrastructureInventoryRecord
	var updatedDataJSON string
	err = database.DB.QueryRow("SELECT id, client_name, client_contact, date, data, created_at, updated_at FROM infrastructure_inventories WHERE id = ?", record.ID).
		Scan(&updatedRecord.ID, &updatedRecord.ClientName, &updatedRecord.ClientContact, &updatedRecord.Date, &updatedDataJSON, &updatedRecord.CreatedAt, &updatedRecord.UpdatedAt)

	if err != nil {
		log.Printf("Error querying updated inventory: %v", err)
		http.Error(w, "Failed to retrieve updated inventory", http.StatusInternalServerError)
		return
	}

	// Parse JSON data
	if err := json.Unmarshal([]byte(updatedDataJSON), &updatedRecord.Data); err != nil {
		log.Printf("Error parsing updated inventory data: %v", err)
		http.Error(w, "Invalid inventory data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(updatedRecord); err != nil {
		log.Printf("Error encoding inventory response: %v", err)
	}
}

// HandleDeleteInfrastructureInventory handles deleting an infrastructure inventory
func HandleDeleteInfrastructureInventory(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Missing inventory ID", http.StatusBadRequest)
		return
	}

	// Ensure table exists
	if err := database.EnsureInfrastructureInventoriesTable(); err != nil {
		log.Printf("Error ensuring infrastructure_inventories table exists: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	result, err := database.DB.Exec("DELETE FROM infrastructure_inventories WHERE id = ?", id)
	if err != nil {
		log.Printf("Error deleting inventory: %v", err)
		http.Error(w, "Failed to delete inventory", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
	} else if rowsAffected == 0 {
		http.Error(w, "Inventory not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Inventory deleted successfully",
	})
}

