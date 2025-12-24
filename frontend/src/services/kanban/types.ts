export interface ColumnConfig {
  id: KanbanColumnId;
  title: string;
  icon: React.ReactNode;
}

export type KanbanColumnId = number;

export interface KanbanColumnMeta {
  [key: number]: {
    id: KanbanColumnId;
    name: string;
    labelIds: string[];
    order: number;
    count: number;
  };
}

export interface KanbanColumnsMetaResponseDto {
  columns: KanbanColumnMeta;
}

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
  headers: EmailHeadersDto;
}

export class EmailHeadersDto {
  subject: string | undefined;
  from: string | undefined;
  to: string | undefined;
  cc?: string | undefined;
  bcc?: string | undefined;
  date: string | undefined;
  replyTo?: string | undefined;
  messageId?: string | undefined;
  references?: string | undefined;
  inReplyTo?: string | undefined;
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

export type SnoozePreset =
  | "later_today"
  | "tomorrow"
  | "this_weekend"
  | "next_week"
  | "custom";

export interface SnoozeEmailDto {
  preset: SnoozePreset;
  customDate?: string;
}

export interface SnoozeResponseDto {
  id: string;
  subject?: string;
  from?: string;
  snippet?: string;
  hasSummary?: boolean;
  summary?: string;
  date?: string;
  hasAttachments?: boolean;
  isUnread?: boolean;
  isStarred?: boolean;
  isImportant?: boolean;
  labelIds?: string[];
  threadId?: string;
  emailId: string;
  originalColumn: KanbanColumnId;
  snoozeUntil: string;
  isRestored: boolean;
  description: string;
  headers?: EmailHeadersDto;
  emailInfo?: {
    id: string;
    snippet: string;
    isUnread: boolean;
    isStarred: boolean;
    isImportant: boolean;
    header: {
      subject: string;
      from: string;
      to: string;
      date: string;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
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

// Column management DTOs / responses
export interface KanbanColumnInfoDto {
  id: number;
  name: string;
  gmailLabel?: string;
  gmailLabelName?: string;
  order: number;
  isActive: boolean;
  hasEmailSync: boolean;
  createdAt: string;
  updatedAt: string;
}

export type LabelType = "system" | "user" | "kanban";

export interface AvailableLabelDto {
  id: string;
  name: string;
  type: LabelType; 
  isKanbanLabel: boolean;
  isAssigned: boolean;
  emailCount: number;
}

export type LabelOption = "none" | "existing" | "new";

export interface CreateColumnDto {
  name: string;
  labelOption?: LabelOption;
  existingLabelId?: string;
  existingLabelName?: string;
  newLabelName?: string;
}

export interface UpdateColumnDto extends CreateColumnDto {}

export interface ReorderColumnsDto {
  columns: {
    id: number;
    order: number;
  }[];
}

export interface SimpleSuccessResponseDto {
  success: boolean;
}
