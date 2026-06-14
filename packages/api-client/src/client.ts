import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Extend InternalAxiosRequestConfig to allow our custom property
export interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export class ApiClient {
  private api: AxiosInstance;
  private token: string | null = null;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  constructor(baseURL: string) {
    this.api = axios.create({
      baseURL,
      withCredentials: true, // Needed to send refresh_token cookie
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private setupInterceptors() {
    // Request interceptor: attach access token
    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.token && config.headers) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: handle token refresh logic
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;
        
        if (!originalRequest) return Promise.reject(error);

        // If 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Queue this request until refresh succeeds
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = 'Bearer ' + token;
                }
                return this.api(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            // The refresh endpoint uses the HTTP-only cookie
            const { data } = await axios.post(
              `${this.api.defaults.baseURL}/auth/refresh`,
              {},
              { withCredentials: true }
            );

            const newAccessToken = data.data.accessToken;
            this.setToken(newAccessToken);
            
            // Store token in localStorage
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('operator_access_token', newAccessToken);
              localStorage.setItem('driver_access_token', newAccessToken); // just in case this client is used in web
            }

            this.processQueue(null, newAccessToken);

            if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
              originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
            } else if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            }

            return this.api(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            this.setToken(null);
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('operator_access_token');
              localStorage.removeItem('driver_access_token');
            }
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: unknown, token: string | null = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  get instance() {
    return this.api;
  }
}
