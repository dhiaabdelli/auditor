package database

import (
	// Standard library
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"fmt"
	"log"
	"strings"
	"time"

	// Third-party packages
	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

// DB is the global database connection
var DB *sql.DB

// ReportTemplate represents a report template
type ReportTemplate struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Type        string         `json:"type"`
	DataSource  string         `json:"dataSource"`
	Description string         `json:"description"`
	Content     string         `json:"content"`
	Rules       string         `json:"rules,omitempty"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	Author      sql.NullString `json:"author,omitempty"`
	Version     sql.NullString `json:"version,omitempty"`
}

// AutomationWorkflow represents an automation workflow
type AutomationWorkflow struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	CanvasOffsetX float64   `json:"canvasOffsetX"`
	CanvasOffsetY float64   `json:"canvasOffsetY"`
	Zoom          float64   `json:"zoom"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// AutomationNode represents a node in a workflow
type AutomationNode struct {
	ID         string           `json:"id"`
	WorkflowID string           `json:"workflowId"`
	Type       string           `json:"type"`
	Category   string           `json:"category"`
	X          float64          `json:"x"`
	Y          float64          `json:"y"`
	Width      float64          `json:"width"`
	Height     float64          `json:"height"`
	Data       string           `json:"data"` // JSON string
	Inputs     []AutomationPort `json:"inputs"`
	Outputs    []AutomationPort `json:"outputs"`
	CreatedAt  time.Time        `json:"createdAt"`
	UpdatedAt  time.Time        `json:"updatedAt"`
}

// AutomationPort represents a port (input/output) on a node
type AutomationPort struct {
	ID       string `json:"id"`
	NodeID   string `json:"nodeId"`
	PortID   string `json:"portId"`
	Name     string `json:"name"`
	Type     string `json:"type"` // "input" or "output"
	Position int    `json:"position"`
}

// AutomationConnection represents a connection between nodes
type AutomationConnection struct {
	ID           string    `json:"id"`
	WorkflowID   string    `json:"workflowId"`
	SourceNodeID string    `json:"sourceNodeId"`
	SourcePortID string    `json:"sourcePortId"`
	TargetNodeID string    `json:"targetNodeId"`
	TargetPortID string    `json:"targetPortId"`
	CreatedAt    time.Time `json:"createdAt"`
}

// AutomationWebhook represents a webhook trigger for a workflow
type AutomationWebhook struct {
	ID           string    `json:"id"`
	WorkflowID   string    `json:"workflowId"`
	Name         string    `json:"name"`
	Path         string    `json:"path"`
	Method       string    `json:"method"`
	Active       bool      `json:"active"`
	ResponseMode string    `json:"responseMode"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// AutomationScheduler represents a scheduled trigger for a workflow
type AutomationScheduler struct {
	ID             string    `json:"id"`
	WorkflowID     string    `json:"workflowId"`
	Name           string    `json:"name"`
	CronExpression string    `json:"cronExpression"`
	Active         bool      `json:"active"`
	Timezone       string    `json:"timezone"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// AutomationExecution represents a workflow execution
type AutomationExecution struct {
	ID          string     `json:"id"`
	WorkflowID  string     `json:"workflowId"`
	TriggerType string     `json:"triggerType"`
	TriggerID   string     `json:"triggerId"`
	Status      string     `json:"status"`
	StartedAt   time.Time  `json:"startedAt"`
	FinishedAt  *time.Time `json:"finishedAt"`
	Data        string     `json:"data"`
}

// InitDatabase initializes the database connection and creates tables
func InitDatabase() error {
	// Ensure database security (file permissions)
	if err := EnsureDatabaseSecurity(); err != nil {
		log.Printf("Warning: Failed to ensure database security: %v", err)
	}

	var err error
	// Open database with connection string that includes PRAGMA settings
	dbPath := GetDatabasePath()
	DB, err = sql.Open("sqlite", dbPath+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=synchronous(NORMAL)&_pragma=foreign_keys(ON)")
	if err != nil {
		return err
	}

	// Set connection pool settings
	DB.SetMaxOpenConns(25) // SQLite recommends 1, but we allow more for concurrent reads
	DB.SetMaxIdleConns(5)
	DB.SetConnMaxLifetime(5 * time.Minute)

	// Configure SQLite PRAGMA settings for better concurrency
	// WAL mode allows multiple readers and one writer simultaneously
	_, err = DB.Exec("PRAGMA journal_mode=WAL")
	if err != nil {
		log.Printf("Warning: Failed to set WAL mode: %v", err)
	}

	// Set busy timeout to 5 seconds (5000ms) - SQLite will retry for this duration
	_, err = DB.Exec("PRAGMA busy_timeout=5000")
	if err != nil {
		log.Printf("Warning: Failed to set busy timeout: %v", err)
	}

	// Set synchronous mode to NORMAL for better performance (WAL mode is safe with this)
	_, err = DB.Exec("PRAGMA synchronous=NORMAL")
	if err != nil {
		log.Printf("Warning: Failed to set synchronous mode: %v", err)
	}

	// Enable foreign keys
	_, err = DB.Exec("PRAGMA foreign_keys=ON")
	if err != nil {
		log.Printf("Warning: Failed to enable foreign keys: %v", err)
	}

	if err := DB.Ping(); err != nil {
		return err
	}

	// Create tables
	if err := createTables(); err != nil {
		return err
	}

	// Migrate existing tables to add missing columns
	if err := migrateTables(); err != nil {
		log.Printf("Warning: Failed to migrate tables: %v", err)
	}

	// Initialize default data
	if err := initDefaultData(); err != nil {
		log.Printf("Warning: Failed to initialize default data: %v", err)
	}

	return nil
}

func createTables() error {
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS categories (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		icon TEXT,
		color TEXT,
		description TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS subcategories (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		category_id INTEGER NOT NULL,
		name TEXT NOT NULL,
		description TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
		UNIQUE(category_id, name)
	);

	CREATE TABLE IF NOT EXISTS documents (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		category_id INTEGER,
		subcategory_id INTEGER,
		title TEXT NOT NULL,
		content TEXT,
		tags TEXT,
		attachment_count INTEGER DEFAULT 0,
		has_scripts INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
		FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS attachments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		document_id INTEGER NOT NULL,
		name TEXT NOT NULL,
		type TEXT,
		size INTEGER,
		data BLOB,
		uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS todos (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		tab_id INTEGER,
		title TEXT NOT NULL,
		description TEXT,
		status TEXT DEFAULT 'pending',
		priority TEXT DEFAULT 'medium',
		due_date DATETIME,
		position INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (tab_id) REFERENCES todo_tabs(id) ON DELETE SET NULL
	);

	CREATE TABLE IF NOT EXISTS todo_tabs (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		icon TEXT NOT NULL,
		position INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS todo_subtasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		todo_id INTEGER NOT NULL,
		title TEXT NOT NULL,
		completed BOOLEAN DEFAULT 0,
		position INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS hyperv_reports (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		target_type TEXT NOT NULL,
		cluster_name TEXT,
		host_names TEXT,
		report_data TEXT,
		private_key TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS ssh_connections (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		host TEXT NOT NULL,
		port INTEGER DEFAULT 22,
		username TEXT NOT NULL,
		password_encrypted TEXT,
		encrypted_data TEXT,
		salt TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS sftp_connections (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		host TEXT NOT NULL,
		port INTEGER DEFAULT 22,
		username TEXT NOT NULL,
		password TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS infrastructure_diagrams (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		data TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS report_templates (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		type TEXT NOT NULL,
		data_source TEXT NOT NULL,
		description TEXT,
		content TEXT NOT NULL,
		rules TEXT,
		created_at DATETIME NOT NULL,
		updated_at DATETIME NOT NULL,
		author TEXT
	);

	CREATE TABLE IF NOT EXISTS api_keys (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		encrypted_key TEXT NOT NULL,
		salt TEXT NOT NULL,
		shown_once BOOLEAN DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		salt TEXT NOT NULL,
		role TEXT DEFAULT 'Admin',
		status TEXT DEFAULT 'Enabled',
		quota TEXT DEFAULT 'Unlimited',
		usage TEXT DEFAULT '0 B',
		is_locked INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS automation_workflows (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		canvas_offset_x REAL DEFAULT 0,
		canvas_offset_y REAL DEFAULT 0,
		zoom REAL DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS automation_nodes (
		id TEXT PRIMARY KEY,
		workflow_id TEXT NOT NULL,
		type TEXT NOT NULL,
		category TEXT NOT NULL,
		x REAL NOT NULL,
		y REAL NOT NULL,
		width REAL DEFAULT 200,
		height REAL DEFAULT 100,
		data TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (workflow_id) REFERENCES automation_workflows(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS automation_node_ports (
		id TEXT PRIMARY KEY,
		node_id TEXT NOT NULL,
		port_id TEXT NOT NULL,
		name TEXT NOT NULL,
		type TEXT NOT NULL,
		position INTEGER NOT NULL,
		FOREIGN KEY (node_id) REFERENCES automation_nodes(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS automation_connections (
		id TEXT PRIMARY KEY,
		workflow_id TEXT NOT NULL,
		source_node_id TEXT NOT NULL,
		source_port_id TEXT NOT NULL,
		target_node_id TEXT NOT NULL,
		target_port_id TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (workflow_id) REFERENCES automation_workflows(id) ON DELETE CASCADE,
		FOREIGN KEY (source_node_id) REFERENCES automation_nodes(id) ON DELETE CASCADE,
		FOREIGN KEY (target_node_id) REFERENCES automation_nodes(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS automation_webhooks (
		id TEXT PRIMARY KEY,
		workflow_id TEXT NOT NULL,
		name TEXT NOT NULL,
		path TEXT NOT NULL UNIQUE,
		method TEXT NOT NULL DEFAULT 'POST',
		active BOOLEAN DEFAULT 1,
		response_mode TEXT DEFAULT 'responseNode',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (workflow_id) REFERENCES automation_workflows(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS automation_schedulers (
		id TEXT PRIMARY KEY,
		workflow_id TEXT NOT NULL,
		name TEXT NOT NULL,
		cron_expression TEXT NOT NULL,
		active BOOLEAN DEFAULT 1,
		timezone TEXT DEFAULT 'UTC',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (workflow_id) REFERENCES automation_workflows(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS speedtest_results (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		download_speed REAL NOT NULL,
		upload_speed REAL NOT NULL,
		ping REAL NOT NULL,
		jitter REAL NOT NULL,
		server_name TEXT,
		server_location TEXT,
		server_id INTEGER,
		isp TEXT,
		ip TEXT,
		packet_loss REAL DEFAULT 0,
		download_bytes INTEGER DEFAULT 0,
		upload_bytes INTEGER DEFAULT 0,
		status TEXT DEFAULT 'completed',
		scheduled INTEGER DEFAULT 0,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS api_audit_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		event_type TEXT NOT NULL DEFAULT 'API_CALL',
		method TEXT,
		path TEXT,
		ip_address TEXT,
		user_agent TEXT,
		request_headers TEXT,
		request_body TEXT,
		response_status INTEGER,
		response_body TEXT,
		response_time_ms INTEGER,
		error_message TEXT,
		event_description TEXT,
		session_id TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS user_sessions (
		id TEXT PRIMARY KEY,
		ip_address TEXT NOT NULL,
		user_agent TEXT,
		login_at DATETIME NOT NULL,
		logout_at DATETIME,
		last_activity DATETIME NOT NULL,
		duration_seconds INTEGER,
		status TEXT NOT NULL DEFAULT 'active',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS automation_executions (
		id TEXT PRIMARY KEY,
		workflow_id TEXT NOT NULL,
		trigger_type TEXT NOT NULL,
		trigger_id TEXT,
		status TEXT DEFAULT 'running',
		started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		finished_at DATETIME,
		data TEXT,
		FOREIGN KEY (workflow_id) REFERENCES automation_workflows(id) ON DELETE CASCADE
	);
	`

	_, err := DB.Exec(createTableSQL)
	if err != nil {
		return err
	}

	return nil
}

func migrateTables() error {
	// Migrate api_audit_logs table
	migrateAPIAuditLogs()

	// Migrate user_sessions table
	migrateUserSessions()

	// Migrate speedtest_results table
	migrateSpeedtestResults()

	// Add icon and color to categories if they don't exist
	_, err := DB.Exec(`ALTER TABLE categories ADD COLUMN icon TEXT`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// Ignore "duplicate column" errors
	}
	_, err = DB.Exec(`ALTER TABLE categories ADD COLUMN color TEXT`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// Ignore "duplicate column" errors
	}

	// Update existing categories with missing or incorrect icons
	iconUpdates := map[string]string{
		"Hyper-V":           "fa-server",
		"Active Directory":  "fa-users",
		"Networking":        "fa-network-wired",
		"Storage":           "fa-database",
		"Security":          "fa-shield-alt",
		"Backup & Recovery": "fa-archive",
		"Monitoring":        "fa-chart-line",
		"Automation":        "fa-cog",
	}
	for name, icon := range iconUpdates {
		// Update if icon is NULL, empty, or doesn't start with "fa-"
		_, err = DB.Exec(`
			UPDATE categories 
			SET icon = ? 
			WHERE name = ? AND (icon IS NULL OR icon = '' OR icon NOT LIKE 'fa-%')
		`, icon, name)
		if err != nil {
			log.Printf("Warning: Failed to update icon for category %s: %v", name, err)
		}
	}

	// Add missing columns to documents table
	_, err = DB.Exec(`ALTER TABLE documents ADD COLUMN category_id INTEGER`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// Ignore "duplicate column" errors
	}
	_, err = DB.Exec(`ALTER TABLE documents ADD COLUMN tags TEXT`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// Ignore "duplicate column" errors
	}
	_, err = DB.Exec(`ALTER TABLE documents ADD COLUMN attachment_count INTEGER DEFAULT 0`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// Ignore "duplicate column" errors
	}
	_, err = DB.Exec(`ALTER TABLE documents ADD COLUMN has_scripts INTEGER DEFAULT 0`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// Ignore "duplicate column" errors
	}

	// Migrate attachments table columns
	_, err = DB.Exec(`ALTER TABLE attachments ADD COLUMN name TEXT`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// If name doesn't exist, copy from filename
		DB.Exec(`UPDATE attachments SET name = filename WHERE name IS NULL`)
	}
	_, err = DB.Exec(`ALTER TABLE attachments ADD COLUMN type TEXT`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// If type doesn't exist, copy from mime_type
		DB.Exec(`UPDATE attachments SET type = mime_type WHERE type IS NULL`)
	}
	_, err = DB.Exec(`ALTER TABLE attachments ADD COLUMN size INTEGER`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// If size doesn't exist, copy from file_size
		DB.Exec(`UPDATE attachments SET size = file_size WHERE size IS NULL`)
	}
	_, err = DB.Exec(`ALTER TABLE attachments ADD COLUMN data BLOB`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// Ignore if column already exists
	}
	_, err = DB.Exec(`ALTER TABLE attachments ADD COLUMN uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// If uploaded_at doesn't exist, copy from created_at
		DB.Exec(`UPDATE attachments SET uploaded_at = created_at WHERE uploaded_at IS NULL`)
	}

	// Add encrypted_data and salt columns to ssh_connections if they don't exist
	_, err = DB.Exec(`ALTER TABLE ssh_connections ADD COLUMN encrypted_data TEXT`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// Ignore if column already exists
	}
	_, err = DB.Exec(`ALTER TABLE ssh_connections ADD COLUMN salt TEXT`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// Ignore if column already exists
	}

	// Add MFA columns to users table if they don't exist
	_, err = DB.Exec(`ALTER TABLE users ADD COLUMN mfa_enabled INTEGER DEFAULT 0`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// Ignore if column already exists
	}
	_, err = DB.Exec(`ALTER TABLE users ADD COLUMN mfa_secret TEXT`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// Ignore if column already exists
	}
	_, err = DB.Exec(`ALTER TABLE users ADD COLUMN mfa_secret_validated INTEGER DEFAULT 0`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// Ignore if column already exists
	}
	_, err = DB.Exec(`ALTER TABLE users ADD COLUMN mfa_backup_codes TEXT`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// Ignore if column already exists
	}
	// Add management columns to users table if they don't exist
	userColumns := []struct {
		name string
		def  string
	}{
		{"role", "TEXT DEFAULT 'Admin'"},
		{"status", "TEXT DEFAULT 'Enabled'"},
		{"quota", "TEXT DEFAULT 'Unlimited'"},
		{"usage", "TEXT DEFAULT '0 B'"},
		{"email", "TEXT"},
		{"is_locked", "INTEGER DEFAULT 0"},
	}

	for _, col := range userColumns {
		_, err = DB.Exec(fmt.Sprintf("ALTER TABLE users ADD COLUMN %s %s", col.name, col.def))
		if err != nil && !strings.Contains(err.Error(), "duplicate column") {
			// Ignore if column already exists
		}
	}
	// Add icon and updated_at columns to todo_tabs if they don't exist
	_, err = DB.Exec(`ALTER TABLE todo_tabs ADD COLUMN icon TEXT`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// If icon doesn't exist, set default value
		DB.Exec(`UPDATE todo_tabs SET icon = 'fa-list' WHERE icon IS NULL`)
	}
	_, err = DB.Exec(`ALTER TABLE todo_tabs ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// If updated_at doesn't exist, copy from created_at
		DB.Exec(`UPDATE todo_tabs SET updated_at = created_at WHERE updated_at IS NULL`)
	}

	// Add tab column to todos if it doesn't exist (for backward compatibility)
	// Note: This is a computed/derived column, but we'll add it as a nullable text field
	// The actual tab value should come from joining with todo_tabs
	_, err = DB.Exec(`ALTER TABLE todos ADD COLUMN tab TEXT`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		// If tab doesn't exist, we'll populate it from tab_id via a join in queries
		// For now, just add the column
	}

	// Rename subtasks table to todo_subtasks if it exists with the old name
	// SQLite doesn't support RENAME TABLE directly, so we'll create the new table
	// and migrate data if needed
	var oldTableExists bool
	err = DB.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name='subtasks'").Scan(&oldTableExists)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	if oldTableExists {
		log.Println("Migrating data from 'subtasks' to 'todo_subtasks'...")
		// Copy data from old table to new table
		_, err = DB.Exec(`
			INSERT INTO todo_subtasks (id, todo_id, title, completed, position, created_at, updated_at)
			SELECT id, todo_id, title, completed, position, created_at, updated_at FROM subtasks
			ON CONFLICT(id) DO UPDATE SET
				todo_id = EXCLUDED.todo_id,
				title = EXCLUDED.title,
				completed = EXCLUDED.completed,
				position = EXCLUDED.position,
				created_at = EXCLUDED.created_at,
				updated_at = EXCLUDED.updated_at;
		`)
		if err != nil {
			return err
		}
		// Drop the old table
		_, err = DB.Exec(`DROP TABLE subtasks`)
		if err != nil {
			return err
		}
		log.Println("Migration of 'subtasks' to 'todo_subtasks' complete.")
	}

	return nil
}

func initDefaultData() error {
	if err := InitDefaultTodoTabs(); err != nil {
		return err
	}
	if err := InitDefaultCategories(); err != nil {
		return err
	}
	if err := InitDefaultSubcategories(); err != nil {
		return err
	}
	if err := InitDefaultUser(); err != nil {
		return err
	}
	return nil
}

// InitDefaultTodoTabs initializes default todo tabs
func InitDefaultTodoTabs() error {
	tabs := []struct {
		ID       string
		Name     string
		Icon     string
		Position int
	}{
		{"all", "All Tasks", "fa-list", 0},
		{"personal", "Personal", "fa-user", 1},
		{"work", "Work", "fa-briefcase", 2},
		{"projects", "Projects", "fa-folder", 3},
	}
	for _, tab := range tabs {
		_, err := DB.Exec(`
			INSERT OR IGNORE INTO todo_tabs (id, name, icon, position)
			VALUES (?, ?, ?, ?)
		`, tab.ID, tab.Name, tab.Icon, tab.Position)
		if err != nil {
			return err
		}
	}
	return nil
}

// InitDefaultCategories initializes default categories
func InitDefaultCategories() error {
	categories := []struct {
		name        string
		icon        string
		color       string
		description string
	}{
		{"Hyper-V", "fa-server", "#0078d4", "Hyper-V virtualization documentation"},
		{"Active Directory", "fa-users", "#28a745", "Active Directory management and configuration"},
		{"Networking", "fa-network-wired", "#ffc107", "Network configuration and troubleshooting"},
		{"Storage", "fa-database", "#ffc107", "Storage solutions and management"},
		{"Security", "fa-shield-alt", "#dc3545", "Security policies and best practices"},
		{"Backup & Recovery", "fa-archive", "#6f42c1", "Backup and disaster recovery procedures"},
		{"Monitoring", "fa-chart-line", "#20c997", "System monitoring and alerting"},
		{"Automation", "fa-cog", "#fd7e14", "Automation scripts and tools"},
	}

	for _, cat := range categories {
		_, err := DB.Exec(`
			INSERT OR IGNORE INTO categories (name, icon, color, description)
			VALUES (?, ?, ?, ?)
		`, cat.name, cat.icon, cat.color, cat.description)
		if err != nil {
			return err
		}
	}
	return nil
}

// InitDefaultSubcategories initializes default subcategories
func InitDefaultSubcategories() error {
	// Get category IDs
	var hypervID, adID, netID int
	DB.QueryRow("SELECT id FROM categories WHERE name = 'Hyper-V'").Scan(&hypervID)
	DB.QueryRow("SELECT id FROM categories WHERE name = 'Active Directory'").Scan(&adID)
	DB.QueryRow("SELECT id FROM categories WHERE name = 'Networking'").Scan(&netID)

	subcategories := []struct {
		categoryID int
		name       string
		desc       string
	}{
		{hypervID, "Clusters", "Hyper-V cluster configuration"},
		{hypervID, "Virtual Machines", "VM management and configuration"},
		{hypervID, "Storage", "Storage configuration for Hyper-V"},
		{adID, "Users & Groups", "User and group management"},
		{adID, "Group Policy", "Group Policy configuration"},
		{netID, "DNS", "DNS configuration and troubleshooting"},
		{netID, "DHCP", "DHCP server management"},
	}

	for _, sub := range subcategories {
		if sub.categoryID > 0 {
			_, err := DB.Exec(`
				INSERT OR IGNORE INTO subcategories (category_id, name, description)
				VALUES (?, ?, ?)
			`, sub.categoryID, sub.name, sub.desc)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

// EnsureReportTemplatesTable ensures the report_templates table exists
func EnsureReportTemplatesTable() error {
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS report_templates (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		type TEXT NOT NULL,
		data_source TEXT NOT NULL,
		description TEXT,
		content TEXT NOT NULL,
		rules TEXT,
		created_at DATETIME NOT NULL,
		updated_at DATETIME NOT NULL,
		author TEXT
	);`

	_, err := DB.Exec(createTableSQL)
	if err != nil {
		return err
	}

	// Add rules column if it doesn't exist (for existing databases)
	_, err = DB.Exec(`ALTER TABLE report_templates ADD COLUMN rules TEXT`)
	// Ignore error if column already exists

	// Add version column if it doesn't exist
	_, err = DB.Exec(`ALTER TABLE report_templates ADD COLUMN version TEXT`)
	// Ignore error if column already exists

	return nil
}

// EnsureInfrastructureInventoriesTable ensures the infrastructure_inventories table exists
func EnsureInfrastructureInventoriesTable() error {
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS infrastructure_inventories (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		client_name TEXT NOT NULL,
		client_contact TEXT,
		date TEXT,
		data TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	_, err := DB.Exec(createTableSQL)
	if err != nil {
		return err
	}

	return nil
}

// RetryExec retries a database Exec operation with exponential backoff on SQLITE_BUSY errors
func RetryExec(query string, args ...interface{}) (sql.Result, error) {
	// Check if database is initialized
	if DB == nil {
		return nil, fmt.Errorf("database connection is not initialized")
	}

	const maxRetries = 5
	const initialDelay = 10 * time.Millisecond

	var result sql.Result
	var err error

	for attempt := 0; attempt < maxRetries; attempt++ {
		result, err = DB.Exec(query, args...)
		if err == nil {
			return result, nil
		}

		// Check if it's a SQLITE_BUSY error
		errStr := err.Error()
		if !strings.Contains(errStr, "database is locked") &&
			!strings.Contains(errStr, "SQLITE_BUSY") &&
			!strings.Contains(errStr, "locked") {
			// Not a locking error, return immediately
			return nil, err
		}

		// Calculate exponential backoff delay
		delay := initialDelay * time.Duration(1<<uint(attempt))
		if delay > 500*time.Millisecond {
			delay = 500 * time.Millisecond
		}

		// Wait before retrying
		time.Sleep(delay)
	}

	// All retries failed
	return nil, err
}

// RetryQuery retries a database Query operation with exponential backoff on SQLITE_BUSY errors
func RetryQuery(query string, args ...interface{}) (*sql.Rows, error) {
	const maxRetries = 5
	const initialDelay = 10 * time.Millisecond

	var rows *sql.Rows
	var err error

	for attempt := 0; attempt < maxRetries; attempt++ {
		rows, err = DB.Query(query, args...)
		if err == nil {
			return rows, nil
		}

		// Check if it's a SQLITE_BUSY error
		errStr := err.Error()
		if !strings.Contains(errStr, "database is locked") &&
			!strings.Contains(errStr, "SQLITE_BUSY") &&
			!strings.Contains(errStr, "locked") {
			// Not a locking error, return immediately
			return nil, err
		}

		// Calculate exponential backoff delay
		delay := initialDelay * time.Duration(1<<uint(attempt))
		if delay > 500*time.Millisecond {
			delay = 500 * time.Millisecond
		}

		// Wait before retrying
		time.Sleep(delay)
	}

	// All retries failed
	return nil, err
}

// RetryQueryRow retries a database QueryRow operation with exponential backoff on SQLITE_BUSY errors
// Note: QueryRow doesn't return an error immediately, so we use a wrapper that checks errors during Scan
func RetryQueryRow(query string, args ...interface{}) *sql.Row {
	// For QueryRow, we rely on the busy_timeout PRAGMA setting (5 seconds)
	// and the connection pool to handle most locking issues
	// If a lock occurs, the Scan() will return an error that the caller can handle
	return DB.QueryRow(query, args...)
}

// migrateAPIAuditLogs adds new columns to existing api_audit_logs table if they don't exist
func migrateAPIAuditLogs() {
	// Check if event_type column exists
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM pragma_table_info('api_audit_logs') WHERE name='event_type'").Scan(&count)
	if err != nil || count == 0 {
		// Add event_type column (SQLite doesn't support NOT NULL with DEFAULT in ALTER TABLE, so we add it nullable first)
		_, err = DB.Exec("ALTER TABLE api_audit_logs ADD COLUMN event_type TEXT")
		if err != nil && !strings.Contains(err.Error(), "duplicate column") {
			log.Printf("Warning: Failed to add event_type column: %v", err)
		} else {
			// Update existing rows to have default value
			_, err = DB.Exec("UPDATE api_audit_logs SET event_type = 'API_CALL' WHERE event_type IS NULL")
			if err != nil {
				log.Printf("Warning: Failed to update event_type for existing rows: %v", err)
			}
		}
	}

	// Check if event_description column exists
	err = DB.QueryRow("SELECT COUNT(*) FROM pragma_table_info('api_audit_logs') WHERE name='event_description'").Scan(&count)
	if err != nil || count == 0 {
		// Add event_description column
		_, err = DB.Exec("ALTER TABLE api_audit_logs ADD COLUMN event_description TEXT")
		if err != nil && !strings.Contains(err.Error(), "duplicate column") {
			log.Printf("Warning: Failed to add event_description column: %v", err)
		}
	}

	// Check if session_id column exists
	err = DB.QueryRow("SELECT COUNT(*) FROM pragma_table_info('api_audit_logs') WHERE name='session_id'").Scan(&count)
	if err != nil || count == 0 {
		// Add session_id column
		_, err = DB.Exec("ALTER TABLE api_audit_logs ADD COLUMN session_id TEXT")
		if err != nil && !strings.Contains(err.Error(), "duplicate column") {
			log.Printf("Warning: Failed to add session_id column: %v", err)
		}
	}
}

// migrateUserSessions ensures user_sessions table exists
func migrateUserSessions() {
	// Table is created in createTables(), but we check if it exists for migration safety
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='user_sessions'").Scan(&count)
	if err != nil || count == 0 {
		// Table doesn't exist, create it
		_, err = DB.Exec(`
			CREATE TABLE IF NOT EXISTS user_sessions (
				id TEXT PRIMARY KEY,
				ip_address TEXT NOT NULL,
				user_agent TEXT,
				login_at DATETIME NOT NULL,
				logout_at DATETIME,
				last_activity DATETIME NOT NULL,
				duration_seconds INTEGER,
				status TEXT NOT NULL DEFAULT 'active',
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`)
		if err != nil {
			log.Printf("Warning: Failed to create user_sessions table: %v", err)
		}
	}
}

// migrateSpeedtestResults adds missing columns to speedtest_results table
func migrateSpeedtestResults() {
	// Check if packet_loss column exists
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM pragma_table_info('speedtest_results') WHERE name='packet_loss'").Scan(&count)
	if err != nil || count == 0 {
		log.Println("Migrating speedtest_results table: adding new columns...")

		alterStatements := []string{
			"ALTER TABLE speedtest_results ADD COLUMN packet_loss REAL DEFAULT 0",
			"ALTER TABLE speedtest_results ADD COLUMN download_bytes INTEGER DEFAULT 0",
			"ALTER TABLE speedtest_results ADD COLUMN upload_bytes INTEGER DEFAULT 0",
			"ALTER TABLE speedtest_results ADD COLUMN status TEXT DEFAULT 'completed'",
			"ALTER TABLE speedtest_results ADD COLUMN scheduled INTEGER DEFAULT 0",
		}

		for _, stmt := range alterStatements {
			if _, err := DB.Exec(stmt); err != nil {
				// Ignore "duplicate column" errors (column might already exist from previous migration attempt)
				if !strings.Contains(err.Error(), "duplicate column") {
					log.Printf("Warning: Failed to add column to speedtest_results: %v", err)
				}
			}
		}

		log.Println("Speedtest_results table migration completed")
	}
}

// InitDefaultUser creates a default admin user if no users exist in the database
func InitDefaultUser() error {
	// Check if any users exist
	var userCount int
	err := DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount)
	if err != nil {
		return fmt.Errorf("failed to check existing users: %w", err)
	}

	// If users exist, no need to create default user
	if userCount > 0 {
		log.Println("Users exist in database, skipping default user creation")
		return nil
	}

	// Create default admin user
	defaultUsername := "admin"
	defaultPassword := "admin123" // Default password - user should change this

	log.Printf("No users found in database. Creating default admin user: %s", defaultUsername)

	// Generate salt
	saltBytes := make([]byte, 16)
	if _, err := rand.Read(saltBytes); err != nil {
		return fmt.Errorf("failed to generate salt: %w", err)
	}
	salt := base64.URLEncoding.EncodeToString(saltBytes)

	// Hash password with bcrypt
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(defaultPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Insert default user
	_, err = DB.Exec(
		"INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)",
		defaultUsername,
		string(passwordHash),
		salt,
	)
	if err != nil {
		return fmt.Errorf("failed to create default user: %w", err)
	}

	log.Printf("Default admin user created successfully. Username: %s, Password: %s", defaultUsername, defaultPassword)
	log.Println("WARNING: Please change the default password after first login!")

	return nil
}
