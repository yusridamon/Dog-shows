import axios from 'axios';

// In production the client is served from a different origin than the API, so
// the API base is configurable via REACT_APP_API_URL.
//   - If REACT_APP_API_URL is set: use `${REACT_APP_API_URL}/api`
//   - Otherwise default to '/api' so local dev uses the CRA proxy.
const API_ORIGIN = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/$/, '')
  : '';

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  timeout: 20000,
});

// Resolve a server-relative upload path (e.g. "/uploads/pedigrees/x.pdf") to an
// absolute URL against the API origin, so document links work in production.
export function fileUrl(pathFromApi) {
  if (!pathFromApi) return pathFromApi;
  if (/^https?:\/\//i.test(pathFromApi)) return pathFromApi;
  return `${API_ORIGIN}${pathFromApi}`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      if (
        window.location.pathname.startsWith('/admin') &&
        window.location.pathname !== '/admin/login'
      ) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
