const API_BASE_URL = (
  process.env.NODE_ENV === "production"
    ? "/api/v1"
    : process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5050/api/v1"
).replace(/\/$/, "");

export async function downloadApiFile(path, fallbackName = "download") {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { credentials: "include", cache: "no-store" });
  } catch {
    throw new ApiError("Unable to connect to the server. Please try again.");
  }
  if (!response.ok) {
    let body;
    try { body = await response.json(); } catch { body = null; }
    throw new ApiError(body?.error?.message || "The file could not be downloaded.", { status: response.status, code: body?.error?.code });
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8''|\")?([^;\"]+)/i);
  const filename = match ? decodeURIComponent(match[1].replace(/"/g, "").trim()) : fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = "NETWORK_ERROR", fields = {} } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export async function apiRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Unable to reach the server. Check the backend API URL and try again.",
    );
  }

  if (response.status === 204) return null;

  let body = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON responses use the safe status-based message below.
  }

  if (!response.ok) {
    const error = body?.error;
    const fallback = response.status >= 500
      ? "The server encountered an error. Please try again shortly."
      : "The request could not be completed. Review the information and try again.";
    throw new ApiError(error?.message || fallback, {
      status: response.status,
      code: error?.code,
      fields: error?.fields,
    });
  }

  const data = body?.data ?? body;
  if (body?.meta && data && typeof data === "object") {
    Object.defineProperty(data, "meta", { value: body.meta, configurable: true, enumerable: false });
  }
  return data;
}

export const authApi = {
  setupStatus: () => apiRequest("/setup/status"),
  setup: (payload) => apiRequest("/setup", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  login: (payload) => apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
};
