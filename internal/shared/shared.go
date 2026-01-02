package shared

import (
	// Standard library
	"net/http"
	"sync"

	// Third-party packages
	"github.com/gorilla/websocket"
	"github.com/pkg/sftp"
	
	// Internal packages
	"network-script-generator/internal/models"
)

// Upgrader is the WebSocket upgrader
var Upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

// SSHConnections stores active SSH connections
var SSHConnections = make(map[string]*models.SSHConnection)
var SSHConnMu sync.RWMutex

// SFTPClients stores active SFTP clients
var SFTPClients = make(map[string]*sftp.Client)

