import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import OpenAI from 'openai';
import openRouterConfig from 'src/config/open-router.config';

@Injectable()
export class OpenRouterService {
    private readonly openaiClient: OpenAI;
    private readonly defaultModel: string;
    private readonly logger = new Logger(OpenRouterService.name);

    constructor(
        @Inject(openRouterConfig.KEY) openRouterConfiguration: ConfigType<typeof openRouterConfig>,
    ) {
        this.openaiClient = new OpenAI({
            apiKey: openRouterConfiguration.apiKey,
            baseURL: openRouterConfiguration.baseUrl,
        });

        this.defaultModel = openRouterConfiguration.defaultModel;
    }

    private async getChatCompletion(
        systemPrompt: string, 
        userContent: string, 
        temperature: number,
        maxTokens: number = 150
    ): Promise<string> {
        try {
            const response = await this.openaiClient.chat.completions.create({
                model: this.defaultModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent },
                ],
                temperature: temperature,
                max_tokens: maxTokens,
            });

            return response.choices[0]?.message?.content || '';
        } catch (error) {
            this.logger.error(`OpenAI Call Failed: ${error.message}`, error.stack);
            throw error; 
        }
    }

    async summarizeEmail(emailBody: string): Promise<string> {
        const truncatedText = emailBody.substring(0, 4000);

        const systemPrompt = `
            You are an expert personal assistant. 
            Your task is to summarize the following email into a concise paragraph (maximum 3 sentences).
            - Focus on the main intent, action items, and deadlines.
            - Ignore signatures, disclaimers, and marketing fluff.
            - If the email is in Vietnamese, summarize in Vietnamese. If English, summarize in English.
            - Just provide the summary without any additional commentary.
        `;

        return this.getChatCompletion(systemPrompt, truncatedText, 0.3, 200);
    }

    async extractActionItems(emailBody: string): Promise<string> {
        const cleanText = emailBody.substring(0, 4000);
        const systemPrompt = `Extract action items as a JSON list.`;
        return this.getChatCompletion(systemPrompt, cleanText, 0.1, 200);
    }
}
