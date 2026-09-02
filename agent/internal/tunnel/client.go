package tunnel

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"tunnix/agent/internal/frames"
)

type TunnelClient struct {
	wsURL      string
	grantToken string
	localPort  int
	publicURL  string
	wsConn     *websocket.Conn
	connMu     sync.Mutex
	httpClient *http.Client
	stopChan   chan struct{}
}

func NewTunnelClient(wsURL, grantToken string, localPort int, publicURL string) *TunnelClient {
	return &TunnelClient{
		wsURL:      wsURL,
		grantToken: grantToken,
		localPort:  localPort,
		publicURL:  publicURL,
		httpClient: &http.Client{
			Timeout: 25 * time.Second,
		},
		stopChan: make(chan struct{}),
	}
}

func (c *TunnelClient) Start() error {
	headers := make(http.Header)
	headers.Set("Authorization", "Bearer "+c.grantToken)

	dialer := websocket.Dialer{
		HandshakeTimeout: 10 * time.Second,
	}

	conn, _, err := dialer.Dial(c.wsURL, headers)
	if err != nil {
		return fmt.Errorf("websocket dial failed: %w", err)
	}
	c.wsConn = conn

	fmt.Println("\n=======================================================")
	fmt.Printf("🚀 Tunnix Tunnel Active!\n")
	fmt.Printf("   Forwarding: %s  ===>  http://localhost:%d\n", c.publicURL, c.localPort)
	fmt.Println("=======================================================\n")

	// Start reading frames loop
	go c.readLoop()

	// Wait for stop
	<-c.stopChan
	return nil
}

func (c *TunnelClient) Stop() {
	c.connMu.Lock()
	if c.wsConn != nil {
		_ = c.wsConn.Close()
	}
	c.connMu.Unlock()
	select {
	case <-c.stopChan:
	default:
		close(c.stopChan)
	}
}

func (c *TunnelClient) readLoop() {
	defer c.Stop()

	for {
		_, message, err := c.wsConn.ReadMessage()
		if err != nil {
			log.Printf("[AgentTunnel] Connection closed: %v", err)
			break
		}

		var generic map[string]interface{}
		if err := json.Unmarshal(message, &generic); err != nil {
			continue
		}

		frameType, _ := generic["type"].(string)

		switch frames.FrameType(frameType) {
		case frames.FrameTypeRequest:
			var req frames.RequestFrame
			if err := json.Unmarshal(message, &req); err == nil {
				go c.handleRequestFrame(&req)
			}
		case frames.FrameTypePing:
			c.sendPong()
		}
	}
}

func (c *TunnelClient) handleRequestFrame(req *frames.RequestFrame) {
	localURL := fmt.Sprintf("http://127.0.0.1:%d%s", c.localPort, req.Path)
	log.Printf("[HTTP %s] %s %s", req.Method, req.Path, localURL)

	httpReq, err := http.NewRequest(req.Method, localURL, bytes.NewBuffer(req.Body))
	if err != nil {
		c.sendErrorResponse(req.RequestID, 500, "Failed to construct local HTTP request")
		return
	}

	// Copy headers
	for k, values := range req.Headers {
		for _, v := range values {
			httpReq.Header.Add(k, v)
		}
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		log.Printf("[HTTP Error] Local target down on port %d: %v", c.localPort, err)
		c.sendErrorResponse(req.RequestID, 502, fmt.Sprintf("Bad Gateway: Local target port %d unreachable", c.localPort))
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	respHeaders := make(frames.HeaderMap)
	for k, values := range resp.Header {
		respHeaders[k] = values
	}

	respFrame := &frames.ResponseFrame{
		Type:       frames.FrameTypeResponse,
		RequestID:  req.RequestID,
		StatusCode: resp.StatusCode,
		Headers:    respHeaders,
		Body:       respBody,
	}

	c.sendFrame(respFrame)
}

func (c *TunnelClient) sendErrorResponse(requestID string, status int, msg string) {
	respFrame := &frames.ResponseFrame{
		Type:       frames.FrameTypeResponse,
		RequestID:  requestID,
		StatusCode: status,
		Headers:    frames.HeaderMap{"Content-Type": []string{"application/json"}},
		Body:       []byte(fmt.Sprintf(`{"error":"%s"}`, msg)),
	}
	c.sendFrame(respFrame)
}

func (c *TunnelClient) sendPong() {
	c.sendFrame(&frames.ControlFrame{Type: frames.FrameTypePong})
}

func (c *TunnelClient) sendFrame(v interface{}) {
	c.connMu.Lock()
	defer c.connMu.Unlock()
	if c.wsConn != nil {
		_ = c.wsConn.WriteJSON(v)
	}
}
