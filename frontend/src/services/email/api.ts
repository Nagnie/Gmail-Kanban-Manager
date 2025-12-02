import { apiClient } from "@/services/core/api-client";
import type { ApiResponse } from "@/services/core/types";
import type {
    DeleteBatchEmailDto,
    BatchModifyEmailDto,
    ModifyEmailDto,
    BatchOperationResponse,
} from "./types";
import type { EmailMessage } from "@/services/mailboxes/types";

export const markEmailAsRead = async (emailId: string): Promise<EmailMessage> => {
    const client = apiClient.getClient();
    const response = await client.post<ApiResponse<EmailMessage>>(
        `/api/v1/emails/${emailId}/mark-as-read`
    );
    return response.data.data || ({} as EmailMessage);
};

export const markEmailAsUnread = async (emailId: string): Promise<EmailMessage> => {
    const client = apiClient.getClient();
    const response = await client.post<ApiResponse<EmailMessage>>(
        `/api/v1/emails/${emailId}/mark-as-unread`
    );
    return response.data.data || ({} as EmailMessage);
};

export const starEmail = async (emailId: string): Promise<EmailMessage> => {
    const client = apiClient.getClient();
    const response = await client.post<ApiResponse<EmailMessage>>(`/api/v1/emails/${emailId}/star`);
    return response.data.data || ({} as EmailMessage);
};

export const unstarEmail = async (emailId: string): Promise<EmailMessage> => {
    const client = apiClient.getClient();
    const response = await client.post<ApiResponse<EmailMessage>>(
        `/api/v1/emails/${emailId}/unstar`
    );
    return response.data.data || ({} as EmailMessage);
};

export const deleteEmail = async (emailId: string): Promise<BatchOperationResponse> => {
    const client = apiClient.getClient();
    const response = await client.delete<ApiResponse<BatchOperationResponse>>(
        `/api/v1/emails/${emailId}`
    );
    return response.data.data || { success: false };
};

export const batchDeleteEmails = async (
    dto: DeleteBatchEmailDto
): Promise<BatchOperationResponse> => {
    const client = apiClient.getClient();
    const response = await client.delete<ApiResponse<BatchOperationResponse>>(
        "/api/v1/emails/batch-delete",
        { data: dto }
    );
    return response.data.data || { success: false };
};

export const modifyEmail = async (
    emailId: string,
    modifyDto: ModifyEmailDto
): Promise<EmailMessage> => {
    const client = apiClient.getClient();
    const response = await client.post<ApiResponse<EmailMessage>>(
        `/api/v1/emails/${emailId}/modify`,
        modifyDto
    );
    return response.data.data || ({} as EmailMessage);
};

export const batchModifyEmails = async (
    dto: BatchModifyEmailDto
): Promise<BatchOperationResponse> => {
    const client = apiClient.getClient();
    const response = await client.post<ApiResponse<BatchOperationResponse>>(
        "/api/v1/emails/batch-modify",
        dto
    );
    return response.data.data || { success: false };
};

export const moveEmailToTrash = async (emailId: string): Promise<EmailMessage> => {
    const client = apiClient.getClient();
    const response = await client.post<ApiResponse<EmailMessage>>(
        `/api/v1/emails/${emailId}/move-to-trash`
    );
    return response.data.data || ({} as EmailMessage);
};

export const moveEmailToInbox = async (emailId: string): Promise<EmailMessage> => {
    const client = apiClient.getClient();
    const response = await client.post<ApiResponse<EmailMessage>>(
        `/api/v1/emails/${emailId}/move-to-inbox`
    );
    return response.data.data || ({} as EmailMessage);
};

export const archiveEmail = async (emailId: string): Promise<EmailMessage> => {
    const client = apiClient.getClient();
    const response = await client.post<ApiResponse<EmailMessage>>(
        `/api/v1/emails/${emailId}/archive`
    );
    return response.data.data || ({} as EmailMessage);
};

export const untrashEmail = async (emailId: string): Promise<EmailMessage> => {
    const client = apiClient.getClient();
    const response = await client.post<ApiResponse<EmailMessage>>(
        `/api/v1/emails/${emailId}/untrash`
    );
    return response.data.data || ({} as EmailMessage);
};

export const sendEmail = async (emailData: FormData): Promise<EmailMessage> => {
    const client = apiClient.getClient();
    const response = await client.post<ApiResponse<EmailMessage>>(
        `/api/v1/emails/send`,
        emailData
    );
    return response.data.data || ({} as EmailMessage);
};