import { supabase } from "@/integrations/supabase/client";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

/**
 * Retrieves the current Supabase session access token.
 */
export async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

/**
 * Standard fetch wrapper that forwards the Supabase JWT Bearer token
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

  let url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

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

    const body: ApiResponse<T> = await res.json();
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
 * Typed client exposing standard HTTP methods with Supabase JWT forwarding.
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
};

export default apiClient;

/**
 * Test helper for Phase 1 & 2 verification:
 * Invokes GET /api/v1/users/me carrying the Supabase JWT.
 */
export async function testApiMe(): Promise<ApiResponse<ProfileData>> {
  console.log("==> Calling GET /api/v1/users/me with Supabase session token...");
  const res = await apiClient.get<ProfileData>("/api/v1/users/me");
  console.log("<== Response from FastAPI /api/v1/users/me:", res);
  return res;
}

// Bind to window in development for immediate browser console testing
if (typeof window !== "undefined") {
  (window as any).testApiMe = testApiMe;
  (window as any).apiClient = apiClient;
}
