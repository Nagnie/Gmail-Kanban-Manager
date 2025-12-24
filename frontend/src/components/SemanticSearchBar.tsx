import { Badge } from "@/components/ui/badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { useDebounce } from "@/hooks/useDebounce";
import { useSemanticSearchEmails } from "@/hooks/useEmails";
import { cn } from "@/lib/utils";
import { Loader2, Mail, SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SemanticBarProps {
    onEmailSelect: (emailId: string) => void;
    onViewAll: (query: string) => void;
    className?: string;
    initialQuery?: string;
}

export const SemanticSearchBar = ({
    onEmailSelect,
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

    const { data: searchData, isLoading } = useSemanticSearchEmails(
        debouncedQuery,
        debouncedQuery.length >= 1 && open
    );

    const results = searchData?.data || [];

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
                                <p className="text-sm text-muted-foreground">Searching...</p>
                            </div>
                        )}

                        {!isLoading && results.length === 0 && (
                            <CommandEmpty>
                                <div className="flex flex-col items-center py-6">
                                    <Mail className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
                                    <p className="text-sm font-medium">No emails found</p>
                                    <p className="text-xs text-muted-foreground">
                                        Try different keywords
                                    </p>
                                </div>
                            </CommandEmpty>
                        )}

                        {!isLoading && results.length > 0 && (
                            <>
                                <CommandGroup heading="Search Results">
                                    {results.map((email) => (
                                        <CommandItem
                                            key={email.id}
                                            value={email.id}
                                            onSelect={() => {
                                                onEmailSelect(email.id);
                                                setOpen(false);
                                            }}
                                            className="cursor-pointer"
                                        >
                                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                                                    <span className="text-sm font-medium truncate">
                                                        {email.sender}
                                                    </span>
                                                    {!email.isRead && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="h-4 text-xs"
                                                        >
                                                            New
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm font-semibold truncate pl-5">
                                                    {email.subject}
                                                </p>
                                                <p className="text-xs text-muted-foreground line-clamp-1 pl-5">
                                                    {email.snippet}
                                                </p>
                                            </div>
                                            <div className="text-xs text-muted-foreground ml-2 shrink-0">
                                                {new Date(+email.internalDate).toLocaleDateString(
                                                    "en-US",
                                                    { month: "short", day: "numeric" }
                                                )}
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>

                                <CommandSeparator />

                                <CommandItem
                                    onSelect={() => {
                                        onViewAll(query);
                                        setOpen(false);
                                    }}
                                    className="cursor-pointer justify-center text-primary"
                                >
                                    <SearchIcon className="w-4 h-4 mr-2" />
                                    View all results for "{query}"
                                </CommandItem>
                            </>
                        )}
                    </CommandList>
                )}
            </Command>
        </div>
    );
};
