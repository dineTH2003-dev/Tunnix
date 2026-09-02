package callback

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Client struct {
	serverURL     string
	gatewaySecret string
	httpClient    *http.Client
}

func NewClient(serverURL, gatewaySecret string) *Client {
	return &Client{
		serverURL:     serverURL,
		gatewaySecret: gatewaySecret,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

type IntrospectResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Valid     bool   `json:"valid"`
		SessionID string `json:"sessionId"`
		UserID    string `json:"userId"`
		Subdomain string `json:"subdomain"`
		Status    string `json:"status"`
	} `json:"data"`
}

func (c *Client) IntrospectGrant(jti string) (*IntrospectResponse, error) {
	url := fmt.Sprintf("%s/v1/internal/tunnel/grants/%s/introspect", c.serverURL, jti)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-gateway-secret", c.gatewaySecret)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("introspect returned status %d", resp.StatusCode)
	}

	var res IntrospectResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}
	return &res, nil
}

func (c *Client) NotifyConnected(sessionID string) error {
	url := fmt.Sprintf("%s/v1/internal/tunnel/sessions/%s/connected", c.serverURL, sessionID)
	return c.postEmpty(url)
}

func (c *Client) NotifyDisconnected(sessionID string) error {
	url := fmt.Sprintf("%s/v1/internal/tunnel/sessions/%s/disconnected", c.serverURL, sessionID)
	return c.postEmpty(url)
}

func (c *Client) SendHeartbeat(sessionID string) error {
	url := fmt.Sprintf("%s/v1/internal/tunnel/sessions/%s/heartbeat", c.serverURL, sessionID)
	return c.postEmpty(url)
}

func (c *Client) postEmpty(url string) error {
	req, err := http.NewRequest("POST", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("x-gateway-secret", c.gatewaySecret)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("callback returned status %d", resp.StatusCode)
	}
	return nil
}
