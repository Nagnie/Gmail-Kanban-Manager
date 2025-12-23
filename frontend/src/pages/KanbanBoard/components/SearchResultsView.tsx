import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Loader2, Search, Paperclip } from "lucide-react";

interface SearchResultsViewProps {
  searchResults: any[];
  isSearching: boolean;
  onClose: () => void;
  onEmailSelect: (emailId: string) => void;
}

export const SearchResultsView = ({
  searchResults,
  isSearching,
  onClose,
  onEmailSelect,
}: SearchResultsViewProps) => {
  return (
    <div className='absolute inset-0 z-50 bg-background'>
      <div className='h-full flex flex-col'>
        <div className='bg-card border-b px-6 py-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              size='icon'
              onClick={onClose}
              className='cursor-pointer'
            >
              <ChevronLeft className='w-4 h-4' />
            </Button>
            <h2 className='text-lg font-semibold'>Search Results</h2>
            <Badge variant='secondary'>{searchResults.length} found</Badge>
          </div>
          <Button
            variant='ghost'
            size='sm'
            onClick={onClose}
            className='cursor-pointer'
          >
            Close
          </Button>
        </div>

        <div className='flex-1 overflow-y-auto p-6'>
          {isSearching ? (
            <div className='flex flex-col items-center justify-center py-12'>
              <Loader2 className='w-12 h-12 mb-4 animate-spin text-muted-foreground' />
              <p className='text-muted-foreground'>Searching...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12'>
              <Search className='w-12 h-12 mb-4 text-muted-foreground opacity-50' />
              <p className='text-lg font-medium mb-2'>No results found</p>
              <p className='text-sm text-muted-foreground'>
                Try searching with different keywords
              </p>
            </div>
          ) : (
            <div className='max-w-4xl mx-auto space-y-3'>
              {searchResults.map((email) => (
                <div
                  key={email.id}
                  className='bg-card rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer'
                  onClick={() => onEmailSelect(email.id)}
                >
                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='font-medium text-sm truncate'>
                          {email.fromName || email.from}
                        </span>
                        {email.isUnread && (
                          <Badge variant='secondary' className='h-5 text-xs'>
                            New
                          </Badge>
                        )}
                        {email.hasAttachments && (
                          <Paperclip className='w-3 h-3 text-muted-foreground' />
                        )}
                      </div>
                      <h3 className='font-semibold mb-1 truncate'>
                        {email.subject}
                      </h3>
                      <p className='text-sm text-muted-foreground line-clamp-2'>
                        {email.snippet}
                      </p>
                      <p className='text-xs text-muted-foreground mt-2'>
                        {new Date(email.date).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      className='cursor-pointer shrink-0'
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
