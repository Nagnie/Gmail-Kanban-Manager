import {
  Archive,
  ArrowUpDown,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Paperclip,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

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
  const [searchQuery] = useState("");
  const [fuzzySearchQuery, setFuzzySearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<EmailCardDto[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedFolder] = useState("INBOX");
  const [showInboxPanel, setShowInboxPanel] = useState(true);
  const [showHiddenPanel, setShowHiddenPanel] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [processedEmailIds, setProcessedEmailIds] = useState<Set<string>>(
    new Set()
  );

  // Filter & Sort states
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "sender">(
    "date-desc"
  );
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterAttachments, setFilterAttachments] = useState(false);

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

  useEffect(() => {
    if (snoozedData) {
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

  // Apply filters and sorting
  const applyFiltersAndSort = (emails: EmailCardDto[]) => {
    let filtered = [...emails];

    // Apply filters
    if (filterUnread) {
      filtered = filtered.filter((email) => email.isUnread);
    }
    if (filterAttachments) {
      filtered = filtered.filter((email) => email.hasAttachments);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "sender":
          return (a.fromName || a.from || "").localeCompare(
            b.fromName || b.from || ""
          );
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Filtered columns
  const filteredColumns = useMemo(
    () => ({
      TODO: {
        ...columns.TODO,
        emails: applyFiltersAndSort(columns.TODO.emails),
      },
      IN_PROGRESS: {
        ...columns.IN_PROGRESS,
        emails: applyFiltersAndSort(columns.IN_PROGRESS.emails),
      },
      DONE: {
        ...columns.DONE,
        emails: applyFiltersAndSort(columns.DONE.emails),
      },
    }),
    [columns, sortBy, filterUnread, filterAttachments]
  );

  const filteredInboxEmails = useMemo(
    () => applyFiltersAndSort(inboxEmails),
    [inboxEmails, sortBy, filterUnread, filterAttachments]
  );

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

  // Fuzzy search handler
  const handleFuzzySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuzzySearchQuery.trim()) return;

    setIsSearching(true);

    // Simulate fuzzy search on all emails
    setTimeout(() => {
      const allEmails = [
        ...filteredInboxEmails,
        ...filteredColumns.TODO.emails,
        ...filteredColumns.IN_PROGRESS.emails,
        ...filteredColumns.DONE.emails,
      ];

      const query = fuzzySearchQuery.toLowerCase();
      const results = allEmails.filter((email) => {
        const searchText =
          `${email.subject} ${email.from} ${email.fromName} ${email.snippet}`.toLowerCase();
        return searchText.includes(query);
      });

      setSearchResults(results);
      setShowSearchResults(true);
      setIsSearching(false);
    }, 300);
  };

  const clearSearch = () => {
    setFuzzySearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
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

    const columnIdMap: Record<string, KanbanColumnId> = {
      inbox: "inbox",
      TODO: "todo",
      IN_PROGRESS: "in_progress",
      DONE: "done",
    };

    const sourceColumnApi = columnIdMap[source as string] || source;
    const targetColumnApi = columnIdMap[targetColumnId] || targetColumnId;

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
          queryClient.invalidateQueries({ queryKey: kanbanKeys.columns() });
        },
      }
    );
  };

  const handleHideEmail = (emailId: string) => {
    const email = filteredInboxEmails.find(
      (e: EmailCardDto) => e.id === emailId
    );
    if (email) {
      setHiddenEmails((prev) => [...prev, email as any]);
      setProcessedEmailIds((prev) => new Set(prev).add(emailId));

      snoozeEmailMutation(
        {
          emailId,
          snoozeDto: {
            preset: "tomorrow",
          },
        },
        {
          onError: (error) => {
            console.error("Failed to snooze email:", error);
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
          <div className='flex items-center justify-between gap-3'>
            <div className='flex items-center gap-3 flex-1'>
              {/* Fuzzy Search Bar */}
              <form
                onSubmit={handleFuzzySearch}
                className='relative flex-1 max-w-md'
              >
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                <Input
                  type='text'
                  placeholder='Search all emails...'
                  value={fuzzySearchQuery}
                  onChange={(e) => setFuzzySearchQuery(e.target.value)}
                  className='pl-10 pr-10'
                />
                {fuzzySearchQuery && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7'
                    onClick={clearSearch}
                  >
                    <X className='w-4 h-4' />
                  </Button>
                )}
              </form>

              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className='cursor-pointer'
              >
                <SlidersHorizontal className='w-4 h-4 mr-2' />
                Filters
                {(filterUnread || filterAttachments) && (
                  <Badge
                    variant='destructive'
                    className='ml-2 h-5 w-5 p-0 text-xs'
                  >
                    {(filterUnread ? 1 : 0) + (filterAttachments ? 1 : 0)}
                  </Badge>
                )}
              </Button>

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

        {/* Filter Panel */}
        {showFilterPanel && (
          <div className='bg-card border-b px-6 py-3'>
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-2'>
                <ArrowUpDown className='w-4 h-4 text-muted-foreground' />
                <span className='text-sm font-medium'>Sort:</span>
                <Button
                  variant={sortBy === "date-desc" ? "secondary" : "ghost"}
                  size='sm'
                  onClick={() => setSortBy("date-desc")}
                  className='cursor-pointer'
                >
                  Newest First
                </Button>
                <Button
                  variant={sortBy === "date-asc" ? "secondary" : "ghost"}
                  size='sm'
                  onClick={() => setSortBy("date-asc")}
                  className='cursor-pointer'
                >
                  Oldest First
                </Button>
                <Button
                  variant={sortBy === "sender" ? "secondary" : "ghost"}
                  size='sm'
                  onClick={() => setSortBy("sender")}
                  className='cursor-pointer'
                >
                  By Sender
                </Button>
              </div>

              <div className='h-6 w-px bg-border' />

              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium'>Filter:</span>
                <Button
                  variant={filterUnread ? "secondary" : "ghost"}
                  size='sm'
                  onClick={() => setFilterUnread(!filterUnread)}
                  className='cursor-pointer'
                >
                  <MailOpen className='w-4 h-4 mr-2' />
                  Unread Only
                </Button>
                <Button
                  variant={filterAttachments ? "secondary" : "ghost"}
                  size='sm'
                  onClick={() => setFilterAttachments(!filterAttachments)}
                  className='cursor-pointer'
                >
                  <Paperclip className='w-4 h-4 mr-2' />
                  Has Attachments
                </Button>
              </div>

              {(filterUnread ||
                filterAttachments ||
                sortBy !== "date-desc") && (
                <>
                  <div className='h-6 w-px bg-border' />
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      setSortBy("date-desc");
                      setFilterUnread(false);
                      setFilterAttachments(false);
                    }}
                    className='cursor-pointer'
                  >
                    <X className='w-4 h-4 mr-2' />
                    Clear All
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Search Results View */}
        {showSearchResults && (
          <div className='absolute inset-0 z-50 bg-background'>
            <div className='h-full flex flex-col'>
              <div className='bg-card border-b px-6 py-4 flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={clearSearch}
                    className='cursor-pointer'
                  >
                    <ChevronLeft className='w-4 h-4' />
                  </Button>
                  <h2 className='text-lg font-semibold'>Search Results</h2>
                  <Badge variant='secondary'>
                    {searchResults.length} found
                  </Badge>
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={clearSearch}
                  className='cursor-pointer'
                >
                  Close
                </Button>
              </div>

              <div className='flex-1 overflow-y-auto p-6'>
                {isSearching ? (
                  <div className='flex flex-col items-center justify-center py-12'>
                    <Loader2 className='w-12 h-12 mb-4 animate-spin text-muted-foreground' />
                    <p className='text-muted-foreground'>Searching...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-12'>
                    <Search className='w-12 h-12 mb-4 text-muted-foreground opacity-50' />
                    <p className='text-lg font-medium mb-2'>No results found</p>
                    <p className='text-sm text-muted-foreground'>
                      Try searching with different keywords
                    </p>
                  </div>
                ) : (
                  <div className='max-w-4xl mx-auto space-y-3'>
                    {searchResults.map((email) => (
                      <div
                        key={email.id}
                        className='bg-card rounded-lg border p-4 hover:shadow-md transition-shadow'
                      >
                        <div className='flex items-start justify-between gap-4'>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-2 mb-1'>
                              <span className='font-medium text-sm truncate'>
                                {email.fromName || email.from}
                              </span>
                              {email.isUnread && (
                                <Badge
                                  variant='secondary'
                                  className='h-5 text-xs'
                                >
                                  New
                                </Badge>
                              )}
                              {email.hasAttachments && (
                                <Paperclip className='w-3 h-3 text-muted-foreground' />
                              )}
                            </div>
                            <h3 className='font-semibold mb-1 truncate'>
                              {email.subject}
                            </h3>
                            <p className='text-sm text-muted-foreground line-clamp-2'>
                              {email.snippet}
                            </p>
                            <p className='text-xs text-muted-foreground mt-2'>
                              {new Date(email.date).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant='outline'
                            size='sm'
                            className='cursor-pointer shrink-0'
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
                    <Badge variant='secondary'>
                      {filteredInboxEmails.length}
                    </Badge>
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
                    {filteredInboxEmails.length === 0 ? (
                      <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
                        <Mail className='w-12 h-12 mb-2 opacity-50' />
                        <p className='text-sm text-center'>
                          {filterUnread || filterAttachments
                            ? "No emails match filters"
                            : "All emails organized!"}
                        </p>
                      </div>
                    ) : (
                      <>
                        {filteredInboxEmails.map((email: any) => (
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
                        {isFetchingEmails && filteredInboxEmails.length > 0 && (
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
              {Object.values(filteredColumns).map((column) => (
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
                          <p className='text-sm'>
                            {filterUnread || filterAttachments
                              ? "No emails match filters"
                              : "Drop emails here"}
                          </p>
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
            <div className='p-4 border-b bg-card flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <EyeOff className='w-4 h-4' />
                <h3 className='font-semibold'>Hidden Emails</h3>
                <Badge variant='secondary'>{hiddenEmails.length}</Badge>
              </div>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setShowHiddenPanel(false)}
                className='cursor-pointer'
              >
                <ChevronRight className='w-4 h-4' />
              </Button>
            </div>
            <div className='flex-1 p-4 overflow-y-auto'>
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
