package main

import (
	"fmt"
	"os"
	"os/signal"
	"strconv"
	"syscall"

	"tunnix/agent/internal/api"
	"tunnix/agent/internal/config"
	"tunnix/agent/internal/tunnel"
)

const CLI_VERSION = "0.1.0"

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]

	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("Error loading config: %v\n", err)
		os.Exit(1)
	}

	switch command {
	case "login":
		handleLogin(cfg)
	case "http":
		handleHTTP(cfg)
	case "version":
		fmt.Printf("tunnix CLI v%s\n", CLI_VERSION)
	case "help", "-h", "--help":
		printUsage()
	default:
		fmt.Printf("Unknown command: %s\n\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("Tunnix CLI - Expose local servers to the internet securely")
	fmt.Println("\nUsage:")
	fmt.Println("  tunnix login <agent-token>      Authenticate CLI with your agent token")
	fmt.Println("  tunnix http <port> [--subdomain name]   Expose local port to the internet")
	fmt.Println("  tunnix version                  Show CLI version")
	fmt.Println("  tunnix help                     Show help instructions")
}

func handleLogin(cfg *config.Config) {
	if len(os.Args) < 3 {
		fmt.Println("Error: Agent token is required.")
		fmt.Println("Usage: tunnix login <agent-token>")
		os.Exit(1)
	}

	token := os.Args[2]
	client := api.NewAPIClient(cfg.ServerURL)

	res, err := client.AgentLogin(token)
	if err != nil {
		fmt.Printf("❌ Authentication failed: %v\n", err)
		os.Exit(1)
	}

	cfg.AgentToken = token
	cfg.UserEmail = res.Data.User.Email
	if res.Data.GatewayWsURL != "" {
		cfg.GatewayWsUrl = res.Data.GatewayWsURL
	}
	if res.Data.GatewayURL != "" {
		cfg.GatewayUrl = res.Data.GatewayURL
	}

	if err := config.Save(cfg); err != nil {
		fmt.Printf("Warning: Failed to save config file: %v\n", err)
	}

	fmt.Printf("✅ Successfully authenticated as %s (token: %s)\n", res.Data.User.Email, res.Data.TokenName)
}

func handleHTTP(cfg *config.Config) {
	if cfg.AgentToken == "" {
		fmt.Println("❌ You are not logged in. Please run `tunnix login <agent-token>` first.")
		os.Exit(1)
	}

	if len(os.Args) < 3 {
		fmt.Println("Error: Local port is required.")
		fmt.Println("Usage: tunnix http <port> [--subdomain name]")
		os.Exit(1)
	}

	portStr := os.Args[2]
	port, err := strconv.Atoi(portStr)
	if err != nil || port < 1 || port > 65535 {
		fmt.Printf("Error: Invalid port number '%s'. Must be 1-65535.\n", portStr)
		os.Exit(1)
	}

	var requestedSubdomain string
	for i := 3; i < len(os.Args); i++ {
		if (os.Args[i] == "--subdomain" || os.Args[i] == "-s") && i+1 < len(os.Args) {
			requestedSubdomain = os.Args[i+1]
			break
		}
	}

	client := api.NewAPIClient(cfg.ServerURL)
	session, err := client.IssueTunnelSession(cfg.AgentToken, requestedSubdomain, port)
	if err != nil {
		fmt.Printf("❌ Failed to create tunnel session: %v\n", err)
		os.Exit(1)
	}

	tunnelClient := tunnel.NewTunnelClient(
		session.Data.WsURL,
		session.Data.GrantToken,
		port,
		session.Data.PublicURL,
	)

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		fmt.Println("\nDisconnecting tunnel...")
		tunnelClient.Stop()
		os.Exit(0)
	}()

	if err := tunnelClient.Start(); err != nil {
		fmt.Printf("❌ Tunnel error: %v\n", err)
		os.Exit(1)
	}
}
