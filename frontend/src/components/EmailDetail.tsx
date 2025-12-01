import { useEffect } from "react";
import {
    Reply,
    ReplyAll,
    Forward,
    Download,
    ChevronLeft,
    Star,
    Mail,
    Trash,
    FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateLong, formatFileSize } from "@/lib/utils";
import type { ThreadMessage } from "@/services/mailboxes/types";
import DOMPurify from "dompurify";
import {
    useStarEmailMutation,
    useUnstarEmailMutation,
    useMarkAsReadMutation,
    useMarkAsUnreadMutation,
    useDeleteEmailMutation,
    useDownloadAttachmentMutation,
} from "@/services/tanstack-query";

interface EmailDetailProps {
    message: ThreadMessage | null;
    onBack?: () => void;
    onRefreshEmails?: () => void;
}

export function EmailDetail({ message, onBack }: EmailDetailProps) {
    // Email action mutations
    const { mutate: starEmail } = useStarEmailMutation();
    const { mutate: unstarEmail } = useUnstarEmailMutation();
    const { mutate: markAsRead } = useMarkAsReadMutation();
    const { mutate: markAsUnread } = useMarkAsUnreadMutation();
    const { mutate: deleteEmail } = useDeleteEmailMutation();
    const { mutate: downloadAttachment, isPending: isDownloading } =
        useDownloadAttachmentMutation();

    // Auto mark as read when email is opened if it's unread
    useEffect(() => {
        if (message && message.isUnread) {
            markAsRead(message.id);
        }
    }, [message, markAsRead]);

    const displayMessage = message;

    if (!displayMessage) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                    <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Select an email to view details</p>
                </div>
            </div>
        );
    }

    // Sanitize HTML content using DOMPurify
    const sanitizedHTML = () => {
        if (!message?.body.htmlBody) return "";

        return DOMPurify.sanitize(message.body.htmlBody, {
            ADD_TAGS: ["style"],
            ADD_ATTR: ["target", "class", "style"],
            ALLOWED_URI_REGEXP:
                // eslint-disable-next-line no-useless-escape
                /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        });
    };

    const handleToggleStar = () => {
        if (!message) return;

        if (displayMessage.isStarred) {
            unstarEmail(message.id);
        } else {
            starEmail(message.id);
        }
    };

    const handleMarkAsUnread = () => {
        if (!message) return;

        markAsUnread(message.id);
    };

    const handleDelete = () => {
        if (!message) return;

        deleteEmail(message.id);
        if (onBack) {
            onBack();
        }
    };

    const handleDownloadAttachment = (attachmentId: string, filename: string, mimeType: string) => {
        if (!message) return;

        downloadAttachment({
            attachmentId,
            messageId: message.id,
            filename,
            mimeType,
        });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="pt-6 pb-4 px-8 shrink-0">
                <div className="flex items-center gap-2">
                    {onBack && (
                        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onBack}>
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                    )}
                    <div className="flex gap-3 flex-wrap flex-1">
                        <Button variant="ghost" size="sm" className="cursor-pointer">
                            <Reply className="w-4 h-4 mr-1 text-mail-foreground" />
                            Reply
                        </Button>
                        <Button variant="ghost" size="sm" className="cursor-pointer">
                            <ReplyAll className="w-4 h-4 mr-1 text-mail-foreground" />
                            Reply All
                        </Button>
                        <Button variant="ghost" size="sm" className="cursor-pointer">
                            <Forward className="w-4 h-4 mr-1 text-mail-foreground" />
                            Forward
                        </Button>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="cursor-pointer"
                        onClick={handleToggleStar}
                    >
                        <Star
                            className={`w-5 h-5 ${
                                displayMessage.isStarred ? "fill-yellow-400 text-yellow-400" : ""
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

            <ScrollArea className="flex-1 overflow-hidden max-w-full">
                <div className="py-4 px-8">
                    <h1 className="text-2xl font-bold mb-4">{displayMessage.headers.subject}</h1>

                    <div className="space-y-2 mb-6 text-sm border-b pb-4">
                        <div className="flex gap-2">
                            <span className="text-muted-foreground w-16">From:</span>
                            <span>{displayMessage.headers.from}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-muted-foreground w-16">To:</span>
                            <span>{displayMessage.headers.to}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-muted-foreground w-16">Date:</span>
                            <span>{formatDateLong(displayMessage.headers.date)}</span>
                        </div>
                    </div>

                    {/* Display HTML content directly with dangerouslySetInnerHTML */}
                    {displayMessage.body.htmlBody ? (
                        <div
                            className="email-content mb-6 overflow-x-auto"
                            dangerouslySetInnerHTML={{ __html: sanitizedHTML() }}
                        />
                    ) : (
                        <p className="whitespace-pre-wrap mb-6">
                            {displayMessage.body.textBody || displayMessage.snippet}
                        </p>
                    )}

                    {/* Attachments */}
                    {displayMessage.body.attachments &&
                        displayMessage.body.attachments.length > 0 && (
                            <div className="border-t pt-4">
                                <h3 className="font-semibold mb-3">
                                    Attachments ({displayMessage.body.attachments.length})
                                </h3>
                                <div className="space-y-2">
                                    {displayMessage.body.attachments.map((attachment, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-3 bg-secondary border rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-5 h-5 text-muted-foreground" />
                                                <div>
                                                    <div className="font-medium">
                                                        {attachment.filename}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {formatFileSize(attachment.size)}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="cursor-pointer"
                                                onClick={() =>
                                                    handleDownloadAttachment(
                                                        attachment.attachmentId,
                                                        attachment.filename,
                                                        attachment.mimeType
                                                    )
                                                }
                                                disabled={isDownloading}
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                </div>
            </ScrollArea>
        </div>
    );
}
