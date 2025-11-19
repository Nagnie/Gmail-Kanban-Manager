/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LoginFormData, SignupFormData } from '@/schemas/auth'
import { authAPI } from '@/services/api'
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface User {
    id: string
    name: string
    email: string
    createdAt: string
    updatedAt: string
}

interface AuthState {
    user: User | null
    accessToken: string | null
    isLoading: boolean
    error: string | null
    isInitialized: boolean
}

const getStoredUser = (): User | null => {
    try {
        const storedUser = localStorage.getItem('user')
        return storedUser ? JSON.parse(storedUser) : null
    } catch {
        return null
    }
}

const initialState: AuthState = {
    user: getStoredUser(),
    accessToken: null,
    isLoading: false,
    error: null,
    isInitialized: false
}

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginFormData, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      return response.data; 
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const signupUser = createAsyncThunk(
  'auth/signup',
  async (formData: SignupFormData, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(formData);
      return response.data; 
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Registration failed');
    }
  }
);

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (googleToken: string, { rejectWithValue }) => {
    try {
      const response = await authAPI.googleExchange(googleToken);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Google Login failed');
    }
  }
);

export const initializeAuth = createAsyncThunk(
    'auth/initialize',
    async (_, { dispatch }) => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return;

        try {
            const response = await authAPI.refreshToken(refreshToken);
            dispatch(setAccessToken(response.data.accessToken));
            
            const userRes = await authAPI.getMe();
            dispatch(setUser(userRes.data.user));
            
        } catch {
            dispatch(logout());
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // using thunks instead of these
        loginStart: (state) => {
            state.isLoading = true
            state.error = null
        },
        loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
            state.isLoading = false
            state.user = action.payload.user
            state.accessToken = action.payload.token
            state.error = null
            localStorage.setItem('refreshToken', action.payload.token)
        },
        loginFailure: (state, action: PayloadAction<string>) => {
            state.isLoading = false
            state.error = action.payload
            state.user = null
            state.accessToken = null
            localStorage.removeItem('refreshToken')
        },

        logout: (state) => {
            state.user = null
            state.accessToken = null
            state.error = null
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('user')
        },
        setAccessToken: (state, action: PayloadAction<string>) => {
            state.accessToken = action.payload;
        },
        setUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload
            localStorage.setItem('user', JSON.stringify(action.payload))
        },
    },
    extraReducers(builder) {
        builder
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isLoading = false
                state.user = action.payload.user
                state.accessToken = action.payload.accessToken
                state.error = null

                localStorage.setItem('refreshToken', action.payload.refreshToken)
                localStorage.setItem('user', JSON.stringify(action.payload.user))
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload as string
            })

            .addCase(signupUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(signupUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload.user;
                state.accessToken = action.payload.accessToken;
                state.error = null;
                localStorage.setItem('refreshToken', action.payload.refreshToken);
                localStorage.setItem('user', JSON.stringify(action.payload.user));
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
                localStorage.setItem('refreshToken', action.payload.refreshToken);
                localStorage.setItem('user', JSON.stringify(action.payload.user));
            })
            .addCase(googleLogin.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            
            .addCase(initializeAuth.pending, (state) => {
                state.isInitialized = false;
            })
            .addCase(initializeAuth.fulfilled, (state) => {
                state.isInitialized = true;
            })
            .addCase(initializeAuth.rejected, (state) => {
                state.isInitialized = true;
            });
    },
})

export const {
    loginStart,
    loginSuccess,
    loginFailure,
    logout,
    setAccessToken,
    setUser
} = authSlice.actions

export type { User, AuthState }
export default authSlice.reducer