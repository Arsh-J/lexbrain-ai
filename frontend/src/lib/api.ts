import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 90000,
});

// ── Token helpers — localStorage ONLY (most reliable, no cookie issues) ──
const TOKEN_KEY = "legal_ai_token";
// Store when user last performed an action (for inactivity tracking)
const LAST_ACTIVE_KEY = "legal_ai_last_active";
// Store when the token was issued (for 10-hour absolute expiry check)
const TOKEN_ISSUED_AT_KEY = "legal_ai_token_issued_at";
// 2 hours inactivity before forced logout (in ms)
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000;
// 10 hours absolute session expiry (must match JWT exp)
const SESSION_MAX_AGE_MS = 10 * 60 * 60 * 1000;

export function saveToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_ISSUED_AT_KEY, Date.now().toString());
    touchActivity(); // record login time as first activity
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LAST_ACTIVE_KEY);
    localStorage.removeItem(TOKEN_ISSUED_AT_KEY);
  }
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

/**
 * Returns true if the JWT is older than 10 hours (absolute expiry).
 * This is a client-side guard; the server also enforces via JWT exp.
 */
export function isTokenExpiredByAge(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(TOKEN_ISSUED_AT_KEY);
  if (!raw) return false;
  return Date.now() - parseInt(raw, 10) > SESSION_MAX_AGE_MS;
}

// ── Activity tracking ──────────────────────────────────────────────────────
export function touchActivity() {
  if (typeof window !== "undefined") {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  }
}

/**
 * Returns true if the user has been inactive for more than INACTIVITY_TIMEOUT_MS.
 * Should be called on page load to decide whether to force logout.
 */
export function isSessionExpiredByInactivity(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(LAST_ACTIVE_KEY);
  if (!raw) return false; // no activity recorded yet — new session, allow
  const lastActive = parseInt(raw, 10);
  return Date.now() - lastActive > INACTIVITY_TIMEOUT_MS;
}

// ── User ID extraction (from JWT payload — no secret needed, just decode base64) ──
function getUserIdFromToken(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ? String(payload.sub) : null;
  } catch {
    return null;
  }
}

// Attach token to every request + update last-active timestamp
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    touchActivity(); // every API call = user is active
  }
  return config;
});

// Redirect on 401 for protected data calls — clear token and show session expired toast
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url: string = err.config?.url || "";
    const is401 = err.response?.status === 401;
    const isCriticalRoute =
      url.includes("/api/query/") || url.includes("/api/report/");

    if (is401 && isCriticalRoute && typeof window !== "undefined") {
      clearToken();
      clearHistoryCache(); // also wipe the per-user history cache
      // Show a toast before redirect (use a small delay so the toast renders)
      try {
        // Dynamically import toast to avoid SSR issues
        import("react-hot-toast").then(({ default: toast }) => {
          toast.error("Session expired. Please login again.", { duration: 3000 });
          setTimeout(() => { window.location.href = "/login"; }, 1200);
        }).catch(() => {
          window.location.href = "/login";
        });
      } catch {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  signup: (data: { name: string; email: string; password: string }) =>
    api.post("/api/auth/signup", data),
  login: (data: { email: string; password: string }) =>
    api.post("/api/auth/login", data),
  getMe: () => api.get("/api/auth/me"),
  logout: () => api.post("/api/auth/logout"),
};

// ── History cache helpers ──────────────────────────────────────────────────
// KEY is user-scoped (includes user_id extracted from JWT) so that switching
// accounts on the same browser NEVER leaks one user's history to another.
const HISTORY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (matches Redis TTL)

function getHistoryCacheKey(): string {
  const uid = getUserIdFromToken();
  return uid ? `history_cache_${uid}` : "history_cache_anon";
}

function getHistoryCache(): any[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getHistoryCacheKey());
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > HISTORY_CACHE_TTL_MS) {
      localStorage.removeItem(getHistoryCacheKey());
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setHistoryCache(data: any[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      getHistoryCacheKey(),
      JSON.stringify({ data, ts: Date.now() })
    );
  } catch { /* quota exceeded — ignore */ }
}

export function clearHistoryCache() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(getHistoryCacheKey());
  }
}

export const queryApi = {
  analyze: (query_text: string) => {
    clearHistoryCache();
    return api.post("/api/query/analyze", { query_text });
  },
  history: async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getHistoryCache();
      if (cached !== null) return { data: cached };
    }
    const res = await api.get("/api/query/history");
    setHistoryCache(res.data);
    return res;
  },
  getById: (id: number) => api.get(`/api/query/${id}`),
  deleteOne: (id: number) => {
    clearHistoryCache();
    return api.delete(`/api/query/${id}`);
  },
  deleteAll: () => {
    clearHistoryCache();
    return api.delete("/api/query/history");
  },
};

export const reportApi = {
  download: (queryId: number, format: "pdf" | "docx") =>
    api.get(`/api/report/download/${queryId}/${format}`, {
      responseType: "blob",
    }),
};

// ── Forgot Password API helpers ────────────────────────────────────────────
export const forgotPassword = (email: string) =>
  api.post("/api/auth/forgot-password", { email });

export const verifyOtp = (email: string, otp: string, new_password: string) =>
  api.post("/api/auth/verify-otp", { email, otp, new_password });

export default api;
