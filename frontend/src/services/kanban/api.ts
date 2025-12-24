import { apiClient } from "@/services/core/api-client";

import type { ApiResponse } from "@/services/core/types";
import {
  type KanbanColumnsMetaResponseDto,
  type GetColumnQueryDto,
  type KanbanColumnDto,
  type KanbanColumnId,
  type MoveEmailDto,
  type MoveEmailResponseDto,
  type ReorderEmailsDto,
  type ReorderEmailsResponseDto,
  type SnoozeEmailDto,
  type SnoozeResponseDto,
  type SummarizeEmailDto,
  type SummarizeResponseDto,
  type CreateColumnDto,
  type UpdateColumnDto,
  type ReorderColumnsDto,
  type KanbanColumnInfoDto,
  type SimpleSuccessResponseDto,
  type AvailableLabelDto,
} from "@/services/kanban/types";

export const getUserKanbanColumnsMeta = async () => {
  const client = apiClient.getClient();

  const response = await client.get<ApiResponse<KanbanColumnsMetaResponseDto>>(
    `/api/v1/emails/kanban/columns`
  );

  return response.data.data;
};

// Api call lấy thông tin của một cột Kanban cụ thể
// sẽ call 4 api cho 4 cột: "inbox" | "todo" | "in_progress" | "done"
export const getKanbanColumn = async (
  columnId: KanbanColumnId,
  query?: GetColumnQueryDto
) => {
  const client = apiClient.getClient();

  const response = await client.get<ApiResponse<KanbanColumnDto>>(
    `/api/v1/emails/kanban/columns/${columnId}`,
    { params: query }
  );

  return response.data.data;
};

// Api call di chuyển email từ cột này sang cột khác
export const moveEmailToColumn = async (
  emailId: string,
  moveDto: MoveEmailDto
) => {
  const client = apiClient.getClient();

  const response = await client.post<ApiResponse<MoveEmailResponseDto>>(
    `/api/v1/emails/kanban/${emailId}/move`,
    moveDto
  );

  return response.data.data;
};

// có thể call hoặc không nếu không có thời gian
// Api call sắp xếp lại thứ tự email trong cùng một cột (trừ cột "inbox" vì cột này sắp xếp theo thời gian nhận)
// cần tính toán thứ tự mới của các email sau khi kéo thả và gửi lên server
// phần order có hỗ trợ dàn float để dễ dàng chèn email vào giữa hai email khác nên không cần phải cập nhật lại toàn bộ thứ tự
export const reorderEmailsInColumn = async (reorderDto: ReorderEmailsDto) => {
  const client = apiClient.getClient();

  const response = await client.post<ApiResponse<ReorderEmailsResponseDto>>(
    `/api/v1/emails/kanban/reorder`,
    reorderDto
  );

  return response.data.data;
};

// hiện tại ở backend đang cron job để tự động chuyển email từ cột "todo" sang "in_progress"
// nên hiện tại ở frontend phải tự polling để lấy lại danh sách email của 4 cột
// hoặc thêm 1 nút "Refresh" để người dùng tự cập nhật
// hoặc call api lấy lại dữ liệu 4 cột khi focus vào page

// Api call tạm ẩn email
export const snoozeEmail = async (
  emailId: string,
  snoozeDto: SnoozeEmailDto
) => {
  const client = apiClient.getClient();

  const response = await client.post<ApiResponse<SnoozeResponseDto>>(
    `/api/v1/emails/kanban/${emailId}/snooze`,
    snoozeDto
  );

  return response.data.data;
};

// Api call lấy danh sách các email đã tạm ẩn
export const getSnoozedEmails = async () => {
  const client = apiClient.getClient();

  const response = await client.get<ApiResponse<SnoozeResponseDto[]>>(
    `/api/v1/emails/kanban/snoozed`
  );

  return response.data.data;
};

// Api call bỏ tạm ẩn email
export const unsnoozeEmail = async (emailId: string) => {
  const client = apiClient.getClient();

  const response = await client.post<
    ApiResponse<{ success: boolean; message: string }>
  >(`/api/v1/emails/kanban/${emailId}/unsnooze`);

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

// Api call tóm tắt email
// đang mock tạm thời, chưa có ai service
export const summarizeEmail = async (
  emailId: string,
  dto: SummarizeEmailDto
) => {
  const client = apiClient.getClient();

  const response = await client.post<ApiResponse<SummarizeResponseDto>>(
    `/api/v1/emails/kanban/${emailId}/summarize`,
    dto
  );

  return response.data.data;
};

// Api call lấy danh sách nhãn có thể gán cho cột Kanban
export const getAvailableLabels = async () => {
  const client = apiClient.getClient();

  const response = await client.get<ApiResponse<AvailableLabelDto[]>>(
    `/api/v1/emails/kanban/labels/available`
  );

  return response.data.data;
}

// Create new column
export const createKanbanColumn = async (dto: CreateColumnDto) => {
  const client = apiClient.getClient();

  const response = await client.post<ApiResponse<KanbanColumnInfoDto>>(
    `/api/v1/emails/kanban/columns`,
    dto
  );

  return response.data.data;
};

// Update existing column
export const updateKanbanColumn = async (
  columnId: KanbanColumnId,
  dto: UpdateColumnDto
) => {
  const client = apiClient.getClient();

  const response = await client.put<ApiResponse<KanbanColumnInfoDto>>(
    `/api/v1/emails/kanban/columns/${columnId}`,
    dto
  );

  return response.data.data;
};

// Soft delete a column
export const deleteKanbanColumn = async (columnId: KanbanColumnId) => {
  const client = apiClient.getClient();

  const response = await client.delete<ApiResponse<SimpleSuccessResponseDto>>(
    `/api/v1/emails/kanban/columns/${columnId}`
  );

  return response.data.data;
};

// Reorder multiple columns (update their display order)
export const reorderKanbanColumns = async (dto: ReorderColumnsDto) => {
  const client = apiClient.getClient();

  const response = await client.put<ApiResponse<SimpleSuccessResponseDto>>(
    `/api/v1/emails/kanban/columns/reorder`,
    dto
  );

  return response.data.data;
};
