import React, { useState, useEffect } from "react";
import {
    Mail,
    Star,
    Send,
    FileText,
    Archive,
    Trash,
    Plus,
    RefreshCw,
    Menu,
    X,
    Check,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { type Email, type Folder } from "@/services/types";
import mailApi from "@/services/mailApi";
import { EmailDetail } from "@/components/EmailDetail";
import { formatDateShort } from "@/lib/utils";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

// Icon mapping for mailbox IDs
const mailboxIcons: Record<string, React.ReactNode> = {
    inbox: <Mail className="w-4 h-4" />,
    starred: <Star className="w-4 h-4" />,
    sent: <Send className="w-4 h-4" />,
    drafts: <FileText className="w-4 h-4" />,
    archive: <Archive className="w-4 h-4" />,
    trash: <Trash className="w-4 h-4" />,
};

export default function Dashboard() {
    const [folders, setFolders] = useState<Folder[]>([]);
    const [selectedFolder, setSelectedFolder] = useState("inbox");
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [emails, setEmails] = useState<Email[]>([]);
    const [selectedEmailIds, setSelectedEmailIds] = useState<Set<number>>(new Set());
    const [showMobileFolders, setShowMobileFolders] = useState(false);
    const [showMobileDetail, setShowMobileDetail] = useState(false);
    const [composeOpen, setComposeOpen] = useState(false);
    const [offset, setOffset] = useState(0);
    const [limit] = useState(5);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const sentinelRef = useInfiniteScroll({
        hasMore,
        isLoading: isLoadingMore,
        onLoadMore: handleLoadMore,
    });

    function handleLoadMore() {
        if (!hasMore || isLoadingMore || isLoading) return;
        setIsLoadingMore(true);
        const newOffset = offset + limit;
        const loadMoreEmails = async () => {
            try {
                const result = await mailApi.getMailboxEmails(selectedFolder, {
                    offset: newOffset,
                    limit: limit,
                    q: searchQuery,
                });

                setEmails((prevEmails) => [...prevEmails, ...result.items]);
                setOffset(newOffset);
                setHasMore(result.hasMore);
            } catch (err) {
                console.error("Error loading more emails:", err);
            } finally {
                setIsLoadingMore(false);
            }
        };
        loadMoreEmails();
    }

    // Load mailboxes from API
    useEffect(() => {
        const loadMailboxes = async () => {
            try {
                const mailboxes = await mailApi.getMailboxes();
                const foldersData: Folder[] = mailboxes.map((mailbox) => ({
                    id: mailbox.id,
                    name: mailbox.name,
                    icon: mailboxIcons[mailbox.id] || <Mail className="w-4 h-4" />,
                    count: mailbox.unreadCount || 0,
                }));
                setFolders(foldersData);
            } catch (error) {
                console.error("Error loading mailboxes:", error);
                // Fallback to default folders if API fails
                const defaultFolders: Folder[] = [
                    { id: "inbox", name: "Inbox", icon: mailboxIcons["inbox"], count: 0 },
                    { id: "starred", name: "Starred", icon: mailboxIcons["starred"] },
                    { id: "sent", name: "Sent", icon: mailboxIcons["sent"] },
                    { id: "drafts", name: "Drafts", icon: mailboxIcons["drafts"] },
                    { id: "archive", name: "Archive", icon: mailboxIcons["archive"] },
                    { id: "trash", name: "Trash", icon: mailboxIcons["trash"] },
                ];
                setFolders(defaultFolders);
            }
        };

        loadMailboxes();
    }, []);

    // Reset emails when folder changes
    useEffect(() => {
        setEmails([]);
        setOffset(0);
        setHasMore(true);
    }, [selectedFolder]);

    // Load initial emails from API
    useEffect(() => {
        const loadEmails = async () => {
            setIsLoading(true);
            try {
                const result = await mailApi.getMailboxEmails(selectedFolder, {
                    offset: 0,
                    limit: limit,
                    q: searchQuery,
                });

                setEmails(result.items);
                setOffset(limit);
                setHasMore(result.hasMore);
            } catch (err) {
                console.error("Error loading emails:", err);
                setEmails([]);
                setHasMore(false);
            } finally {
                setIsLoading(false);
            }
        };

        loadEmails();
        setSelectedEmail(null);
        setSelectedEmailIds(new Set());
    }, [selectedFolder, searchQuery, limit]);

    const handleEmailClick = (email: Email) => {
        setShowMobileDetail(true);
        setIsLoadingDetail(true);
        // Fetch email detail from API
        const fetchEmailDetail = async () => {
            try {
                const emailDetail = await mailApi.getEmailById(email.id);
                setSelectedEmail(emailDetail);
                // Mark as read if it's unread
                if (!emailDetail.isRead) {
                    setEmails(emails.map((e) => (e.id === email.id ? { ...e, isRead: true } : e)));
                }
            } catch (err) {
                console.error("Error fetching email detail:", err);
                // Fallback to the email from list
                setSelectedEmail(email);
            } finally {
                setIsLoadingDetail(false);
            }
        };
        fetchEmailDetail();
    };

    const handleToggleStar = (emailId: number) => {
        setEmails(emails.map((e) => (e.id === emailId ? { ...e, isStarred: !e.isStarred } : e)));
        if (selectedEmail?.id === emailId) {
            setSelectedEmail({ ...selectedEmail, isStarred: !selectedEmail.isStarred });
        }
    };

    const handleSelectEmail = (emailId: number) => {
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
        setEmails(emails.map((e) => (selectedEmailIds.has(e.id) ? { ...e, isRead: true } : e)));
    };

    const handleMarkAsUnread = () => {
        setEmails(emails.map((e) => (selectedEmailIds.has(e.id) ? { ...e, isRead: false } : e)));
        if (selectedEmail) {
            setSelectedEmail({ ...selectedEmail, isRead: false });
        }
    };

    const handleDelete = () => {
        setEmails(emails.filter((e) => !selectedEmailIds.has(e.id)));
        setSelectedEmailIds(new Set());
        if (selectedEmail && selectedEmailIds.has(selectedEmail.id)) {
            setSelectedEmail(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, email: Email) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleEmailClick(email);
        }
    };

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
                <Button variant={"default"} onClick={() => setComposeOpen(true)} size="sm">
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
                        <div className="p-4 border-b flex items-center justify-between">
                            <h2 className="font-semibold text-2xl">Mailboxes</h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden"
                                onClick={() => setShowMobileFolders(false)}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                        <ScrollArea className="flex-1">
                            <nav className="p-2">
                                {folders.map((folder) => (
                                    <Button
                                        variant={"ghost"}
                                        key={folder.id}
                                        onClick={() => {
                                            setSelectedFolder(folder.id);
                                            setShowMobileFolders(false);
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
                                ))}
                            </nav>
                        </ScrollArea>
                    </div>
                </aside>

                {/* Column 2: Email List */}
                <div
                    className={`
                    ${showMobileDetail ? "hidden lg:flex" : "flex"}
                    flex-col w-full lg:w-2/5 border-r overflow-hidden
                    `}
                >
                    <div className="p-4 border-b space-y-3 shrink-0">
                        {/* Search Input */}
                        <Input
                            type="text"
                            placeholder="Search emails..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                            }}
                            className="w-full"
                        />

                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                onClick={() => setComposeOpen(true)}
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
                                    setEmails([]);
                                    setOffset(0);
                                    setHasMore(true);
                                }}
                                disabled={isLoading}
                            >
                                <RefreshCw
                                    className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                                />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAll}
                                className="cursor-pointer"
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

                    <ScrollArea className="h-full w-full overflow-auto">
                        <div className="divide-y">
                            {emails.length === 0 && !isLoading ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No emails in this folder</p>
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
                                            aria-label={`Email from ${email.from}: ${email.subject}`}
                                            className={`
                                                p-4 cursor-pointer transition-colors
                                                ${
                                                    selectedEmail?.id === email.id
                                                        ? "bg-mail-selected"
                                                        : "hover:bg-sidebar-border"
                                                }
                                            `}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Checkbox
                                                    checked={selectedEmailIds.has(email.id)}
                                                    onCheckedChange={() =>
                                                        handleSelectEmail(email.id)
                                                    }
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="mt-1 bg-card"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span
                                                            className={`flex-1 truncate ${
                                                                !email.isRead
                                                                    ? "font-bold text-mail-foreground"
                                                                    : "font-semibold"
                                                            }`}
                                                        >
                                                            {email.from.split("<")[0].trim()}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {formatDateShort(email.timestamp)}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className={`text-sm truncate mb-1 ${
                                                            !email.isRead
                                                                ? "font-bold text-mail-foreground"
                                                                : ""
                                                        }`}
                                                    >
                                                        {email.subject}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {email.preview}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant={"ghost"}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleStar(email.id);
                                                    }}
                                                    className="mt-1 cursor-pointer"
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
                                    <div
                                        ref={sentinelRef}
                                        style={{
                                            height: 32,
                                        }}
                                    ></div>
                                    <div className="p-4 text-center text-muted-foreground">
                                        {isLoadingMore && (
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Loading more emails...</span>
                                            </div>
                                        )}
                                        {!hasMore && emails.length > 0 && (
                                            <p className="text-sm">No more emails to load</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Column 3: Email Detail */}
                <div
                    className={`
                    ${showMobileDetail ? "flex" : "hidden lg:flex"}
                    flex-col w-full lg:w-2/5 overflow-hidden
                    `}
                >
                    {isLoadingDetail ? (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin opacity-50" />
                                <p className="text-lg">Loading email...</p>
                            </div>
                        </div>
                    ) : selectedEmail ? (
                        <EmailDetail
                            email={selectedEmail}
                            onBack={() => setShowMobileDetail(false)}
                            onToggleStar={handleToggleStar}
                            onMarkAsUnread={(email) => {
                                setEmails(
                                    emails.map((e) =>
                                        e.id === email.id ? { ...e, isRead: false } : e
                                    )
                                );
                                setSelectedEmail({ ...email, isRead: false });
                            }}
                            onDelete={(email) => {
                                setEmails(emails.filter((e) => e.id !== email.id));
                                setSelectedEmail(null);
                            }}
                        />
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

            {/* Compose Dialog */}
            <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>New Message</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input placeholder="To" />
                        <Input placeholder="Subject" />
                        <Textarea placeholder="Compose your message..." rows={10} />
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => setComposeOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="cursor-pointer"
                                onClick={() => setComposeOpen(false)}
                            >
                                Send
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Mobile Overlay */}
            {showMobileFolders && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setShowMobileFolders(false)}
                />
            )}
        </div>
    );
}
