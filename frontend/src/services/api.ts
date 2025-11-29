import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { logout, setAccessToken, type User } from '../store/authSlice'
import { store } from '@/store'
import { mockAuthAPI } from './mockAuth'

const API_BASE_URL = import.meta.env.VITE_API_URL

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
})

interface AuthResponse {
    user: User
    accessToken: string
    refreshToken: string
}

interface SignupData {
    name: string
    email: string
    password: string
    confirmPassword: string
}

interface LoginData {
    email: string
    password: string
}

interface RefreshTokenResponse {
    user: User
    accessToken: string
    refreshToken: string
}

interface MeResponse {
    user: User
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const state = store.getState();
    const token = state.auth.accessToken;
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        store.dispatch(logout());
        return Promise.reject(error);
      }

      try {
        const response = await mockAuthAPI.refreshToken(refreshToken);
        const newAccessToken = response.data.accessToken;
        
        store.dispatch(setAccessToken(newAccessToken));
        
        processQueue(null, newAccessToken);
        
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        store.dispatch(logout());
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
    login: (userData: LoginData) => 
        mockAuthAPI.login(userData),
    
    register: (userData: SignupData) => 
        mockAuthAPI.register(userData),
    
    googleExchange: (authCode: string) => 
        api.post('/auth/google-login', {code: authCode}),
    refreshToken: (refreshToken: string) => 
        mockAuthAPI.refreshToken(refreshToken),
    
    getMe: () => 
        mockAuthAPI.getMe(),
}

export type {
    SignupData,
    LoginData,
    AuthResponse,
    RefreshTokenResponse,
    MeResponse,
}
export default api