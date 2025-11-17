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
    Reply,
    ReplyAll,
    Forward,
    Download,
    ChevronLeft,
    Menu,
    X,
    Check,
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

const folders: Folder[] = [
    { id: "inbox", name: "Inbox", icon: <Mail className="w-4 h-4" />, count: 2 },
    { id: "starred", name: "Starred", icon: <Star className="w-4 h-4" /> },
    { id: "sent", name: "Sent", icon: <Send className="w-4 h-4" /> },
    { id: "drafts", name: "Drafts", icon: <FileText className="w-4 h-4" /> },
    { id: "archive", name: "Archive", icon: <Archive className="w-4 h-4" /> },
    { id: "trash", name: "Trash", icon: <Trash className="w-4 h-4" /> },
];

export default function Dashboard() {
    const [selectedFolder, setSelectedFolder] = useState("inbox");
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [emails, setEmails] = useState<Email[]>([]);
    const [mailboxesState, setMailboxesState] = useState<
        Array<{ id: string; name: string; unreadCount?: number }>
    >([]);
    const [selectedEmailIds, setSelectedEmailIds] = useState<Set<number>>(new Set());
    const [showMobileFolders, setShowMobileFolders] = useState(false);
    const [showMobileDetail, setShowMobileDetail] = useState(false);
    const [composeOpen, setComposeOpen] = useState(false);

    useEffect(() => {
        let mounted = true;
        async function load() {
            setSelectedEmail(null);
            setSelectedEmailIds(new Set());
            try {
                if (selectedFolder === "starred") {
                    const res = await mailApi.getAllEmails({ page: 1, pageSize: 200 });
                    if (!mounted) return;
                    setEmails(res.items.filter((e) => e.isStarred));
                    // refresh mailbox counts
                    try {
                        const boxes = await mailApi.getMailboxes();
                        if (!mounted) return;
                        setMailboxesState(boxes);
                    } catch (err) {
                        console.error("Failed to refresh mailboxes", err);
                    }
                } else {
                    const res = await mailApi.getMailboxEmails(selectedFolder, {
                        page: 1,
                        pageSize: 200,
                    });
                    if (!mounted) return;
                    setEmails(res.items);
                    // refresh mailbox counts
                    try {
                        const boxes = await mailApi.getMailboxes();
                        if (!mounted) return;
                        setMailboxesState(boxes);
                    } catch (err) {
                        console.error("Failed to refresh mailboxes", err);
                    }
                }
            } catch (err) {
                console.error("Failed to load emails", err);
            }
        }
        load();
        return () => {
            mounted = false;
        };
    }, [selectedFolder]);

    // initial load of mailboxes (counts)
    useEffect(() => {
        let mounted = true;
        mailApi
            .getMailboxes()
            .then((boxes) => {
                if (!mounted) return;
                setMailboxesState(boxes);
            })
            .catch((err) => console.error("Failed to load mailboxes", err));
        return () => {
            mounted = false;
        };
    }, []);

    const handleEmailClick = async (email: Email) => {
        try {
            const detail = await mailApi.getEmailById(email.id);
            setSelectedEmail(detail);
            setShowMobileDetail(true);
            if (!email.isRead) {
                // optimistic update
                setEmails((prev) =>
                    prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e))
                );
                // adjust mailbox unread count locally
                setMailboxesState((prev) =>
                    prev.map((m) =>
                        m.id === selectedFolder
                            ? { ...m, unreadCount: Math.max(0, (m.unreadCount || 0) - 1) }
                            : m
                    )
                );
                // NOTE: intentionally not persisting read state to API to avoid reloads
            }
        } catch (err) {
            console.error("Failed to load email detail", err);
            // fallback to using the list item
            setSelectedEmail(email);
            setShowMobileDetail(true);
        }
    };

    const handleToggleStar = async (emailId: number) => {
        const current = emails.find((e) => e.id === emailId) || selectedEmail;
        const newVal = !(current?.isStarred ?? false);
        // optimistic update
        setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, isStarred: newVal } : e)));
        if (selectedEmail?.id === emailId) {
            setSelectedEmail({ ...selectedEmail, isStarred: newVal });
        }
        try {
            await mailApi.patchEmail(emailId, { isStarred: newVal });
        } catch (err) {
            console.error("Failed to toggle star", err);
            // revert on failure
            setEmails((prev) =>
                prev.map((e) => (e.id === emailId ? { ...e, isStarred: !newVal } : e))
            );
            if (selectedEmail?.id === emailId) {
                setSelectedEmail({ ...selectedEmail, isStarred: !newVal });
            }
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
        // optimistic update
        const affected = emails.filter((e) => selectedEmailIds.has(e.id) && !e.isRead);
        if (affected.length > 0) {
            setEmails((prev) =>
                prev.map((e) => (selectedEmailIds.has(e.id) ? { ...e, isRead: true } : e))
            );
            // decrement unread count for current mailbox
            setMailboxesState((prev) =>
                prev.map((m) =>
                    m.id === selectedFolder
                        ? { ...m, unreadCount: Math.max(0, (m.unreadCount || 0) - affected.length) }
                        : m
                )
            );
            // NOTE: intentionally not persisting read state to API to avoid reloads
        }
    };

    const handleMarkAsUnread = () => {
        const affected = emails.filter((e) => selectedEmailIds.has(e.id) && e.isRead);
        if (affected.length > 0) {
            setEmails((prev) =>
                prev.map((e) => (selectedEmailIds.has(e.id) ? { ...e, isRead: false } : e))
            );
            if (selectedEmail) {
                setSelectedEmail({ ...selectedEmail, isRead: false });
            }
            // increment unread count for current mailbox
            setMailboxesState((prev) =>
                prev.map((m) =>
                    m.id === selectedFolder
                        ? { ...m, unreadCount: (m.unreadCount || 0) + affected.length }
                        : m
                )
            );
            // NOTE: intentionally not persisting read state to API to avoid reloads
        }
    };

    const handleDelete = () => {
        setEmails(emails.filter((e) => !selectedEmailIds.has(e.id)));
        setSelectedEmailIds(new Set());
        if (selectedEmail && selectedEmailIds.has(selectedEmail.id)) {
            setSelectedEmail(null);
        }
    };

    const handleDownloadAttachment = (attachment: { name: string; size?: string }) => {
        try {
            const content = `Mock file content for ${attachment.name}\nSize: ${
                attachment.size || ""
            }\nGenerated: ${new Date().toISOString()}`;
            const blob = new Blob([content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = attachment.name;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            a.remove();
        } catch (err) {
            console.error("Download failed", err);
        }
    };

    const sanitizeHtml = (html: string) => {
        // basic sanitization for mock content: remove script tags and inline event handlers
        return html
            .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
            .replace(/ on\w+="[^"]*"/gi, "")
            .replace(/ on\w+='[^']*'/gi, "");
    };

    function formatTimestamp(ts?: string, mode: "list" | "detail" = "list") {
        if (!ts) return "";
        const d = new Date(ts);
        if (isNaN(d.getTime())) return ts;

        const now = new Date();
        const sameDay =
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate();

        if (mode === "list") {
            // show time if today, else show day/month + time so time is always visible
            const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
            if (sameDay) {
                return time;
            }
            const shortDate = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
            return `${shortDate} · ${time}`;
        }

        // detail: full date + time
        return d.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    const handleKeyDown = (e: React.KeyboardEvent, email: Email) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleEmailClick(email);
        }
    };

    return (
        <div className="h-full flex flex-col">
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
                                        {(() => {
                                            const mb = mailboxesState.find(
                                                (m) => m.id === folder.id
                                            );
                                            const count = mb?.unreadCount ?? folder.count;
                                            return count ? (
                                                <Badge variant="secondary" className="ml-auto">
                                                    {count}
                                                </Badge>
                                            ) : null;
                                        })()}
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
                    flex-col w-full lg:w-2/5 border-r
                    `}
                >
                    <div className="p-4 border-b space-y-3">
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
                                onClick={() => {}}
                            >
                                <RefreshCw className="w-4 h-4" />
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

                    <ScrollArea className="flex-1">
                        <div className="divide-y">
                            {emails.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No emails in this folder</p>
                                </div>
                            ) : (
                                emails.map((email) => (
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
                                                onCheckedChange={() => handleSelectEmail(email.id)}
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
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap w-24 text-right ml-2 shrink-0">
                                                        {formatTimestamp(email.timestamp, "list")}
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
                                                <div className="text-sm text-muted-foreground truncate">
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
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Column 3: Email Detail */}
                <div
                    className={`
                    ${showMobileDetail ? "flex" : "hidden lg:flex"}
                    flex-col w-full lg:w-2/5
                    `}
                >
                    {selectedEmail ? (
                        <>
                            <div className="pt-6 pb-4 px-8">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="lg:hidden"
                                        onClick={() => setShowMobileDetail(false)}
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </Button>
                                    <div className="flex gap-3 flex-wrap flex-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="cursor-pointer"
                                        >
                                            <Reply className="w-4 h-4 mr-1 text-mail-foreground" />
                                            Reply
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="cursor-pointer"
                                        >
                                            <ReplyAll className="w-4 h-4 mr-1 text-mail-foreground" />
                                            Reply All
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="cursor-pointer"
                                        >
                                            <Forward className="w-4 h-4 mr-1 text-mail-foreground" />
                                            Forward
                                        </Button>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="cursor-pointer"
                                        onClick={() => handleToggleStar(selectedEmail.id)}
                                    >
                                        <Star
                                            className={`w-5 h-5 ${
                                                selectedEmail.isStarred
                                                    ? "fill-yellow-400 text-yellow-400"
                                                    : ""
                                            }`}
                                        />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="cursor-pointer"
                                        onClick={handleMarkAsUnread}
                                    >
                                        <Mail className="w-5 h-5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="cursor-pointer"
                                        onClick={handleDelete}
                                    >
                                        <Trash className="w-5 h-5 text-red-500" />
                                    </Button>
                                </div>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="py-4 px-8">
                                    <h1 className="text-2xl font-bold mb-4">
                                        {selectedEmail.subject}
                                    </h1>

                                    <div className="space-y-2 mb-6 text-sm border-b pb-4">
                                        <div className="flex gap-2">
                                            <span className="text-muted-foreground w-16">
                                                From:
                                            </span>
                                            <span>{selectedEmail.from}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-muted-foreground w-16">To:</span>
                                            <span>{selectedEmail.to}</span>
                                        </div>
                                        {selectedEmail.cc && (
                                            <div className="flex gap-2">
                                                <span className="text-muted-foreground w-16">
                                                    CC:
                                                </span>
                                                <span>{selectedEmail.cc}</span>
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <span className="text-muted-foreground w-16">
                                                Date:
                                            </span>
                                            <span>
                                                {formatTimestamp(selectedEmail.timestamp, "detail")}
                                            </span>
                                        </div>
                                    </div>

                                    {selectedEmail.bodyHtml ? (
                                        <div
                                            className="prose max-w-none mb-6"
                                            dangerouslySetInnerHTML={{
                                                __html: sanitizeHtml(selectedEmail.bodyHtml),
                                            }}
                                        />
                                    ) : (
                                        <div className="prose max-w-none mb-6">
                                            <p className="whitespace-pre-wrap">
                                                {selectedEmail.body}
                                            </p>
                                        </div>
                                    )}

                                    {selectedEmail.attachments &&
                                        selectedEmail.attachments.length > 0 && (
                                            <div className="border-t pt-4">
                                                <h3 className="font-semibold mb-3">
                                                    Attachments ({selectedEmail.attachments.length})
                                                </h3>
                                                <div className="space-y-2">
                                                    {selectedEmail.attachments.map(
                                                        (attachment, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center justify-between p-3 bg-secondary border rounded-lg"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <FileText className="w-5 h-5 text-muted-foreground" />
                                                                    <div>
                                                                        <div className="font-medium">
                                                                            {attachment.name}
                                                                        </div>
                                                                        <div className="text-sm text-muted-foreground">
                                                                            {attachment.size}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="cursor-pointer"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDownloadAttachment(
                                                                            attachment as {
                                                                                name: string;
                                                                                size?: string;
                                                                            }
                                                                        );
                                                                    }}
                                                                >
                                                                    <Download className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                </div>
                            </ScrollArea>
                        </>
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
