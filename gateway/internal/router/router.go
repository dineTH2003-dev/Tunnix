package router

import (
	"log"
	"sync"
)

type Router struct {
	tunnels map[string]*Tunnel
	mu      sync.RWMutex
}

func NewRouter() *Router {
	return &Router{
		tunnels: make(map[string]*Tunnel),
	}
}

func (r *Router) Register(t *Tunnel) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if existing, ok := r.tunnels[t.Subdomain]; ok {
		log.Printf("[Router] Replacing existing tunnel for subdomain: %s (old session: %s)", t.Subdomain, existing.SessionID)
		existing.Close()
	}

	r.tunnels[t.Subdomain] = t
	log.Printf("[Router] Tunnel registered: subdomain=%s sessionID=%s", t.Subdomain, t.SessionID)
	return nil
}

func (r *Router) Lookup(subdomain string) (*Tunnel, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	t, ok := r.tunnels[subdomain]
	return t, ok
}

func (r *Router) Unregister(subdomain, sessionID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if t, ok := r.tunnels[subdomain]; ok {
		if t.SessionID == sessionID {
			delete(r.tunnels, subdomain)
			t.Close()
			log.Printf("[Router] Tunnel unregistered: subdomain=%s sessionID=%s", subdomain, sessionID)
		}
	}
}

func (r *Router) GetAll() []*Tunnel {
	r.mu.RLock()
	defer r.mu.RUnlock()

	list := make([]*Tunnel, 0, len(r.tunnels))
	for _, t := range r.tunnels {
		list = append(list, t)
	}
	return list
}
