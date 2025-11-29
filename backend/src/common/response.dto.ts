/* eslint-disable prettier/prettier */
export class ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data: T | null;
  metadata?: {
    timestamp: string;
    path?: string;
    [key: string]: any;
  };
}