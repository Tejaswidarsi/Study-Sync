import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
  },
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && error.response.data.refreshRequired && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post('http://localhost:5000/api/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', res.data.accessToken);
          localStorage.setItem('refreshToken', res.data.refreshToken);
          API.defaults.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return API(originalRequest); // Retry the original request
        } catch (refreshError) {
          console.error('Refresh token failed:', refreshError);
          // Redirect to login if refresh fails
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;