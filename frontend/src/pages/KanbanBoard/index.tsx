/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Archive,
  CheckCircle,
  ChevronRight,
  Clock,
  Eye,
  Inbox,
  ListTodo,
  Loader2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import {
  kanbanKeys,
  useKanbanColumn,
  useKanbanColumnsMeta,
  useMoveEmail,
  useSnoozedEmails,
  useSnoozeEmail,
  useSummarizeEmail,
  useUnsnoozeEmail,
  useCreateKanbanColumn,
  useUpdateKanbanColumn,
  useDeleteKanbanColumn,
  useReorderKanbanColumns,
} from "@/hooks/useKanbanQueries";
import { useMailboxEmails } from "@/hooks/useMailboxEmails";
import { StaticEmailCard } from "./components/StaticEmailCard";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";

import { SearchResultsView } from "./components/SearchResultsView";
import { ColumnModals } from "./components/ColumnModals";
import { InboxPanel } from "./components/InboxPanel";
import { HiddenEmailsPanel } from "./components/HiddenEmailsPanel";
import { KanbanHeader } from "./components/KanbanHeader";
import { FilterPanel } from "./components/FilterPanel";

import type {
  EmailCardDto,
  KanbanColumnId,
  SnoozeResponseDto,
} from "@/services/kanban/types";
import { useNavigate } from "react-router-dom";
import KanbanColumn from "@/components/KanbanColumn";

export type ColumnSettings = {
  sortBy: "date-desc" | "date-asc" | "sender";
  filterUnread: boolean;
  filterAttachments: boolean;
  search: string;
};

const applyFiltersAndSort = (
  emails: EmailCardDto[],
  settings: ColumnSettings
) => {
  let filtered = [...emails];

  if (settings.filterUnread) {
    filtered = filtered.filter((email) => email.isUnread);
  }
  if (settings.filterAttachments) {
    filtered = filtered.filter((email) => email.hasAttachments);
  }

  if (settings.search.trim()) {
    const q = settings.search.toLowerCase();
    filtered = filtered.filter((email) => {
      const text = `${email.subject} ${email.fromName || ""} ${
        email.from || ""
      } ${email.snippet || ""}`.toLowerCase();
      return text.includes(q);
    });
  }

  filtered.sort((a, b) => {
    switch (settings.sortBy) {
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

const getColumnIcon = (columnName: string) => {
  const name = columnName.toLowerCase();
  if (name.includes("inbox")) return <Inbox className='w-4 h-4' />;
  if (name.includes("todo") || name.includes("to do"))
    return <CheckCircle className='w-4 h-4' />;
  if (name.includes("progress")) return <Clock className='w-4 h-4' />;
  if (name.includes("done")) return <Archive className='w-4 h-4' />;
  if (name.includes("snoozed")) return <Eye className='w-4 h-4' />;
  return <ListTodo className='w-4 h-4' />;
};

const KanbanBoard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch columns configuration
  const { data: columnsConfig, isLoading: isLoadingColumns } =
    useKanbanColumnsMeta();

  const { mutate: moveEmail } = useMoveEmail();
  const { mutate: snoozeEmailMutation } = useSnoozeEmail();
  const { data: snoozedData } = useSnoozedEmails();
  const { mutate: unsnoozeEmailMutation } = useUnsnoozeEmail();
  const { mutate: summarizeEmail } = useSummarizeEmail();
  const { mutate: createColumn } = useCreateKanbanColumn();
  const { mutate: updateColumn } = useUpdateKanbanColumn();
  const { mutate: deleteColumn } = useDeleteKanbanColumn();
  const { mutate: reorderColumns } = useReorderKanbanColumns();
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);

  const [newColumnName, setNewColumnName] = useState("");
  const [renameColumnId, setRenameColumnId] = useState<number | null>(null);
  const [renameColumnName, setRenameColumnName] = useState("");
  const [deleteColumnId, setDeleteColumnId] = useState<number | null>(null);
  const [reorderList, setReorderList] = useState<
    { id: number; order: number }[]
  >([]);

  const [inboxColumn, setInboxColumn] = useState<any>(null);
  const [kanbanColumns, setKanbanColumns] = useState<any[]>([]);

  const [columnSettings, setColumnSettings] = useState<
    Record<string, ColumnSettings>
  >({});
  const [columnSearchVisible, setColumnSearchVisible] = useState<
    Record<string, boolean>
  >({});

  const [hiddenEmails, setHiddenEmails] = useState<SnoozeResponseDto[]>([]);
  const [activeEmail, setActiveEmail] = useState<EmailCardDto | null>(null);
  const [searchQuery] = useState("");
  const [isSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<EmailCardDto[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedFolder] = useState("INBOX");
  const [showInboxPanel, setShowInboxPanel] = useState(true);
  const [showHiddenPanel, setShowHiddenPanel] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [processedEmailIds, setProcessedEmailIds] = useState<Set<string>>(
    new Set()
  );

  const { data: inboxData, isLoading: isLoadingInbox } = useKanbanColumn(
    inboxColumn?.id
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

  // Initialize columns from API
  useEffect(() => {
    if (columnsConfig?.columns) {
      const cols = Object.values(columnsConfig.columns);
      const sortedCols = cols.sort((a: any, b: any) => a.order - b.order);

      const inbox = sortedCols.find(
        (col: any) =>
          col.labelIds?.includes("INBOX") || col.name.toLowerCase() === "inbox"
      );
      const kanban = sortedCols.filter(
        (col: any) =>
          !col.labelIds?.includes("INBOX") && col.name.toLowerCase() !== "inbox"
      );

      setInboxColumn(inbox);
      setKanbanColumns(kanban);

      // Initialize settings
      const settings: Record<string, ColumnSettings> = {};
      const searchVisible: Record<string, boolean> = {};

      sortedCols.forEach((col: any) => {
        const key = col.id.toString();
        settings[key] = {
          sortBy: "date-desc",
          filterUnread: false,
          filterAttachments: false,
          search: "",
        };
        searchVisible[key] = false;
      });

      setColumnSettings(settings);
      setColumnSearchVisible(searchVisible);
    }
  }, [columnsConfig]);

  // Track processed emails from all kanban columns
  useEffect(() => {
    // Note: We can't directly access column data here anymore
    // since it's fetched in child components. We'll update this
    // when emails are moved.
  }, []);

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

  const updateColumnSettings = (
    columnId: string,
    updater: (prev: ColumnSettings) => ColumnSettings
  ) => {
    setColumnSettings((prev) => ({
      ...prev,
      [columnId]: updater(
        prev[columnId] || {
          sortBy: "date-desc",
          filterUnread: false,
          filterAttachments: false,
          search: "",
        }
      ),
    }));
  };

  const toggleColumnSearch = (columnId: string) => {
    setColumnSearchVisible((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  const inboxSettings = columnSettings[inboxColumn?.id?.toString()] || {
    sortBy: "date-desc",
    filterUnread: false,
    filterAttachments: false,
    search: "",
  };

  const filteredInboxEmails = useMemo(
    () => applyFiltersAndSort(inboxEmails, inboxSettings),
    [inboxEmails, inboxSettings]
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

  const clearSearch = () => {
    setSearchResults([]);
    setShowSearchResults(false);
  };

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

    // Find columns
    const sourceCol = kanbanColumns.find(
      (c: any) => c.id.toString() === source
    );
    const targetCol = kanbanColumns.find(
      (c: any) => c.id.toString() === targetColumnId
    );

    const sourceColumnApi = sourceCol ? sourceCol.id : inboxColumn?.id;
    const targetColumnApi = targetCol ? targetCol.id : targetColumnId;

    // Mark email as processed immediately
    setProcessedEmailIds((prev) => new Set(prev).add(email.id));

    // Get query keys for source and target columns
    const sourceQueryKey = kanbanKeys.column(sourceColumnApi);
    const targetQueryKey = kanbanKeys.column(targetColumnApi);

    // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
    queryClient.cancelQueries({ queryKey: sourceQueryKey });
    queryClient.cancelQueries({ queryKey: targetQueryKey });

    // Snapshot the previous values for rollback
    const previousSourceData = queryClient.getQueryData(sourceQueryKey);
    const previousTargetData = queryClient.getQueryData(targetQueryKey);

    // Optimistically update source column (remove email)
    queryClient.setQueryData(sourceQueryKey, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        emails: old.emails.filter((e: EmailCardDto) => e.id !== email.id),
      };
    });

    // Optimistically update target column (add email)
    queryClient.setQueryData(targetQueryKey, (old: any) => {
      if (!old) return old;

      // Check if email already exists
      const emailExists = old.emails.some(
        (e: EmailCardDto) => e.id === email.id
      );
      if (emailExists) return old;

      return {
        ...old,
        emails: [...old.emails, email],
      };
    });

    // Now call the API in background
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

          queryClient.setQueryData(sourceQueryKey, previousSourceData);
          queryClient.setQueryData(targetQueryKey, previousTargetData);

          // Remove from processed set
          setProcessedEmailIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(email.id);
            return newSet;
          });

          // Optional: Show error toast/notification
          // toast.error("Failed to move email. Please try again.");
        },
        onSuccess: () => {
          // Success! The optimistic update was correct
          // We can optionally refresh to ensure consistency
          // but it's not necessary for UX

          // Optional: Silently refetch in background to ensure data consistency
          queryClient.invalidateQueries({
            queryKey: sourceQueryKey,
            refetchType: "none",
          });
          queryClient.invalidateQueries({
            queryKey: targetQueryKey,
            refetchType: "none",
          });
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
            // preset: "tomorrow",
            // test 1 minute later
            preset: "custom",
            customDate: new Date(Date.now() + 1 * 60 * 1000).toISOString(),
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

  const handleEmailSelect = (emailId: string) => {
    navigate(`/email/${emailId}?from=kanban`);
  };

  const handleViewAllSearch = (query: string) => {
    setShowSearchResults(true);
    navigate(`/search?q=${encodeURIComponent(query)}&from=kanban`);
  };

  if (isLoadingEmails || isLoadingColumns) {
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
        <KanbanHeader
          onEmailSelect={handleEmailSelect}
          onViewAllSearch={handleViewAllSearch}
          onToggleFilterPanel={() => setShowFilterPanel(!showFilterPanel)}
          onToggleHiddenPanel={() => setShowHiddenPanel(!showHiddenPanel)}
          onRefresh={handleRefresh}
          onAddColumn={() => setShowAddModal(true)}
          onReorderColumns={() => {
            // prepare reorder list
            if (!columnsConfig?.columns) return;
            const cols = Object.values(columnsConfig.columns)
              .sort((a: any, b: any) => a.order - b.order)
              .map((c: any) => ({ id: c.id, order: c.order }));
            setReorderList(cols);
            setShowReorderModal(true);
          }}
          hiddenEmailsCount={hiddenEmails.length}
          activeFiltersCount={Object.values(columnSettings).reduce(
            (count, settings) => {
              return (
                count +
                (settings.filterUnread ? 1 : 0) +
                (settings.filterAttachments ? 1 : 0)
              );
            },
            0
          )}
          isFetchingEmails={isFetchingEmails}
        />

        {/* Column Modals */}
        <ColumnModals
          showAddModal={showAddModal}
          onCloseAddModal={() => {
            setNewColumnName("");
            setShowAddModal(false);
          }}
          newColumnName={newColumnName}
          onChangeColumnName={setNewColumnName}
          onCreateColumn={() => {
            if (!newColumnName.trim()) return;
            createColumn(
              { name: newColumnName.trim(), labelOption: "none" },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({
                    queryKey: kanbanKeys.metadata(),
                  });
                  queryClient.invalidateQueries({
                    queryKey: kanbanKeys.columns(),
                  });
                  setNewColumnName("");
                  setShowAddModal(false);
                },
              }
            );
          }}
          showRenameModal={showRenameModal}
          onCloseRenameModal={() => setShowRenameModal(false)}
          renameColumnName={renameColumnName}
          onChangeRenameColumnName={setRenameColumnName}
          onRenameColumn={() => {
            if (!renameColumnId || !renameColumnName.trim()) return;
            updateColumn(
              {
                columnId: renameColumnId,
                dto: { name: renameColumnName.trim() },
              },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({
                    queryKey: kanbanKeys.metadata(),
                  });
                  queryClient.invalidateQueries({
                    queryKey: kanbanKeys.columns(),
                  });
                  setRenameColumnId(null);
                  setRenameColumnName("");
                  setShowRenameModal(false);
                },
              }
            );
          }}
          showDeleteModal={showDeleteModal}
          onCloseDeleteModal={() => setShowDeleteModal(false)}
          onDeleteColumn={() => {
            if (!deleteColumnId) return;
            deleteColumn(deleteColumnId, {
              onSuccess: () => {
                queryClient.invalidateQueries({
                  queryKey: kanbanKeys.metadata(),
                });
                queryClient.invalidateQueries({
                  queryKey: kanbanKeys.columns(),
                });
                setDeleteColumnId(null);
                setShowDeleteModal(false);
              },
            });
          }}
          showReorderModal={showReorderModal}
          onCloseReorderModal={() => setShowReorderModal(false)}
          reorderList={reorderList}
          onUpdateReorderList={setReorderList}
          onSaveReorder={() => {
            // normalize orders to integers
            const payload = reorderList.map((r) => ({
              id: r.id,
              order: Number(r.order),
            }));
            reorderColumns(
              { columns: payload },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({
                    queryKey: kanbanKeys.metadata(),
                  });
                  queryClient.invalidateQueries({
                    queryKey: kanbanKeys.columns(),
                  });
                  setShowReorderModal(false);
                },
              }
            );
          }}
          columnsConfig={columnsConfig}
        />

        {/* Filter Panel */}
        {showFilterPanel && inboxColumn && (
          <>
            <FilterPanel
              sortBy={
                inboxSettings.sortBy === "date-desc" ? "secondary" : "ghost"
              }
              filterUnread={inboxSettings.filterUnread}
              filterAttachments={inboxSettings.filterAttachments}
              onChangeSortBy={() => {
                updateColumnSettings(inboxColumn.id.toString(), (prev) => ({
                  ...prev,
                  sortBy: "date-desc",
                }));
              }}
              onToggleUnread={() => {
                updateColumnSettings(inboxColumn.id.toString(), (prev) => ({
                  ...prev,
                  filterUnread: !prev.filterUnread,
                }));
              }}
              onToggleAttachments={() => {
                updateColumnSettings(inboxColumn.id.toString(), (prev) => ({
                  ...prev,
                  filterAttachments: !prev.filterAttachments,
                }));
              }}
              onClearAll={() => {
                updateColumnSettings(inboxColumn.id.toString(), () => ({
                  sortBy: "date-desc",
                  filterUnread: false,
                  filterAttachments: false,
                  search: "",
                }));
              }}
            />
          </>
        )}

        {/* Search Results View */}
        {showSearchResults && (
          <SearchResultsView
            searchResults={searchResults}
            isSearching={isSearching}
            onClose={clearSearch}
            onEmailSelect={handleEmailSelect}
          />
        )}

        {/* Main Content */}
        <div className='flex-1 overflow-hidden flex'>
          {/* Inbox Panel */}
          {inboxColumn && (
            <div
              className={`${
                showInboxPanel ? "w-100" : "w-0"
              } transition-all duration-300 border-r flex flex-col bg-sidebar`}
            >
              {showInboxPanel && (
                <>
                  <InboxPanel
                    column={inboxColumn}
                    emails={filteredInboxEmails}
                    settings={inboxSettings}
                    searchVisible={
                      columnSearchVisible[inboxColumn.id.toString()] || false
                    }
                    isLoading={isLoadingInbox}
                    isFetchingMore={isFetchingEmails}
                    summarizingId={summarizingId}
                    sentinelRef={sentinelRef}
                    onClose={() => setShowInboxPanel(false)}
                    onToggleSearch={() =>
                      toggleColumnSearch(inboxColumn.id.toString())
                    }
                    onUpdateSettings={(updater) =>
                      updateColumnSettings(inboxColumn.id.toString(), updater)
                    }
                    onHideEmail={handleHideEmail}
                    onSummarizeEmail={handleSummarizeEmail}
                    getColumnIcon={getColumnIcon}
                  />
                </>
              )}
            </div>
          )}

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

          {/* Kanban Board - Dynamic Columns */}
          <div className='flex-1 overflow-x-auto p-6'>
            <div className='flex gap-6 h-full min-w-max'>
              {kanbanColumns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  settings={
                    columnSettings[column.id.toString()] || {
                      sortBy: "date-desc",
                      filterUnread: false,
                      filterAttachments: false,
                      search: "",
                    }
                  }
                  searchVisible={
                    columnSearchVisible[column.id.toString()] || false
                  }
                  summarizingId={summarizingId}
                  onUpdateSettings={(updater) =>
                    updateColumnSettings(column.id.toString(), updater)
                  }
                  onToggleSearch={() =>
                    toggleColumnSearch(column.id.toString())
                  }
                  onSummarize={handleSummarizeEmail}
                  onRenameColumn={() => {
                    setRenameColumnId(column.id);
                    setRenameColumnName(column.name);
                    setShowRenameModal(true);
                  }}
                  onDeleteColumn={() => {
                    setDeleteColumnId(column.id);
                    setShowDeleteModal(true);
                  }}
                />
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
            {showHiddenPanel && (
              <HiddenEmailsPanel
                hiddenEmails={hiddenEmails}
                summarizingId={summarizingId}
                onClose={() => setShowHiddenPanel(false)}
                onUnhideEmail={handleUnhideEmail}
                onSummarizeEmail={handleSummarizeEmail}
              />
            )}
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
