import { EyeOff, Grip, Star } from "lucide-react";

import { extractSenderName, formatDateShort, getAISummary } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";

import { Button } from "../../../components/ui/button";

import type { EmailMessage } from "@/services/mailboxes";
export const DraggableEmailCard = ({
  email,
  onHide,
  source,
}: {
  email: EmailMessage;
  onHide?: (id: string) => void;
  source: string | "inbox";
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
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
      className='bg-card w-90 rounded-lg shadow-sm border border-sidebar-border p-4 hover:shadow-md transition-shadow hover:border-mail-selected group'
    >
      <div className='flex items-start justify-between mb-3'>
        <div className='flex items-center gap-2 flex-1 min-w-0'>
          <div
            {...listeners}
            {...attributes}
            className='cursor-grab active:cursor-grabbing'
          >
            <Grip className='w-4 h-4 text-muted-foreground flex-shrink-0' />
          </div>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2'>
              <span className='text-xs font-medium text-muted-foreground truncate'>
                {email.participantEmails ||
                  extractSenderName(email.header.from)}
              </span>
              {email.isStarred && (
                <Star className='w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0' />
              )}
            </div>
            <h4
              className={`text-sm mt-1 line-clamp-2 ${
                email.isUnread ? "font-bold" : "font-medium"
              }`}
            >
              {email.header.subject}
            </h4>
          </div>
        </div>
        {onHide && (
          <Button
            variant='ghost'
            size='icon'
            className='opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 cursor-pointer'
            onClick={(e) => {
              e.stopPropagation();
              onHide(email.id);
            }}
          >
            <EyeOff className='w-3 h-3' />
          </Button>
        )}
      </div>

      <div className='bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-3'>
        <div className='flex items-start gap-2'>
          <div className='bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded flex-shrink-0'>
            AI
          </div>
          <p className='text-xs text-foreground leading-relaxed line-clamp-3'>
            {getAISummary(email.snippet)}
          </p>
        </div>
      </div>

      <div className='flex items-center justify-between text-xs text-muted-foreground'>
        <span>{formatDateShort(email.header.date)}</span>
        <div className='flex items-center gap-2'>
          {email.messageCount !== undefined && email.messageCount > 1 && (
            <span className='bg-sidebar-border px-2 py-1 rounded-full'>
              {email.messageCount}
            </span>
          )}
          {email.isUnread && (
            <span className='bg-blue-500 text-white px-2 py-1 rounded-full font-medium'>
              New
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
