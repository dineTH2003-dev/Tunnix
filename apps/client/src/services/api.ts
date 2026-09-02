export interface ApiEnvelope<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  requestId: string;
}

let accessTokenInMemory: string | null = localStorage.getItem("tunnix_access_token");

export function setAccessToken(token: string | null) {
  accessTokenInMemory = token;
  if (token) {
    localStorage.setItem("tunnix_access_token", token);
  } else {
    localStorage.removeItem("tunnix_access_token");
  }
}

export function getAccessToken(): string | null {
  return accessTokenInMemory;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const json: ApiEnvelope<T> = await response.json().catch(() => ({
    success: false,
    error: { code: "SERVER_ERROR", message: "Invalid JSON response from server" },
    requestId: "unknown",
  }));

  if (!response.ok || !json.success) {
    const error = json.error || {
      code: "HTTP_ERROR",
      message: `Request failed with status ${response.status}`,
    };
    throw error;
  }

  return json.data as T;
}
