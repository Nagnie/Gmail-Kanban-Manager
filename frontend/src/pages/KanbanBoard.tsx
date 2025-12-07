import React, { useState, useEffect } from "react";
import {
  Mail,
  Inbox,
  CheckCircle,
  Clock,
  Archive,
  Star,
  Grip,
  Search,
  X,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { useMailboxEmails } from "@/hooks/useMailboxEmails";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { EmailMessage } from "@/services/mailboxes";

const KanbanBoard = () => {
  const baseColumns = React.useRef({
    TODO: {
      id: "TODO",
      title: "To Do",
      icon: <CheckCircle className='w-4 h-4' />,
      emails: [] as EmailMessage[],
    },
    IN_PROGRESS: {
      id: "IN_PROGRESS",
      title: "In Progress",
      icon: <Clock className='w-4 h-4' />,
      emails: [] as EmailMessage[],
    },
    DONE: {
      id: "DONE",
      title: "Done",
      icon: <Archive className='w-4 h-4' />,
      emails: [] as EmailMessage[],
    },
  });

  const [columns, setColumns] = useState(() => ({
    TODO: { ...baseColumns.current.TODO },
    IN_PROGRESS: { ...baseColumns.current.IN_PROGRESS },
    DONE: { ...baseColumns.current.DONE },
  }));

  const [hiddenEmails, setHiddenEmails] = useState<EmailMessage[]>([]);
  const [draggedEmail, setDraggedEmail] = useState<{
    email: EmailMessage;
    sourceColumn: string | "inbox";
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder] = useState("INBOX");
  const [showInboxPanel, setShowInboxPanel] = useState(true);
  const [showHiddenPanel, setShowHiddenPanel] = useState(false);
  const [processedEmailIds, setProcessedEmailIds] = useState<Set<string>>(
    new Set()
  );

  // Use your actual hook with infinite scroll
  const {
    emails,
    isLoading: isLoadingEmails,
    isFetching: isFetchingEmails,
    hasNextPage,
    loadNextPage,
  } = useMailboxEmails({
    labelId: selectedFolder,
    q: searchQuery,
  });

  const sentinelRef = useInfiniteScroll({
    hasMore: hasNextPage,
    isLoading: isFetchingEmails,
    onLoadMore: loadNextPage,
  });

  // Filter emails that are not yet processed (not in kanban or hidden)
  const inboxEmails = emails.filter(
    (email: EmailMessage) => !processedEmailIds.has(email.id)
  );

  useEffect(() => {
    if (!emails || emails.length === 0) return;

    // Build new columns based on base meta to avoid depending on `columns` in the closure
    const newColumns = {
      TODO: { ...baseColumns.current.TODO, emails: [] as EmailMessage[] },
      IN_PROGRESS: {
        ...baseColumns.current.IN_PROGRESS,
        emails: [] as EmailMessage[],
      },
      DONE: { ...baseColumns.current.DONE, emails: [] as EmailMessage[] },
    };

    // Collect processed ids from emails that already have a kanban label
    const collectedProcessed = new Set<string>();

    emails.forEach((email: EmailMessage) => {
      const kanbanLabel = email.labelIds?.find((label) =>
        ["TODO", "IN_PROGRESS", "DONE"].includes(label)
      );

      if (kanbanLabel && newColumns[kanbanLabel as keyof typeof newColumns]) {
        newColumns[kanbanLabel as keyof typeof newColumns].emails.push(email);
        collectedProcessed.add(email.id);
      }
    });

    // Only update state when there is an actual change to avoid update loops
    setColumns((prev) => {
      const isSame = Object.keys(newColumns).every((key) => {
        const prevIds = (prev as any)[key].emails
          .map((e: EmailMessage) => e.id)
          .join(",");
        const newIds = (newColumns as any)[key].emails
          .map((e: EmailMessage) => e.id)
          .join(",");
        return prevIds === newIds;
      });
      return isSame ? prev : newColumns;
    });

    setProcessedEmailIds((prev) => {
      // If sets are equal (same size and items) return prev to avoid re-render
      if (prev.size === collectedProcessed.size) {
        let equal = true;
        collectedProcessed.forEach((id) => {
          if (!prev.has(id)) equal = false;
        });
        if (equal) return prev;
      }
      return new Set(collectedProcessed);
    });
  }, [emails]);

  const handleDragStart = (
    e: React.DragEvent,
    email: EmailMessage,
    sourceColumn: string | "inbox"
  ) => {
    setDraggedEmail({ email, sourceColumn });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();

    if (!draggedEmail) return;

    const { email, sourceColumn } = draggedEmail;

    if (sourceColumn === targetColumnId) {
      setDraggedEmail(null);
      return;
    }

    const newColumns = { ...columns };

    // Remove from source column if it's a kanban column
    if (
      sourceColumn !== "inbox" &&
      newColumns[sourceColumn as keyof typeof newColumns]
    ) {
      newColumns[sourceColumn as keyof typeof newColumns].emails = newColumns[
        sourceColumn as keyof typeof newColumns
      ].emails.filter((e) => e.id !== email.id);
    }

    // Add to target column
    const updatedEmail = {
      ...email,
      labelIds: email.labelIds
        .filter((label) => !["TODO", "IN_PROGRESS", "DONE"].includes(label))
        .concat(targetColumnId),
    };

    newColumns[targetColumnId as keyof typeof newColumns].emails.push(
      updatedEmail
    );

    setColumns(newColumns);

    // Mark as processed (remove from inbox panel)
    setProcessedEmailIds((prev) => new Set(prev).add(email.id));

    setDraggedEmail(null);

    // TODO: Call your API to update email label
    // updateEmailLabel({ emailId: email.id, addLabelIds: [targetColumnId], removeLabelIds: sourceColumn !== 'inbox' ? [sourceColumn] : [] });
  };

  const handleHideEmail = (emailId: string) => {
    const email = inboxEmails.find((e) => e.id === emailId);
    if (email) {
      setHiddenEmails((prev) => [...prev, email]);
      setProcessedEmailIds((prev) => new Set(prev).add(emailId));
    }
  };

  const handleUnhideEmail = (emailId: string) => {
    setHiddenEmails((prev) => prev.filter((e) => e.id !== emailId));
    setProcessedEmailIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(emailId);
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getAISummary = (snippet: string) => {
    return `AI Summary: ${snippet.substring(0, 50)}${
      snippet.length > 100 ? "..." : ""
    }`;
  };

  const extractSenderName = (from: string) => {
    const match = from.match(/^(.+?)\s*</);
    return match ? match[1].trim() : from;
  };

  const EmailCard = ({
    email,
    onHide,
    isDraggable = true,
    source,
  }: {
    email: EmailMessage;
    onHide?: (id: string) => void;
    isDraggable?: boolean;
    source: string | "inbox";
  }) => (
    <div
      draggable={isDraggable}
      onDragStart={(e) => isDraggable && handleDragStart(e, email, source)}
      className='bg-card w-90 rounded-lg shadow-sm border border-sidebar-border p-4 cursor-move hover:shadow-md transition-shadow hover:border-mail-selected group'
    >
      <div className='flex items-start justify-between mb-3'>
        <div className='flex items-center gap-2 flex-1 min-w-0'>
          <Grip className='w-4 h-4 text-muted-foreground flex-shrink-0' />
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
        <span>{formatDate(email.header.date)}</span>
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

  if (isLoadingEmails) {
    return (
      <div className='flex items-center justify-center h-[calc(100vh-64px)] bg-background'>
        <div className='text-center'>
          <Loader2 className='w-12 h-12 mx-auto mb-4 animate-spin text-muted-foreground' />
          <p className='text-muted-foreground'>Loading emails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='h-[calc(100vh-64px)] flex flex-col bg-background'>
      {/* Header */}
      <div className='bg-card border-b px-6 py-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground' />
              <Input
                type='text'
                placeholder='Search emails...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-10 w-64'
              />
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowHiddenPanel(!showHiddenPanel)}
              className='cursor-pointer'
            >
              <Eye className='w-4 h-4 mr-2' />
              Hidden ({hiddenEmails.length})
            </Button>
            {isFetchingEmails && (
              <Loader2 className='w-4 h-4 animate-spin text-muted-foreground' />
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex-1 overflow-hidden flex'>
        {/* Inbox Panel */}
        <div
          className={`${
            showInboxPanel ? "w-100" : "w-0"
          } transition-all duration-300 border-r flex flex-col bg-sidebar`}
        >
          {showInboxPanel && (
            <>
              <div className='p-4 border-b bg-card flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Inbox className='w-4 h-4' />
                  <h3 className='font-semibold'>Inbox</h3>
                  <Badge variant='secondary'>{inboxEmails.length}</Badge>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setShowInboxPanel(false)}
                  className='cursor-pointer'
                >
                  <ChevronLeft className='w-4 h-4' />
                </Button>
              </div>
              <ScrollArea className='flex-1 p-4 overflow-y-auto'>
                <div className='space-y-3'>
                  {inboxEmails.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
                      <Mail className='w-12 h-12 mb-2 opacity-50' />
                      <p className='text-sm text-center'>
                        All emails organized!
                      </p>
                    </div>
                  ) : (
                    <>
                      {inboxEmails.map((email: EmailMessage) => (
                        <EmailCard
                          key={email.id}
                          email={email}
                          onHide={handleHideEmail}
                          source='inbox'
                        />
                      ))}
                      <div ref={sentinelRef} style={{ height: 32 }}></div>
                      {isFetchingEmails && inboxEmails.length > 0 && (
                        <div className='w-full p-4 text-center'>
                          <Loader2 className='w-4 h-4 animate-spin mx-auto text-muted-foreground' />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        {/* Show Inbox Button when collapsed */}
        {!showInboxPanel && (
          <div className='py-4 px-2 border-b bg-card'>
            <Button
              variant='ghost'
              size='icon'
              className='cursor-pointer'
              onClick={() => setShowInboxPanel(true)}
            >
              <ChevronRight className='w-4 h-4' />
            </Button>
          </div>
        )}

        {/* Kanban Board */}
        <div className='flex-1 overflow-x-auto p-6'>
          <div className='flex gap-6 h-full min-w-max'>
            {Object.values(columns).map((column) => (
              <div
                key={column.id}
                className='flex flex-col w-100 bg-sidebar rounded-lg'
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className='flex items-center justify-between p-4 border-b bg-card rounded-t-lg'>
                  <div className='flex items-center gap-2'>
                    {column.icon}
                    <h3 className='font-semibold'>{column.title}</h3>
                    <Badge variant='secondary'>{column.emails.length}</Badge>
                  </div>
                </div>

                <ScrollArea className='flex-1 p-4'>
                  <div className='space-y-3'>
                    {column.emails.length === 0 ? (
                      <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
                        <Mail className='w-12 h-12 mb-2 opacity-50' />
                        <p className='text-sm'>Drop emails here</p>
                      </div>
                    ) : (
                      column.emails.map((email) => (
                        <EmailCard
                          key={email.id}
                          email={email}
                          source={column.id}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            ))}
          </div>
        </div>

        {/* Hidden Emails Panel (always rendered, animated) */}
        <div
          className={`${
            showHiddenPanel
              ? "w-100 opacity-100 translate-x-0"
              : "w-0 opacity-0 -translate-x-4 pointer-events-none"
          } transition-all duration-300 border-l flex flex-col bg-sidebar overflow-hidden`}
          aria-hidden={showHiddenPanel ? "false" : "true"}
        >
          <div
            className={`p-4 border-b bg-card flex items-center justify-between transition-opacity duration-200 ${
              showHiddenPanel ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className='flex items-center gap-2'>
              <EyeOff className='w-4 h-4' />
              <h3 className='font-semibold'>Hidden</h3>
              <Badge variant='secondary'>{hiddenEmails.length}</Badge>
            </div>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setShowHiddenPanel(false)}
              className='cursor-pointer'
            >
              <X className='w-4 h-4' />
            </Button>
          </div>

          <ScrollArea
            className={`flex-1 p-4 transition-opacity duration-300 ${
              showHiddenPanel ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className='space-y-3'>
              {hiddenEmails.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
                  <Eye className='w-12 h-12 mb-2 opacity-50' />
                  <p className='text-sm text-center'>No hidden emails</p>
                </div>
              ) : (
                hiddenEmails.map((email) => (
                  <div key={email.id} className='relative'>
                    <EmailCard
                      email={email}
                      isDraggable={false}
                      source='hidden'
                    />
                    <Button
                      variant='ghost'
                      size='sm'
                      className='absolute top-2 right-2 cursor-pointer'
                      onClick={() => handleUnhideEmail(email.id)}
                    >
                      <Eye className='w-4 h-4' />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default KanbanBoard;
