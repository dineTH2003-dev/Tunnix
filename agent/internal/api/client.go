package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type APIClient struct {
	serverURL  string
	httpClient *http.Client
}

func NewAPIClient(serverURL string) *APIClient {
	return &APIClient{
		serverURL: serverURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type AgentLoginResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Valid bool `json:"valid"`
		User  struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"user"`
		TokenName    string `json:"tokenName"`
		GatewayURL   string `json:"gatewayUrl"`
		GatewayWsURL string `json:"gatewayWsUrl"`
	} `json:"data"`
	Error *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (c *APIClient) AgentLogin(token string) (*AgentLoginResponse, error) {
	url := fmt.Sprintf("%s/v1/auth/agent-login", c.serverURL)
	payload, _ := json.Marshal(map[string]string{"token": token})

	resp, err := c.httpClient.Post(url, "application/json", bytes.NewBuffer(payload))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var res AgentLoginResponse
	if err := json.Unmarshal(body, &res); err != nil {
		return nil, fmt.Errorf("invalid server response: %s", string(body))
	}

	if !res.Success || res.Error != nil {
		errMsg := "agent login failed"
		if res.Error != nil {
			errMsg = res.Error.Message
		}
		return nil, fmt.Errorf(errMsg)
	}

	return &res, nil
}

type TunnelSessionResponse struct {
	Success bool `json:"success"`
	Data    struct {
		SessionID        string `json:"sessionId"`
		Subdomain        string `json:"subdomain"`
		PublicURL        string `json:"publicUrl"`
		WsURL            string `json:"wsUrl"`
		GrantToken       string `json:"grantToken"`
		ExpiresInSeconds int    `json:"expiresInSeconds"`
	} `json:"data"`
	Error *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (c *APIClient) IssueTunnelSession(agentToken, requestedSubdomain string, localPort int) (*TunnelSessionResponse, error) {
	url := fmt.Sprintf("%s/v1/tunnel/sessions", c.serverURL)
	reqBody := map[string]interface{}{
		"agentToken": agentToken,
		"localPort":  localPort,
	}
	if requestedSubdomain != "" {
		reqBody["requestedSubdomain"] = requestedSubdomain
	}

	payload, _ := json.Marshal(reqBody)
	resp, err := c.httpClient.Post(url, "application/json", bytes.NewBuffer(payload))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var res TunnelSessionResponse
	if err := json.Unmarshal(body, &res); err != nil {
		return nil, fmt.Errorf("invalid server response: %s", string(body))
	}

	if !res.Success || res.Error != nil {
		errMsg := "tunnel session creation failed"
		if res.Error != nil {
			errMsg = res.Error.Message
		}
		return nil, fmt.Errorf(errMsg)
	}

	return &res, nil
}
