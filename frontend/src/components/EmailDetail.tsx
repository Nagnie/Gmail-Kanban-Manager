import { useEffect, useState } from "react";
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
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Email } from "@/services/types";
import mailApi from "@/services/mailApi";
import { formatDateLong } from "@/lib/utils";

interface EmailDetailProps {
    email: Email | null;
    onBack?: () => void;
    onToggleStar: (emailId: number) => void;
    onMarkAsUnread: (email: Email) => void;
    onDelete: (email: Email) => void;
    onReply: (email: Email) => void;
}

export default function EmailDetail({
    email,
    onBack,
    onToggleStar,
    onMarkAsUnread,
    onDelete,
    onReply,
}: EmailDetailProps) {
    const [fullEmail, setFullEmail] = useState<Email | null>(email);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (email && !fullEmail?.bodyHtml) {
            loadFullEmail(email.id);
        } else if (email?.id !== fullEmail?.id) {
            setFullEmail(email);
        }
    }, [email?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadFullEmail = async (emailId: number) => {
        try {
            setIsLoading(true);
            setError(null);
            const fetchedEmail = await mailApi.getEmailById(emailId);
            setFullEmail(fetchedEmail);
        } catch (err) {
            setError("Failed to load email details");
            console.error("Error loading email:", err);
            // Fallback to original email if API fails
            setFullEmail(email);
        } finally {
            setIsLoading(false);
        }
    };

    if (!fullEmail) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                    <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Select an email to view details</p>
                </div>
            </div>
        );
    }

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
                        <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => onReply(fullEmail)}>
                            <Reply className="w-4 h-4 mr-1 text-mail-foreground" />
                            Reply
                        </Button>
                        <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => onReply(fullEmail)}>
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
                        onClick={() => onToggleStar(fullEmail.id)}
                    >
                        <Star
                            className={`w-5 h-5 ${
                                fullEmail.isStarred ? "fill-yellow-400 text-yellow-400" : ""
                            }`}
                        />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="cursor-pointer"
                        onClick={() => onMarkAsUnread(fullEmail)}
                    >
                        <Mail className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="cursor-pointer"
                        onClick={() => onDelete(fullEmail)}
                    >
                        <Trash className="w-5 h-5 text-red-500" />
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 overflow-hidden">
                <div className="py-4 px-8">
                    {isLoading && (
                        <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Loading email...</span>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded text-red-800">
                            {error}
                        </div>
                    )}

                    <h1 className="text-2xl font-bold mb-4">{fullEmail.subject}</h1>

                    <div className="space-y-2 mb-6 text-sm border-b pb-4">
                        <div className="flex gap-2">
                            <span className="text-muted-foreground w-16">From:</span>
                            <span>{fullEmail.from}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-muted-foreground w-16">To:</span>
                            <span>{fullEmail.to}</span>
                        </div>
                        {fullEmail.cc && (
                            <div className="flex gap-2">
                                <span className="text-muted-foreground w-16">CC:</span>
                                <span>{fullEmail.cc}</span>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <span className="text-muted-foreground w-16">Date:</span>
                            <span>{formatDateLong(fullEmail.timestamp)}</span>
                        </div>
                    </div>

                    {/* Display HTML content if available, fallback to plain text */}
                    <div className="prose prose-sm max-w-none mb-6">
                        {fullEmail.bodyHtml ? (
                            <div
                                className="email-content break-words"
                                dangerouslySetInnerHTML={{
                                    __html: sanitizeHtml(fullEmail.bodyHtml),
                                }}
                            />
                        ) : (
                            <p className="whitespace-pre-wrap">{fullEmail.body}</p>
                        )}
                    </div>

                    {/* Attachments */}
                    {fullEmail.attachments && fullEmail.attachments.length > 0 && (
                        <div className="border-t pt-4">
                            <h3 className="font-semibold mb-3">
                                Attachments ({fullEmail.attachments.length})
                            </h3>
                            <div className="space-y-2">
                                {fullEmail.attachments.map((attachment, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-3 bg-secondary border rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-muted-foreground" />
                                            <div>
                                                <div className="font-medium">{attachment.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {attachment.size}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="cursor-pointer"
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

// Simple HTML sanitization to prevent XSS attacks
function sanitizeHtml(html: string): string {
    const div = document.createElement("div");
    // Remove script tags and event handlers
    const cleaned = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
        .replace(/on\w+\s*=\s*[^\s>]*/gi, "");

    div.innerHTML = cleaned;
    return div.innerHTML;
}
