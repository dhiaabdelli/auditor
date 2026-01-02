package scripts

import (
	// Standard library
	"encoding/base64"
	"fmt"
	"strings"
	"time"
	
	// Internal packages
	"network-script-generator/internal/models"
)

// GeneratePowerShellScript generates a PowerShell script for network adapter configuration
func GeneratePowerShellScript(adapters []models.NetworkAdapter) string {
	var script strings.Builder
	script.WriteString("# Network Adapter Configuration Script\n")
	script.WriteString("# Generated on " + time.Now().Format("2006-01-02 15:04:05") + "\n\n")

	for _, adapter := range adapters {
		script.WriteString(fmt.Sprintf("# Configure %s\n", adapter.Name))
		script.WriteString(fmt.Sprintf("Set-NetAdapter -Name \"%s\" -InterfaceDescription \"*\"\n", adapter.Name))
		script.WriteString("\n")
	}

	return script.String()
}

// ObfuscatePowerShellScript obfuscates a PowerShell script by encoding to base64 and wrapping in decode/execute wrapper
func ObfuscatePowerShellScript(script string) string {
	// Base64 encode the script
	encoded := base64.StdEncoding.EncodeToString([]byte(script))
	
	// Create obfuscated wrapper that decodes and executes
	obfuscated := fmt.Sprintf(`$s='%s';$b=[System.Convert]::FromBase64String($s);$d=[System.Text.Encoding]::UTF8.GetString($b);Invoke-Expression $d`, encoded)
	
	return obfuscated
}

