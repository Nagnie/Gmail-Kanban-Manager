import { useState } from 'react';
import {
    ArrowLeft,
    SendHorizontal,
    Bold,
    Italic,
    UnderlineIcon,
    Strikethrough,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Link2,
    ImageIcon,
    Type,
    ChevronDown,
    Paperclip,
    Smile,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type DraftEmail, type Email } from '@/services/types';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';

interface EmailComposeProps {
    draft?: DraftEmail;
    replyTo?: Email;
    onClose: () => void;
    onSend: (email: { to: string; subject: string; body: string }) => void;
}

export default function EmailCompose({
    draft,
    replyTo,
    onClose,
    onSend,
}: EmailComposeProps) {
    const [to, setTo] = useState(draft?.to || (replyTo ? replyTo.from.match(/<(.+)>/)?.[1] || replyTo.from : ''));
    const [from] = useState('user@mail.com');
    const [subject, setSubject] = useState(draft?.subject || (replyTo ? `Re: ${replyTo.subject}` : ''));

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Link,
            Image,
        ],
        content: draft?.body || (replyTo ? `<p></p><p></p><hr><p>On ${new Date(replyTo.timestamp).toLocaleString()}, ${replyTo.from} wrote:</p><p>${replyTo.body || replyTo.preview}</p>` : ''),
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4',
            },
        },
    });

    const handleSend = () => {
        if (editor) {
            onSend({ to, subject, body: editor.getHTML() });
            onClose();
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onClose} className='cursor-pointer'>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h2 className="text-lg font-semibold">New Email</h2>
                </div>
                <Button variant="default" className='cursor-pointer' onClick={handleSend}>
                    Send
                    <SendHorizontal className="w-5 h-5" />
                </Button>
            </div>

            <div className="flex-1 flex flex-col overflow-auto">
                <div className="p-4 space-y-3 border-b">
                    <div className="flex items-center gap-2">
                        <span className="text-sm w-12">To</span>
                        <Input
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="flex-1 focus-visible:ring-0 px-3 border-border"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm w-12">From</span>
                        <span className="text-sm px-3">{from}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm w-12">Subject</span>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="flex-1 focus-visible:ring-0 px-3 border-border"
                        />
                    </div>
                </div>

                <div className="border-b p-2 flex items-center gap-1 flex-wrap">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                    >
                        <Bold className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                    >
                        <Italic className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => editor?.chain().focus().toggleUnderline().run()}
                    >
                        <UnderlineIcon className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => editor?.chain().focus().toggleStrike().run()}
                    >
                        <Strikethrough className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-6 mx-1" />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    >
                        <List className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    >
                        <ListOrdered className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-6 mx-1" />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                    >
                        <AlignLeft className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                    >
                        <AlignCenter className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                    >
                        <AlignRight className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-6 mx-1" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                        <Link2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                        <ImageIcon className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 cursor-pointer">
                        <Type className="w-4 h-4 mr-1" />
                        <ChevronDown className="w-3 h-3" />
                    </Button>
                    <div className="w-px h-6 mx-1" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                        <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                        <Smile className="w-4 h-4" />
                    </Button>
                </div>

                <EditorContent editor={editor} className="flex-1 overflow-auto" />
            </div>
        </div>
    );
};