package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"tunnix/gateway/internal/auth"
	"tunnix/gateway/internal/callback"
	"tunnix/gateway/internal/config"
	"tunnix/gateway/internal/heartbeat"
	"tunnix/gateway/internal/proxy"
	"tunnix/gateway/internal/router"
)

func main() {
	log.Println("Starting Tunnix Ingress Gateway...")

	cfg := config.Load()
	r := router.NewRouter()
	cb := callback.NewClient(cfg.ServerAPIURL, cfg.InternalGatewaySecret)

	// Start Heartbeat Monitor
	monitor := heartbeat.NewMonitor(r, cb)
	monitor.Start()

	// Start Agent WebSocket Server in goroutine
	agentServer := auth.NewAgentServer(cfg, r, cb)
	go func() {
		if err := agentServer.ListenAndServe(); err != nil {
			log.Fatalf("Agent WebSocket Server failed: %v", err)
		}
	}()

	// Start Public HTTP Ingress Server in goroutine
	httpServer := proxy.NewHTTPServer(cfg, r)
	go func() {
		if err := httpServer.ListenAndServe(); err != nil {
			log.Fatalf("Public HTTP Ingress Server failed: %v", err)
		}
	}()

	// Wait for OS shutdown signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutting down Tunnix Gateway gracefully...")
	monitor.Stop()
}
