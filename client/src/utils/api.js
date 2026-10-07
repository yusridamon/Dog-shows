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

// Origin where uploaded/generated files are served (/uploads/...). In production
// this is REACT_APP_API_URL. In local dev the API runs on :5001 (the CRA proxy
// does not forward /uploads), so point directly at it.
const FILE_ORIGIN = API_ORIGIN || `${window.location.protocol}//${window.location.hostname}:5001`;

// Resolve a server-relative upload path (e.g. "/uploads/pedigrees/x.pdf") to an
// absolute URL against the API/file origin, so document links work everywhere.
export function fileUrl(pathFromApi) {
  if (!pathFromApi) return pathFromApi;
  if (/^https?:\/\//i.test(pathFromApi)) return pathFromApi;
  return `${FILE_ORIGIN}${pathFromApi}`;
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
