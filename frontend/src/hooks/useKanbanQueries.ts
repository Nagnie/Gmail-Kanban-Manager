import {
  getKanbanColumn,
  getSnoozedEmails,
  moveEmailToColumn,
  reorderEmailsInColumn,
  snoozeEmail,
  summarizeEmail,
  unsnoozeEmail,
} from "@/services/kanban/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  KanbanColumnId,
  MoveEmailDto,
  ReorderEmailsDto,
  SnoozeEmailDto,
  SummarizeEmailDto,
  GetColumnQueryDto,
} from "@/services/kanban/types";

// Query keys
export const kanbanKeys = {
  all: ["kanban"] as const,
  columns: () => [...kanbanKeys.all, "columns"] as const,
  column: (columnId: KanbanColumnId, query?: GetColumnQueryDto) =>
    [...kanbanKeys.columns(), columnId, query] as const,
  snoozed: () => [...kanbanKeys.all, "snoozed"] as const,
};

// Hook để lấy dữ liệu một cột
export const useKanbanColumn = (
  columnId: KanbanColumnId,
  query?: GetColumnQueryDto
) => {
  return useQuery({
    queryKey: kanbanKeys.column(columnId, query),
    queryFn: () => getKanbanColumn(columnId, query),
    staleTime: 30000, // 30 seconds
  });
};

// Hook để move email
export const useMoveEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      emailId,
      moveDto,
    }: {
      emailId: string;
      moveDto: MoveEmailDto;
    }) => moveEmailToColumn(emailId, moveDto),
    onSuccess: (data) => {
      if (!data) return;
      // Invalidate cả source và target column
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.column(data.sourceColumn),
      });
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.column(data.targetColumn),
      });
    },
  });
};

// Hook để reorder emails
export const useReorderEmails = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reorderDto: ReorderEmailsDto) =>
      reorderEmailsInColumn(reorderDto),
    onSuccess: (data, variables) => {
      if (!data) return;
      // Invalidate cột đã reorder
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.column(variables.columnId),
      });
    },
  });
};

// Hook để snooze email
export const useSnoozeEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      emailId,
      snoozeDto,
    }: {
      emailId: string;
      snoozeDto: SnoozeEmailDto;
    }) => snoozeEmail(emailId, snoozeDto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.snoozed() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.columns() });
    },
  });
};

// Hook để lấy danh sách snoozed emails
export const useSnoozedEmails = () => {
  return useQuery({
    queryKey: kanbanKeys.snoozed(),
    queryFn: getSnoozedEmails,
  });
};

// Hook để unsnooze email
export const useUnsnoozeEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (emailId: string) => unsnoozeEmail(emailId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.snoozed() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.columns() });
    },
  });
};

// Hook để summarize email
export const useSummarizeEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      emailId,
      dto,
    }: {
      emailId: string;
      dto: SummarizeEmailDto;
    }) => summarizeEmail(emailId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanKeys.columns() });
      queryClient.invalidateQueries({ queryKey: kanbanKeys.snoozed() });
    },
  });
};
