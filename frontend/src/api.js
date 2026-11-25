const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const TOKEN_KEY = 'ews_access_token';
const REFRESH_KEY = 'ews_refresh_token';

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export const setTokens = (accessToken, refreshToken) => {
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

async function request(path, options = {}, retry = true) {
  const token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && retry && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request(path, options, false);
    }
    clearTokens();
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const err = new Error(json.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = json.error_code;
    throw err;
  }

  return json.data !== undefined ? json.data : json;
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    const newAccess = json?.data?.access_token;
    if (newAccess) {
      localStorage.setItem(TOKEN_KEY, newAccess);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const api = {
  login: async (username, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }, false);
    setTokens(data.access_token, data.refresh_token);
    return data;
  },
  me: () => request('/auth/me'),
  getMyRisk: () => request('/students/me/risk'),
  getAdvisees: () => request('/advisees'),
  getStudentRisk: (nim) => request(`/students/${encodeURIComponent(nim)}/risk`),
  getStudentMilestones: (nim) => request(`/students/${encodeURIComponent(nim)}/milestones`),
  createCounseling: (nim, payload) =>
    request(`/students/${encodeURIComponent(nim)}/counseling`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateActionPlan: (id, status) =>
    request(`/action-plans/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  getEscalations: () => request('/escalations'),
  updateEscalation: (id, payload) =>
    request(`/escalations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getKtwAnalytics: () => request('/analytics/ktw'),
  getConfig: () => request('/config'),
  updateConfig: (payload) =>
    request('/config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  triggerScan: () =>
    request('/scans', {
      method: 'POST',
    }),
  getAuditLogs: () => request('/audit-logs'),
};
