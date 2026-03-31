const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`.replace(/([^:]\/)\/+/g, '$1');
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    const msg = err.message || String(err);
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
      throw new Error(
        'Cannot reach backend. Start it: cd backend && python app.py. Then start frontend: npm run dev.'
      );
    }
    throw err;
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let data;
  if (isJson) {
    try {
      data = await response.json();
    } catch {
      data = {};
    }
  } else {
    await response.text();
    throw new Error(
      response.ok
        ? 'Backend did not return JSON.'
        : `Backend returned ${response.status}. Start backend: cd backend && python app.py`
    );
  }

  if (!response.ok) {
    const msg = data.error || data.message || 'Request failed';
    const detail = data.detail ? ` — ${data.detail}` : '';
    throw new Error(msg + detail);
  }

  return data;
}

export const api = {
  register: (userData) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  login: (credentials) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),

  getGroups: () => request('/groups'),
  getGroup: (id) => request(`/groups/${id}`),
  createGroup: (groupData) =>
    request('/groups', { method: 'POST', body: JSON.stringify(groupData) }),
  joinGroup: (joinData) =>
    request('/groups/join', { method: 'POST', body: JSON.stringify(joinData) }),

  getGroupMessages: (groupId) => request(`/groups/${groupId}/messages`),
  createGroupMessage: (groupId, payload) =>
    request(`/groups/${groupId}/messages`, { method: 'POST', body: JSON.stringify(payload) }),

  getGroupMeetings: (groupId) => request(`/groups/${groupId}/meetings`),
  createGroupMeeting: (groupId, payload) =>
    request(`/groups/${groupId}/meetings`, { method: 'POST', body: JSON.stringify(payload) }),

  deleteGroup: (groupId) => request(`/groups/${groupId}`, { method: 'DELETE' }),

  getUserProfile: (userId) => request(`/auth/profile/${userId}`),

  getAdminUsers: () => request('/admin/users'),
};
