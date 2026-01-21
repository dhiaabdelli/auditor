package main

import (
	// Standard library
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	// Third-party packages
	_ "modernc.org/sqlite"

	// Internal packages
	"embed"
	"io/fs"
	"network-script-generator/internal/database"
	"network-script-generator/internal/handlers"
	"network-script-generator/internal/router"
	"network-script-generator/internal/security"
)

//go:embed static
var staticContent embed.FS

// staticFileSystem returns an http.FileSystem for serving static files
func staticFileSystem() http.FileSystem {
	sub, err := fs.Sub(staticContent, "static")
	if err != nil {
		log.Fatal("Failed to create sub filesystem:", err)
	}
	return http.FS(sub)
}

func main() {
	/*cfg, err := license.GetLicenseConfig()
	if err != nil {
		log.Fatal("License config error:", err)
	}
	if err := license.ValidateLicenseOnStartup(cfg); err != nil {
		log.Fatal("License validation failed:", err)
	}
	*/
	// Initialize database
	if err := database.InitDatabase(); err != nil {
		log.Fatal("Database initialization failed:", err)
	}

	// Initialize automation schedulers after database is ready
	handlers.InitSchedulers()

	// Start system monitoring
	handlers.StartSystemMonitoring()

	defer func() {
		// Stop cron schedulers first to prevent them from accessing the database
		handlers.StopSchedulers()

		// Shutdown workflow execution manager (wait for all workflows to complete)
		manager := handlers.GetExecutionManager()
		if err := manager.Shutdown(30 * time.Second); err != nil {
			log.Printf("Error shutting down workflow execution manager: %v", err)
		}

		// Close database connection
		if database.DB != nil {
			database.DB.Close()
		}
	}()

	// Initialize API key in database if needed
	if _, _, err := security.InitializeAPIKeyIfNeeded(); err != nil {
		log.Printf("Warning: Failed to initialize API key: %v", err)
	}

	// Setup all routes, serving static assets from the embedded file system
	router.SetupRoutes(staticFileSystem())

	// Start session cleanup job (runs every hour to mark expired sessions as inactive)
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				security.MarkExpiredSessionsInactive()
			}
		}
	}()

	// Create HTTP server
	srv := &http.Server{
		Addr:    ":8080",
		Handler: nil,
	}

	// Start server in a goroutine
	go func() {
		fmt.Println("Server starting on http://localhost:8080")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
