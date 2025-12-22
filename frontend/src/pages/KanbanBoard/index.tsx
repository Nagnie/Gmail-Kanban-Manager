/* eslint-disable @typescript-eslint/no-explicit-any */
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
    ListTodo,
    Loader2,
    Mail,
    MailOpen,
    Paperclip,
    RefreshCw,
    Search,
    SlidersHorizontal,
    X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/hooks/useKanbanQueries";
import { useMailboxEmails } from "@/hooks/useMailboxEmails";
import { DraggableEmailCard } from "@/pages/KanbanBoard/components/DraggableEmailCard";
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

import type { EmailCardDto, KanbanColumnId, SnoozeResponseDto } from "@/services/kanban/types";
import { FuzzySearchBar } from "@/components/FuzzySearchBar";
import { useNavigate } from "react-router-dom";
import KanbanColumn from "@/components/KanbanColumn";

export type ColumnSettings = {
    sortBy: "date-desc" | "date-asc" | "sender";
    filterUnread: boolean;
    filterAttachments: boolean;
    search: string;
};

const applyFiltersAndSort = (emails: EmailCardDto[], settings: ColumnSettings) => {
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
            const text = `${email.subject} ${email.fromName || ""} ${email.from || ""} ${
                email.snippet || ""
            }`.toLowerCase();
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
                return (a.fromName || a.from || "").localeCompare(b.fromName || b.from || "");
            default:
                return 0;
        }
    });

    return filtered;
};

const getColumnIcon = (columnName: string) => {
    const name = columnName.toLowerCase();
    if (name.includes("inbox")) return <Inbox className="w-4 h-4" />;
    if (name.includes("todo") || name.includes("to do")) return <CheckCircle className="w-4 h-4" />;
    if (name.includes("progress")) return <Clock className="w-4 h-4" />;
    if (name.includes("done")) return <Archive className="w-4 h-4" />;
    if (name.includes("snoozed")) return <Eye className="w-4 h-4" />;
    return <ListTodo className="w-4 h-4" />;
};

const KanbanBoard = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Fetch columns configuration
    const { data: columnsConfig, isLoading: isLoadingColumns } = useKanbanColumnsMeta();

    const { mutate: moveEmail } = useMoveEmail();
    const { mutate: snoozeEmailMutation } = useSnoozeEmail();
    const { data: snoozedData } = useSnoozedEmails();
    const { mutate: unsnoozeEmailMutation } = useUnsnoozeEmail();
    const { mutate: summarizeEmail } = useSummarizeEmail();
    const [summarizingId, setSummarizingId] = useState<string | null>(null);

    const [inboxColumn, setInboxColumn] = useState<any>(null);
    const [kanbanColumns, setKanbanColumns] = useState<any[]>([]);

    const [columnSettings, setColumnSettings] = useState<Record<string, ColumnSettings>>({});
    const [columnSearchVisible, setColumnSearchVisible] = useState<Record<string, boolean>>({});

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
    const [processedEmailIds, setProcessedEmailIds] = useState<Set<string>>(new Set());

    const { data: inboxData, isLoading: isLoadingInbox } = useKanbanColumn(inboxColumn?.id);

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
                (col: any) => col.labelIds?.includes("INBOX") || col.name.toLowerCase() === "inbox"
            );
            const kanban = sortedCols.filter(
                (col: any) => !col.labelIds?.includes("INBOX") && col.name.toLowerCase() !== "inbox"
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
        const sourceCol = kanbanColumns.find((c: any) => c.id.toString() === source);
        const targetCol = kanbanColumns.find((c: any) => c.id.toString() === targetColumnId);

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
            const emailExists = old.emails.some((e: EmailCardDto) => e.id === email.id);
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
        const email = filteredInboxEmails.find((e: EmailCardDto) => e.id === emailId);

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
            <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-background">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">Loading emails...</p>
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
            <div className="h-[calc(100vh-64px)] flex flex-col bg-background">
                {/* Header */}
                <div className="bg-card border-b px-6 py-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                            <FuzzySearchBar
                                onEmailSelect={handleEmailSelect}
                                onViewAll={handleViewAllSearch}
                            />

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFilterPanel(!showFilterPanel)}
                                className="cursor-pointer"
                            >
                                <SlidersHorizontal className="w-4 h-4 mr-2" />
                                Filters
                                {(inboxSettings.filterUnread ||
                                    inboxSettings.filterAttachments) && (
                                    <Badge
                                        variant="destructive"
                                        className="ml-2 h-5 w-5 p-0 text-xs"
                                    >
                                        {(inboxSettings.filterUnread ? 1 : 0) +
                                            (inboxSettings.filterAttachments ? 1 : 0)}
                                    </Badge>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowHiddenPanel(!showHiddenPanel)}
                                className="cursor-pointer"
                            >
                                <Eye className="w-4 h-4 mr-2" />
                                Hidden ({hiddenEmails.length})
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                className="cursor-pointer"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh
                            </Button>

                            {isFetchingEmails && (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilterPanel && inboxColumn && (
                    <div className="bg-card border-b px-6 py-3">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Sort:</span>
                                <Button
                                    variant={
                                        inboxSettings.sortBy === "date-desc" ? "secondary" : "ghost"
                                    }
                                    size="sm"
                                    onClick={() => {
                                        updateColumnSettings(inboxColumn.id.toString(), (prev) => ({
                                            ...prev,
                                            sortBy: "date-desc",
                                        }));
                                    }}
                                    className="cursor-pointer"
                                >
                                    Newest First
                                </Button>
                                <Button
                                    variant={
                                        inboxSettings.sortBy === "date-asc" ? "secondary" : "ghost"
                                    }
                                    size="sm"
                                    onClick={() => {
                                        updateColumnSettings(inboxColumn.id.toString(), (prev) => ({
                                            ...prev,
                                            sortBy: "date-asc",
                                        }));
                                    }}
                                    className="cursor-pointer"
                                >
                                    Oldest First
                                </Button>
                                <Button
                                    variant={
                                        inboxSettings.sortBy === "sender" ? "secondary" : "ghost"
                                    }
                                    size="sm"
                                    onClick={() => {
                                        updateColumnSettings(inboxColumn.id.toString(), (prev) => ({
                                            ...prev,
                                            sortBy: "sender",
                                        }));
                                    }}
                                    className="cursor-pointer"
                                >
                                    By Sender
                                </Button>
                            </div>

                            <div className="h-6 w-px bg-border" />

                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Filter:</span>
                                <Button
                                    variant={inboxSettings.filterUnread ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => {
                                        updateColumnSettings(inboxColumn.id.toString(), (prev) => ({
                                            ...prev,
                                            filterUnread: !prev.filterUnread,
                                        }));
                                    }}
                                    className="cursor-pointer"
                                >
                                    <MailOpen className="w-4 h-4 mr-2" />
                                    Unread Only
                                </Button>
                                <Button
                                    variant={
                                        inboxSettings.filterAttachments ? "secondary" : "ghost"
                                    }
                                    size="sm"
                                    onClick={() => {
                                        updateColumnSettings(inboxColumn.id.toString(), (prev) => ({
                                            ...prev,
                                            filterAttachments: !prev.filterAttachments,
                                        }));
                                    }}
                                    className="cursor-pointer"
                                >
                                    <Paperclip className="w-4 h-4 mr-2" />
                                    Has Attachments
                                </Button>
                            </div>

                            {(inboxSettings.filterUnread ||
                                inboxSettings.filterAttachments ||
                                inboxSettings.sortBy !== "date-desc") && (
                                <>
                                    <div className="h-6 w-px bg-border" />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            updateColumnSettings(inboxColumn.id.toString(), () => ({
                                                sortBy: "date-desc",
                                                filterUnread: false,
                                                filterAttachments: false,
                                                search: "",
                                            }));
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Clear All
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Search Results View */}
                {showSearchResults && (
                    <div className="absolute inset-0 z-50 bg-background">
                        <div className="h-full flex flex-col">
                            <div className="bg-card border-b px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={clearSearch}
                                        className="cursor-pointer"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <h2 className="text-lg font-semibold">Search Results</h2>
                                    <Badge variant="secondary">{searchResults.length} found</Badge>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearSearch}
                                    className="cursor-pointer"
                                >
                                    Close
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {isSearching ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <Loader2 className="w-12 h-12 mb-4 animate-spin text-muted-foreground" />
                                        <p className="text-muted-foreground">Searching...</p>
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <Search className="w-12 h-12 mb-4 text-muted-foreground opacity-50" />
                                        <p className="text-lg font-medium mb-2">No results found</p>
                                        <p className="text-sm text-muted-foreground">
                                            Try searching with different keywords
                                        </p>
                                    </div>
                                ) : (
                                    <div className="max-w-4xl mx-auto space-y-3">
                                        {searchResults.map((email) => (
                                            <div
                                                key={email.id}
                                                className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer"
                                                onClick={() => handleEmailSelect(email.id)}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-sm truncate">
                                                                {email.fromName || email.from}
                                                            </span>
                                                            {email.isUnread && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="h-5 text-xs"
                                                                >
                                                                    New
                                                                </Badge>
                                                            )}
                                                            {email.hasAttachments && (
                                                                <Paperclip className="w-3 h-3 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                        <h3 className="font-semibold mb-1 truncate">
                                                            {email.subject}
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                                            {email.snippet}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                            {new Date(email.date).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="cursor-pointer shrink-0"
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
                <div className="flex-1 overflow-hidden flex">
                    {/* Inbox Panel */}
                    {inboxColumn && (
                        <div
                            className={`${
                                showInboxPanel ? "w-100" : "w-0"
                            } transition-all duration-300 border-r flex flex-col bg-sidebar`}
                        >
                            {showInboxPanel && (
                                <>
                                    <div className="p-4 border-b bg-card flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {getColumnIcon(inboxColumn.name)}
                                            <h3 className="font-semibold">{inboxColumn.name}</h3>
                                            <Badge variant="secondary">
                                                {filteredInboxEmails.length}
                                            </Badge>
                                        </div>

                                        <div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 cursor-pointer"
                                                onClick={() =>
                                                    toggleColumnSearch(inboxColumn.id.toString())
                                                }
                                            >
                                                <Search
                                                    className={`w-4 h-4 ${
                                                        columnSearchVisible[
                                                            inboxColumn.id.toString()
                                                        ]
                                                            ? "text-primary"
                                                            : ""
                                                    }`}
                                                />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setShowInboxPanel(false)}
                                                className="cursor-pointer"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {columnSearchVisible[inboxColumn.id.toString()] && (
                                        <div className="px-4 mt-2">
                                            <div className="animate-in slide-in-from-top-2 duration-200 pr-2">
                                                <div className="relative">
                                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                                    <Input
                                                        className="pl-7 pr-7 h-8 text-xs"
                                                        placeholder="Search in this column..."
                                                        value={inboxSettings.search}
                                                        onChange={(e) => {
                                                            updateColumnSettings(
                                                                inboxColumn.id.toString(),
                                                                (prev) => ({
                                                                    ...prev,
                                                                    search: e.target.value,
                                                                })
                                                            );
                                                        }}
                                                        autoFocus
                                                    />
                                                    {inboxSettings.search && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6"
                                                            onClick={() =>
                                                                updateColumnSettings(
                                                                    inboxColumn.id.toString(),
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        search: "",
                                                                    })
                                                                )
                                                            }
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex-1 p-4 overflow-y-auto">
                                        <div className="space-y-3">
                                            {isLoadingInbox ? (
                                                <div className="flex justify-center py-12">
                                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                                </div>
                                            ) : filteredInboxEmails.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                                    <Mail className="w-12 h-12 mb-2 opacity-50" />
                                                    <p className="text-sm text-center">
                                                        {inboxSettings.filterUnread ||
                                                        inboxSettings.filterAttachments
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
                                                            isSummarizing={
                                                                summarizingId === email.id
                                                            }
                                                            source="inbox"
                                                        />
                                                    ))}
                                                    <div
                                                        ref={sentinelRef}
                                                        style={{ height: 32 }}
                                                    ></div>
                                                    {isFetchingEmails &&
                                                        filteredInboxEmails.length > 0 && (
                                                            <div className="w-full p-4 text-center">
                                                                <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
                                                            </div>
                                                        )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Show Inbox Button when collapsed */}
                    {!showInboxPanel && (
                        <div className="py-4 px-2 border bg-card">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer"
                                onClick={() => setShowInboxPanel(true)}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {/* Kanban Board - Dynamic Columns */}
                    <div className="flex-1 overflow-x-auto p-6">
                        <div className="flex gap-6 h-full min-w-max">
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
                                    onToggleSearch={() => toggleColumnSearch(column.id.toString())}
                                    onSummarize={handleSummarizeEmail}
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
                        <div className="p-4 border-b bg-card flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <EyeOff className="w-4 h-4" />
                                <h3 className="font-semibold">Hidden Emails</h3>
                                <Badge variant="secondary">{hiddenEmails.length}</Badge>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowHiddenPanel(false)}
                                className="cursor-pointer"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto">
                            <div className="space-y-3">
                                {hiddenEmails.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Eye className="w-12 h-12 mb-2 opacity-50" />
                                        <p className="text-sm text-center">No hidden emails</p>
                                    </div>
                                ) : (
                                    hiddenEmails.map((email) => (
                                        <div key={email.id} className="relative">
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
                                                variant="ghost"
                                                size="sm"
                                                className="absolute top-2 right-2 cursor-pointer"
                                                onClick={() => handleUnhideEmail(email.id)}
                                            >
                                                <Eye className="w-4 h-4" />
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
