package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Config struct {
	ServerURL    string `json:"serverUrl"`
	AgentToken   string `json:"agentToken"`
	GatewayWsUrl string `json:"gatewayWsUrl"`
	GatewayUrl   string `json:"gatewayUrl"`
	UserEmail    string `json:"userEmail"`
}

func getConfigPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(homeDir, ".tunnix")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	return filepath.Join(dir, "config.json"), nil
}

const DefaultServerURL = "https://47.130.245.232.sslip.io"

func Load() (*Config, error) {
	path, err := getConfigPath()
	if err != nil {
		return nil, err
	}

	cfg := &Config{
		ServerURL: DefaultServerURL,
	}

	data, err := os.ReadFile(path)
	if err == nil {
		_ = json.Unmarshal(data, cfg)
	}

	// Environment variable overrides file config
	if envURL := os.Getenv("TUNNIX_SERVER_URL"); envURL != "" {
		cfg.ServerURL = envURL
	} else if cfg.ServerURL == "" || cfg.ServerURL == "http://localhost:4310" {
		cfg.ServerURL = DefaultServerURL
	}

	return cfg, nil
}

func Save(cfg *Config) error {
	path, err := getConfigPath()
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0600)
}
