# Auth API Integration - Setup Complete ✅

## Files Created

### 1. **API Types & Definitions**

-   `src/services/api-types.ts` - Type-safe response types cho tất cả API
-   `src/services/api-utils.ts` - Helper functions (getApiErrorMessage, isApiResponse)
-   `src/services/api-factory.ts` - Template pattern để tạo API modules

### 2. **API Client**

-   `src/services/api-client.ts` - Centralized Axios instance với:
    -   Automatic access token injection
    -   401 handling with token refresh
    -   Request queue cho retry logic
    -   Event dispatch khi auth fails

### 3. **Auth API Module**

-   `src/services/auth-api.ts` - Auth endpoints:
    -   `googleLogin(code)` → POST /api/v1/auth/google-login
    -   `refreshToken()` → POST /api/v1/auth/refresh
    -   `logout()` → POST /api/v1/auth/logout

### 4. **Hooks**

-   `src/hooks/useAuthListener.ts` - Hook để listen auth-failed events

### 5. **Redux Updates**

-   `src/store/authSlice.ts` - Updated thunks & reducers:
    -   `googleLogin` - gọi authApi.googleLogin
    -   `initializeAuth` - gọi authApi.refreshToken
    -   Removed refreshToken dependency, uses localStorage.accessToken

### 6. **Components**

-   `src/components/SignIn.tsx` - Updated để use useAuthListener

### 7. **Root Setup**

-   `src/Root.tsx` - Added AuthInitializer component:
    -   Initializes auth on app load
    -   Sets up auth listeners
    -   Shows loading state while initializing

### 8. **Config**

-   `.env.local` - Environment variables template
-   `src/vite-env.d.ts` - Type-safe env vars

### 9. **Documentation**

-   `API_INTEGRATION_GUIDE.md` - Comprehensive guide
-   `src/services/auth-setup-example.tsx` - Example setup code

## Key Features

✅ **Type-Safe** - No `any` types, strict typing throughout  
✅ **Centralized** - Single API client with interceptors  
✅ **Automatic Token Refresh** - Handles 401 responses  
✅ **Request Queue** - Prevents race conditions during refresh  
✅ **Error Handling** - Typed error handling  
✅ **Scalable** - Easy to add new API modules  
✅ **Security** - withCredentials for httpOnly cookies

## Quick Start

### 1. Update .env.local

```env
VITE_API_URL=http://localhost:3001
```

### 2. Google Login Already Works!

SignIn.tsx automatically uses `googleLogin` thunk → `authApi.googleLogin()` → backend

### 3. Add New API Module Later

```typescript
// src/services/mail-api.ts
import api from "./api-client";
import type { ApiResponse } from "./api-types";

export const mailApi = {
    getInbox: async (limit?: number) => {
        const response = await api.get<ApiResponse<Email[]>>("/api/v1/mails/inbox", {
            params: { limit },
        });
        return response.data;
    },
};
```

### 4. Use in Redux Thunk

```typescript
export const fetchInbox = createAsyncThunk("mail/fetchInbox", async (_, { rejectWithValue }) => {
    try {
        const response = await mailApi.getInbox();
        if (response.status !== "success") {
            throw new Error(response.message);
        }
        return response.data;
    } catch (err: unknown) {
        return rejectWithValue((err as Error).message);
    }
});
```

## Storage & Token Management

-   **Access Token**: `localStorage.accessToken`
-   **User Data**: `localStorage.user`
-   **Refresh Token**: httpOnly cookie (handled by backend)

## Error Handling Flow

1. API call fails with 401
2. api-client intercepts & tries refresh
3. If refresh fails → dispatch auth-failed event
4. useAuthListener receives event → logout & redirect to /signin
5. SignIn page shows error from Redux state

## What's Still in Place

✅ `mockAuth.ts`, `mockData.ts` - Kept for reference  
✅ All old components working  
✅ Redux store structure intact

## Testing

1. Start backend: `npm run dev` (backend on :3001)
2. Start frontend: `npm run dev` (frontend on :5173)
3. Try Google login - should call `/api/v1/auth/google-login`
4. Check Network tab in DevTools to see:
    - POST /api/v1/auth/google-login
    - Access token stored in localStorage
    - User data cached

## Next Steps

-   Implement email/password login endpoint
-   Add mail API module
-   Add user profile API module
-   Setup error toast notifications
