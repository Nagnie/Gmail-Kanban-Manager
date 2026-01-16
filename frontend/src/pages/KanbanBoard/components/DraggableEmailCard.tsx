import { EyeOff, Grip, Loader2, Sparkles, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDateShort } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";

import type { EmailCardDto } from "@/services/kanban/types";
import { Link } from "react-router-dom";
export const DraggableEmailCard = ({
    email,
    onHide,
    onSummarize,
    isSummarizing,
    source,
}: {
    email: EmailCardDto;
    onHide?: (id: string) => void;
    onSummarize?: (id: string) => void;
    isSummarizing?: boolean;
    source: string | "inbox";
}) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `${source}-${email.id}`,
        data: { email, source },
    });

    const style = transform
        ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              opacity: isDragging ? 0.5 : 1,
          }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-card w-full rounded-lg shadow-sm border border-sidebar-border p-3 sm:p-4 hover:shadow-md transition-shadow hover:border-mail-selected group"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                        {...listeners}
                        {...attributes}
                        className="cursor-grab active:cursor-grabbing"
                    >
                        <Grip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground truncate">
                                {email.fromName || email.from}
                            </span>
                            {email.isStarred && (
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                            )}
                        </div>
                        <Link
                            className={`text-sm mt-1 line-clamp-2 ${
                                email.isUnread ? "font-bold" : "font-medium"
                            }`}
                            to={`/email/${email.id}`}
                        >
                            {email.subject}
                        </Link>
                    </div>
                </div>
                {onHide && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            onHide(email.id);
                        }}
                    >
                        <EyeOff className="w-3 h-3" />
                    </Button>
                )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-3">
                <div className="flex items-start gap-2">
                    <div className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded flex-shrink-0">
                        AI
                    </div>
                    {email.summary ? (
                        <p className="text-xs text-foreground leading-relaxed line-clamp-3">
                            {email.summary}
                        </p>
                    ) : (
                        <div className="flex-1 flex items-center justify-between">
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1 italic">
                                {email.snippet}
                            </p>
                            {onSummarize && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSummarize(email.id);
                                    }}
                                    disabled={isSummarizing}
                                >
                                    {isSummarizing ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-3 h-3" />
                                    )}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDateShort(email.date)}</span>
                <div className="flex items-center gap-2">
                    {email.isUnread && (
                        <span className="bg-blue-500 text-white px-2 py-1 rounded-full font-medium">
                            New
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
