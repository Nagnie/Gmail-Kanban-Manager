import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Search, X, Loader2, Mail } from "lucide-react";
import { DraggableEmailCard } from "./DraggableEmailCard";
import type { JSX } from "react";

interface InboxPanelProps {
    column: any;
    emails: any[];
    settings: any;
    searchVisible: boolean;
    isLoading: boolean;
    isFetchingMore: boolean;
    summarizingId: string | null;
    sentinelRef: any;
    onClose: () => void;
    onToggleSearch: () => void;
    onUpdateSettings: (updater: (prev: any) => any) => void;
    onHideEmail: (emailId: string) => void;
    onSummarizeEmail: (emailId: string) => void;
    getColumnIcon: (name: string) => JSX.Element;
}

export const InboxPanel = ({
    column,
    emails,
    settings,
    searchVisible,
    isLoading,
    isFetchingMore,
    summarizingId,
    sentinelRef,
    onClose,
    onToggleSearch,
    onUpdateSettings,
    onHideEmail,
    onSummarizeEmail,
    getColumnIcon,
}: InboxPanelProps) => {
    return (
        <>
            <div className="p-4 border-b bg-card flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {getColumnIcon(column.name)}
                    <h3 className="font-semibold">{column.name}</h3>
                    <Badge variant="secondary">{emails.length}</Badge>
                </div>

                <div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={onToggleSearch}
                    >
                        <Search className={`w-4 h-4 ${searchVisible ? "text-primary" : ""}`} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {searchVisible && (
                <div className="px-4 mt-2">
                    <div className="animate-in slide-in-from-top-2 duration-200 pr-2">
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
                </div>
            )}

            <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : emails.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Mail className="w-12 h-12 mb-2 opacity-50" />
                            <p className="text-sm text-center">
                                {settings.filterUnread || settings.filterAttachments
                                    ? "No emails match filters"
                                    : "All emails organized!"}
                            </p>
                        </div>
                    ) : (
                        <>
                            {emails.map((email: any) => (
                                <DraggableEmailCard
                                    key={email.id}
                                    email={email}
                                    onHide={onHideEmail}
                                    onSummarize={onSummarizeEmail}
                                    isSummarizing={summarizingId === email.id}
                                    source="inbox"
                                />
                            ))}
                            <div ref={sentinelRef} style={{ height: 32 }}></div>
                            {isFetchingMore && emails.length > 0 && (
                                <div className="w-full p-4 text-center">
                                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
};
