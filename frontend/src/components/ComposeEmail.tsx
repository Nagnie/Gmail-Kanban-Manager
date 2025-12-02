import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Paperclip, Send, Loader2 } from 'lucide-react';
import { useSendEmailMutation } from '@/services/email/useEmailMutations';
import { useReplyForwardEmailMutation } from '@/services/email/useEmailMutations';

interface ComposeEmailProps {
    onClose: () => void;
    mode: 'compose' | 'reply' | 'reply_all' | 'forward' | null;
    replyTo?: {
        emailId: string;
        threadId: string;
        subject: string;
        to: string;
        cc?: string;
        body?: string;
    };
}
export default function ComposeEmail({ onClose, mode, replyTo }: ComposeEmailProps) {
    const [to, setTo] = useState(replyTo?.to || '');
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const [subject, setSubject] = useState(replyTo?.subject || '');
    const [body, setBody] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [showCc, setShowCc] = useState(false);
    const [showBcc, setShowBcc] = useState(false);
    const [toError, setToError] = useState('');

    const { mutate: sendEmail, isPending } = useSendEmailMutation();
    const { mutate: replyForwardEmail, isPending: isPendingReply } = useReplyForwardEmailMutation();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleSend = () => {
        const trimmedTo = to.trim();
        const trimmedSubject = subject.trim();
        const trimmedBody = body.trim();

        if (!trimmedTo) {
            setToError('Please enter at least one recipient.');
            return;
        }

        if (!trimmedSubject || !trimmedBody) {
            const ok = window.confirm('Are you sure? Subject or message is empty.');
            if (!ok) return;
        }

        const formData = new FormData();

        if (mode === 'compose') {
            formData.append('to', JSON.stringify(to.split(',').map(email => email.trim())));
            if (cc) formData.append('cc', JSON.stringify(cc.split(',').map(email => email.trim())));
            if (bcc) formData.append('bcc', JSON.stringify(bcc.split(',').map(email => email.trim())));
            formData.append('subject', subject);
            formData.append('textBody', body);
            if (replyTo?.threadId) formData.append('threadId', replyTo.threadId);
            files.forEach((file) => formData.append('files', file));

            sendEmail(formData, {
                onSuccess: () => onClose(),
                onError: (error) => console.error(error),
            });
        } else {
            formData.append('type', mode!);

            if (mode === 'forward') {
                formData.append('to', JSON.stringify(to.split(',').map(email => email.trim())));
                formData.append('subject', subject);
                // formData.append('includeOriginalAttachments', includeOriginalAttachments.toString());
            } else if (mode === 'reply_all') {
                if (to) formData.append('to', JSON.stringify(to.split(',').map(email => email.trim())));
            }

            if (cc) formData.append('cc', JSON.stringify(cc.split(',').map(email => email.trim())));
            if (bcc) formData.append('bcc', JSON.stringify(bcc.split(',').map(email => email.trim())));
            formData.append('textBody', body);
            files.forEach((file) => formData.append('files', file));

            replyForwardEmail(
                { emailId: replyTo!.emailId, data: formData },
                {
                    onSuccess: () => onClose(),
                    onError: (error) => console.error(error),
                }
            );
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-lg">
                    {replyTo ? 'Reply' : 'New Message'}
                </h3>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className='cursor-pointer'>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium w-12">To:</span>
                        <Input
                            value={to}
                            onChange={(e) => {
                                setTo(e.target.value);
                                if (toError) setToError('');
                            }}
                            placeholder="recipient@example.com"
                            className="flex-1"
                        />
                        {!showCc && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowCc(true)}
                                className='cursor-pointer'
                            >
                                Cc
                            </Button>
                        )}
                        {!showBcc && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowBcc(true)}
                                className='cursor-pointer'
                            >
                                Bcc
                            </Button>
                        )}
                    </div>

                    {toError && (
                        <p className="text-sm text-red-600">{toError}</p>
                    )}

                    {showCc && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium w-12">Cc:</span>
                            <Input
                                value={cc}
                                onChange={(e) => setCc(e.target.value)}
                                placeholder="cc@example.com"
                                className="flex-1"
                            />
                        </div>
                    )}

                    {showBcc && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium w-12">Bcc:</span>
                            <Input
                                value={bcc}
                                onChange={(e) => setBcc(e.target.value)}
                                placeholder="bcc@example.com"
                                className="flex-1"
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium w-12">Subject:</span>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Email subject"
                            className="flex-1"
                        />
                    </div>
                </div>

                <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your message..."
                    className="min-h-[300px] resize-none"
                />

                {files.length > 0 && (
                    <div className="space-y-1">
                        <p className="text-sm font-medium">Attachments:</p>
                        {files.map((file, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                                <Paperclip className="w-3 h-3" />
                                <span>{file.name}</span>
                                <span className="text-xs">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t">
                <div className="flex gap-2">
                    <Button
                        onClick={handleSend}
                        disabled={mode === 'compose' ? isPending : isPendingReply}
                        className="cursor-pointer"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Send
                            </>
                        )}
                    </Button>

                    <label>
                        <Button
                            variant="outline"
                            className="cursor-pointer"
                            asChild
                        >
                            <span>
                                <Paperclip className="w-4 h-4 mr-2" />
                                Attach
                            </span>
                        </Button>
                        <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </label>
                </div>

                <Button
                    variant="ghost"
                    onClick={onClose}
                    className='cursor-pointer'>
                    Discard
                </Button>
            </div>
        </div>
    );
}