import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface RequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

interface FailedQueueItem {
    resolve: (value: string) => void;
    reject: (error: Error) => void;
}

class ApiClient {
    private client: AxiosInstance;
    private accessToken: string | null = null;
    private isRefreshing = false;
    private failedQueue: FailedQueueItem[] = [];

    constructor(baseURL: string) {
        this.client = axios.create({
            baseURL,
            headers: {
                "Content-Type": "application/json",
            },
            withCredentials: true,
        });

        this.setupInterceptors();
    }

    private processQueue = (error: Error | null, token: string | null = null) => {
        this.failedQueue.forEach((prom) => {
            if (error) {
                prom.reject(error);
            } else if (token) {
                prom.resolve(token);
            }
        });
        this.failedQueue = [];
    };

    private setupInterceptors() {
        // Request interceptor: Thêm access token vào header
        this.client.interceptors.request.use(
            (config: RequestConfig) => {
                const token = this.accessToken;
                if (token && config.headers) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error),
        );

        // Response interceptor: Handle 401 và refresh token
        this.client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const originalRequest = error.config as RequestConfig;
                const url = originalRequest.url || "";

                // Nếu đang call refresh endpoint, không cần retry
                if (url.includes("/auth/refresh")) {
                    return Promise.reject(error);
                }

                // Nếu 401 và chưa retry
                if (error.response?.status === 401 && !originalRequest._retry) {
                    if (this.isRefreshing) {
                        // Đang refresh, thêm vào queue
                        return new Promise((resolve, reject) => {
                            this.failedQueue.push({ resolve, reject });
                        })
                            .then((token) => {
                                if (originalRequest.headers) {
                                    originalRequest.headers.Authorization = `Bearer ${token}`;
                                }
                                return this.client(originalRequest);
                            })
                            .catch((err) => Promise.reject(err));
                    }

                    originalRequest._retry = true;
                    this.isRefreshing = true;

                    try {
                        // Gọi refresh token endpoint
                        const response = await this.client.post("/api/v1/auth/refresh");
                        const { data } = response.data;
                        const newAccessToken = data?.accessToken;

                        if (!newAccessToken) {
                            throw new Error("No access token in refresh response");
                        }

                        this.accessToken = newAccessToken;
                        this.processQueue(null, newAccessToken);

                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                        }

                        return this.client(originalRequest);
                    } catch (refreshError) {
                        this.processQueue(refreshError as Error, null);
                        this.accessToken = null;
                        localStorage.removeItem("user");
                        // Redirect to login hoặc dispatch logout action
                        window.dispatchEvent(new CustomEvent("auth-failed"));
                        return Promise.reject(refreshError);
                    } finally {
                        this.isRefreshing = false;
                    }
                }

                return Promise.reject(error);
            },
        );
    }

    getClient(): AxiosInstance {
        return this.client;
    }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient.getClient();
