import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { Loader2, SearchIcon, User, Mail as MailIcon, TextSearch } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchSuggestions } from "@/services/email/api";
import type { EmailSearchSuggestion } from "@/services/email/types";

interface SemanticBarProps {
    onViewAll: (query: string) => void;
    className?: string;
    initialQuery?: string;
}

export const SemanticSearchBar = ({
    onViewAll,
    className,
    initialQuery = "",
}: SemanticBarProps) => {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const isInitialMount = useRef(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync with initialQuery prop
    useEffect(() => {
        setQuery(initialQuery);
    }, [initialQuery]);

    const debouncedQuery = useDebounce(query, 300);

    // Fetch suggestions instead of search results
    const { data: suggestionsData, isLoading } = useQuery({
        queryKey: ["search-suggestions", debouncedQuery],
        queryFn: () => searchSuggestions({ query: debouncedQuery }),
        enabled: debouncedQuery.length >= 1 && open,
    });

    const suggestions = suggestionsData?.suggestions || [];

    useEffect(() => {
        if (!isInitialMount.current && query.length >= 1) {
            setOpen(true);
        } else if (query.length < 1) {
            setOpen(false);
        }
    }, [query]);

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            // Check if click is outside both input and dropdown
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                inputRef.current &&
                !inputRef.current.contains(target)
            ) {
                setOpen(false);
            }
        };

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && query.trim()) {
            e.preventDefault();
            onViewAll(query);
            setOpen(false);
        }
        if (e.key === "Escape") {
            setOpen(false);
        }
    };

    const handleSuggestionClick = (suggestionValue: string) => {
        setQuery(suggestionValue);
        onViewAll(suggestionValue);
        setOpen(false);
    };

    const getSuggestionIcon = (type: EmailSearchSuggestion["type"]) => {
        switch (type) {
            case "sender":
                return <User className="w-3 h-3 text-muted-foreground shrink-0" />;
            case "subject":
                return <MailIcon className="w-3 h-3 text-muted-foreground shrink-0" />;
            case "query":
                return <TextSearch className="w-3 h-3 text-muted-foreground shrink-0" />;
            default:
                return <SearchIcon className="w-3 h-3 text-muted-foreground shrink-0" />;
        }
    };

    const getSuggestionLabel = (type: EmailSearchSuggestion["type"]) => {
        switch (type) {
            case "sender":
                return "From";
            case "subject":
                return "Subject";
            case "query":
                return "Query";
            default:
                return "";
        }
    };

    const handleInputChange = (value: string) => {
        setQuery(value);
        if (isInitialMount.current) {
            isInitialMount.current = false;
        }
    };

    const handleFocus = () => {
        if (!isInitialMount.current && query.length >= 1) {
            setOpen(true);
        }
        if (isInitialMount.current) {
            isInitialMount.current = false;
        }
    };

    return (
        <div className={cn("relative w-full max-w-md", className)}>
            <Command className="rounded-lg border shadow-md" shouldFilter={false}>
                <CommandInput
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ref={inputRef as any}
                    placeholder="Search all emails..."
                    value={query}
                    onValueChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                />

                {open && (
                    <CommandList
                        ref={dropdownRef}
                        className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-96"
                    >
                        {isLoading && (
                            <div className="p-8 flex flex-col items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    Loading suggestions...
                                </p>
                            </div>
                        )}

                        {!isLoading && suggestions.length === 0 && (
                            <CommandEmpty>
                                <div className="flex flex-col items-center py-6">
                                    <SearchIcon className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
                                    <p className="text-sm font-medium">No suggestions found</p>
                                    <p className="text-xs text-muted-foreground">
                                        Press Enter to search
                                    </p>
                                </div>
                            </CommandEmpty>
                        )}

                        {!isLoading && suggestions.length > 0 && (
                            <>
                                <CommandGroup heading="Search Suggestions">
                                    {suggestions.map(
                                        (suggestion: EmailSearchSuggestion, index: number) => (
                                            <CommandItem
                                                key={`${suggestion.type}-${suggestion.value}-${index}`}
                                                value={suggestion.value}
                                                onSelect={() =>
                                                    handleSuggestionClick(suggestion.value)
                                                }
                                                className="cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    {getSuggestionIcon(suggestion.type)}
                                                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground uppercase font-medium">
                                                                {getSuggestionLabel(
                                                                    suggestion.type,
                                                                )}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm truncate">
                                                            {suggestion.value}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CommandItem>
                                        ),
                                    )}
                                </CommandGroup>

                                <CommandItem
                                    onSelect={() => {
                                        onViewAll(query);
                                        setOpen(false);
                                    }}
                                    className="cursor-pointer justify-center text-primary border-t"
                                >
                                    <SearchIcon className="w-4 h-4 mr-2" />
                                    Search for "{query}"
                                </CommandItem>
                            </>
                        )}
                    </CommandList>
                )}
            </Command>
        </div>
    );
};
