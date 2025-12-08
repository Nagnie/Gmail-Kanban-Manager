export interface ColumnConfig {
    id: KanbanColumnId;
    title: string;
    icon: React.ReactNode;
}

export type KanbanColumnId = "inbox" | "todo" | "in_progress" | "done" | "snoozed";

export interface EmailCardDto {
    id: string;
    subject: string;
    from: string;
    fromName?: string;
    snippet: string;
    summary?: string;
    hasSummary: boolean;
    summarizedAt?: string | null;
    date: string;
    hasAttachments: boolean;
    attachmentCount?: number;
    isUnread: boolean;
    isStarred: boolean;
    isImportant: boolean;
    labelIds: string[];
    threadId: string;
    isPinned?: boolean;
    priorityLevel?: number;
}

export interface KanbanColumnPaginationDto {
    nextPageToken?: string;
    estimatedTotal: number;
    hasMore: boolean;
}

export interface KanbanColumnDto {
    id: KanbanColumnId;
    name: string;
    labelIds: string[];
    count: number;
    emails: EmailCardDto[];
    color?: string;
    order: number;
    pagination: KanbanColumnPaginationDto;
    canReorder: boolean;
    pinnedCount?: number;
}

export interface GetColumnQueryDto {
    limit?: number;
    pageToken?: string;
    search?: string;
    from?: string;
    hasAttachments?: boolean;
    isUnread?: boolean;
    isStarred?: boolean;
    isImportant?: boolean;
}

export interface MoveEmailDto {
    sourceColumn: KanbanColumnId;
    targetColumn: KanbanColumnId;
    targetPosition?: number;
}

export interface MoveEmailResponseDto {
    success: boolean;
    emailId: string;
    sourceColumn: KanbanColumnId;
    targetColumn: KanbanColumnId;
    message: string;
}

export interface EmailOrderDto {
    emailId: string;
    order: number;
}

export interface ReorderEmailsDto {
    columnId: KanbanColumnId;
    emails: EmailOrderDto[];
}

export interface ReorderEmailsResponseDto {
    success: boolean;
    message: string;
}

export type SnoozePreset = "later_today" | "tomorrow" | "this_weekend" | "next_week" | "custom";

export interface SnoozeEmailDto {
    preset: SnoozePreset;
    customDate?: string;
}

export interface SnoozeResponseDto {
    id: number;
    emailId: string;
    originalColumn: KanbanColumnId;
    snoozeUntil: string;
    isRestored: boolean;
    description: string;
}

export interface PinEmailDto {
    columnId: KanbanColumnId;
    position?: number;
}

export interface SetPriorityDto {
    priorityLevel: number; // 'Priority level (0 = normal, 1 = high, 2 = urgent)'
}

export interface PinResponseDto {
    emailId: string;
    isPinned: boolean;
    pinnedOrder: number;
    priorityLevel: number;
}

export interface SummarizeEmailDto {
    forceRegenerate?: boolean;
}

export interface SummarizeResponseDto {
    emailId: string;
    summary: string;
    fromDatabase: boolean;
    summarizedAt: string;
}
