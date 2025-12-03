# API Integration Guide

## Project Structure

```
src/
├── services/
│   ├── api-types.ts        # Type definitions cho tất cả API responses
│   ├── api-client.ts       # Axios instance + interceptors (centralized)
│   ├── auth-api.ts         # Auth API endpoints
│   ├── api-utils.ts        # Helper functions
│   └── (mockAuth.ts, mockData.ts) # Keep old mock APIs for reference
├── store/
│   ├── authSlice.ts        # Redux slice for auth state
│   └── index.ts
├── hooks/
│   ├── useAuthListener.ts  # Hook để handle auth events
│   └── redux.ts
└── ...
```

## Key Features

### 1. **Type-Safe API Client** (`api-client.ts`)

-   Centralized Axios instance
-   Automatic access token injection in request headers
-   401 Response handling dengan token refresh
-   Request queue untuk pending requests saat refresh
-   Event dispatch khi auth fails

### 2. **Auth Endpoints** (`auth-api.ts`)

-   `googleLogin(code)` - Google login
-   `refreshToken()` - Refresh access token
-   `logout()` - Logout

### 3. **Type Definitions** (`api-types.ts`)

-   `ApiResponse<T>` - Generic response type matching backend format
-   Auth-specific types: `GoogleLoginResponse`, `RefreshTokenResponse`, etc.

### 4. **Redux Integration** (`authSlice.ts`)

-   Async thunks: `googleLogin`, `initializeAuth`
-   Stores: user, accessToken, loading state, error
-   Clear error handling

### 5. **Auth Listener** (`useAuthListener.ts`)

-   Hook để listen auth-failed events
-   Auto redirect to signin khi auth fails

## Usage

### Google Login in Component

```tsx
import { googleLogin } from "@/store/authSlice";
import { useAppDispatch } from "@/hooks/redux";
import { useGoogleLogin } from "@react-oauth/google";

const MyComponent = () => {
    const dispatch = useAppDispatch();

    const handleGoogleLogin = useGoogleLogin({
        flow: "auth-code",
        // ... config
        onSuccess: async (codeResponse) => {
            await dispatch(googleLogin(codeResponse.code)).unwrap();
            navigate("/dashboard");
        },
    });

    return <button onClick={handleGoogleLogin}>Login with Google</button>;
};
```

### Using Auth Client for Other APIs

Để thêm endpoints khác sau này (mail API, user API, etc.):

```typescript
// src/services/user-api.ts
import api from "./api-client";
import type { ApiResponse } from "./api-types";

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

export const userApi = {
    getProfile: async () => {
        const response = await api.get<ApiResponse<UserProfile>>("/api/v1/users/profile");
        return response.data;
    },

    updateProfile: async (data: Partial<UserProfile>) => {
        const response = await api.put<ApiResponse<UserProfile>>("/api/v1/users/profile", data);
        return response.data;
    },
};
```

Rồi sử dụng trong Redux thunk:

```typescript
export const fetchUserProfile = createAsyncThunk(
    "auth/fetchProfile",
    async (_, { rejectWithValue }) => {
        try {
            const response = await userApi.getProfile();
            if (response.status !== "success") {
                throw new Error(response.message);
            }
            return response.data;
        } catch (err: unknown) {
            const error = err as Error;
            return rejectWithValue(error.message);
        }
    }
);
```

## Environment Variables

Tạo `.env.local` file:

```env
VITE_API_URL=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=your_client_id
```

## Storage Strategy

-   **Access Token**: `localStorage.accessToken` - Dùng để attach vào requests
-   **User Info**: `localStorage.user` - Cached user data
-   **Refresh Token**: Trong httpOnly cookie (backend gửi) - Safer

## Error Handling

API client automatically:

1. Intercepts 401 responses
2. Attempts refresh token
3. Retries failed requests với token mới
4. Dispatches `auth-failed` event nếu refresh fails
5. useAuthListener hook sẽ redirect to signin

## Persisting Auth State

Tạo middleware để initialize auth khi app loads:

```typescript
// store/middleware/authMiddleware.ts
export const authMiddleware = (store) => (next) => (action) => {
    const result = next(action);

    if (action.type === "auth/initialize/fulfilled") {
        // Auth initialized
    }

    return result;
};
```

Rồi dispatch trong Root component hoặc App setup.

## Notes

-   Old mock APIs (mockAuth.ts, mockData.ts) vẫn ở đó, không bị xóa
-   Tất cả errors return via rejectWithValue - Redux state sẽ có error message
-   API client has withCredentials: true - Refresh token cookie sẽ auto-gửi
-   Type safety: Không dùng `any`, tất cả errors typed as `unknown` rồi cast khi cần
