package main

import (
	"fmt"
	"os"
	"os/signal"
	"strconv"
	"strings"
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
	case "config":
		handleConfig(cfg)
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
	fmt.Println("  tunnix login <agent-token> [--server <url>]       Authenticate CLI with your agent token")
	fmt.Println("  tunnix http <port> [--subdomain name] [--server]  Expose local port to the internet")
	fmt.Println("  tunnix config get                                 Show current configuration")
	fmt.Println("  tunnix config set server <url>                    Set default control plane URL")
	fmt.Println("  tunnix version                                    Show CLI version")
	fmt.Println("  tunnix help                                       Show help instructions")
}

func handleConfig(cfg *config.Config) {
	if len(os.Args) < 3 {
		fmt.Println("Usage: tunnix config <get|set> [key] [value]")
		os.Exit(1)
	}

	subCmd := os.Args[2]
	if subCmd == "get" {
		fmt.Println("Tunnix Configuration:")
		fmt.Printf("  Server URL:    %s\n", cfg.ServerURL)
		fmt.Printf("  User Email:    %s\n", cfg.UserEmail)
		fmt.Printf("  Gateway WS:    %s\n", cfg.GatewayWsUrl)
		maskedToken := "(none)"
		if len(cfg.AgentToken) > 12 {
			maskedToken = cfg.AgentToken[:10] + "..." + cfg.AgentToken[len(cfg.AgentToken)-4:]
		}
		fmt.Printf("  Agent Token:   %s\n", maskedToken)
		return
	}

	if subCmd == "set" {
		if len(os.Args) < 5 {
			fmt.Println("Usage: tunnix config set <key> <value>")
			fmt.Println("Example: tunnix config set server https://47.130.245.232.sslip.io")
			os.Exit(1)
		}
		key := os.Args[3]
		val := os.Args[4]
		if key == "server" || key == "serverUrl" {
			cfg.ServerURL = val
			if err := config.Save(cfg); err != nil {
				fmt.Printf("Error saving config: %v\n", err)
				os.Exit(1)
			}
			fmt.Printf("✅ Updated server URL to %s\n", val)
			return
		}
		fmt.Printf("Unknown config key: %s. Supported keys: server\n", key)
		os.Exit(1)
	}

	fmt.Printf("Unknown config action: %s\n", subCmd)
}

func handleLogin(cfg *config.Config) {
	var token string
	var serverURL string

	for i := 2; i < len(os.Args); i++ {
		arg := os.Args[i]
		if (arg == "--server" || arg == "-s") && i+1 < len(os.Args) {
			serverURL = os.Args[i+1]
			i++
		} else if token == "" && arg[0] != '-' {
			token = arg
		}
	}

	if token == "" {
		fmt.Println("Error: Agent token is required.")
		fmt.Println("Usage: tunnix login <agent-token> [--server <url>]")
		os.Exit(1)
	}

	if serverURL != "" {
		cfg.ServerURL = serverURL
	}

	fmt.Printf("Connecting to control plane at %s ...\n", cfg.ServerURL)
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

	var portStr string
	var requestedSubdomain string
	var serverURL string

	for i := 2; i < len(os.Args); i++ {
		arg := os.Args[i]
		if (arg == "--subdomain" || arg == "-s") && i+1 < len(os.Args) {
			requestedSubdomain = os.Args[i+1]
			i++
		} else if strings.HasPrefix(arg, "--subdomain=") {
			requestedSubdomain = strings.TrimPrefix(arg, "--subdomain=")
		} else if strings.HasPrefix(arg, "-s=") {
			requestedSubdomain = strings.TrimPrefix(arg, "-s=")
		} else if arg == "--server" && i+1 < len(os.Args) {
			serverURL = os.Args[i+1]
			i++
		} else if strings.HasPrefix(arg, "--server=") {
			serverURL = strings.TrimPrefix(arg, "--server=")
		} else if portStr == "" && !strings.HasPrefix(arg, "-") {
			portStr = arg
		} else if requestedSubdomain == "" {
			// Handles positional or flags like --my-cool-app
			cleaned := strings.TrimLeft(arg, "-")
			if cleaned != "" {
				requestedSubdomain = cleaned
			}
		}
	}

	if portStr == "" {
		fmt.Println("Error: Local port is required.")
		fmt.Println("Usage: tunnix http <port> [--subdomain name] [--server <url>]")
		os.Exit(1)
	}

	port, err := strconv.Atoi(portStr)
	if err != nil || port < 1 || port > 65535 {
		fmt.Printf("Error: Invalid port number '%s'. Must be 1-65535.\n", portStr)
		os.Exit(1)
	}

	if serverURL != "" {
		cfg.ServerURL = serverURL
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
