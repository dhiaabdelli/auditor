package license

import (
	// Standard library - encoding
	"encoding/json"

	// Standard library - io
	"io"
	"os"
	"path/filepath"

	// Standard library - net
	"net/http"

	// Standard library - other
	"errors"
	"fmt"
	"log"
	"strings"
	"time"
)

type LicenseConfig struct {
	LicenseKey    string `json:"licenseKey"`
	LicenseServer string `json:"licenseServer"`
	AppID         string `json:"appId"`
}

// Embedded license configuration - cannot be changed at runtime
var embeddedLicenseConfig = LicenseConfig{
	LicenseKey:    "N3CH5-R936Q-MXWW-E2988Z-4248-9LBJSC",
	LicenseServer: "https://licenses.dhiaabdelli.me",
	AppID:         "hyperv-suite",
}

// GetLicenseConfig returns the embedded license configuration
// This is static to prevent bypassing the license system
func GetLicenseConfig() (*LicenseConfig, error) {
	cfg := embeddedLicenseConfig
	cfg.LicenseKey = strings.TrimSpace(cfg.LicenseKey)
	cfg.LicenseServer = strings.TrimSpace(cfg.LicenseServer)
	cfg.AppID = strings.TrimSpace(cfg.AppID)

	if cfg.LicenseKey == "" {
		return nil, errors.New("embedded license key is empty; update embeddedLicenseConfig")
	}
	if cfg.LicenseServer == "" {
		cfg.LicenseServer = "http://localhost:8090"
	}
	if cfg.AppID == "" {
		if exe, err := os.Executable(); err == nil && exe != "" {
			cfg.AppID = filepath.Base(exe)
		} else {
			cfg.AppID = "main-app"
		}
	}
	return &cfg, nil
}

type LicenseValidationRequest struct {
	LicenseKey string `json:"licenseKey"`
	AppID      string `json:"appId"`
	MachineID  string `json:"machineId,omitempty"`
}

type LicenseValidationResponse struct {
	Valid     bool      `json:"valid"`
	Message   string    `json:"message,omitempty"`
	ExpiresAt time.Time `json:"expiresAt,omitempty"`
}

// ValidateLicenseOnStartup validates the license on application startup
func ValidateLicenseOnStartup(cfg *LicenseConfig) error {
	licenseServer := strings.TrimSuffix(cfg.LicenseServer, "/")

	// Use GET request with query parameters (matching license server API)
	// The server expects: /api/license/validate?key=...&app=...
	validateURL := fmt.Sprintf("%s/api/license/validate?key=%s&app=%s",
		licenseServer,
		strings.ReplaceAll(cfg.LicenseKey, " ", "%20"),
		strings.ReplaceAll(cfg.AppID, " ", "%20"),
	)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(validateURL)
	if err != nil {
		return fmt.Errorf("failed to contact license server: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read license response: %w", err)
	}

	// Check HTTP status code
	if resp.StatusCode != http.StatusOK {
		bodyStr := strings.TrimSpace(string(body))
		if len(bodyStr) > 200 {
			bodyStr = bodyStr[:200] + "..."
		}
		return fmt.Errorf("license server returned %s: %s", resp.Status, bodyStr)
	}

	// Trim whitespace and try to find JSON in the response
	bodyStr := strings.TrimSpace(string(body))

	// Try to find JSON object in the response (in case there's extra text)
	jsonStart := strings.Index(bodyStr, "{")
	jsonEnd := strings.LastIndex(bodyStr, "}")
	if jsonStart >= 0 && jsonEnd > jsonStart {
		bodyStr = bodyStr[jsonStart : jsonEnd+1]
	}

	// Parse response - license server uses "reason" instead of "message"
	var licenseResp struct {
		Valid     bool   `json:"valid"`
		Reason    string `json:"reason"`
		AppID     string `json:"appId"`
		ExpiresAt string `json:"expiresAt"`
	}

	if err := json.Unmarshal([]byte(bodyStr), &licenseResp); err != nil {
		// Log the actual response for debugging
		bodyPreview := bodyStr
		if len(bodyPreview) > 200 {
			bodyPreview = bodyPreview[:200] + "..."
		}
		return fmt.Errorf("failed to parse license response (status %d): %w\nResponse preview: %s", resp.StatusCode, err, bodyPreview)
	}

	if !licenseResp.Valid {
		reason := strings.TrimSpace(licenseResp.Reason)
		if reason == "" {
			reason = "license rejected by server"
		}
		return fmt.Errorf("license validation failed: %s", reason)
	}

	if licenseResp.AppID == "" {
		licenseResp.AppID = cfg.AppID
	}
	log.Printf("License validated for app %s (expires %s)", licenseResp.AppID, licenseResp.ExpiresAt)
	return nil
}

// GetMachineID returns a machine identifier
func GetMachineID() string {
	hostname, _ := os.Hostname()
	return hostname
}

