package frames

type FrameType string

const (
	FrameTypeRequest  FrameType = "request"
	FrameTypeResponse FrameType = "response"
	FrameTypePing     FrameType = "ping"
	FrameTypePong     FrameType = "pong"
	FrameTypeError    FrameType = "error"
)

type HeaderMap map[string][]string

type RequestFrame struct {
	Type      FrameType `json:"type"`
	RequestID string    `json:"requestId"`
	Method    string    `json:"method"`
	Path      string    `json:"path"`
	Headers   HeaderMap `json:"headers"`
	Body      []byte    `json:"body,omitempty"`
}

type ResponseFrame struct {
	Type       FrameType `json:"type"`
	RequestID  string    `json:"requestId"`
	StatusCode int       `json:"statusCode"`
	Headers    HeaderMap `json:"headers"`
	Body       []byte    `json:"body,omitempty"`
	Error      string    `json:"error,omitempty"`
}

type ControlFrame struct {
	Type  FrameType `json:"type"`
	Error string    `json:"error,omitempty"`
}
