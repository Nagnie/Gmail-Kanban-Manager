export type SuggestionType = 'sender' | 'subject' | 'query';

export interface Suggestion {
  type: SuggestionType;
  value: string;
  score: number;
}
