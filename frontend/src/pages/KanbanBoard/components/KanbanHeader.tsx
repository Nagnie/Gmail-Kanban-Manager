import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, Eye, RefreshCw, Loader2 } from "lucide-react";
import { FuzzySearchBar } from "@/components/FuzzySearchBar";

interface KanbanHeaderProps {
  onEmailSelect: (emailId: string) => void;
  onViewAllSearch: (query: string) => void;
  onToggleFilterPanel: () => void;
  onToggleHiddenPanel: () => void;
  onRefresh: () => void;
  onAddColumn: () => void;
  onReorderColumns: () => void;
  hiddenEmailsCount: number;
  activeFiltersCount: number;
  isFetchingEmails: boolean;
}

export const KanbanHeader = ({
  onEmailSelect,
  onViewAllSearch,
  onToggleFilterPanel,
  onToggleHiddenPanel,
  onRefresh,
  onAddColumn,
  onReorderColumns,
  hiddenEmailsCount,
  activeFiltersCount,
  isFetchingEmails,
}: KanbanHeaderProps) => {
  return (
    <div className='bg-card border-b px-6 py-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-3 flex-1'>
          <FuzzySearchBar
            onEmailSelect={onEmailSelect}
            onViewAll={onViewAllSearch}
          />

          <Button
            variant='outline'
            size='sm'
            onClick={onToggleFilterPanel}
            className='cursor-pointer'
          >
            <SlidersHorizontal className='w-4 h-4 mr-2' />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant='destructive' className='ml-2 h-5 w-5 p-0 text-xs'>
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={onToggleHiddenPanel}
            className='cursor-pointer'
          >
            <Eye className='w-4 h-4 mr-2' />
            Hidden ({hiddenEmailsCount})
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={onRefresh}
            className='cursor-pointer'
          >
            <RefreshCw className='w-4 h-4 mr-2' />
            Refresh
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={onAddColumn}
            className='cursor-pointer'
          >
            Add Column
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={onReorderColumns}
            className='cursor-pointer'
          >
            Reorder Columns
          </Button>

          {isFetchingEmails && (
            <Loader2 className='w-4 h-4 animate-spin text-muted-foreground' />
          )}
        </div>
      </div>
    </div>
  );
};
