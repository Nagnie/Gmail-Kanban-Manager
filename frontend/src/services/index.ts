/**
 * Services - Main entry point
 *
 * Cấu trúc:
 * - core/: API client, base types
 * - auth/: Authentication endpoints
 * - mail/: Email endpoints
 * - mocks/: Mock data & services
 */

// Core
export { api, apiClient } from "./core";
export type { ApiResponse } from "./core";

// Auth
export { authApi } from "./auth";
export type {
    GoogleLoginRequest,
    GoogleLoginResponse,
    RefreshTokenResponse,
    LogoutResponse,
    AuthUser,
} from "./auth";

// Mail
export { mailApi } from "./mail";
export type { Email, Mailbox, Folder, EmailsResponse } from "./mail";

// Mailboxes
export { mailboxesApi, useGetMailboxesQuery } from "./mailboxes";
export type { Mailbox as MailboxData, MailboxesResponse } from "./mailboxes";
