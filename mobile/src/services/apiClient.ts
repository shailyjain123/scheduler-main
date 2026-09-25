import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '../store/authStore';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  message?: string;
}

const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!backendUrl) {
  throw new Error('EXPO_PUBLIC_BACKEND_URL is required for mobile API client configuration');
}

export const API_BASE_URL = `${backendUrl}/api/v1`;

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
    }
    return Promise.resolve(error.response?.data || { 
      success: false, 
      error: { code: 'NETWORK_ERROR', message: 'Network connection failed' } 
    });
  }
);

export default apiClient;
