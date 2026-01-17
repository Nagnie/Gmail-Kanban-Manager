import {
    Archive,
    Check,
    ChevronLeft,
    FileText,
    Loader2,
    Mail,
    Menu,
    Plus,
    RefreshCw,
    Send,
    Star,
    Trash,
    Search,
    Sparkles,
    TextSearch,
} from "lucide-react";
import React, { useEffect, useState } from "react";

import ComposeEmail from "@/pages/Dashboard/components/ComposeEmail";
import { EmailDetail } from "@/pages/Dashboard/components/EmailDetail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FuzzySearchBar } from "@/components/FuzzySearchBar";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useMailboxEmails } from "@/hooks/useMailboxEmails";
import { useMailboxes } from "@/hooks/useMailboxes";
import { useThreadDetail } from "@/hooks/useThreadDetail";
import { formatDateShort, formatMailboxName } from "@/lib/utils";
import { type Folder } from "@/services/mail";
import {
    useBatchDeleteEmailsMutation,
    useMarkAsReadMutation,
    useMarkAsUnreadMutation,
    useStarEmailMutation,
    useUnstarEmailMutation,
} from "@/services/tanstack-query";

import type { EmailMessage } from "@/services/mailboxes";
import type { ThreadMessage } from "@/services/mailboxes/types";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SemanticSearchBar } from "@/components/SemanticSearchBar";

const mailboxIcons: Record<string, React.ReactNode> = {
    inbox: <Mail className="w-4 h-4" />,
    starred: <Star className="w-4 h-4" />,
    sent: <Send className="w-4 h-4" />,
    drafts: <FileText className="w-4 h-4" />,
    archive: <Archive className="w-4 h-4" />,
    trash: <Trash className="w-4 h-4" />,
};

export default function Dashboard() {
    const navigate = useNavigate();

    const [searchParams] = useSearchParams();
    const folderParam = searchParams.get("folder");

    const { mailboxes, isLoading: isLoadingMailboxes } = useMailboxes();

    const { mutate: batchDeleteEmails } = useBatchDeleteEmailsMutation();
    const { mutate: starEmail } = useStarEmailMutation();
    const { mutate: unstarEmail } = useUnstarEmailMutation();
    const { mutate: markAsRead } = useMarkAsReadMutation();
    const { mutate: markAsUnread } = useMarkAsUnreadMutation();

    const [selectedFolder, setSelectedFolder] = useState("INBOX");
    const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
    const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
    const [showMobileFolders, setShowMobileFolders] = useState(false);
    const [showMobileDetail, setShowMobileDetail] = useState(false);

    // Search states
    const [searchMode, setSearchMode] = useState<"folder" | "fuzzy" | "semantic">("folder");
    const [folderSearchQuery, setFolderSearchQuery] = useState("");

    const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
    const [composeMode, setComposeMode] = useState<
        "compose" | "reply" | "reply_all" | "forward" | null
    >(null);
    const [replyData, setReplyData] = useState<
        | {
              emailId: string;
              threadId: string;
              subject: string;
              from: string;
              to: string;
              cc?: string;
              body?: string;
          }
        | undefined
    >();

    // Fetch emails - uses folder search query
    const {
        emails,
        isLoading: isLoadingEmails,
        isFetching: isFetchingEmails,
        hasNextPage,
        loadNextPage,
    } = useMailboxEmails({
        labelId: selectedFolder || "",
        q: searchMode === "folder" ? folderSearchQuery : "",
    });

    const sentinelRef = useInfiniteScroll({
        hasMore: hasNextPage,
        isLoading: isFetchingEmails,
        onLoadMore: loadNextPage,
    });

    const { threadDetail, isLoading: isLoadingThread } = useThreadDetail(
        selectedEmail?.threadId || "",
        !!selectedEmail,
    );

    useEffect(() => {
        if (folderParam) {
            setSelectedFolder(folderParam);
        }
    }, [folderParam]);

    useEffect(() => {
        if (threadDetail?.messages) {
            setThreadMessages(threadDetail.messages);
        }
    }, [threadDetail?.messages]);

    const [folders, setFolders] = useState<Folder[]>([]);
    useEffect(() => {
        if (mailboxes && mailboxes.length > 0) {
            const foldersData: Folder[] = mailboxes
                .filter(
                    (mailbox) =>
                        !mailbox.id.startsWith("CATEGORY_") &&
                        !mailbox.id.startsWith("YELLOW_") &&
                        !mailbox.id.startsWith("CHAT") &&
                        !mailbox.id.startsWith("DRAFT"),
                )
                .map((mailbox) => ({
                    id: mailbox.id,
                    name: formatMailboxName(mailbox.name),
                    icon: mailboxIcons[mailbox.id.toLowerCase()] || <Mail className="w-4 h-4" />,
                    count: mailbox.messagesUnread || 0,
                }));
            setFolders(foldersData);
        }
    }, [mailboxes]);

    useEffect(() => {
        setSelectedEmail(null);
        setSelectedEmailIds(new Set());
    }, [selectedFolder]);

    // Handlers for fuzzy search
    const handleEmailSelectFromFuzzy = (emailId: string) => {
        navigate(`/email/${emailId}${searchMode === "semantic" ? "?mode=semantic" : ""}`);
    };

    const handleViewAllFuzzyResults = (query: string) => {
        console.log("View all fuzzy results for:", query);
        navigate(
            `/search?q=${encodeURIComponent(query)}${
                searchMode === "semantic" ? "&mode=semantic" : ""
            }`,
        );
    };

    const handleEmailClick = (email: EmailMessage) => {
        setShowMobileDetail(true);
        setSelectedEmail(email);
    };

    const handleToggleStar = (emailId: string) => {
        const email = emails.find((e: EmailMessage) => e.id === emailId);
        if (!email) return;

        if (email.isStarred) {
            unstarEmail(emailId);
        } else {
            starEmail(emailId);
        }
    };

    const handleSelectEmail = (emailId: string) => {
        const newSelected = new Set(selectedEmailIds);
        if (newSelected.has(emailId)) {
            newSelected.delete(emailId);
        } else {
            newSelected.add(emailId);
        }
        setSelectedEmailIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedEmailIds.size === emails.length) {
            setSelectedEmailIds(new Set());
        } else {
            setSelectedEmailIds(new Set(emails.map((e) => e.id)));
        }
    };

    const handleMarkAsRead = () => {
        const emailIds = Array.from(selectedEmailIds);
        if (emailIds.length === 0) return;

        emailIds.forEach((emailId) => {
            markAsRead(emailId);
        });

        setSelectedEmailIds(new Set());
    };

    const handleMarkAsUnread = () => {
        const emailIds = Array.from(selectedEmailIds);
        if (emailIds.length === 0) return;

        emailIds.forEach((emailId) => {
            markAsUnread(emailId);
        });

        setSelectedEmailIds(new Set());
    };

    const handleDelete = () => {
        const emailIds = Array.from(selectedEmailIds);
        if (emailIds.length === 0) return;

        batchDeleteEmails({ ids: emailIds });
        setSelectedEmailIds(new Set());
        if (selectedEmail && selectedEmailIds.has(selectedEmail.id)) {
            setSelectedEmail(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, email: EmailMessage) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleEmailClick(email);
        }
    };

    const showLoadingOverlay = isLoadingEmails || (isFetchingEmails && emails.length === 0);

    const currentFolderName = folders.find((f) => f.id === selectedFolder)?.name || "folder";

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col">
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowMobileFolders(!showMobileFolders)}
                >
                    <Menu className="w-5 h-5" />
                </Button>
                <h1 className="text-lg font-semibold">Email</h1>
                <Button variant={"default"} onClick={() => setComposeMode("compose")} size="sm">
                    <Plus className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Column 1: Folders */}
                <aside
                    className={`
                    ${showMobileFolders ? "translate-x-0" : "-translate-x-full"}
                    lg:translate-x-0 fixed lg:static inset-0 z-40 
                    w-64 lg:w-1/5 border-r transition-transform duration-200
                    `}
                >
                    <div className="h-full flex flex-col bg-sidebar">
                        <ScrollArea className="flex-1">
                            {isLoadingMailboxes ? (
                                <div className="p-4 flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                        Loading mailboxes...
                                    </p>
                                </div>
                            ) : (
                                <nav className="p-2">
                                    {folders.length > 0 ? (
                                        folders.map((folder) => (
                                            <Button
                                                variant={"ghost"}
                                                key={folder.id}
                                                onClick={() => {
                                                    setSelectedFolder(folder.id);
                                                    window.history.replaceState(
                                                        {},
                                                        "",
                                                        `?folder=${encodeURIComponent(folder.id)}`,
                                                    );
                                                    setShowMobileFolders(false);
                                                    // Clear folder search when switching folders
                                                    setFolderSearchQuery("");
                                                }}
                                                className={`
                                                    w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer
                                                    transition-colors text-left
                                                    ${
                                                        selectedFolder === folder.id
                                                            ? "bg-mail-selected text-foreground"
                                                            : "text-muted-foreground"
                                                    }
                                                `}
                                            >
                                                {folder.icon}
                                                <span className="flex-1">{folder.name}</span>
                                                {folder.count ? (
                                                    <Badge variant="secondary" className="ml-auto">
                                                        {folder.count}
                                                    </Badge>
                                                ) : null}
                                            </Button>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-muted-foreground">
                                            <p className="text-sm">No mailboxes available</p>
                                        </div>
                                    )}
                                </nav>
                            )}
                        </ScrollArea>
                    </div>
                </aside>

                {/* Column 2: Email List */}
                <div
                    className={`
                    ${showMobileDetail ? "hidden lg:flex" : "flex"}
                    flex-col flex-1 lg:w-2/5 border-r overflow-hidden
                    `}
                >
                    <div className="p-4 border-b space-y-3 shrink-0">
                        {/* Search Mode Toggle */}
                        <div className="flex gap-2">
                            <Button
                                variant={searchMode === "folder" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSearchMode("folder")}
                                className="flex-1 cursor-pointer"
                            >
                                <Search className="w-4 h-4 md:mr-2" />
                                <span className="hidden md:inline">Folder Search</span>
                            </Button>
                            <Button
                                variant={searchMode === "fuzzy" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSearchMode("fuzzy")}
                                className="flex-1 cursor-pointer"
                            >
                                <Sparkles className="w-4 h-4 md:mr-2" />
                                <span className="hidden md:inline">Fuzzy Search</span>
                            </Button>
                            <Button
                                variant={searchMode === "semantic" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSearchMode("semantic")}
                                className="flex-1 cursor-pointer"
                            >
                                <TextSearch className="w-4 h-4 md:mr-2" />
                                <span className="hidden md:inline">Semantic Search</span>
                            </Button>
                        </div>

                        {/* Conditional Search Input */}
                        {searchMode === "folder" ? (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder={`Search in ${currentFolderName}...`}
                                    value={folderSearchQuery}
                                    onChange={(e) => setFolderSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        ) : searchMode === "fuzzy" ? (
                            <FuzzySearchBar
                                onEmailSelect={handleEmailSelectFromFuzzy}
                                onViewAll={handleViewAllFuzzyResults}
                                className="max-w-full"
                            />
                        ) : searchMode === "semantic" ? (
                            <SemanticSearchBar
                                onViewAll={handleViewAllFuzzyResults}
                                className="max-w-full"
                            />
                        ) : null}

                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                onClick={() => setComposeMode("compose")}
                                size="sm"
                                className="hidden lg:flex cursor-pointer"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Compose
                            </Button>
                            <Button
                                variant="outline"
                                className="cursor-pointer"
                                size="sm"
                                onClick={() => {
                                    // TanStack Query handles refetch automatically
                                }}
                                disabled={isFetchingEmails || isLoadingMailboxes}
                            >
                                <RefreshCw
                                    className={`w-4 h-4 ${
                                        isFetchingEmails || isLoadingMailboxes ? "animate-spin" : ""
                                    }`}
                                />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAll}
                                className="cursor-pointer"
                                disabled={emails.length === 0}
                            >
                                <Check className="w-4 h-4 mr-1" />
                                {selectedEmailIds.size === emails.length
                                    ? "Deselect"
                                    : "Select All"}
                            </Button>
                            {selectedEmailIds.size > 0 && (
                                <>
                                    <Button
                                        variant="outline"
                                        className="cursor-pointer"
                                        size="sm"
                                        onClick={handleMarkAsRead}
                                    >
                                        Mark Read
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="cursor-pointer"
                                        size="sm"
                                        onClick={handleMarkAsUnread}
                                    >
                                        Mark Unread
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="cursor-pointer"
                                        size="sm"
                                        onClick={handleDelete}
                                    >
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <ScrollArea className="h-full w-full overflow-auto relative">
                        {showLoadingOverlay && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                        Loading emails...
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="divide-y">
                            {emails.length === 0 && !showLoadingOverlay ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>
                                        {folderSearchQuery
                                            ? `No emails found for "${folderSearchQuery}"`
                                            : "No emails in this folder"}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {emails.map((email) => (
                                        <div
                                            key={email.id}
                                            onClick={() => handleEmailClick(email)}
                                            onKeyDown={(e) => handleKeyDown(e, email)}
                                            tabIndex={0}
                                            role="button"
                                            aria-label={`Email from ${email.header.from}: ${email.header.subject}`}
                                            className={`
                                                p-4 cursor-pointer transition-colors
                                                ${
                                                    selectedEmail?.id === email.id
                                                        ? "bg-mail-selected"
                                                        : "hover:bg-sidebar-border"
                                                }
                                            `}
                                        >
                                            <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-start">
                                                <Checkbox
                                                    checked={selectedEmailIds.has(email.id)}
                                                    onCheckedChange={() =>
                                                        handleSelectEmail(email.id)
                                                    }
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="mt-1 bg-card"
                                                />
                                                <div className="min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
                                                        <span
                                                            className={`truncate ${
                                                                email.isUnread
                                                                    ? "font-bold text-mail-foreground"
                                                                    : "font-semibold"
                                                            }`}
                                                        >
                                                            {email.participantEmails ??
                                                                email.header.from
                                                                    .split("<")[0]
                                                                    .trim()}
                                                            {email.messageCount &&
                                                                email.messageCount > 1 && (
                                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                                        {email.messageCount}
                                                                    </span>
                                                                )}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {formatDateShort(email.header.date)}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className={`text-sm truncate mb-1 ${
                                                            email.isUnread
                                                                ? "font-bold text-mail-foreground"
                                                                : ""
                                                        }`}
                                                    >
                                                        {email.header.subject}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground line-clamp-1">
                                                        {email.snippet}
                                                    </div>
                                                    <Button
                                                        variant="link"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(
                                                                `https://mail.google.com/mail/u/0/#all/${email.id}`,
                                                                "_blank",
                                                            );
                                                        }}
                                                        className="cursor-pointer p-0 mt-1 text-sm text-blue-600"
                                                        size="sm"
                                                    >
                                                        To Gmail
                                                    </Button>
                                                </div>
                                                <Button
                                                    variant={"ghost"}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleStar(email.id);
                                                    }}
                                                    className="cursor-pointer"
                                                    size="sm"
                                                >
                                                    <Star
                                                        className={`w-4 h-4 ${
                                                            email.isStarred
                                                                ? "fill-yellow-400 text-yellow-400"
                                                                : "text-muted-foreground fill-card"
                                                        }`}
                                                    />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                        <div ref={sentinelRef} style={{ height: 32 }}></div>
                        {isFetchingEmails && emails.length > 0 && !showLoadingOverlay && (
                            <div className="w-full p-4 text-center text-muted-foreground border-t">
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Loading more emails...</span>
                                </div>
                            </div>
                        )}
                        {!hasNextPage && emails.length > 0 && !showLoadingOverlay && (
                            <div className="w-full p-4 text-center text-muted-foreground border-t">
                                <p className="text-sm">No more emails to load</p>
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Column 3: Email Detail - unchanged */}
                <div
                    className={`
                    ${showMobileDetail ? "flex" : "hidden lg:flex"}
                    flex-col flex-1 lg:w-2/5 overflow-hidden
                    `}
                >
                    {composeMode ? (
                        <ComposeEmail
                            mode={composeMode}
                            onClose={() => {
                                setComposeMode(null);
                                setReplyData(undefined);
                            }}
                            replyTo={replyData}
                        />
                    ) : isLoadingThread ? (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin opacity-50" />
                                <p className="text-lg">Loading thread...</p>
                            </div>
                        </div>
                    ) : threadMessages.length > 0 ? (
                        <div className="flex flex-col h-full">
                            <div className="px-4 py-3 border-b lg:hidden">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowMobileDetail(false)}
                                    className="cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-2" />
                                    Back
                                </Button>
                            </div>

                            <ScrollArea className="flex-1 overflow-hidden">
                                <div className="divide-y">
                                    {threadMessages.map((message) => (
                                        <EmailDetail
                                            key={message.id}
                                            message={message}
                                            onReply={(data) => {
                                                setReplyData(data);
                                                setComposeMode("reply");
                                            }}
                                            onReplyAll={(data) => {
                                                setReplyData(data);
                                                setComposeMode("reply_all");
                                            }}
                                            onForward={(data) => {
                                                setReplyData(data);
                                                setComposeMode("forward");
                                            }}
                                        />
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg">Select an email to view details</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showMobileFolders && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setShowMobileFolders(false)}
                />
            )}
        </div>
    );
}
