import { Button } from "@/components/ui/button";
import { ArrowUpDown, MailOpen, Paperclip, X } from "lucide-react";

interface FilterPanelProps {
  sortBy: string;
  filterUnread: boolean;
  filterAttachments: boolean;
  onChangeSortBy: (sortBy: string) => void;
  onToggleUnread: () => void;
  onToggleAttachments: () => void;
  onClearAll: () => void;
}

export const FilterPanel = ({
  sortBy,
  filterUnread,
  filterAttachments,
  onChangeSortBy,
  onToggleUnread,
  onToggleAttachments,
  onClearAll,
}: FilterPanelProps) => {
  const hasActiveFilters =
    filterUnread || filterAttachments || sortBy !== "date-desc";

  return (
    <div className='bg-card border-b px-6 py-3'>
      <div className='flex items-center gap-4'>
        <div className='flex items-center gap-2'>
          <ArrowUpDown className='w-4 h-4 text-muted-foreground' />
          <span className='text-sm font-medium'>Sort:</span>
          <Button
            variant={sortBy === "date-desc" ? "secondary" : "ghost"}
            size='sm'
            onClick={() => onChangeSortBy("date-desc")}
            className='cursor-pointer'
          >
            Newest First
          </Button>
          <Button
            variant={sortBy === "date-asc" ? "secondary" : "ghost"}
            size='sm'
            onClick={() => onChangeSortBy("date-asc")}
            className='cursor-pointer'
          >
            Oldest First
          </Button>
          <Button
            variant={sortBy === "sender" ? "secondary" : "ghost"}
            size='sm'
            onClick={() => onChangeSortBy("sender")}
            className='cursor-pointer'
          >
            By Sender
          </Button>
        </div>

        <div className='h-6 w-px bg-border' />

        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium'>Filter:</span>
          <Button
            variant={filterUnread ? "secondary" : "ghost"}
            size='sm'
            onClick={onToggleUnread}
            className='cursor-pointer'
          >
            <MailOpen className='w-4 h-4 mr-2' />
            Unread Only
          </Button>
          <Button
            variant={filterAttachments ? "secondary" : "ghost"}
            size='sm'
            onClick={onToggleAttachments}
            className='cursor-pointer'
          >
            <Paperclip className='w-4 h-4 mr-2' />
            Has Attachments
          </Button>
        </div>

        {hasActiveFilters && (
          <>
            <div className='h-6 w-px bg-border' />
            <Button
              variant='ghost'
              size='sm'
              onClick={onClearAll}
              className='cursor-pointer'
            >
              <X className='w-4 h-4 mr-2' />
              Clear All
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
