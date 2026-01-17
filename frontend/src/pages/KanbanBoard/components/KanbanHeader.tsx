import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, Eye, RefreshCw, Loader2, Menu, Plus, ArrowUpDown } from "lucide-react";
import { FuzzySearchBar } from "@/components/FuzzySearchBar";
import { useState } from "react";
import { SemanticSearchBar } from "@/components/SemanticSearchBar";
import { useNavigate } from "react-router-dom";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
            `/email/${emailId}?from=kanban${searchMode === "semantic" ? "&mode=semantic" : ""}`,
        );
    };

    const handleViewAllSearch = (query: string) => {
        navigate(
            `/search?q=${encodeURIComponent(query)}&from=kanban${
                searchMode === "semantic" ? "&mode=semantic" : ""
            }`,
        );
    };

    return (
        <div className="bg-card border-b px-3 sm:px-6 py-3 sm:py-4">
            {/* Desktop Layout */}
            <div className="hidden lg:flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                    {searchMode === "fuzzy" ? (
                        <FuzzySearchBar
                            onEmailSelect={handleEmailSelect}
                            onViewAll={handleViewAllSearch}
                        />
                    ) : (
                        <SemanticSearchBar onViewAll={handleViewAllSearch} />
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

            {/* Mobile/Tablet Layout */}
            <div className="lg:hidden space-y-3">
                {/* Search Bar Row */}
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        {searchMode === "fuzzy" ? (
                            <FuzzySearchBar
                                onEmailSelect={handleEmailSelect}
                                onViewAll={handleViewAllSearch}
                            />
                        ) : (
                            <SemanticSearchBar onViewAll={handleViewAllSearch} />
                        )}
                    </div>
                    {isFetchingEmails && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
                    )}
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {/* Search Mode Toggle */}
                    <div className="flex gap-1 flex-shrink-0">
                        <Button
                            variant={searchMode === "fuzzy" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSearchMode("fuzzy")}
                            className="cursor-pointer text-xs px-2 h-8"
                        >
                            Fuzzy
                        </Button>
                        <Button
                            variant={searchMode === "semantic" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSearchMode("semantic")}
                            className="cursor-pointer text-xs px-2 h-8"
                        >
                            Semantic
                        </Button>
                    </div>

                    {/* Primary Actions */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onToggleFilterPanel}
                        className="cursor-pointer flex-shrink-0 h-8"
                    >
                        <SlidersHorizontal className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Filters</span>
                        {activeFiltersCount > 0 && (
                            <Badge
                                variant="destructive"
                                className="ml-1 sm:ml-2 h-4 w-4 p-0 text-[10px]"
                            >
                                {activeFiltersCount}
                            </Badge>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onToggleHiddenPanel}
                        className="cursor-pointer flex-shrink-0 h-8"
                    >
                        <Eye className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Hidden</span>
                        <span className="sm:hidden ml-1">({hiddenEmailsCount})</span>
                        <span className="hidden sm:inline">({hiddenEmailsCount})</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        className="cursor-pointer flex-shrink-0 h-8"
                    >
                        <RefreshCw className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>

                    {/* More Actions Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="cursor-pointer flex-shrink-0 h-8"
                            >
                                <Menu className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">More</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={onAddColumn} className="cursor-pointer">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Column
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onReorderColumns} className="cursor-pointer">
                                <ArrowUpDown className="w-4 h-4 mr-2" />
                                Reorder Columns
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
};
