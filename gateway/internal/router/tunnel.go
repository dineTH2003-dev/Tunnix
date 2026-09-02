package router

import (
	"fmt"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"tunnix/gateway/internal/frames"
)

type PendingRequest struct {
	ResponseChan chan *frames.ResponseFrame
}

type Tunnel struct {
	SessionID     string
	UserID        string
	Subdomain     string
	Port          int
	WSConn        *websocket.Conn
	ConnMu        sync.Mutex
	LastHeartbeat time.Time
	PendingReqs   map[string]*PendingRequest
	ReqsMu        sync.RWMutex
}

func NewTunnel(sessionID, userID, subdomain string, port int, conn *websocket.Conn) *Tunnel {
	return &Tunnel{
		SessionID:     sessionID,
		UserID:        userID,
		Subdomain:     subdomain,
		Port:          port,
		WSConn:        conn,
		LastHeartbeat: time.Now(),
		PendingReqs:   make(map[string]*PendingRequest),
	}
}

func (t *Tunnel) SendFrame(v interface{}) error {
	t.ConnMu.Lock()
	defer t.ConnMu.Unlock()
	return t.WSConn.WriteJSON(v)
}

func (t *Tunnel) ForwardRequest(req *frames.RequestFrame, timeout time.Duration) (*frames.ResponseFrame, error) {
	respChan := make(chan *frames.ResponseFrame, 1)
	pending := &PendingRequest{ResponseChan: respChan}

	t.ReqsMu.Lock()
	t.PendingReqs[req.RequestID] = pending
	t.ReqsMu.Unlock()

	defer func() {
		t.ReqsMu.Lock()
		delete(t.PendingReqs, req.RequestID)
		t.ReqsMu.Unlock()
	}()

	if err := t.SendFrame(req); err != nil {
		return nil, fmt.Errorf("failed to write request frame to websocket: %w", err)
	}

	select {
	case resp := <-respChan:
		return resp, nil
	case <-time.After(timeout):
		return nil, fmt.Errorf("request timed out after %v", timeout)
	}
}

func (t *Tunnel) DispatchResponse(resp *frames.ResponseFrame) {
	t.ReqsMu.RLock()
	pending, ok := t.PendingReqs[resp.RequestID]
	t.ReqsMu.RUnlock()

	if ok && pending != nil {
		select {
		case pending.ResponseChan <- resp:
		default:
		}
	}
}

func (t *Tunnel) Close() {
	t.ConnMu.Lock()
	_ = t.WSConn.Close()
	t.ConnMu.Unlock()

	t.ReqsMu.Lock()
	for reqID, pending := range t.PendingReqs {
		select {
		case pending.ResponseChan <- &frames.ResponseFrame{
			Type:       frames.FrameTypeResponse,
			RequestID:  reqID,
			StatusCode: 502,
			Body:       []byte(`{"error":"Tunnel connection closed"}`),
		}:
		default:
		}
	}
	t.PendingReqs = make(map[string]*PendingRequest)
	t.ReqsMu.Unlock()
}
