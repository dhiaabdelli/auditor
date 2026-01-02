package mfa

import (
	// Standard library - encoding
	"encoding/json"

	// Standard library - io
	"io"

	// Standard library - net
	"net/http"

	// Standard library - other
	"errors"
	"fmt"
	"strings"
	"time"
)

type MFAConfig struct {
	MFAToken  string `json:"mfaToken"`
	MFAServer string `json:"mfaServer"`
	AppID     string `json:"appId"`
}

// Embedded MFA configuration - cannot be changed at runtime
var embeddedMFAConfig = MFAConfig{
	MFAToken:  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5X2lkIjoxLCJleHAiOjE4NjEzNDkwMDgsImlhdCI6MTc2Njc0MTAwOH0.PXADhX8gs5ZdZDkQNrYkw41ZgKwnJKZuEsjXAp5J0Z8",
	MFAServer: "http://localhost:8089",
	AppID:     "hyperv-suite",
}

// GetMFAConfig returns the embedded MFA configuration
// This is static to prevent bypassing the MFA system
func GetMFAConfig() (*MFAConfig, error) {
	cfg := embeddedMFAConfig
	cfg.MFAToken = strings.TrimSpace(cfg.MFAToken)
	cfg.MFAServer = strings.TrimSpace(cfg.MFAServer)
	cfg.AppID = strings.TrimSpace(cfg.AppID)

	if cfg.MFAToken == "" {
		return nil, errors.New("embedded MFA token is empty; update embeddedMFAConfig")
	}
	if cfg.MFAServer == "" {
		cfg.MFAServer = "http://localhost:8091"
	}
	if cfg.AppID == "" {
		cfg.AppID = "hyperv-suite"
	}
	return &cfg, nil
}

type MFAValidationRequest struct {
	MFAToken string `json:"mfaToken"`
	AppID    string `json:"appId"`
	Username string `json:"username,omitempty"`
}

type MFAValidationResponse struct {
	Valid   bool   `json:"valid"`
	Message string `json:"message,omitempty"`
}

// ValidateMFAToken validates the MFA token with the MFA server
func ValidateMFAToken(cfg *MFAConfig, providedToken string, username string) error {
	if providedToken == "" {
		return errors.New("MFA token is required")
	}

	mfaServer := strings.TrimSuffix(cfg.MFAServer, "/")

	// Use GET request with Authorization header and query parameters for app and username
	// The server expects: /api/mfa/validate?app=...&username=...
	// Token is sent in Authorization: Bearer header
	validateURL := fmt.Sprintf("%s/api/mfa/validate?app=%s&username=%s",
		mfaServer,
		strings.ReplaceAll(cfg.AppID, " ", "%20"),
		strings.ReplaceAll(username, " ", "%20"),
	)

	// Create request with Authorization header
	req, err := http.NewRequest("GET", validateURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set Authorization header with Bearer token
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", providedToken))

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to contact MFA server: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read MFA response: %w", err)
	}

	// Check HTTP status code
	if resp.StatusCode != http.StatusOK {
		bodyStr := strings.TrimSpace(string(body))
		if len(bodyStr) > 200 {
			bodyStr = bodyStr[:200] + "..."
		}
		return fmt.Errorf("MFA server returned %s: %s", resp.Status, bodyStr)
	}

	// Trim whitespace and try to find JSON in the response
	bodyStr := strings.TrimSpace(string(body))

	// Try to find JSON object in the response (in case there's extra text)
	jsonStart := strings.Index(bodyStr, "{")
	jsonEnd := strings.LastIndex(bodyStr, "}")
	if jsonStart >= 0 && jsonEnd > jsonStart {
		bodyStr = bodyStr[jsonStart : jsonEnd+1]
	}

	// Parse response
	var mfaResp struct {
		Valid   bool   `json:"valid"`
		Message string `json:"message"`
		Reason  string `json:"reason"`
	}

	if err := json.Unmarshal([]byte(bodyStr), &mfaResp); err != nil {
		// Log the actual response for debugging
		bodyPreview := bodyStr
		if len(bodyPreview) > 200 {
			bodyPreview = bodyPreview[:200] + "..."
		}
		return fmt.Errorf("failed to parse MFA response (status %d): %w\nResponse preview: %s", resp.StatusCode, err, bodyPreview)
	}

	if !mfaResp.Valid {
		reason := strings.TrimSpace(mfaResp.Reason)
		if reason == "" {
			reason = strings.TrimSpace(mfaResp.Message)
		}
		if reason == "" {
			reason = "MFA token rejected by server"
		}
		return fmt.Errorf("MFA token validation failed: %s", reason)
	}

	return nil
}

// DisableMFA disables MFA on the external MFA server
func DisableMFA(cfg *MFAConfig) error {
	mfaServer := strings.TrimSuffix(cfg.MFAServer, "/")
	disableURL := fmt.Sprintf("%s/mfa/totp/disable", mfaServer)

	// Create request
	req, err := http.NewRequest("POST", disableURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set Authorization header with Bearer token (using the embedded MFA token for server-to-server auth)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", cfg.MFAToken))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to contact MFA server: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read MFA response: %w", err)
	}

	// Check HTTP status code
	if resp.StatusCode != http.StatusOK {
		bodyStr := strings.TrimSpace(string(body))
		if len(bodyStr) > 200 {
			bodyStr = bodyStr[:200] + "..."
		}
		return fmt.Errorf("MFA server returned %s: %s", resp.Status, bodyStr)
	}

	// Parse response
	var mfaResp struct {
		Disabled bool   `json:"disabled"`
		Message  string `json:"message"`
	}

	if err := json.Unmarshal(body, &mfaResp); err != nil {
		bodyPreview := string(body)
		if len(bodyPreview) > 200 {
			bodyPreview = bodyPreview[:200] + "..."
		}
		return fmt.Errorf("failed to parse MFA response: %w\nResponse preview: %s", err, bodyPreview)
	}

	if !mfaResp.Disabled {
		return fmt.Errorf("MFA server did not confirm disable: %s", mfaResp.Message)
	}

	return nil
}
