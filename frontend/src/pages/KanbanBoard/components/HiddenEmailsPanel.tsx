import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EyeOff, Eye, ChevronRight } from "lucide-react";
import { StaticEmailCard } from "./StaticEmailCard";

interface HiddenEmailsPanelProps {
  hiddenEmails: any[];
  summarizingId: string | null;
  onClose: () => void;
  onUnhideEmail: (emailId: string) => void;
  onSummarizeEmail: (emailId: string) => void;
}

export const HiddenEmailsPanel = ({
  hiddenEmails,
  summarizingId,
  onClose,
  onUnhideEmail,
  onSummarizeEmail,
}: HiddenEmailsPanelProps) => {
  return (
    <>
      <div className='p-4 border-b bg-card flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <EyeOff className='w-4 h-4' />
          <h3 className='font-semibold'>Hidden Emails</h3>
          <Badge variant='secondary'>{hiddenEmails.length}</Badge>
        </div>
        <Button
          variant='ghost'
          size='icon'
          onClick={onClose}
          className='cursor-pointer'
        >
          <ChevronRight className='w-4 h-4' />
        </Button>
      </div>
      <div className='flex-1 p-4 overflow-y-auto'>
        <div className='space-y-3'>
          {hiddenEmails.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
              <Eye className='w-12 h-12 mb-2 opacity-50' />
              <p className='text-sm text-center'>No hidden emails</p>
            </div>
          ) : (
            hiddenEmails.map((email) => (
              <div key={email.id} className='relative'>
                <StaticEmailCard
                  onSummarize={onSummarizeEmail}
                  isSummarizing={summarizingId === email.id}
                  email={{
                    id: email.id,
                    from: email.from,
                    subject: email.subject,
                    snippet: email.snippet,
                    date: email.date,
                    isUnread: false,
                    isStarred: false,
                    summary: email.summary,
                    hasSummary: !!email.summary,
                    headers: email.headers,
                    hasAttachments: email.hasAttachments,
                    isImportant: email.isImportant,
                    labelIds: email.labelIds,
                    threadId: email.threadId,
                  }}
                />
                <Button
                  variant='ghost'
                  size='sm'
                  className='absolute top-2 right-2 cursor-pointer'
                  onClick={() => onUnhideEmail(email.id)}
                >
                  <Eye className='w-4 h-4' />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
