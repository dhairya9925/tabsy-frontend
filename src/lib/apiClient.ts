export const AUTH_TOKEN_KEY = "access_token";

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  meta?: Record<string, any> | null;
}

export interface ProfileData {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  is_shadow: boolean;
  created_at: string;
  updated_at: string;
}

export interface HealthData {
  status: string;
  version?: string;
  environment?: string;
  timestamp?: string;
}

/**
 * Retrieves the current authentication access token from localStorage.
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Stores or clears the authentication access token in localStorage.
 */
export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

/**
 * Standard fetch wrapper that forwards the JWT Bearer token
 * and unwraps the agreed response envelope ({ data, error, meta }).
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  let url = `${API_BASE_URL}${cleanEndpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(options.params)) {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    let body: ApiResponse<T>;
    const contentType = res.headers?.get?.("content-type") || "";
    if (contentType.includes("application/json") || (!contentType && typeof res.json === "function")) {
      body = await res.json();
    } else if (typeof res.text === "function") {
      const text = await res.text();
      body = {
        data: null,
        error: res.ok ? null : `Server error (${res.status} ${res.statusText}): ${text.slice(0, 200)}`,
        meta: null,
      };
    } else {
      body = await res.json();
    }

    return body;
  } catch (err: any) {
    console.error(`API request failed [${options.method || "GET"} ${url}]:`, err);
    return {
      data: null,
      error: err.message || "Network connection error",
      meta: null,
    };
  }
}

/**
 * Typed client exposing standard HTTP methods with JWT Bearer forwarding.
 */
export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
  apiRequest,
  getAuthToken,
  setAuthToken,
};

export default apiClient;

/**
 * Test helper: Checks connectivity to the FastAPI /api/v1/health endpoint.
 */
export async function checkBackendHealth(): Promise<{
  connected: boolean;
  url: string;
  data?: HealthData | null;
  error?: string | null;
}> {
  console.log(`==> Checking backend health at ${API_BASE_URL}/api/v1/health...`);
  const res = await apiClient.get<HealthData>("/api/v1/health");
  if (res.data?.status === "healthy") {
    console.log("✅ Backend is connected and healthy:", res.data);
    return { connected: true, url: API_BASE_URL, data: res.data };
  }
  console.warn("⚠️ Backend health check failed:", res.error);
  return { connected: false, url: API_BASE_URL, error: res.error || "Unexpected response" };
}

/**
 * Test helper: Invokes GET /api/v1/users/me carrying the JWT Bearer token.
 */
export async function testApiMe(): Promise<ApiResponse<ProfileData>> {
  console.log("==> Calling GET /api/v1/users/me with session token...");
  const res = await apiClient.get<ProfileData>("/api/v1/users/me");
  console.log("<== Response from FastAPI /api/v1/users/me:", res);
  return res;
}

// Bind to window in development for immediate browser console testing
if (typeof window !== "undefined") {
  (window as any).apiClient = apiClient;
  (window as any).checkBackendHealth = checkBackendHealth;
  (window as any).testApiMe = testApiMe;
  (window as any).API_BASE_URL = API_BASE_URL;
}
