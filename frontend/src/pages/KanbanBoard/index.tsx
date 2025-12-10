import {
  Archive,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import {
  kanbanKeys,
  useKanbanColumn,
  useMoveEmail,
  useSnoozedEmails,
  useSnoozeEmail,
  useSummarizeEmail,
  useUnsnoozeEmail,
} from "@/hooks/useKanbanQueries";
import { useMailboxEmails } from "@/hooks/useMailboxEmails";
import { DraggableEmailCard } from "@/pages/KanbanBoard/components/DraggableEmailCard";
import { DroppableColumn } from "@/pages/KanbanBoard/components/DroppableColumn";
import { StaticEmailCard } from "@/pages/KanbanBoard/components/StaticEmailCard";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";

import type {
  EmailCardDto,
  KanbanColumnId,
  SnoozeResponseDto,
} from "@/services/kanban/types";
const KanbanBoard = () => {
  const queryClient = useQueryClient();

  const baseColumns = React.useRef({
    TODO: {
      id: "TODO",
      title: "To Do",
      icon: <CheckCircle className='w-4 h-4' />,
      emails: [] as EmailCardDto[],
    },
    IN_PROGRESS: {
      id: "IN_PROGRESS",
      title: "In Progress",
      icon: <Clock className='w-4 h-4' />,
      emails: [] as EmailCardDto[],
    },
    DONE: {
      id: "DONE",
      title: "Done",
      icon: <Archive className='w-4 h-4' />,
      emails: [] as EmailCardDto[],
    },
  });
  const { mutate: moveEmail } = useMoveEmail();
  const { mutate: snoozeEmailMutation } = useSnoozeEmail();
  const { data: snoozedData } = useSnoozedEmails();
  const { mutate: unsnoozeEmailMutation } = useUnsnoozeEmail();
  const { mutate: summarizeEmail } = useSummarizeEmail();
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  const [columns, setColumns] = useState(() => ({
    TODO: { ...baseColumns.current.TODO },
    IN_PROGRESS: { ...baseColumns.current.IN_PROGRESS },
    DONE: { ...baseColumns.current.DONE },
  }));

  const [hiddenEmails, setHiddenEmails] = useState<SnoozeResponseDto[]>([]);
  const [activeEmail, setActiveEmail] = useState<EmailCardDto | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder] = useState("INBOX");
  const [showInboxPanel, setShowInboxPanel] = useState(true);
  const [showHiddenPanel, setShowHiddenPanel] = useState(false);
  const [processedEmailIds, setProcessedEmailIds] = useState<Set<string>>(
    new Set()
  );

  const { data: todoData, isLoading: isLoadingTodo } = useKanbanColumn("todo");
  const { data: inProgressData, isLoading: isLoadingInProgress } =
    useKanbanColumn("in_progress");
  const { data: doneData, isLoading: isLoadingDone } = useKanbanColumn("done");
  const { data: inboxData, isLoading: isLoadingInbox } = useKanbanColumn(
    "inbox",
    {
      search: searchQuery,
    }
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const {
    isLoading: isLoadingEmails,
    isFetching: isFetchingEmails,
    hasNextPage,
    loadNextPage,
  } = useMailboxEmails({
    labelId: selectedFolder,
    q: searchQuery,
  });

  const sentinelRef = useInfiniteScroll({
    hasMore: hasNextPage,
    isLoading: isFetchingEmails,
    onLoadMore: loadNextPage,
  });

  useEffect(() => {
    if (todoData || inProgressData || doneData) {
      setColumns({
        TODO: {
          ...baseColumns.current.TODO,
          emails: todoData?.emails || [],
        },
        IN_PROGRESS: {
          ...baseColumns.current.IN_PROGRESS,
          emails: inProgressData?.emails || [],
        },
        DONE: {
          ...baseColumns.current.DONE,
          emails: doneData?.emails || [],
        },
      });
    }
  }, [todoData, inProgressData, doneData]);

  useEffect(() => {
    const processed = new Set<string>();
    [todoData, inProgressData, doneData].forEach((columnData) => {
      columnData?.emails?.forEach((email) => processed.add(email.id));
    });
    setProcessedEmailIds(processed);
  }, [todoData, inProgressData, doneData]);

  // Cập nhật snoozed emails
  useEffect(() => {
    if (snoozedData) {
      // Map SnoozeResponseDto[] sang EmailCardDto[] nếu cần
      // hoặc giữ nguyên tùy structure
      setHiddenEmails(
        snoozedData.map((s) => {
          const info = s.emailInfo;
          const header = info?.header;

          return {
            id: s.emailId,
            from: s.from || header?.from,
            subject: s.subject || header?.subject,
            snippet: s.snippet || info?.snippet,
            date: s.snoozeUntil,
            isUnread: s.isUnread ?? info?.isUnread ?? false,
            isStarred: s.isStarred ?? info?.isStarred ?? false,
            summary: s.summary,
            hasSummary: !!s.summary,
            headers: s.headers || header,
          } as any;
        })
      );
    }
  }, [snoozedData]);

  const inboxEmails = (inboxData?.emails || []).filter(
    (email: EmailCardDto) => !processedEmailIds.has(email.id)
  );
  console.log("🚀 ~ KanbanBoard ~ inboxEmails:", inboxEmails);

  const handleSummarizeEmail = (emailId: string) => {
    setSummarizingId(emailId);
    summarizeEmail(
      { emailId, dto: {} },
      {
        onSuccess: (data) => {
          if (data) {
            setHiddenEmails((prev) =>
              prev.map((email: any) => {
                if (email.id === emailId) {
                  return { ...email, summary: data.summary, hasSummary: true };
                }
                return email;
              })
            );
          }
        },
        onSettled: () => setSummarizingId(null),
      }
    );
  };

  const isLoading =
    isLoadingTodo || isLoadingInProgress || isLoadingDone || isLoadingInbox;

  const handleDragStart = (event: any) => {
    const { active } = event;
    const email = active.data.current?.email;
    if (email) {
      setActiveEmail(email);
    }
  };
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveEmail(null);

    if (!over) return;

    const dragData = active.data.current;
    if (!dragData) return;

    const { email, source } = dragData;
    const targetColumnId = over.id as string;

    if (source === targetColumnId) return;

    // Map column IDs sang đúng format của API
    const columnIdMap: Record<string, KanbanColumnId> = {
      inbox: "inbox",
      TODO: "todo",
      IN_PROGRESS: "in_progress",
      DONE: "done",
    };

    const sourceColumnApi = columnIdMap[source as string] || source;
    const targetColumnApi = columnIdMap[targetColumnId] || targetColumnId;

    // Optimistic update UI
    const newColumns = {
      TODO: { ...columns.TODO, emails: [...columns.TODO.emails] },
      IN_PROGRESS: {
        ...columns.IN_PROGRESS,
        emails: [...columns.IN_PROGRESS.emails],
      },
      DONE: { ...columns.DONE, emails: [...columns.DONE.emails] },
    };

    if (source !== "inbox" && newColumns[source as keyof typeof newColumns]) {
      newColumns[source as keyof typeof newColumns].emails = newColumns[
        source as keyof typeof newColumns
      ].emails.filter((e) => e.id !== email.id);
    }

    const targetArr =
      newColumns[targetColumnId as keyof typeof newColumns]?.emails;
    if (targetArr) {
      const alreadyInTarget = targetArr.some((e) => e.id === email.id);
      if (!alreadyInTarget) {
        targetArr.push(email);
      }
    }

    setColumns(newColumns);
    setProcessedEmailIds((prev) => new Set(prev).add(email.id));

    // Call API
    moveEmail(
      {
        emailId: email.id,
        moveDto: {
          sourceColumn: sourceColumnApi as KanbanColumnId,
          targetColumn: targetColumnApi as KanbanColumnId,
        },
      },
      {
        onError: (error) => {
          console.error("Failed to move email:", error);
          // Revert optimistic update
          queryClient.invalidateQueries({ queryKey: kanbanKeys.columns() });
        },
      }
    );
  };

  const handleHideEmail = (emailId: string) => {
    const email = inboxEmails.find((e: EmailCardDto) => e.id === emailId);
    if (email) {
      // Optimistic update
      setHiddenEmails((prev) => [...prev, email as any]);
      setProcessedEmailIds((prev) => new Set(prev).add(emailId));

      // Call API - snooze với preset
      snoozeEmailMutation(
        {
          emailId,
          snoozeDto: {
            preset: "tomorrow", // hoặc cho user chọn preset
          },
        },
        {
          onError: (error) => {
            console.error("Failed to snooze email:", error);
            // Revert nếu lỗi
            setHiddenEmails((prev) => prev.filter((e) => e.id !== emailId));
            setProcessedEmailIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(emailId);
              return newSet;
            });
          },
        }
      );
    }
  };

  const handleUnhideEmail = (emailId: string) => {
    setHiddenEmails((prev) => prev.filter((e) => e.id !== emailId));
    setProcessedEmailIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(emailId);
      return newSet;
    });

    unsnoozeEmailMutation(emailId, {
      onError: (error) => {
        console.error("Failed to unsnooze email:", error);
        queryClient.invalidateQueries({ queryKey: kanbanKeys.snoozed() });
      },
    });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: kanbanKeys.columns() });
  };

  if (isLoadingEmails) {
    return (
      <div className='flex items-center justify-center h-[calc(100vh-64px)] bg-background'>
        <div className='text-center'>
          <Loader2 className='w-12 h-12 mx-auto mb-4 animate-spin text-muted-foreground' />
          <p className='text-muted-foreground'>Loading emails...</p>
        </div>
      </div>
    );
  }

  console.log("🚀 ~ KanbanBoard ~ hiddenEmails:", hiddenEmails);
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className='h-[calc(100vh-64px)] flex flex-col bg-background'>
        {/* Header */}
        <div className='bg-card border-b px-6 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                <Input
                  type='text'
                  placeholder='Search emails...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-10 w-64'
                />
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowHiddenPanel(!showHiddenPanel)}
                className='cursor-pointer'
              >
                <Eye className='w-4 h-4 mr-2' />
                Hidden ({hiddenEmails.length})
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={handleRefresh}
                className='cursor-pointer'
                disabled={isLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              {isFetchingEmails && (
                <Loader2 className='w-4 h-4 animate-spin text-muted-foreground' />
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className='flex-1 overflow-hidden flex'>
          {/* Inbox Panel */}
          <div
            className={`${
              showInboxPanel ? "w-100" : "w-0"
            } transition-all duration-300 border-r flex flex-col bg-sidebar`}
          >
            {showInboxPanel && (
              <>
                <div className='p-4 border-b bg-card flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Inbox className='w-4 h-4' />
                    <h3 className='font-semibold'>Inbox</h3>
                    <Badge variant='secondary'>{inboxEmails.length}</Badge>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => setShowInboxPanel(false)}
                    className='cursor-pointer'
                  >
                    <ChevronLeft className='w-4 h-4' />
                  </Button>
                </div>
                <div className='flex-1 p-4 overflow-y-auto'>
                  <div className='space-y-3'>
                    {inboxEmails.length === 0 ? (
                      <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
                        <Mail className='w-12 h-12 mb-2 opacity-50' />
                        <p className='text-sm text-center'>
                          All emails organized!
                        </p>
                      </div>
                    ) : (
                      <>
                        {inboxEmails.map((email: any) => (
                          <DraggableEmailCard
                            key={email.id}
                            email={email}
                            onHide={handleHideEmail}
                            onSummarize={handleSummarizeEmail}
                            isSummarizing={summarizingId === email.id}
                            source='inbox'
                          />
                        ))}
                        <div ref={sentinelRef} style={{ height: 32 }}></div>
                        {isFetchingEmails && inboxEmails.length > 0 && (
                          <div className='w-full p-4 text-center'>
                            <Loader2 className='w-4 h-4 animate-spin mx-auto text-muted-foreground' />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Show Inbox Button when collapsed */}
          {!showInboxPanel && (
            <div className='py-4 px-2 border bg-card'>
              <Button
                variant='ghost'
                size='icon'
                className='cursor-pointer'
                onClick={() => setShowInboxPanel(true)}
              >
                <ChevronRight className='w-4 h-4' />
              </Button>
            </div>
          )}

          {/* Kanban Board */}
          <div className='flex-1 overflow-x-auto p-6'>
            <div className='flex gap-6 h-full min-w-max'>
              {Object.values(columns).map((column) => (
                <div
                  key={column.id}
                  className='flex flex-col w-100 bg-sidebar rounded-lg'
                >
                  <div className='flex items-center justify-between p-4 border-b bg-card rounded-t-lg'>
                    <div className='flex items-center gap-2'>
                      {column.icon}
                      <h3 className='font-semibold'>{column.title}</h3>
                      <Badge variant='secondary'>{column.emails.length}</Badge>
                    </div>
                  </div>

                  <DroppableColumn id={column.id}>
                    <div className='space-y-3 min-h-[200px]'>
                      {column.emails.length === 0 ? (
                        <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
                          <Mail className='w-12 h-12 mb-2 opacity-50' />
                          <p className='text-sm'>Drop emails here</p>
                        </div>
                      ) : (
                        column.emails.map((email) => (
                          <DraggableEmailCard
                            key={email.id}
                            email={email}
                            source={column.id}
                            onSummarize={handleSummarizeEmail}
                            isSummarizing={summarizingId === email.id}
                          />
                        ))
                      )}
                    </div>
                  </DroppableColumn>
                </div>
              ))}
            </div>
          </div>

          {/* Hidden Emails Panel */}
          <div
            className={`${
              showHiddenPanel
                ? "w-100 opacity-100 translate-x-0"
                : "w-0 opacity-0 -translate-x-4 pointer-events-none"
            } transition-all duration-300 border-l flex flex-col bg-sidebar overflow-hidden`}
            aria-hidden={showHiddenPanel ? "false" : "true"}
          >
            <div
              className={`p-4 border-b bg-card flex items-center justify-between transition-opacity duration-200 ${
                showHiddenPanel ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className='flex items-center gap-2'>
                <EyeOff className='w-4 h-4' />
                <h3 className='font-semibold'>Hidden</h3>
                <Badge variant='secondary'>{hiddenEmails.length}</Badge>
              </div>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setShowHiddenPanel(false)}
                className='cursor-pointer'
              >
                <X className='w-4 h-4' />
              </Button>
            </div>

            <div
              className={`flex-1 p-4 overflow-y-auto transition-opacity duration-300 ${
                showHiddenPanel ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className='space-y-3'>
                {hiddenEmails.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
                    <Eye className='w-12 h-12 mb-2 opacity-50' />
                    <p className='text-sm text-center'>No hidden emails</p>
                  </div>
                ) : (
                  hiddenEmails.map((email) => (
                    <div key={email.id} className='relative'>
                      <StaticEmailCard
                        onSummarize={handleSummarizeEmail}
                        isSummarizing={summarizingId === email.id}
                        email={
                          {
                            id: email.id,
                            from: email.from,
                            subject: email.subject,
                            snippet: email.snippet,
                            date: email.date,
                            isUnread: false,
                            isStarred: false,
                            summary: email.summary,
                            hasSummary: !!email.summary,
                            headers: email.headers,
                          } as EmailCardDto
                        }
                      />
                      <Button
                        variant='ghost'
                        size='sm'
                        className='absolute top-2 right-2 cursor-pointer'
                        onClick={() => handleUnhideEmail(email.id)}
                      >
                        <Eye className='w-4 h-4' />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeEmail ? <StaticEmailCard email={activeEmail} /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
