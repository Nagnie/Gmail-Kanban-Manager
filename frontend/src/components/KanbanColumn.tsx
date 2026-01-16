import { ColumnFilterMenu } from "@/components/ColumnFilterMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInfiniteKanbanColumn } from "@/hooks/useKanbanQueries";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { ColumnSettings } from "@/pages/KanbanBoard";
import { DraggableEmailCard } from "@/pages/KanbanBoard/components/DraggableEmailCard";
import { DroppableColumn } from "@/pages/KanbanBoard/components/DroppableColumn";
import type { EmailCardDto } from "@/services/kanban/types";
import {
    Archive,
    CheckCircle,
    Clock,
    Eye,
    Inbox,
    ListTodo,
    Loader2,
    Mail,
    Pencil,
    Search,
    Tag,
    Trash2,
    X,
} from "lucide-react";
import { useMemo } from "react";
import { MoreVertical } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface KanbanColumnProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    column: any;
    settings: ColumnSettings;
    searchVisible: boolean;
    summarizingId: string | null;
    onUpdateSettings: (updater: (prev: ColumnSettings) => ColumnSettings) => void;
    onToggleSearch: () => void;
    onSummarize: (emailId: string) => void;
    onHideEmail?: (emailId: string) => void;
    onRenameColumn: (columnId: number, currentName: string) => void;
    onAssignLabel: (columnId: number, currentName: string) => void;
    onDeleteColumn: (columnId: number) => void;
}

const getColumnIcon = (columnName: string) => {
    const name = columnName.toLowerCase();
    if (name.includes("inbox")) return <Inbox className="w-4 h-4" />;
    if (name.includes("todo") || name.includes("to do")) return <CheckCircle className="w-4 h-4" />;
    if (name.includes("progress")) return <Clock className="w-4 h-4" />;
    if (name.includes("done")) return <Archive className="w-4 h-4" />;
    if (name.includes("snoozed")) return <Eye className="w-4 h-4" />;
    return <ListTodo className="w-4 h-4" />;
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

const KanbanColumn: React.FC<KanbanColumnProps> = ({
    column,
    settings,
    searchVisible,
    summarizingId,
    onUpdateSettings,
    onToggleSearch,
    onSummarize,
    onHideEmail,
    onRenameColumn,
    onAssignLabel,
    onDeleteColumn,
}) => {
    // Each column fetches its own data with infinite scroll
    const { data, isLoading, isFetching, hasNextPage, fetchNextPage } = useInfiniteKanbanColumn(
        column.id
    );

    // Flatten all pages into a single array of emails
    const emails = data?.pages.flatMap((page) => page.emails) || [];
    const filteredEmails = useMemo(() => applyFiltersAndSort(emails, settings), [emails, settings]);

    // Set up infinite scroll
    const sentinelRef = useInfiniteScroll({
        hasMore: hasNextPage ?? false,
        isLoading: isFetching,
        onLoadMore: fetchNextPage,
    });

    const hasActiveFilters =
        settings.filterUnread || settings.filterAttachments || settings.sortBy !== "date-desc";

    return (
        <div className="flex flex-col w-100 bg-sidebar rounded-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                    {getColumnIcon(column.name)}
                    <h3 className="font-semibold">{column.name}</h3>
                    <Badge variant="secondary">{filteredEmails.length}</Badge>

                    {hasActiveFilters && (
                        <Badge variant="destructive" className="size-5 rounded-full text-[10px]">
                            {
                                [
                                    settings.filterUnread,
                                    settings.filterAttachments,
                                    settings.sortBy !== "date-desc",
                                ].filter(Boolean).length
                            }
                        </Badge>
                    )}

                    {isFetching && !isLoading && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={onToggleSearch}
                    >
                        <Search className={`w-4 h-4 ${searchVisible ? "text-primary" : ""}`} />
                    </Button>

                    <ColumnFilterMenu
                        columnId={column.id.toString()}
                        settings={settings}
                        onChange={(next) => onUpdateSettings(() => next)}
                    />
                </div>
            </div>

            {/* Search Bar */}
            {searchVisible && (
                <div className="px-3 pb-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input
                            className="pl-7 pr-7 h-8 text-xs"
                            placeholder="Search in this column..."
                            value={settings.search}
                            onChange={(e) => {
                                onUpdateSettings((prev) => ({
                                    ...prev,
                                    search: e.target.value,
                                }));
                            }}
                            autoFocus
                        />
                        {settings.search && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6"
                                onClick={() =>
                                    onUpdateSettings((prev) => ({
                                        ...prev,
                                        search: "",
                                    }))
                                }
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Droppable Area */}
            <DroppableColumn id={column.id.toString()}>
                <div className="space-y-3 min-h-[200px]">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredEmails.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Mail className="w-12 h-12 mb-2 opacity-50" />
                            <p className="text-sm">
                                {hasActiveFilters ? "No emails match filters" : "Drop emails here"}
                            </p>
                        </div>
                    ) : (
                        <>
                            {filteredEmails.map((email: EmailCardDto) => (
                                <DraggableEmailCard
                                    key={email.id}
                                    email={email}
                                    source={column.id.toString()}
                                    onSummarize={onSummarize}
                                    onHide={onHideEmail}
                                    isSummarizing={summarizingId === email.id}
                                />
                            ))}

                            {/* Infinite scroll sentinel */}
                            {hasNextPage && (
                                <div ref={sentinelRef} className="flex justify-center py-4">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </DroppableColumn>
            <div className="p-4 border-b bg-card flex items-center justify-between">
                <div className="flex items-center gap-2">{/* existing icon and title */}</div>

                <div className="flex items-center gap-2">
                    {/* existing search button */}

                    {/* Thêm dropdown menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onSelect={() => {
                                    requestAnimationFrame(() => {
                                        onRenameColumn(column.id, column.name);
                                    });
                                }}
                                className="cursor-pointer"
                            >
                                <Pencil className="w-4 h-4 mr-2" />
                                Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={() => {
                                    requestAnimationFrame(() => {
                                        onAssignLabel(column.id, column.name);
                                    });
                                }}
                                className="cursor-pointer"
                            >
                                <Tag className="w-4 h-4 mr-2" />
                                Assign Label
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={() => {
                                    requestAnimationFrame(() => {
                                        onDeleteColumn(column.id);
                                    });
                                }}
                                className="cursor-pointer text-destructive"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
};

export default KanbanColumn;
