import { Archive, ChevronLeft, FileText, Loader2, Mail, Send, Star, Trash, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FuzzySearchBar } from "@/components/FuzzySearchBar";
import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useMailboxes } from "@/hooks/useMailboxes";
import { formatMailboxName } from "@/lib/utils";
import { type Folder } from "@/services/mail";
import type { EmailSearchCard } from "@/services/email/types";
import {
    flattenSearchResults,
    useInfiniteEmailSearch,
    useInfiniteEmailSemanticSearch,
} from "@/hooks/useEmails";
import { SemanticSearchBar } from "@/components/SemanticSearchBar";

const mailboxIcons: Record<string, React.ReactNode> = {
    inbox: <Mail className="w-4 h-4" />,
    starred: <Star className="w-4 h-4" />,
    sent: <Send className="w-4 h-4" />,
    drafts: <FileText className="w-4 h-4" />,
    archive: <Archive className="w-4 h-4" />,
    trash: <Trash className="w-4 h-4" />,
};

export default function SearchResultsPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryFromUrl = searchParams.get("q") || "";
    const fromFromUrl = searchParams.get("from") || "";
    const searchMode = searchParams.get("mode") || "fuzzy";

    const { mailboxes, isLoading: isLoadingMailboxes } = useMailboxes();
    const [folders, setFolders] = useState<Folder[]>([]);

    const debouncedQuery = useDebounce(queryFromUrl, 300);

    // Use infinite query hook
    const {
        data,
        isLoading: isSearching,
        isFetching,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
    } = useInfiniteEmailSearch(debouncedQuery, searchMode === "semantic" ? false : true);

    const {
        data: semanticData,
        isLoading: isSemanticSearching,
        isFetching: isSemanticFetching,
        hasNextPage: hasSemanticNextPage,
        fetchNextPage: fetchSemanticNextPage,
        isFetchingNextPage: isSemanticFetchingNextPage,
    } = useInfiniteEmailSemanticSearch(debouncedQuery, searchMode === "semantic" ? true : false);

    // Flatten all pages into single array
    const results = flattenSearchResults(data || semanticData);
    const totalResults = data?.pages?.[0]?.totalResult || results.length;

    // Infinite scroll sentinel
    const sentinelRef = useInfiniteScroll({
        hasMore: searchMode === "semantic" ? hasSemanticNextPage : hasNextPage,
        isLoading: searchMode === "semantic" ? isSemanticFetchingNextPage : isFetchingNextPage,
        onLoadMore: searchMode === "semantic" ? fetchSemanticNextPage : fetchNextPage,
    });

    // Setup folders
    useEffect(() => {
        if (mailboxes && mailboxes.length > 0) {
            const foldersData: Folder[] = mailboxes
                .filter(
                    (mailbox) =>
                        !mailbox.id.startsWith("CATEGORY_") &&
                        !mailbox.id.startsWith("YELLOW_") &&
                        !mailbox.id.startsWith("CHAT") &&
                        !mailbox.id.startsWith("DRAFT")
                )
                .map((mailbox) => ({
                    id: mailbox.id,
                    name: formatMailboxName(mailbox.name),
                    icon: mailboxIcons[mailbox.id.toLowerCase()] || <Mail className="w-4 h-4" />,
                    count: mailbox.messagesUnread || 0,
                }));
            setFolders(foldersData);
        }
    }, [mailboxes]);

    // Handler when clicking email from dropdown preview
    const handleEmailSelectFromDropdown = (emailId: string) => {
        navigate(
            `/email/${emailId}?from=search&q=${encodeURIComponent(queryFromUrl)}${
                searchMode === "semantic" ? "&mode=semantic" : ""
            }`
        );
    };

    // Handler when "View All" or Enter pressed in search bar
    const handleViewAllFromSearch = (query: string) => {
        if (query.trim()) {
            setSearchParams({ q: query.trim() });
        }
    };

    const handleEmailClick = (email: EmailSearchCard) => {
        navigate(
            `/email/${email.id}?from=search&q=${encodeURIComponent(queryFromUrl)}${
                searchMode === "semantic" ? "&mode=semantic" : ""
            }`
        );
    };

    const handleFolderClick = (folderId: string) => {
        navigate(`/dashboard?folder=${folderId}`);
    };

    const handleBack = () => {
        if (fromFromUrl === "kanban") {
            navigate("/kanban");
        } else {
            navigate("/dashboard");
        }
    };

    // Show initial loading overlay
    const showLoadingOverlay = (isSemanticSearching || isSearching) && results.length === 0;

    return (
        <div className="h-[calc(100vh-64px)] flex">
            {/* Column 1: Folders (No active state) */}
            <aside className="w-64 lg:w-1/5 border-r">
                <div className="h-full flex flex-col bg-sidebar">
                    <div className="p-4 border-b">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBack}
                            className="w-full justify-start cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back to {fromFromUrl === "kanban" ? "Kanban" : "Dashboard"}
                        </Button>
                    </div>

                    <ScrollArea className="flex-1">
                        {isLoadingMailboxes ? (
                            <div className="p-4 flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                    Loading mailboxes...
                                </p>
                            </div>
                        ) : (
                            <nav className="p-2">
                                {folders.map((folder) => (
                                    <Button
                                        variant="ghost"
                                        key={folder.id}
                                        onClick={() => handleFolderClick(folder.id)}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-left text-muted-foreground hover:bg-accent"
                                    >
                                        {folder.icon}
                                        <span className="flex-1">{folder.name}</span>
                                        {folder.count ? (
                                            <Badge variant="secondary" className="ml-auto">
                                                {folder.count}
                                            </Badge>
                                        ) : null}
                                    </Button>
                                ))}
                            </nav>
                        )}
                    </ScrollArea>
                </div>
            </aside>

            {/* Column 2: Search Results */}
            <div className="flex-col flex-1 flex overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b shrink-0 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <h1 className="text-xl font-semibold">Search Results</h1>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBack}
                            className="cursor-pointer"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Close
                        </Button>
                    </div>

                    {/* Fuzzy Search Bar */}
                    {searchMode === "semantic" ? (
                        <SemanticSearchBar
                            onEmailSelect={handleEmailSelectFromDropdown}
                            onViewAll={handleViewAllFromSearch}
                            initialQuery={queryFromUrl}
                        />
                    ) : (
                        <FuzzySearchBar
                            onEmailSelect={handleEmailSelectFromDropdown}
                            onViewAll={handleViewAllFromSearch}
                            initialQuery={queryFromUrl}
                        />
                    )}

                    {/* Results info */}
                    {queryFromUrl && (
                        <div className="flex items-center justify-between">
                            <div className="bg-muted px-3 py-2 rounded-md flex-1">
                                <span className="text-sm">
                                    Results for: <strong>"{queryFromUrl}"</strong>
                                </span>
                            </div>
                            {!isSearching && results.length > 0 && (
                                <Badge variant="secondary" className="ml-3">
                                    {totalResults} {totalResults === 1 ? "result" : "results"}
                                </Badge>
                            )}
                            {(isSemanticFetching || isFetching) && !showLoadingOverlay && (
                                <Loader2 className="w-4 h-4 ml-3 animate-spin text-muted-foreground" />
                            )}
                        </div>
                    )}
                </div>

                {/* Results List */}
                <ScrollArea className="flex-1 overflow-auto relative">
                    {/* Loading Overlay */}
                    {showLoadingOverlay && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Searching...</p>
                            </div>
                        </div>
                    )}

                    {!showLoadingOverlay && results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Mail className="w-16 h-16 mb-4 text-muted-foreground opacity-50" />
                            <p className="text-lg font-medium mb-2">
                                {queryFromUrl ? "No results found" : "Start searching"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {queryFromUrl
                                    ? "Try different keywords or check your spelling"
                                    : "Enter a search query above to find emails"}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {results.map((email: EmailSearchCard) => (
                                <div
                                    key={email.id}
                                    onClick={() => handleEmailClick(email)}
                                    className="p-4 cursor-pointer transition-colors hover:bg-accent"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-sm truncate">
                                                    {email.sender}
                                                </span>
                                                {!email.isRead && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="h-5 text-xs"
                                                    >
                                                        New
                                                    </Badge>
                                                )}
                                                {email.relevance_score &&
                                                    email.relevance_score > 0 && (
                                                        <Badge
                                                            variant="outline"
                                                            className="h-5 text-xs"
                                                        >
                                                            {Math.round(
                                                                email.relevance_score * 100
                                                            )}
                                                            % match
                                                        </Badge>
                                                    )}
                                            </div>
                                            <h3 className="font-semibold mb-1 truncate">
                                                {email.subject}
                                            </h3>
                                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                                {email.snippet}
                                            </p>
                                            {email.summary && (
                                                <p className="text-xs text-muted-foreground italic line-clamp-1">
                                                    Summary: {email.summary}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {new Date(+email.internalDate).toLocaleString()}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="cursor-pointer shrink-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEmailClick(email);
                                            }}
                                        >
                                            View
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {/* Infinite scroll sentinel */}
                            <div ref={sentinelRef} style={{ height: 32 }}></div>

                            {/* Loading more indicator */}
                            {isFetchingNextPage && (
                                <div className="w-full p-4 text-center text-muted-foreground border-t">
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Loading more results...</span>
                                    </div>
                                </div>
                            )}

                            {/* End of results indicator */}
                            {!hasNextPage && results.length > 0 && !showLoadingOverlay && (
                                <div className="w-full p-4 text-center text-muted-foreground border-t">
                                    <p className="text-sm">End of results</p>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}
