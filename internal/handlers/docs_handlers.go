package handlers

import (
	// Standard library - database
	"database/sql"
	
	// Standard library - encoding
	"encoding/json"
	
	// Standard library - io
	"io"
	
	// Standard library - net
	"net/http"
	
	// Standard library - other
	"fmt"
	"strconv"
	"strings"
	
	// Internal packages
	"network-script-generator/internal/database"
	"network-script-generator/internal/utils"
)

// Documentation handlers
func HandleGetSubcategories(w http.ResponseWriter, r *http.Request) {
	categoryIDStr := r.URL.Query().Get("category")
	if categoryIDStr == "" {
		http.Error(w, "category required", http.StatusBadRequest)
		return
	}

	categoryID, err := strconv.Atoi(categoryIDStr)
	if err != nil {
		http.Error(w, "invalid category ID", http.StatusBadRequest)
		return
	}

	rows, err := database.DB.Query("SELECT id, category_id, name, description FROM subcategories WHERE category_id = ? ORDER BY name", categoryID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var subcategories []map[string]interface{}
	for rows.Next() {
		var id, catID int
		var name, description string
		err := rows.Scan(&id, &catID, &name, &description)
		if err != nil {
			continue
		}
		subcategories = append(subcategories, map[string]interface{}{
			"id":          fmt.Sprintf("%d", id),
			"category":    fmt.Sprintf("%d", catID),
			"name":        name,
			"description": description,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(subcategories)
}

func HandleCreateSubcategory(w http.ResponseWriter, r *http.Request) {
	var subcategory map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&subcategory); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	categoryIDStr := subcategory["category"].(string)
	categoryID, err := strconv.Atoi(categoryIDStr)
	if err != nil {
		http.Error(w, "invalid category ID", http.StatusBadRequest)
		return
	}

	name := subcategory["name"].(string)
	description := ""
	if d, ok := subcategory["description"].(string); ok {
		description = d
	}

	_, err = database.DB.Exec(
		"INSERT INTO subcategories (category_id, name, description) VALUES (?, ?, ?)",
		categoryID, name, description,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func HandleUpdateSubcategory(w http.ResponseWriter, r *http.Request) {
	var subcategory map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&subcategory); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id := subcategory["id"].(string)
	name := subcategory["name"].(string)
	description := ""
	if d, ok := subcategory["description"].(string); ok {
		description = d
	}

	_, err := database.DB.Exec(
		"UPDATE subcategories SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		name, description, id,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func HandleDeleteSubcategory(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		http.Error(w, "ID required", http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "invalid subcategory ID", http.StatusBadRequest)
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Delete attachments
	_, err = tx.Exec("DELETE FROM attachments WHERE document_id IN (SELECT id FROM documents WHERE subcategory_id = ?)", id)
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Delete documents
	_, err = tx.Exec("DELETE FROM documents WHERE subcategory_id = ?", id)
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Delete subcategory
	_, err = tx.Exec("DELETE FROM subcategories WHERE id = ?", id)
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tx.Commit()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func HandleGetCategories(w http.ResponseWriter, r *http.Request) {
	rows, err := database.DB.Query("SELECT id, name, icon, color, description FROM categories ORDER BY name")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var categories []map[string]interface{}
	for rows.Next() {
		var id int
		var name, icon, color, description string
		err := rows.Scan(&id, &name, &icon, &color, &description)
		if err != nil {
			continue
		}

		// Get subcategories for this category
		subcatRows, err := database.DB.Query("SELECT id, category_id, name, description FROM subcategories WHERE category_id = ? ORDER BY name", id)
		var subcategories []map[string]interface{}
		if err == nil {
			defer subcatRows.Close()
			for subcatRows.Next() {
				var subID, catID int
				var subName, subDesc string
				if err := subcatRows.Scan(&subID, &catID, &subName, &subDesc); err == nil {
					// Count documents in this subcategory
					var docCount int
					database.DB.QueryRow("SELECT COUNT(*) FROM documents WHERE subcategory_id = ?", subID).Scan(&docCount)

					subcategories = append(subcategories, map[string]interface{}{
						"id":            fmt.Sprintf("%d", subID),
						"category":      fmt.Sprintf("%d", catID),
						"name":          subName,
						"description":   subDesc,
						"documentCount": docCount,
					})
				}
			}
		}

		// Count total documents in all subcategories of this category
		var totalDocCount int
		database.DB.QueryRow(`
			SELECT COUNT(*) FROM documents 
			WHERE subcategory_id IN (
				SELECT id FROM subcategories WHERE category_id = ?
			)
		`, id).Scan(&totalDocCount)

		categories = append(categories, map[string]interface{}{
			"id":            fmt.Sprintf("%d", id),
			"name":          name,
			"icon":          icon,
			"color":         color,
			"description":   description,
			"subcategories": subcategories,
			"documentCount": totalDocCount,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

func HandleCreateCategory(w http.ResponseWriter, r *http.Request) {
	var category map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&category); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	name := category["name"].(string)
	icon := category["icon"].(string)
	color := category["color"].(string)
	description := category["description"].(string)

	_, err := database.DB.Exec(
		"INSERT INTO categories (name, icon, color, description) VALUES (?, ?, ?, ?)",
		name, icon, color, description,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func HandleUpdateCategory(w http.ResponseWriter, r *http.Request) {
	var category map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&category); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	idStr := category["id"].(string)
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "invalid category ID", http.StatusBadRequest)
		return
	}

	name := category["name"].(string)
	icon := category["icon"].(string)
	color := category["color"].(string)
	description := category["description"].(string)

	_, err = database.DB.Exec(
		"UPDATE categories SET name = ?, icon = ?, color = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		name, icon, color, description, id,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func HandleDeleteCategory(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		http.Error(w, "ID required", http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "invalid category ID", http.StatusBadRequest)
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Delete attachments
	_, err = tx.Exec("DELETE FROM attachments WHERE document_id IN (SELECT id FROM documents WHERE category_id = ?)", id)
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Delete documents
	_, err = tx.Exec("DELETE FROM documents WHERE category_id = ?", id)
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Delete category
	_, err = tx.Exec("DELETE FROM categories WHERE id = ?", id)
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tx.Commit()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func HandleGetDocuments(w http.ResponseWriter, r *http.Request) {
	categoryID := r.URL.Query().Get("category")
	subcategoryID := r.URL.Query().Get("subcategory")
	
	var rows *sql.Rows
	var err error
	
	if subcategoryID != "" {
		subID, err := strconv.Atoi(subcategoryID)
		if err != nil {
			http.Error(w, "invalid subcategory ID", http.StatusBadRequest)
			return
		}
		// Get documents by subcategory
		rows, err = database.DB.Query(
			"SELECT id, category_id, subcategory_id, title, content, tags, attachment_count, has_scripts, created_at, updated_at FROM documents WHERE subcategory_id = ? ORDER BY updated_at DESC",
			subID,
		)
	} else if categoryID != "" {
		catID, err := strconv.Atoi(categoryID)
		if err != nil {
			http.Error(w, "invalid category ID", http.StatusBadRequest)
			return
		}
		// Get documents by category (no subcategory filter)
		rows, err = database.DB.Query(
			"SELECT id, category_id, subcategory_id, title, content, tags, attachment_count, has_scripts, created_at, updated_at FROM documents WHERE category_id = ? AND subcategory_id IS NULL ORDER BY updated_at DESC",
			catID,
		)
	} else {
		http.Error(w, "category or subcategory required", http.StatusBadRequest)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var documents []map[string]interface{}
	for rows.Next() {
		var id, attachmentCount, hasScripts int
		var categoryID, subcategoryID sql.NullInt64
		var title, content, tags sql.NullString
		var createdAt, updatedAt string

		err := rows.Scan(&id, &categoryID, &subcategoryID, &title, &content, &tags, &attachmentCount, &hasScripts, &createdAt, &updatedAt)
		if err != nil {
			continue
		}

		var tagsArray []string
		if tags.Valid && tags.String != "" {
			json.Unmarshal([]byte(tags.String), &tagsArray)
		}

		var catIDStr, subIDStr string
		if categoryID.Valid {
			catIDStr = fmt.Sprintf("%d", categoryID.Int64)
		}
		if subcategoryID.Valid {
			subIDStr = fmt.Sprintf("%d", subcategoryID.Int64)
		}

		doc := map[string]interface{}{
			"id":              id,
			"category":       catIDStr,
			"subcategory":    subIDStr,
			"title":           title.String,
			"content":         content.String,
			"tags":            tagsArray,
			"attachmentCount": attachmentCount,
			"hasScripts":      hasScripts == 1,
			"createdAt":       createdAt,
			"updatedAt":       updatedAt,
		}
		documents = append(documents, doc)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(documents)
}

func HandleCreateDocument(w http.ResponseWriter, r *http.Request) {
	var doc map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&doc); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	categoryIDStr := doc["category"].(string)
	title := doc["title"].(string)
	content := doc["content"].(string)

	tagsJSON := "[]"
	if tags, ok := doc["tags"].([]interface{}); ok && len(tags) > 0 {
		tagsBytes, _ := json.Marshal(tags)
		tagsJSON = string(tagsBytes)
	}

	hasScripts := 0
	if strings.Contains(content, "```") {
		hasScripts = 1
	}

	var categoryID, subcategoryID sql.NullInt64
	if categoryIDStr != "" {
		catID, err := strconv.Atoi(categoryIDStr)
		if err == nil {
			categoryID = sql.NullInt64{Int64: int64(catID), Valid: true}
		}
	}

	subcategoryIDStr := ""
	if s, ok := doc["subcategory"].(string); ok && s != "" {
		subcategoryIDStr = s
	}
	if subcategoryIDStr != "" {
		subID, err := strconv.Atoi(subcategoryIDStr)
		if err == nil {
			subcategoryID = sql.NullInt64{Int64: int64(subID), Valid: true}
		}
	}

	result, err := database.DB.Exec(
		"INSERT INTO documents (category_id, subcategory_id, title, content, tags, has_scripts) VALUES (?, ?, ?, ?, ?, ?)",
		categoryID, subcategoryID, title, content, tagsJSON, hasScripts,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"id": id, "success": true})
}

func HandleUpdateDocument(w http.ResponseWriter, r *http.Request) {
	var doc map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&doc); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id := int(doc["id"].(float64))
	subcategoryIDStr := ""
	if s, ok := doc["subcategory"].(string); ok && s != "" {
		subcategoryIDStr = s
	}
	title := doc["title"].(string)
	content := doc["content"].(string)

	tagsJSON := "[]"
	if tags, ok := doc["tags"].([]interface{}); ok && len(tags) > 0 {
		tagsBytes, _ := json.Marshal(tags)
		tagsJSON = string(tagsBytes)
	}

	hasScripts := 0
	if strings.Contains(content, "```") {
		hasScripts = 1
	}

	var subcategoryID sql.NullInt64
	if subcategoryIDStr != "" {
		subID, err := strconv.Atoi(subcategoryIDStr)
		if err == nil {
			subcategoryID = sql.NullInt64{Int64: int64(subID), Valid: true}
		}
	}

	_, err := database.DB.Exec(
		"UPDATE documents SET subcategory_id = ?, title = ?, content = ?, tags = ?, has_scripts = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		subcategoryID, title, content, tagsJSON, hasScripts, id,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func HandleDeleteDocument(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "ID required", http.StatusBadRequest)
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Delete attachments
	_, err = tx.Exec("DELETE FROM attachments WHERE document_id = ?", id)
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Delete document
	_, err = tx.Exec("DELETE FROM documents WHERE id = ?", id)
	if err != nil {
		tx.Rollback()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tx.Commit()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func HandleGetAttachments(w http.ResponseWriter, r *http.Request) {
	docID := r.URL.Query().Get("document_id")
	if docID == "" {
		http.Error(w, "document_id required", http.StatusBadRequest)
		return
	}

	rows, err := database.DB.Query(
		"SELECT id, name, type, size, uploaded_at FROM attachments WHERE document_id = ? ORDER BY uploaded_at DESC",
		docID,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var attachments []map[string]interface{}
	for rows.Next() {
		var id, size int
		var name, fileType, uploadedAt string
		err := rows.Scan(&id, &name, &fileType, &size, &uploadedAt)
		if err != nil {
			continue
		}
		attachments = append(attachments, map[string]interface{}{
			"id":         id,
			"name":       name,
			"type":       fileType,
			"size":       size,
			"uploadedAt": uploadedAt,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(attachments)
}

func HandleUploadAttachment(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	docID := r.FormValue("document_id")
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Detect MIME type based on file extension if Content-Type is generic
	contentType := header.Header.Get("Content-Type")
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = utils.DetectMimeType(header.Filename)
	}

	result, err := database.DB.Exec(
		"INSERT INTO attachments (document_id, name, type, size, data) VALUES (?, ?, ?, ?, ?)",
		docID, header.Filename, contentType, len(data), data,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Get the inserted attachment ID
	attachmentID, err := result.LastInsertId()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Update document attachment count
	database.DB.Exec("UPDATE documents SET attachment_count = (SELECT COUNT(*) FROM attachments WHERE document_id = ?) WHERE id = ?", docID, docID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":      true,
		"id":           attachmentID,
		"attachmentId": attachmentID,
	})
}

func HandleDownloadAttachment(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "ID required", http.StatusBadRequest)
		return
	}

	var name, fileType string
	var data []byte
	err := database.DB.QueryRow("SELECT name, type, data FROM attachments WHERE id = ?", id).Scan(&name, &fileType, &data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", fileType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", name))
	w.Write(data)
}

func HandleViewAttachment(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "ID required", http.StatusBadRequest)
		return
	}

	var name, fileType string
	var data []byte
	err := database.DB.QueryRow("SELECT name, type, data FROM attachments WHERE id = ?", id).Scan(&name, &fileType, &data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// If stored type is generic, try to detect from filename
	if fileType == "" || fileType == "application/octet-stream" {
		fileType = utils.DetectMimeType(name)
	}

	// Set appropriate headers for viewing (not downloading)
	w.Header().Set("Content-Type", fileType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=%s", name))
	w.Header().Set("Cache-Control", "private, max-age=3600")
	w.Write(data)
}

func HandleDeleteAttachment(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "ID required", http.StatusBadRequest)
		return
	}

	var docID int
	err := database.DB.QueryRow("SELECT document_id FROM attachments WHERE id = ?", id).Scan(&docID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	_, err = database.DB.Exec("DELETE FROM attachments WHERE id = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Update document attachment count
	database.DB.Exec("UPDATE documents SET attachment_count = attachment_count - 1 WHERE id = ?", docID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

