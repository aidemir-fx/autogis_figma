import axios from "axios";
import { normalizeUserProfile } from "./userAccess";

function isLocalDevelopmentHost(hostname: string) {
    return (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "0.0.0.0"
    );
}

function resolveRawApiBaseURL() {
    const explicitApiBaseURL = import.meta.env.VITE_API_URL?.trim();
    if (!explicitApiBaseURL) {
        return "/api";
    }

    // An explicit API URL is authoritative. This allows local development to
    // use the real Go backend instead of the mock API in server.ts.
    return explicitApiBaseURL;
}

const rawApiBaseURL = resolveRawApiBaseURL();

function normalizeApiBaseURL(url: string) {
    try {
        const parsed = new URL(url);
        const pathname = parsed.pathname.replace(/\/+$/, "");
        parsed.pathname = pathname.endsWith("/api")
            ? pathname || "/api"
            : `${pathname || ""}/api`;
        return parsed.toString().replace(/\/$/, "");
    } catch {
        const trimmed = url.replace(/\/+$/, "");
        return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
    }
}

export const apiBaseURL = normalizeApiBaseURL(rawApiBaseURL);

export function getRealtimeBaseURL() {
    const explicitWsUrl = import.meta.env.VITE_WS_URL;
    if (explicitWsUrl) {
        return explicitWsUrl.replace(/\/$/, "");
    }

    try {
        const resolved = new URL(apiBaseURL, window.location.origin);
        const pathname = resolved.pathname.replace(/\/api\/?$/, "");
        const normalizedPath = pathname === "/" ? "" : pathname.replace(/\/$/, "");
        return `${resolved.origin}${normalizedPath}`;
    } catch {
        return "http://localhost:3001";
    }
}

export const http = axios.create({
    baseURL: apiBaseURL,
    withCredentials: true,
});

http.interceptors.request.use((config: any) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
        config.headers = config.headers ?? {};
        config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
});

const REFRESH_TIMEOUT_MS = 10_000;
let refreshPromise: Promise<string | null> | null = null;

function clearAuthState() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error("refresh_timeout")),
            ms,
        );
        p.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (err) => {
                clearTimeout(timer);
                reject(err);
            },
        );
    });
}

function runRefresh(refreshToken: string): Promise<string | null> {
    const request = axios
        .create({ baseURL: apiBaseURL, withCredentials: true })
        .post("/auth/refresh", { refreshToken })
        .then((res: any) => {
            const accessToken = res?.data?.accessToken ?? null;
            const newRefreshToken = res?.data?.refreshToken ?? null;
            if (accessToken) {
                localStorage.setItem("accessToken", accessToken);
            }
            if (newRefreshToken) {
                localStorage.setItem("refreshToken", newRefreshToken);
            }
            if (res?.data?.user) {
                localStorage.setItem(
                    "user",
                    JSON.stringify(normalizeUserProfile(res.data.user)),
                );
            }
            return accessToken;
        });

    return withTimeout(request, REFRESH_TIMEOUT_MS);
}

http.interceptors.response.use(
    (res: any) => {
        return res;
    },
    async (error: any) => {
        const originalRequest = error.config as any;
        const requestUrl = originalRequest?.url as string | undefined;
        const accessToken = localStorage.getItem("accessToken");
        const isAuthEndpoint =
            requestUrl?.includes("/auth/login") ||
            requestUrl?.includes("/auth/register") ||
            requestUrl?.includes("/auth/refresh");

        if (error?.response?.status === 401 && !accessToken) {
            return Promise.reject(error);
        }

        if (
            error?.response?.status !== 401 ||
            originalRequest?._retry ||
            isAuthEndpoint
        ) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
            clearAuthState();
            window.location.href = "/login";
            return Promise.reject(error);
        }

        if (!refreshPromise) {
            refreshPromise = runRefresh(refreshToken).finally(() => {
                refreshPromise = null;
            });
        }

        try {
            const newToken = await refreshPromise;
            if (!newToken) {
                clearAuthState();
                window.location.href = "/login";
                return Promise.reject(error);
            }
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
            return http(originalRequest);
        } catch (e) {
            clearAuthState();
            window.location.href = "/login";
            return Promise.reject(e);
        }
    },
);
