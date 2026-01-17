export interface DeleteBatchEmailDto {
    ids: string[];
}

export interface BatchModifyEmailDto {
    ids?: string[];
    addLabelIds?: string[];
    removeLabelIds?: string[];
}

export interface ModifyEmailDto {
    addLabelIds?: string[];
    removeLabelIds?: string[];
}

export interface BatchOperationResponse {
    success: boolean;
    modified?: number;
    deleted?: number;
}

export interface EmailSearchDto {
    query?: string;
    page?: number;
    limit?: number;
}

export interface EmailSearchCard {
    id: string;
    subject: string;
    sender: string;
    snippet: string;
    internalDate: string;
    internal_date: string;
    similarity: number;
    isRead: boolean;
    summary: string;
    relevance_score: number;
}

export interface EmailSearchResult {
    data: EmailSearchCard[];
    page: number;
    limit: number;
    totalResult: number;
}

export interface EmailSearchSuggestionParams {
    query: string;
}

export type SuggestionType = "sender" | "subject" | "query";

export interface EmailSearchSuggestion {
    type: SuggestionType;
    value: string;
    score: number;
}

export interface EmailSearchSuggestionsResult {
    query: string;
    suggestions: EmailSearchSuggestion[];
}
