import { useMemo } from "react";
import Fuse from "fuse.js";

interface UseFuzzySearchOptions<T> {
    data: T[];
    query: string;
    keys: Array<string | { name: string; weight: number }>;
    threshold?: number;
}

/**
 * Custom hook for client-side fuzzy search using Fuse.js
 * @param data - Array of items to search
 * @param query - Search query string
 * @param keys - Keys to search in (can include weights)
 * @param threshold - Fuzzy matching threshold (0 = exact, 1 = match anything). Default: 0.4
 */
export const useFuzzySearch = <T>({
    data,
    query,
    keys,
    threshold = 0.4,
}: UseFuzzySearchOptions<T>) => {
    const results = useMemo(() => {
        if (!query.trim()) {
            return data;
        }

        const fuse = new Fuse(data, {
            keys,
            threshold,
            includeScore: true,
            ignoreLocation: true,
            findAllMatches: true,
        });

        const searchResults = fuse.search(query);
        return searchResults.map((result) => result.item);
    }, [data, query, keys, threshold]);

    return results;
};
