import { registerAs } from "@nestjs/config";

type OpenRouterConfig = {
    apiKey: string;
    baseUrl: string;
    defaultModel: string;
};

export default registerAs('openRouter', (): OpenRouterConfig => ({
  apiKey: process.env.OPENROUTER_API_KEY || 'default_api_key',
  baseUrl: process.env.OPENROUTER_BASE_URL || 'https://api.openrouter.com',
  defaultModel: process.env.OPENROUTER_MODEL_DEFAULT || 'default_model',
}));