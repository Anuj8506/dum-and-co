import axios from 'axios';
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
  withCredentials: true,
  timeout: import.meta.env.VITE_WS_URL ? 75000 : 15000,
});
api.interceptors.response.use(
  (r) => r.data,
  (error) => {
    error.message =
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED'
        ? 'That took too long. Please try again.'
        : 'Cannot reach the kitchen. Check your connection and retry.');
    return Promise.reject(error);
  }
);
export default api;
