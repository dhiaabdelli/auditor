package shared

import (
	"fmt"
	"net"
	"sync"

	"github.com/oschwald/geoip2-golang"
)

var (
	geoipOnce     sync.Once
	cityReader    *geoip2.Reader
	asnReader     *geoip2.Reader
	countryReader *geoip2.Reader
)

// InitGeoIP initializes the GeoIP readers from .mmdb files
func InitGeoIP(cityDBPath, asnDBPath, countryDBPath string) error {
	var err error
	geoipOnce.Do(func() {
		if cityDBPath != "" {
			cityReader, err = geoip2.Open(cityDBPath)
			if err != nil {
				err = fmt.Errorf("failed to open city database: %v", err)
				return
			}
		}
		if asnDBPath != "" {
			asnReader, err = geoip2.Open(asnDBPath)
			if err != nil {
				err = fmt.Errorf("failed to open ASN database: %v", err)
				return
			}
		}
		if countryDBPath != "" {
			countryReader, err = geoip2.Open(countryDBPath)
			if err != nil {
				err = fmt.Errorf("failed to open country database: %v", err)
				return
			}
		}
	})
	return err
}

// CloseGeoIP closes the GeoIP readers
func CloseGeoIP() {
	if cityReader != nil {
		cityReader.Close()
	}
	if asnReader != nil {
		asnReader.Close()
	}
	if countryReader != nil {
		countryReader.Close()
	}
}

// GetCountryInfo lookups country info for an IP
func GetCountryInfo(ipStr string) (string, error) {
	if countryReader == nil {
		return "", fmt.Errorf("country database not initialized")
	}
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return "", fmt.Errorf("invalid IP address")
	}
	record, err := countryReader.Country(ip)
	if err != nil {
		return "", err
	}
	return record.Country.Names["en"], nil
}

// GetCityInfo lookups city/country info for an IP
func GetCityInfo(ipStr string) (string, error) {
	if cityReader == nil {
		return "", fmt.Errorf("city database not initialized")
	}
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return "", fmt.Errorf("invalid IP address")
	}
	record, err := cityReader.City(ip)
	if err != nil {
		return "", err
	}

	loc := ""
	if record.City.Names["en"] != "" {
		loc = record.City.Names["en"]
	}
	if record.Country.Names["en"] != "" {
		if loc != "" {
			loc += ", " + record.Country.Names["en"]
		} else {
			loc = record.Country.Names["en"]
		}
	}
	return loc, nil
}

// GetASNInfo lookups ASN info for an IP
func GetASNInfo(ipStr string) (string, error) {
	if asnReader == nil {
		return "", fmt.Errorf("ASN database not initialized")
	}
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return "", fmt.Errorf("invalid IP address")
	}
	record, err := asnReader.ASN(ip)
	if err != nil {
		return "", err
	}

	if record.AutonomousSystemOrganization != "" {
		return fmt.Sprintf("AS%d (%s)", record.AutonomousSystemNumber, record.AutonomousSystemOrganization), nil
	}
	return fmt.Sprintf("AS%d", record.AutonomousSystemNumber), nil
}
