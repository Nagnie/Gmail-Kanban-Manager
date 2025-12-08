import { apiClient } from "@/services/core/api-client";
import type { ApiResponse } from "@/services/core/types";
import type {
    GetColumnQueryDto,
    KanbanColumnDto,
    KanbanColumnId,
    MoveEmailDto,
    MoveEmailResponseDto,
    ReorderEmailsDto,
    ReorderEmailsResponseDto,
    SnoozeEmailDto,
    SnoozeResponseDto,
    SummarizeEmailDto,
    SummarizeResponseDto,
} from "@/services/kanban/types";

export const getKanbanColumn = async (columnId: KanbanColumnId, query?: GetColumnQueryDto) => {
    const client = apiClient.getClient();

    const response = await client.get<ApiResponse<KanbanColumnDto>>(
        `/api/v1/emails/kanban/columns/${columnId}`,
        { params: query }
    );

    return response.data.data;
};

export const moveEmailToColumn = async (emailId: string, moveDto: MoveEmailDto) => {
    const client = apiClient.getClient();

    const response = await client.post<ApiResponse<MoveEmailResponseDto>>(
        `/api/v1/emails/kanban/${emailId}/move`,
        moveDto
    );

    return response.data.data;
};

export const reorderEmailsInColumn = async (reorderDto: ReorderEmailsDto) => {
    const client = apiClient.getClient();

    const response = await client.post<ApiResponse<ReorderEmailsResponseDto>>(
        `/api/v1/emails/kanban/reorder`,
        reorderDto
    );

    return response.data.data;
};

export const snoozeEmail = async (emailId: string, snoozeDto: SnoozeEmailDto) => {
    const client = apiClient.getClient();

    const response = await client.post<ApiResponse<SnoozeResponseDto>>(
        `/api/v1/emails/kanban/${emailId}/snooze`,
        snoozeDto
    );

    return response.data.data;
};

export const getSnoozedEmails = async () => {
    const client = apiClient.getClient();

    const response = await client.get<ApiResponse<SnoozeResponseDto[]>>(
        `/api/v1/emails/kanban/snoozed`
    );

    return response.data.data;
};

export const unsnoozeEmail = async (emailId: string) => {
    const client = apiClient.getClient();

    const response = await client.post<ApiResponse<{ success: boolean; message: string }>>(
        `/api/v1/emails/kanban/${emailId}/unsnooze`
    );

    return response.data.data;
};

// TODO
// currently only supports pinning in "inbox" column
// export const pinEmailInColumn = async (emailId: string, pinDto: PinEmailDto) => {
//     const client = apiClient.getClient();
//     const response = await client.post<ApiResponse<PinResponseDto>>(
//         `/api/v1/emails/kanban/${emailId}/pin`,
//         pinDto
//     );
//     return response.data.data;
// };
// export const unpinEmailInColumn = async (emailId: string) => {
//     const client = apiClient.getClient();
//     const response = await client.delete<ApiResponse<{ success: boolean }>>(
//         `/api/v1/emails/kanban/${emailId}/pin`
//     );
//     return response.data.data;
// };
// export const setPriority = async (emailId: string, priorityDto: SetPriorityDto) => {
//     const client = apiClient.getClient();
//     const response = await client.post<ApiResponse<PinResponseDto>>(
//         `/api/v1/emails/kanban/${emailId}/priority`,
//         priorityDto
//     );
//     return response.data.data;
// };

export const summarizeEmail = async (emailId: string, dto: SummarizeEmailDto) => {
    const client = apiClient.getClient();

    const response = await client.post<ApiResponse<SummarizeResponseDto>>(
        `/api/v1/emails/kanban/${emailId}/summarize`,
        dto
    );

    return response.data.data;
};
