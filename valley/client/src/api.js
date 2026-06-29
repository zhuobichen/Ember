/**
 * API 工具 - 与后端交互
 */

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function clearToken() {
  localStorage.removeItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // 用户
  register: (password, alias) => request('/users/register', {
    method: 'POST',
    body: JSON.stringify({ password, alias })
  }),
  login: (alias, password) => request('/users/login', {
    method: 'POST',
    body: JSON.stringify({ alias, password })
  }),
  getMe: () => request('/users/me'),
  updateAlias: (alias) => request('/users/me/alias', {
    method: 'PUT',
    body: JSON.stringify({ alias })
  }),
  updatePassword: (oldPassword, newPassword) => request('/users/me/password', {
    method: 'PUT',
    body: JSON.stringify({ oldPassword, newPassword })
  }),

  // 纪念碑
  getMonuments: (params = {}) => {
    const { page = 1, search = '', sort = 'latest', hasPuzzle = '' } = params;
    const query = new URLSearchParams();
    query.set('page', page);
    if (search) query.set('search', search);
    if (sort) query.set('sort', sort);
    if (hasPuzzle !== '') query.set('has_puzzle', hasPuzzle);
    return request(`/monuments?${query.toString()}`);
  },
  getMonumentStats: () => request('/monuments/stats/summary'),
  getFeaturedMonuments: (limit = 6) => request(`/monuments/featured/list?limit=${limit}`),
  getMonument: (id, answer) => request(`/monuments/${id}${answer ? `?answer=${encodeURIComponent(answer)}` : ''}`),
  shareMonument: (id) => request(`/monuments/${id}/share`, { method: 'POST' }),
  uploadMonument: async (formData) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/monuments`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '上传失败' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
  getMyMonuments: () => request('/monuments/my/list'),
  updateMonument: (id, data) => request(`/monuments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteMonument: (id) => request(`/monuments/${id}`, { method: 'DELETE' }),

  // 评论
  getComments: (monumentId) => request(`/monuments/${monumentId}/comments`),
  addComment: (monumentId, content) => request(`/monuments/${monumentId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content })
  }),

  // 漂流瓶
  getBottles: (monumentId) => request(`/monuments/${monumentId}/bottles`),
  addBottle: (monumentId, message) => request(`/monuments/${monumentId}/bottles`, {
    method: 'POST',
    body: JSON.stringify({ message })
  }),

  // 点赞
  getLikeStatus: (monumentId) => request(`/monuments/${monumentId}/like`),
  toggleLike: (monumentId) => request(`/monuments/${monumentId}/like`, { method: 'POST' }),

  // 工具
  getToken, setToken, clearToken
};
