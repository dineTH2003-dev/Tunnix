package config

import (
	"log"
	"os"
)

type Config struct {
	PublicAddr            string
	AgentAddr             string
	TunnelGrantSecret     string
	InternalGatewaySecret string
	ServerAPIURL          string
	WildcardDomain        string
}

func getEnvOrDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func Load() *Config {
	grantSecret := os.Getenv("TUNNEL_GRANT_SECRET")
	if grantSecret == "" {
		grantSecret = "change_me_tunnel_grant_secret_min_32_chars"
	}

	gatewaySecret := os.Getenv("INTERNAL_GATEWAY_SECRET")
	if gatewaySecret == "" {
		gatewaySecret = "change_me_internal_gateway_secret_here"
	}

	cfg := &Config{
		PublicAddr:            getEnvOrDefault("PUBLIC_ADDR", ":8080"),
		AgentAddr:             getEnvOrDefault("AGENT_ADDR", ":9000"),
		TunnelGrantSecret:     grantSecret,
		InternalGatewaySecret: gatewaySecret,
		ServerAPIURL:          getEnvOrDefault("SERVER_API_URL", "http://localhost:4310"),
		WildcardDomain:        getEnvOrDefault("WILDCARD_DOMAIN", "localhost"),
	}

	log.Printf("[Config] Gateway config loaded. PublicAddr=%s AgentAddr=%s ServerAPIURL=%s", cfg.PublicAddr, cfg.AgentAddr, cfg.ServerAPIURL)
	return cfg
}
