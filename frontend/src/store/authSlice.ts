import type { LoginFormData, SignupFormData } from "@/schemas/auth";
import { authApi } from "@/services/auth";
import { syncEmails } from "@/services/email/api";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface User {
    name: string;
    email: string;
}

interface RefreshTokenResponse {
    user?: User;
    accessToken: string;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    isLoading: boolean;
    error: string | null;
    isInitialized: boolean;
}

const getStoredUser = (): User | null => {
    try {
        const storedUser = localStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    } catch {
        return null;
    }
};

const initialState: AuthState = {
    user: getStoredUser(),
    accessToken: null,
    isLoading: false,
    error: null,
    isInitialized: false,
};

export const loginUser = createAsyncThunk(
    "auth/login",
    async (_credentials: LoginFormData, { rejectWithValue }) => {
        try {
            // TODO: Implement email/password login khi backend cung cấp endpoint
            throw new Error("Email login not yet implemented");
        } catch (err: unknown) {
            const error = err as Error;
            return rejectWithValue(error.message || "Login failed");
        }
    }
);

export const signupUser = createAsyncThunk(
    "auth/signup",
    async (_formData: SignupFormData, { rejectWithValue }) => {
        try {
            // TODO: Implement signup khi backend cung cấp endpoint
            throw new Error("Signup not yet implemented");
        } catch (err: unknown) {
            const error = err as Error;
            return rejectWithValue(error.message || "Registration failed");
        }
    }
);

export const googleLogin = createAsyncThunk(
    "auth/googleLogin",
    async (googleCode: string, { rejectWithValue, signal }) => {
        try {
            const response = await authApi.googleLogin(googleCode, signal);

            if (response.status !== "success" || !response.data) {
                throw new Error(response.message || "Google login failed");
            }

            // Lưu access token vào localStorage
            localStorage.setItem("accessToken", response.data.accessToken);
            localStorage.setItem("user", JSON.stringify(response.data.user));

            // sync gmail emails after login
            await syncEmails();

            return response.data;
        } catch (err: unknown) {
            const error = err as Error;
            return rejectWithValue(error.message || "Google Login failed");
        }
    }
);

export const initializeAuth = createAsyncThunk(
    "auth/initialize",
    async (_, { rejectWithValue, signal }) => {
        try {
            const response = await authApi.refreshToken(signal);

            if (response.status !== "success" || !response.data) {
                throw new Error("Failed to refresh token");
            }

            localStorage.setItem("accessToken", response.data.accessToken);
            return response.data;
        } catch (err: unknown) {
            const error = err as Error;
            return rejectWithValue(error.message);
        }
    }
);

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        // using thunks instead of these
        loginStart: (state) => {
            state.isLoading = true;
            state.error = null;
        },
        loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
            state.isLoading = false;
            state.user = action.payload.user;
            state.accessToken = action.payload.token;
            state.error = null;
            localStorage.setItem("refreshToken", action.payload.token);
        },
        loginFailure: (state, action: PayloadAction<string>) => {
            state.isLoading = false;
            state.error = action.payload;
            state.user = null;
            state.accessToken = null;
            localStorage.removeItem("refreshToken");
        },

        logout: (state) => {
            state.user = null;
            state.accessToken = null;
            state.error = null;
            localStorage.removeItem("accessToken");
            localStorage.removeItem("user");
        },
        setAccessToken: (state, action: PayloadAction<string>) => {
            state.accessToken = action.payload;
        },
        setUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
            localStorage.setItem("user", JSON.stringify(action.payload));
        },
        setInitialized: (state) => {
            state.isInitialized = true;
        },
    },
    extraReducers(builder) {
        builder
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state) => {
                state.isLoading = false;
                // loginUser currently throws error - this case won't be reached
                // TODO: Update when email/password endpoint is available
                state.error = null;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            .addCase(signupUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(signupUser.fulfilled, (state) => {
                state.isLoading = false;
                // signupUser currently throws error - this case won't be reached
                // TODO: Update when signup endpoint is available
                state.error = null;
            })
            .addCase(signupUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            .addCase(googleLogin.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(googleLogin.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload.user;
                state.accessToken = action.payload.accessToken;
                state.error = null;
            })
            .addCase(googleLogin.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            .addCase(initializeAuth.pending, (state) => {
                state.isInitialized = false;
            })
            .addCase(
                initializeAuth.fulfilled,
                (state, action: PayloadAction<RefreshTokenResponse>) => {
                    state.isInitialized = true;
                    if (action.payload) {
                        state.accessToken = action.payload.accessToken;
                        if (action.payload.user) {
                            state.user = action.payload.user;
                        }
                    }
                }
            )
            .addCase(initializeAuth.rejected, (state) => {
                state.isInitialized = true;
                state.accessToken = null;
            });
    },
});

export const {
    loginStart,
    loginSuccess,
    loginFailure,
    logout,
    setAccessToken,
    setUser,
    setInitialized,
} = authSlice.actions;

export type { User, AuthState };
export default authSlice.reducer;
