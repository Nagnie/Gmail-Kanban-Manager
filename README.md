# React Email Client with Gmail Integration

## Deployed public URLs
- Frontend: https://awad-navy.vercel.app/
- Backend: https://gmail-client-backend.vercel.app/

## Setup & Run Locally

### 1. Clone the repository
```
git clone https://github.com/Nagnie/AWAD.git
cd AWAD
```

### 2. Frontend setup
1. Install frontend dependencies & start server
```
cd ./frontend
npm install
npm run dev
```
2. File .env
```
VITE_API_URL=
VITE_GOOGLE_CLIENT_ID=
```

### 3. Backend setup
1. Start PostgreSQL
You can connect your own DB or run using Docker:
```
docker run --name my-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  -d postgres:15

```
2. Install backend dependencies & start server
```
cd ./backend
npm install
npm run dev:start
```
⚠️ Note: Ensure your .env file is properly configured with:
- Database connection string
- Google OAuth credentials
- Redirect URIs
- JWT secrets
```
PORT=

DB_HOST=
DB_NAME=
DB_USERNAME=
DB_PASSWORD=
DB_SSLMODE=
DB_CHANNELBINDING=
DB_PORT=

JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRES_IN=
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=
JWT_REFRESH_EXPIRATION_MS=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

ENCRYPTION_KEY=
```


## How to create Google OAuth credentials and set allowed redirect URIs
To create Google OAuth credentials we must create a project on Google Console and setup redirect URIs

### Step 1: Create a Project
  - Go to Google Cloud Console.
  - Click the project dropdown (top left) > New Project.
  - Name it (e.g., Gmail-Client-App) and click Create.

### Step 2: Enable Gmail API
  - In the sidebar, go to APIs & Services > Library.
  - Search for "Gmail API".
  - Click on the result and press Enable.

### Step 3: Configure OAuth Consent Screen
  - Go to APIs & Services > OAuth consent screen.
  - Select External (for testing) and click Create.
  - Fill in required fields (App name, User support email, Developer contact information).
  - Scopes: Click "Add or Remove Scopes" and select:
    - https://www.googleapis.com/auth/gmail.readonly — read emails
    - https://www.googleapis.com/auth/gmail.modify — read + modify
    - https://www.googleapis.com/auth/gmail.send — to send/reply.
    - https://www.googleapis.com/auth/gmail.labels
  - Test Users: Add test email address (important for testing while the app is in "Testing" mode).

### Step 4: Create Credentials
  - Go to APIs & Services > Credentials.
  - Click Create Credentials > OAuth client ID.
  - Application type: Select Web application.
  - Name: Enter a name (e.g., React Frontend).

  Authorized JavaScript origins:

    Add Frontend URL: 
      - http://localhost:5173 (local testing).
      - https://awad-navy.vercel.app (for deploy url)

  Authorized redirect URIs:

    Add Frontend URL again: 
      - http://localhost:5173.
      - https://awad-navy.vercel.app (for deploy url)

  Click Create.


## Explanation of token storage choices & security considerations
This project implements a **Dual-Token** Architecture to ensure maximum security for both the Application session and Google credentials.

### A. Google Credentials (Server-Side Storage)
We never expose Google tokens to the Frontend.

  - Refresh Token (Long-lived): 
    - Storage: Stored in the PostgreSQL database (users table).
    - Security: Encrypted at rest before insertion. Even if the database is compromised, the tokens are unusable without the decryption key stored in the environment variables.
    - Usage: The backend decrypts this token on-the-fly to request new Access Tokens from Google when needed.

  - Access Token (Short-lived): 
    - Storage: Kept only in Backend memory (RAM) during the request lifecycle. It is never stored in the DB or sent to the Frontend.

### B. Application Authentication (Client-Side Storage)
We use a standard JWT (JSON Web Token) strategy for user sessions.

  - App Access Token (JWT):
    - Storage: Frontend Memory (React State / Redux Store).
    - Security: Short lifespan (e.g., 15 minutes). Since it's in memory, it is vulnerable to XSS but the damage window is very short. It is lost when the tab is closed.

  - App Refresh Token (JWT):
    - Storage: HttpOnly, Secure, SameSite Cookie.
    - Security: This cookie cannot be accessed via JavaScript (document.cookie), effectively neutralizing XSS attacks trying to steal the session.
    - Validation: The hash of this token is stored in the DB (current_hashed_refresh_token). This allows for Token Rotation and immediate revocation (Logout) by clearing the hash in the DB.


## How to simulate token expiry
Simulating App Access Token Expiry (Frontend Auto-Refresh)

To test if the Frontend automatical calls the /refresh endpoint using the HttpOnly cookie

  - Test:
    - Log in to the application.
    - Access Devtool (F12) and delete accessToken on localstorage
    - Perform an action (e.g., Check a mail).
    - Expected Result: The API call will initially fail (401), but the Axios Interceptor (if implemented) or the Auth Guard will catch it, use the Cookie to get a new token transparently, and the user remains logged in without interruption.