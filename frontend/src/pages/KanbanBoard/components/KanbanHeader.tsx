import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, Eye, RefreshCw, Loader2 } from "lucide-react";
import { FuzzySearchBar } from "@/components/FuzzySearchBar";
import { useState } from "react";
import { SemanticSearchBar } from "@/components/SemanticSearchBar";
import { useNavigate } from "react-router-dom";

interface KanbanHeaderProps {
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
    onToggleFilterPanel,
    onToggleHiddenPanel,
    onRefresh,
    onAddColumn,
    onReorderColumns,
    hiddenEmailsCount,
    activeFiltersCount,
    isFetchingEmails,
}: KanbanHeaderProps) => {
    const navigate = useNavigate();
    const [searchMode, setSearchMode] = useState<"fuzzy" | "semantic">("fuzzy");

    const handleEmailSelect = (emailId: string) => {
        navigate(
            `/email/${emailId}?from=kanban${searchMode === "semantic" ? "&mode=semantic" : ""}`
        );
    };

    const handleViewAllSearch = (query: string) => {
        navigate(
            `/search?q=${encodeURIComponent(query)}&from=kanban${
                searchMode === "semantic" ? "&mode=semantic" : ""
            }`
        );
    };

    return (
        <div className="bg-card border-b px-6 py-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                    {searchMode === "fuzzy" ? (
                        <FuzzySearchBar
                            onEmailSelect={handleEmailSelect}
                            onViewAll={handleViewAllSearch}
                        />
                    ) : (
                        <SemanticSearchBar
                            onEmailSelect={handleEmailSelect}
                            onViewAll={handleViewAllSearch}
                        />
                    )}
                    <div className="flex gap-2">
                        <Button
                            variant={searchMode === "fuzzy" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSearchMode("fuzzy")}
                            className="flex-1 cursor-pointer"
                        >
                            Fuzzy
                        </Button>
                        <Button
                            variant={searchMode === "semantic" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSearchMode("semantic")}
                            className="flex-1 cursor-pointer"
                        >
                            Semantic
                        </Button>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onToggleFilterPanel}
                        className="cursor-pointer"
                    >
                        <SlidersHorizontal className="w-4 h-4 mr-2" />
                        Filters
                        {activeFiltersCount > 0 && (
                            <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                                {activeFiltersCount}
                            </Badge>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onToggleHiddenPanel}
                        className="cursor-pointer"
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        Hidden ({hiddenEmailsCount})
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        className="cursor-pointer"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onAddColumn}
                        className="cursor-pointer"
                    >
                        Add Column
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onReorderColumns}
                        className="cursor-pointer"
                    >
                        Reorder Columns
                    </Button>

                    {isFetchingEmails && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                </div>
            </div>
        </div>
    );
};
