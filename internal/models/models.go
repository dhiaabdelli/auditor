package models

import (
	// Standard library
	"bytes"
	"io"
	"sync"
	"time"

	// Third-party packages
	"github.com/gorilla/websocket"
	"golang.org/x/crypto/ssh"
)

// Network Script Generation
type NetworkAdapter struct {
	Name string `json:"name"`
}

type ScriptRequest struct {
	Adapters []NetworkAdapter `json:"adapters"`
}

type ScriptResponse struct {
	Script string `json:"script"`
}

// Hyper-V Report types
type HyperVReportRequest struct {
	ReportID   *int     `json:"reportId,omitempty"`
	TargetType string   `json:"targetType"` // "cluster" or "host"
	Cluster    string   `json:"cluster"`
	Hosts      []string `json:"hosts"`
	Obfuscate  *bool    `json:"obfuscate,omitempty"`
	Encrypt    *bool    `json:"encrypt,omitempty"`
}

type HyperVReportResponse struct {
	Script string `json:"script"`
}

type CreateHyperVReportRequest struct {
	Name        string   `json:"name"`
	TargetType  string   `json:"targetType"`
	Cluster     string   `json:"cluster"`
	ClusterName string   `json:"clusterName"` // Also accept clusterName
	Hosts       []string `json:"hosts"`
	HostNames   string   `json:"hostNames"` // Also accept hostNames as string
}

type UpdateHyperVReportRequest struct {
	Name       string   `json:"name"`
	TargetType string   `json:"targetType"`
	Cluster    string   `json:"cluster"`
	Hosts      []string `json:"hosts"`
	ReportData string   `json:"reportData"`
}

// SSH Connection
type SSHConnection struct {
	Client   *ssh.Client
	Session  *ssh.Session
	Host     string
	User     string
	Port     int
	Conn     *websocket.Conn
	Stdin    io.WriteCloser
	Stdout   io.Reader
	Stderr   io.Reader
	Output   chan string
	Error    chan error
	StopCh   chan struct{}
	history  bytes.Buffer
	histMu   sync.Mutex
}

const MaxSSHHistory = 1024 * 1024 // 1MB of scrollback

func (s *SSHConnection) AppendHistory(data string) {
	if s == nil || data == "" {
		return
	}
	s.histMu.Lock()
	defer s.histMu.Unlock()
	s.history.WriteString(data)
	if s.history.Len() > MaxSSHHistory {
		buf := s.history.Bytes()
		if len(buf) > MaxSSHHistory {
			buf = buf[len(buf)-MaxSSHHistory:]
		}
		s.history.Reset()
		s.history.Write(buf)
	}
}

func (s *SSHConnection) GetHistory() string {
	if s == nil {
		return ""
	}
	s.histMu.Lock()
	defer s.histMu.Unlock()
	return s.history.String()
}

type WSMessage struct {
	Type      string `json:"type"`
	Data      string `json:"data,omitempty"`
	Host      string `json:"host,omitempty"`
	Port      int    `json:"port,omitempty"`
	User      string `json:"user,omitempty"`
	Password  string `json:"password,omitempty"`
	SessionID string `json:"sessionID,omitempty"`
}

type SSHConnectRequest struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
}

// Report Template
type ReportTemplate struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`        // "html" or "docx"
	DataSource  string    `json:"dataSource"`  // "hyperv", "mixed"
	Description string    `json:"description"`
	Content     string    `json:"content"`
	Rules       string    `json:"rules"`       // JSON array of conditional rules
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	Author      string    `json:"author"`
}

// Network Tools structures
type PingResult struct {
	Host            string   `json:"host"`
	Success         bool     `json:"success"`
	PacketsSent     int      `json:"packets_sent"`
	PacketsReceived int      `json:"packets_received"`
	PacketLoss      float64  `json:"packet_loss"`
	MinTime         string   `json:"min_time,omitempty"`
	MaxTime         string   `json:"max_time,omitempty"`
	AvgTime         string   `json:"avg_time,omitempty"`
	Responses       []string `json:"responses,omitempty"`
	Error           string   `json:"error,omitempty"`
}

type TracerouteResult struct {
	Host   string          `json:"host"`
	Hops   []TracerouteHop `json:"hops,omitempty"`
	Output []string        `json:"output,omitempty"`
	Error  string          `json:"error,omitempty"`
}

type TracerouteHop struct {
	Hop int    `json:"hop"`
	IP  string `json:"ip"`
	RTT string `json:"rtt,omitempty"`
}

type DNSResult struct {
	Domain  string      `json:"domain"`
	Type    string      `json:"type"`
	Records []DNSRecord `json:"records"`
	Error   string      `json:"error,omitempty"`
}

type DNSRecord struct {
	Type  string `json:"type"`
	Value string `json:"value"`
	TTL   int    `json:"ttl,omitempty"`
}

type PortScanResult struct {
	Host         string     `json:"host"`
	Protocol     string     `json:"protocol"`
	PortsScanned int        `json:"ports_scanned"`
	OpenPorts    []OpenPort `json:"open_ports"`
	Error        string     `json:"error,omitempty"`
}

type OpenPort struct {
	Port     int    `json:"port"`
	Protocol string `json:"protocol"`
	Banner   string `json:"banner,omitempty"`
}

type WHOISResult struct {
	Query string `json:"query"`
	Data  string `json:"data,omitempty"`
	Error string `json:"error,omitempty"`
}

// Packet Analyzer structures
type PacketCaptureRequest struct {
	Interface string `json:"interface"`
	Filter    string `json:"filter,omitempty"` // BPF filter
	Snaplen   int    `json:"snaplen,omitempty"` // Snapshot length
	Promisc   bool   `json:"promisc,omitempty"` // Promiscuous mode
}

type PacketInfo struct {
	Number      int                    `json:"number"`
	Timestamp   string                 `json:"timestamp"`
	Source      string                 `json:"source"`
	Destination string                 `json:"destination"`
	SrcPort     int                    `json:"srcPort,omitempty"`
	DstPort     int                    `json:"dstPort,omitempty"`
	Protocol    string                 `json:"protocol"`
	Length      int                    `json:"length"`
	TTL         int                    `json:"ttl,omitempty"`
	SeqNum      uint32                 `json:"seqNum,omitempty"`
	AckNum      uint32                 `json:"ackNum,omitempty"`
	TcpSegLen   int                    `json:"tcpSegLen,omitempty"`
	Info        string                 `json:"info"`
	Layers      map[string]interface{} `json:"layers,omitempty"`
	Raw         string                 `json:"raw,omitempty"` // Hex dump
}

type NetworkInterface struct {
	Name        string   `json:"name"`
	FriendlyName string  `json:"friendlyName"`
	Description string   `json:"description"`
	Addresses   []string `json:"addresses"`
	MACAddress  string   `json:"macAddress"`
}

type CaptureSession struct {
	ID        string
	Interface string
	Filter    string
	Active    bool
	StopCh    chan struct{}
	PacketCh  chan *PacketInfo
	CreatedAt time.Time
}

