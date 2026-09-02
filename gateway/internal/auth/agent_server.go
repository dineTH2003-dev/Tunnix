package auth

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"

	"tunnix/gateway/internal/callback"
	"tunnix/gateway/internal/config"
	"tunnix/gateway/internal/frames"
	"tunnix/gateway/internal/router"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type AgentServer struct {
	cfg            *config.Config
	router         *router.Router
	callbackClient *callback.Client
}

func NewAgentServer(cfg *config.Config, r *router.Router, cb *callback.Client) *AgentServer {
	return &AgentServer{
		cfg:            cfg,
		router:         r,
		callbackClient: cb,
	}
}

func (s *AgentServer) ListenAndServe() error {
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/tunnel/ws", s.handleWebSocket)

	server := &http.Server{
		Addr:    s.cfg.AgentAddr,
		Handler: mux,
	}

	log.Printf("[AgentServer] Listening for Agent WebSockets on %s", s.cfg.AgentAddr)
	return server.ListenAndServe()
}

func (s *AgentServer) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Extract Bearer grant token from Authorization header or sec-websocket-protocol
	authHeader := r.Header.Get("Authorization")
	var tokenStr string
	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
	} else if proto := r.Header.Get("Sec-WebSocket-Protocol"); proto != "" {
		tokenStr = strings.TrimSpace(proto)
	} else {
		tokenStr = r.URL.Query().Get("grant")
	}

	if tokenStr == "" {
		http.Error(w, "Unauthorized: Grant token required", http.StatusUnauthorized)
		return
	}

	// 1. Verify JWT signature & expiration
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(s.cfg.TunnelGrantSecret), nil
	})

	if err != nil || !token.Valid {
		log.Printf("[AgentServer] Invalid JWT grant: %v", err)
		http.Error(w, "Unauthorized: Invalid grant token", http.StatusUnauthorized)
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		http.Error(w, "Unauthorized: Invalid claims", http.StatusUnauthorized)
		return
	}

	jti, _ := claims["jti"].(string)
	sessionID, _ := claims["sid"].(string)
	userID, _ := claims["uid"].(string)
	subdomain, _ := claims["sdn"].(string)
	portFloat, _ := claims["prt"].(float64)
	port := int(portFloat)

	if jti == "" || sessionID == "" || subdomain == "" {
		http.Error(w, "Unauthorized: Missing grant claims", http.StatusUnauthorized)
		return
	}

	// 2. Call Control Plane Introspection to double-check status
	intro, err := s.callbackClient.IntrospectGrant(jti)
	if err != nil || !intro.Success || !intro.Data.Valid {
		log.Printf("[AgentServer] Introspection rejected grant JTI: %s (err: %v)", jti, err)
		http.Error(w, "Unauthorized: Grant revoked or expired", http.StatusUnauthorized)
		return
	}

	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[AgentServer] WebSocket upgrade failed: %v", err)
		return
	}

	tun := router.NewTunnel(sessionID, userID, subdomain, port, conn)
	if err := s.router.Register(tun); err != nil {
		log.Printf("[AgentServer] Failed to register tunnel: %v", err)
		conn.Close()
		return
	}

	// Notify server of active connection
	if err := s.callbackClient.NotifyConnected(sessionID); err != nil {
		log.Printf("[AgentServer] Failed to notify connected for session %s: %v", sessionID, err)
	}

	log.Printf("[AgentServer] Agent connected: subdomain=%s sessionID=%s", subdomain, sessionID)

	// Read loop
	s.readLoop(tun)
}

func (s *AgentServer) readLoop(t *router.Tunnel) {
	defer func() {
		s.router.Unregister(t.Subdomain, t.SessionID)
		_ = s.callbackClient.NotifyDisconnected(t.SessionID)
		log.Printf("[AgentServer] Agent disconnected: subdomain=%s sessionID=%s", t.Subdomain, t.SessionID)
	}()

	for {
		_, message, err := t.WSConn.ReadMessage()
		if err != nil {
			break;
		}

		var generic map[string]interface{}
		if err := json.Unmarshal(message, &generic); err != nil {
			continue
		}

		frameType, _ := generic["type"].(string)

		switch frames.FrameType(frameType) {
		case frames.FrameTypeResponse:
			var resp frames.ResponseFrame
			if err := json.Unmarshal(message, &resp); err == nil {
				t.DispatchResponse(&resp)
			}
		case frames.FrameTypePong:
			t.LastHeartbeat = time.Now()
			_ = s.callbackClient.SendHeartbeat(t.SessionID)
		}
	}
}
