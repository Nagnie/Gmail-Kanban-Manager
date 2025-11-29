import { registerAs } from "@nestjs/config";

type GoogleConfig = {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
};

export default registerAs('googleOauth', (): GoogleConfig => ({
    clientId: process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id-for-development',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret-for-development',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
}));