import React from "react";
import {
    Mail,
    Star,
    Send,
    FileText,
    Archive,
    Trash,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { type Folder } from "@/services/types";

interface FolderSidebarProps {
    folders: Folder[];
    selectedFolder: string;
    onSelectFolder: (id: string) => void;
    showMobile: boolean;
    onCloseMobile: () => void;
}

export default function FolderSidebar({ folders, selectedFolder, onSelectFolder, showMobile, onCloseMobile }: FolderSidebarProps) {
    const mailboxIcons: Record<string, React.ReactNode> = {
        inbox: <Mail className="w-4 h-4" />,
        starred: <Star className="w-4 h-4" />,
        sent: <Send className="w-4 h-4" />,
        drafts: <FileText className="w-4 h-4" />,
        archive: <Archive className="w-4 h-4" />,
        trash: <Trash className="w-4 h-4" />,
    };

    return (
        <aside className={`
      ${showMobile ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0 fixed lg:static inset-0 z-40 
      w-64 lg:w-1/5 border-r transition-transform duration-200
    `}>
            <div className="h-full flex flex-col bg-sidebar">
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="font-semibold text-2xl">Mailboxes</h2>
                    <Button variant="ghost" size="icon" className="lg:hidden" onClick={onCloseMobile}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <ScrollArea className="flex-1">
                    <nav className="p-2">
                        {folders.map((folder) => (
                            <Button
                                variant="ghost"
                                key={folder.id}
                                onClick={() => {
                                    onSelectFolder(folder.id);
                                    onCloseMobile();
                                }}
                                className={`
                                    w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer
                                    transition-colors text-left justify-start
                                    ${selectedFolder === folder.id ? 'bg-mail-selected text-foreground' : 'text-muted-foreground'}
                                    `}
                            >
                                {mailboxIcons[folder.id] || <Mail className="w-4 h-4" />}
                                <span className="flex-1">{folder.name}</span>
                                {folder.count ? (
                                    <Badge variant="secondary" className="ml-auto">{folder.count}</Badge>
                                ) : null}
                            </Button>
                        ))}
                    </nav>
                </ScrollArea>
            </div>
        </aside>
    );
};