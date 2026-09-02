package proxy

import (
	"io"
	"log"
	"net"
	"net/http"
	"strings"
	"time"

	"tunnix/gateway/internal/config"
	"tunnix/gateway/internal/frames"
	"tunnix/gateway/internal/router"
)

type HTTPServer struct {
	cfg    *config.Config
	router *router.Router
}

func NewHTTPServer(cfg *config.Config, r *router.Router) *HTTPServer {
	return &HTTPServer{
		cfg:    cfg,
		router: r,
	}
}

func (s *HTTPServer) ListenAndServe() error {
	server := &http.Server{
		Addr:         s.cfg.PublicAddr,
		Handler:      http.HandlerFunc(s.handleHTTP),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 35 * time.Second,
	}

	log.Printf("[HTTPServer] Listening for Public Ingress on %s", s.cfg.PublicAddr)
	return server.ListenAndServe()
}

func (s *HTTPServer) extractSubdomain(hostHeader string) string {
	// Strip port if present
	host, _, err := net.SplitHostPort(hostHeader)
	if err != nil {
		host = hostHeader
	}

	host = strings.ToLower(strings.TrimSpace(host))
	base := strings.ToLower(strings.TrimSpace(s.cfg.WildcardDomain))

	if host == base || !strings.HasSuffix(host, "."+base) {
		return ""
	}

	sub := strings.TrimSuffix(host, "."+base)
	// Return first segment if nested (e.g. app.sub -> app)
	parts := strings.Split(sub, ".")
	return parts[0]
}

func (s *HTTPServer) handleHTTP(w http.ResponseWriter, r *http.Request) {
	subdomain := s.extractSubdomain(r.Host)

	// Fallback to query param or X-Forwarded-Subdomain if host doesn't match wildcard
	if subdomain == "" {
		subdomain = r.URL.Query().Get("subdomain")
	}
	if subdomain == "" {
		subdomain = r.Header.Get("X-Forwarded-Subdomain")
	}

	if subdomain == "" {
		http.Error(w, "Tunnix Gateway: Host header does not specify a valid subdomain", http.StatusBadRequest)
		return
	}

	tun, found := s.router.Lookup(subdomain)
	if !found {
		w.WriteHeader(http.StatusNotFound)
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(`
			<! crystalline>
			<html>
			<head><title>404 Tunnel Not Found - Tunnix</title></head>
			<body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
				<h1>404 Tunnel Not Found</h1>
				<p>No active tunnel registered for subdomain <strong>` + subdomain + `</strong>.</p>
				<hr style="max-width: 400px;" />
				<small>Tunnix Ingress Gateway</small>
			</body>
			</html>
		`))
		return
	}

	// Read body
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Convert HTTP headers
	headers := make(frames.HeaderMap)
	for k, v := range r.Header {
		headers[k] = v
	}

	reqFrame := &frames.RequestFrame{
		Type:      frames.FrameTypeRequest,
		RequestID: cryptoRandomID(),
		Method:    r.Method,
		Path:      r.URL.RequestURI(),
		Headers:   headers,
		Body:      bodyBytes,
	}

	// Forward over WebSocket to agent and await response
	respFrame, err := tun.ForwardRequest(reqFrame, 30*time.Second)
	if err != nil {
		log.Printf("[HTTPServer] Error forwarding request to tunnel %s: %v", subdomain, err)
		http.Error(w, "504 Gateway Timeout: Agent failed to respond in time", http.StatusGatewayTimeout)
		return
	}

	// Copy response headers
	for k, values := range respFrame.Headers {
		for _, v := range values {
			w.Header().Add(k, v)
		}
	}

	w.WriteHeader(respFrame.StatusCode)
	if len(respFrame.Body) > 0 {
		_, _ = w.Write(respFrame.Body)
	}
}

func cryptoRandomID() string {
	return time.Now().Format("20060102150405.000000000")
}
