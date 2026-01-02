package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

// RDAPDomainInfo represents RDAP domain information
type RDAPDomainInfo struct {
	ObjectClassName string           `json:"objectClassName"`
	Handle          string           `json:"handle"`
	LDHName         string           `json:"ldhName"`
	Nameservers     []RDAPNameserver `json:"nameservers,omitempty"`
	Status          []string         `json:"status,omitempty"`
	Entities        []RDAPEntity     `json:"entities,omitempty"`
	Events          []RDAPEvent      `json:"events,omitempty"`
	SecureDNS       *RDAPSecureDNS   `json:"secureDNS,omitempty"`
	Links           []RDAPLink       `json:"links,omitempty"`
	Remarks         []RDAPRemark     `json:"remarks,omitempty"`
	Port43          string           `json:"port43,omitempty"`
	PublicIDs       []RDAPPublicID   `json:"publicIds,omitempty"`
}

// RDAPNameserver represents a nameserver
type RDAPNameserver struct {
	ObjectClassName string     `json:"objectClassName"`
	LDHName         string     `json:"ldhName"`
	IPAddresses     *RDAPIPs   `json:"ipAddresses,omitempty"`
	Status          []string   `json:"status,omitempty"`
	Links           []RDAPLink `json:"links,omitempty"`
}

// RDAPIPs represents IP addresses
type RDAPIPs struct {
	V4 []string `json:"v4,omitempty"`
	V6 []string `json:"v6,omitempty"`
}

// RDAPEntity represents an entity (registrar, registrant, etc.)
type RDAPEntity struct {
	ObjectClassName string         `json:"objectClassName"`
	Handle          string         `json:"handle,omitempty"`
	VCardArray      []interface{}  `json:"vcardArray,omitempty"`
	Roles           []string       `json:"roles,omitempty"`
	PublicIDs       []RDAPPublicID `json:"publicIds,omitempty"`
	Entities        []RDAPEntity   `json:"entities,omitempty"`
	Links           []RDAPLink     `json:"links,omitempty"`
	Events          []RDAPEvent    `json:"events,omitempty"`
	Remarks         []RDAPRemark   `json:"remarks,omitempty"`
	Status          []string       `json:"status,omitempty"`
}

// RDAPEvent represents a domain event
type RDAPEvent struct {
	EventAction string    `json:"eventAction"`
	EventDate   time.Time `json:"eventDate"`
	EventActor  string    `json:"eventActor,omitempty"`
}

// RDAPSecureDNS represents DNSSEC information
type RDAPSecureDNS struct {
	DelegationSigned bool     `json:"delegationSigned"`
	DSData           []RDAPDS `json:"dsData,omitempty"`
}

// RDAPDS represents DS record data
type RDAPDS struct {
	KeyTag     int    `json:"keyTag"`
	Algorithm  int    `json:"algorithm"`
	Digest     string `json:"digest"`
	DigestType int    `json:"digestType"`
}

// RDAPLink represents a link
type RDAPLink struct {
	Value string `json:"value"`
	Rel   string `json:"rel"`
	Href  string `json:"href"`
	Type  string `json:"type,omitempty"`
}

// RDAPRemark represents a remark
type RDAPRemark struct {
	Title       []string `json:"title,omitempty"`
	Description []string `json:"description,omitempty"`
}

// RDAPPublicID represents a public identifier
type RDAPPublicID struct {
	Type       string `json:"type"`
	Identifier string `json:"identifier"`
}

// RDAPResponse represents the full RDAP response
type RDAPResponse struct {
	Domain      *RDAPDomainInfo `json:"domain,omitempty"`
	Error       string          `json:"error,omitempty"`
	ErrorCode   int             `json:"errorCode,omitempty"`
	Title       string          `json:"title,omitempty"`
	Description []string        `json:"description,omitempty"`
}

// HandleDomainLookup handles domain lookup requests
func HandleDomainLookup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	domain := r.URL.Query().Get("domain")
	if domain == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "domain parameter is required",
		})
		return
	}

	// Clean domain name
	domain = strings.TrimSpace(strings.ToLower(domain))
	domain = strings.TrimPrefix(domain, "http://")
	domain = strings.TrimPrefix(domain, "https://")
	domain = strings.TrimPrefix(domain, "www.")
	domain = strings.Split(domain, "/")[0]
	domain = strings.Split(domain, "?")[0]

	// Fetch RDAP data
	rdapData, err := fetchRDAPData(domain)
	if err != nil {
		log.Printf("Error fetching RDAP data for %s: %v", domain, err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Failed to fetch domain information",
			"details": err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rdapData)
}

// fetchRDAPData fetches RDAP data for a domain
func fetchRDAPData(domain string) (*RDAPDomainInfo, error) {
	// Extract TLD to determine RDAP server
	parts := strings.Split(domain, ".")
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid domain name")
	}
	tld := strings.ToLower(parts[len(parts)-1])

	// List of RDAP servers to try (in order of preference)
	rdapServers := []string{}

	// Try IANA bootstrap first
	bootstrapServer, bootstrapErr := getRDAPServerFromBootstrap(tld)
	if bootstrapErr == nil && bootstrapServer != "" {
		rdapServers = append(rdapServers, bootstrapServer)
	}

	// Add fallback servers based on TLD (avoid duplicates)
	fallbackServer := getRDAPServerFallback(tld)
	if fallbackServer != "" {
		alreadyAdded := false
		for _, s := range rdapServers {
			if s == fallbackServer {
				alreadyAdded = true
				break
			}
		}
		if !alreadyAdded {
			rdapServers = append(rdapServers, fallbackServer)
		}
	}

	// Try each server until one works
	var lastErr error
	var triedServers []string

	for _, rdapServer := range rdapServers {
		if rdapServer == "" {
			continue
		}

		// Build RDAP URL - try different formats
		urls := []string{
			fmt.Sprintf("%s/domain/%s", strings.TrimSuffix(rdapServer, "/"), domain),
			fmt.Sprintf("%s/v1/domain/%s", strings.TrimSuffix(rdapServer, "/"), domain),
			fmt.Sprintf("%s/rdap/domain/%s", strings.TrimSuffix(rdapServer, "/"), domain),
		}

		for _, rdapURL := range urls {
			triedServers = append(triedServers, rdapURL)
			domainInfo, err := tryRDAPRequest(rdapURL)
			if err == nil && domainInfo != nil {
				return domainInfo, nil
			}
			if err != nil {
				lastErr = err
			}
		}
	}

	// If no error was captured, create a meaningful error
	if lastErr == nil {
		if len(triedServers) == 0 {
			lastErr = fmt.Errorf("no RDAP servers available for TLD %s. This TLD may not support RDAP", tld)
		} else {
			lastErr = fmt.Errorf("all %d RDAP server attempts failed (404, DNS lookup failure, or connection errors)", len(triedServers))
		}
	}

	// Provide helpful error message
	if len(triedServers) == 0 {
		return nil, fmt.Errorf("RDAP is not available for TLD %s. This TLD may not have a public RDAP server. Consider using WHOIS instead", tld)
	}

	return nil, fmt.Errorf("failed to fetch RDAP data from all servers (tried %d URLs): %w", len(triedServers), lastErr)
}

// tryRDAPRequest attempts to fetch RDAP data from a specific URL
func tryRDAPRequest(rdapURL string) (*RDAPDomainInfo, error) {

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// Make request
	req, err := http.NewRequest("GET", rdapURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Accept", "application/rdap+json, application/json")
	req.Header.Set("User-Agent", "Domain-Lookup/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch RDAP data: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		// Return error with status code for caller to handle
		bodyStr := string(body)
		if len(bodyStr) > 200 {
			bodyStr = bodyStr[:200] + "..."
		}
		return nil, fmt.Errorf("RDAP server returned status %d: %s", resp.StatusCode, bodyStr)
	}

	// Parse response
	var domainInfo RDAPDomainInfo
	if err := json.NewDecoder(resp.Body).Decode(&domainInfo); err != nil {
		return nil, fmt.Errorf("failed to parse RDAP response: %w", err)
	}

	// Validate that we got domain data
	// Some RDAP servers may not include objectClassName, so check LDHName instead
	if domainInfo.LDHName == "" {
		return nil, fmt.Errorf("invalid RDAP response: missing domain name (ldhName)")
	}

	return &domainInfo, nil
}

// getRDAPServerFromBootstrap queries IANA bootstrap service to find RDAP server for a TLD
// Uses the same approach as domain lookup: fetches dns.json which contains all TLDs
func getRDAPServerFromBootstrap(tld string) (string, error) {
	// Use the main DNS bootstrap file
	bootstrapURL := "https://data.iana.org/rdap/dns.json"

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Get(bootstrapURL)
	if err != nil {
		return "", fmt.Errorf("failed to fetch IANA bootstrap: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("IANA bootstrap returned status %d", resp.StatusCode)
	}

	var bootstrap struct {
		Services [][]interface{} `json:"services"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&bootstrap); err != nil {
		return "", fmt.Errorf("failed to parse IANA bootstrap: %w", err)
	}

	// Extract RDAP server URL from bootstrap response
	for _, service := range bootstrap.Services {
		if len(service) >= 2 {
			if tlds, ok := service[0].([]interface{}); ok {
				for _, t := range tlds {
					if tStr, ok := t.(string); ok && strings.EqualFold(tStr, tld) {
						if urls, ok := service[1].([]interface{}); ok && len(urls) > 0 {
							if urlStr, ok := urls[0].(string); ok {
								return strings.TrimSuffix(urlStr, "/"), nil
							}
						}
					}
				}
			}
		}
	}

	return "", fmt.Errorf("RDAP server not found in IANA bootstrap for TLD %s", tld)
}

// getRDAPServerFallback returns fallback RDAP server for common TLDs
func getRDAPServerFallback(tld string) string {
	// Common RDAP servers - expanded list
	rdapServers := map[string]string{
		"com":  "https://rdap.verisign.com",
		"net":  "https://rdap.verisign.com",
		"org":  "https://rdap.publicinterestregistry.org",
		"info": "https://rdap.afilias.net",
		"biz":  "https://rdap.afilias.net",
		"io":   "https://rdap.nic.io",
		"co":   "https://rdap.nic.co",
		"uk":   "https://rdap.nominet.uk",
		"de":   "https://rdap.denic.de",
		"fr":   "https://rdap.afnic.fr",
		"nl":   "https://rdap.domain-registry.nl",
		"au":   "https://rdap.auda.org.au",
		"ca":   "https://rdap.cira.ca",
		"me":   "https://rdap.identitydigital.services/rdap", // Montenegro (.me, .ac, .ag, .bz, .gi, .pr, .sc, .vc)
		"tv":   "https://rdap.nic.tv",
		"cc":   "https://rdap.nic.cc",
		"ws":   "https://rdap.nic.ws",
		"name": "https://rdap.nic.name",
		"mobi": "https://rdap.afilias.net",
		"asia": "https://rdap.nic.asia",
		"tel":  "https://rdap.nic.tel",
		"pro":  "https://rdap.nic.pro",
		"xxx":  "https://rdap.nic.xxx",
	}

	if server, ok := rdapServers[strings.ToLower(tld)]; ok {
		return server
	}

	// No fallback for unknown TLDs - will rely on bootstrap or return empty
	return ""
}
