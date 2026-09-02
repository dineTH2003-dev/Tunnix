package heartbeat

import (
	"log"
	"time"

	"tunnix/gateway/internal/callback"
	"tunnix/gateway/internal/frames"
	"tunnix/gateway/internal/router"
)

type Monitor struct {
	router         *router.Router
	callbackClient *callback.Client
	stopChan       chan struct{}
}

func NewMonitor(r *router.Router, cb *callback.Client) *Monitor {
	return &Monitor{
		router:         r,
		callbackClient: cb,
		stopChan:       make(chan struct{}),
	}
}

func (m *Monitor) Start() {
	ticker := time.NewTicker(30 * time.Second)
	go func() {
		for {
			select {
			case <-ticker.C:
				m.checkTunnels()
			case <-m.stopChan:
				ticker.Stop()
				return
			}
		}
	}()
	log.Printf("[Heartbeat] Heartbeat monitor started (30s interval)")
}

func (m *Monitor) Stop() {
	close(m.stopChan)
}

func (m *Monitor) checkTunnels() {
	now := time.Now()
	allTunnels := m.router.GetAll()

	for _, t := range allTunnels {
		// If no heartbeat for > 120s, evict tunnel
		if now.Sub(t.LastHeartbeat) > 120*time.Second {
			log.Printf("[Heartbeat] Evicting stale tunnel: subdomain=%s sessionID=%s (idle for %v)", t.Subdomain, t.SessionID, now.Sub(t.LastHeartbeat))
			m.router.Unregister(t.Subdomain, t.SessionID)
			_ = m.callbackClient.NotifyDisconnected(t.SessionID)
			continue
		}

		// Send ping frame
		pingFrame := &frames.ControlFrame{Type: frames.FrameTypePing}
		if err := t.SendFrame(pingFrame); err != nil {
			log.Printf("[Heartbeat] Failed to send ping to %s: %v", t.Subdomain, err)
		}
	}
}
