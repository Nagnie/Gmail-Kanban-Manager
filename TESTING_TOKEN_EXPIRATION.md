# Testing Token Expiration & Auto-Refresh Flow

## 🎯 Mục đích

Hướng dẫn này giải thích cách mock API xử lý token expiration và cách test auto-refresh flow trong development.

## 🔑 Cách MockAuth hoạt động

### 1. Token Tracking với Expiration

**Trước đây:**
```typescript
const MOCK_ACCESS_TOKEN = "mock-access-token-valid-30s"; // Token tĩnh, không bao giờ expire
```

**Bây giờ:**
```typescript
// Mỗi token có timestamp tracking
const tokenStorage = new Map<string, TokenRecord>();

interface TokenRecord {
  token: string;
  issuedAt: number;    // Timestamp khi token được tạo
  expiresAt: number;   // Timestamp khi token hết hạn
}
```

### 2. Token Lifecycle

```
Login/Signup/Google OAuth
    ↓
createAccessToken() + createRefreshToken()
    ↓
Lưu vào tokenStorage với timestamp
    ↓
Return tokens to client
    ↓
Client lưu: accessToken (Redux state), refreshToken (localStorage)
    ↓
API calls → api.ts interceptor attach accessToken
    ↓
[AFTER TTL] Token expires
    ↓
Next API call returns 401
    ↓
api.ts interceptor gọi refreshToken()
    ↓
mockAuth validates refreshToken
    ↓
Invalidate old refresh token (rotation)
    ↓
Create new accessToken + refreshToken
    ↓
Retry failed request với new token
```

### 3. Token Configuration

```typescript
// src/services/mockAuth.ts
const ACCESS_TOKEN_TTL = 30 * 1000;  // 30 giây (production)
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 ngày
```

## 🧪 Cách Test Token Expiration

### Method 1: Giảm TTL xuống 10 giây (Recommended)

**Bước 1:** Sửa `src/services/mockAuth.ts`

```typescript
// Uncomment dòng này:
const ACCESS_TOKEN_TTL = 10 * 1000; // 10 seconds

// Comment dòng production:
// const ACCESS_TOKEN_TTL = 30 * 1000;
```

**Bước 2:** Restart dev server

```bash
npm run dev
```

**Bước 3:** Login vào app

**Bước 4:** Mở DevTools Console và chạy:

```javascript
// Check token info
const state = window.__REDUX_DEVTOOLS_EXTENSION__ ? 
  window.__REDUX_DEVTOOLS_EXTENSION__.getState() : null;
const accessToken = state?.auth?.accessToken;

// Import debug utility
import('./services/mockAuth.js').then(({ mockAuthDebug }) => {
  console.log('Token Info:', mockAuthDebug.getTokenInfo(accessToken));
  
  // Set interval để theo dõi
  const interval = setInterval(() => {
    const info = mockAuthDebug.getTokenInfo(accessToken);
    console.log(`Token status: ${info?.expiresIn} - Valid: ${info?.isValid}`);
    if (!info?.isValid) {
      console.log('❌ TOKEN EXPIRED!');
      clearInterval(interval);
    }
  }, 1000);
});
```

**Bước 5:** Đợi 10 giây, sau đó click vào một email hoặc refresh danh sách

**Expected behavior:**
```
1. API call với expired token → 401 Unauthorized
2. api.ts interceptor catches 401
3. Auto refresh với refreshToken
4. Get new accessToken
5. Retry original request
6. ✅ Success
```

**Xem logs trong Network tab:**
```
1. GET /api/emails - Status: 401 (token expired)
2. POST /api/refresh - Status: 200 (refresh success)
3. GET /api/emails - Status: 200 (retry success)
```

### Method 2: Debug Console

Mở console và check token status bất cứ lúc nào:

```javascript
// Add to window for easy access
import('./services/mockAuth.js').then(({ mockAuthDebug }) => {
  window.mockAuthDebug = mockAuthDebug;
});

// Usage:
mockAuthDebug.getAllTokens();          // Xem tất cả tokens đang active
mockAuthDebug.getTokenInfo(token);     // Chi tiết của 1 token
mockAuthDebug.ACCESS_TOKEN_TTL;        // Check current TTL setting
mockAuthDebug.clearAllTokens();        // Clear all tokens (test logout)
```

### Method 3: Manual Token Invalidation

Trong Redux DevTools hoặc console:

```javascript
// Get current state
const state = store.getState();
const oldToken = state.auth.accessToken;

// Manually corrupt token to force 401
store.dispatch({ 
  type: 'auth/setAccessToken', 
  payload: 'invalid-token-to-trigger-refresh' 
});

// Now any API call sẽ trigger refresh flow
```

## 📊 Monitoring Auto-Refresh Flow

### Redux DevTools

Theo dõi actions:
```
1. [API Call] → Uses accessToken from state
2. [401 Response] → Token expired
3. auth/setAccessToken → New token after refresh
4. [API Retry] → Original request với new token
```

### Network Tab

Filter: `XHR` để xem:
```
1. Request failed (401)
2. Refresh token request (200)
3. Original request retry (200)
```

### Console Logs

Thêm log vào `api.ts` interceptor:

```typescript
// In response interceptor
console.log('🔴 401 detected, refreshing token...');
console.log('🟢 Token refreshed successfully');
console.log('🔄 Retrying original request');
```

## ⚠️ Common Issues & Solutions

### Issue 1: Refresh Loop

**Symptom:** Infinite refresh requests

**Cause:** Refresh token cũng expired

**Solution:** 
```typescript
// api.ts đã handle:
if (!refreshToken) {
  store.dispatch(logout());  // Force logout
  return Promise.reject(error);
}
```

### Issue 2: Race Condition

**Symptom:** Multiple refresh requests cùng lúc

**Solution:**
```typescript
// api.ts đã implement queue:
if (isRefreshing) {
  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  });
}
```

### Issue 3: Token Not Updating

**Symptom:** UI vẫn dùng old token

**Cause:** Redux state không update

**Check:**
```javascript
// Redux DevTools → State → auth → accessToken
// Should change after refresh
```

## 🎓 Test Scenarios

### Scenario 1: Normal Auto-Refresh
1. Login → Token valid
2. Wait for expiration
3. Make API call
4. ✅ Auto-refresh và retry thành công

### Scenario 2: Refresh Token Expired
1. Login → Cả 2 tokens valid
2. Manually invalidate refresh token
3. Wait for access token expiration
4. Make API call
5. ✅ Redirect to login (không thể refresh)

### Scenario 3: Multiple Concurrent Requests
1. Set TTL = 5s
2. Login
3. Wait 5s
4. Mở nhiều emails cùng lúc (5-10 requests)
5. ✅ Chỉ 1 refresh request, tất cả retry thành công

### Scenario 4: Logout Invalidation
1. Login → Get tokens
2. Logout
3. Try to use old tokens
4. ✅ 401 Unauthorized (tokens đã invalidated)

## 📝 Notes

- **Development**: Dùng TTL ngắn (10s) để test nhanh
- **Production**: TTL dài hơn (30s-5m) để giảm refresh frequency
- **Security**: Refresh token rotation (old token invalidated after use)
- **UX**: Auto-refresh transparent, user không thấy gì

## 🔗 Related Files

- `src/services/mockAuth.ts` - Token generation & validation
- `src/services/api.ts` - Auto-refresh interceptor
- `src/store/authSlice.ts` - Auth state management
