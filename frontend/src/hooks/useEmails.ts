import { searchEmails, semanticSearchEmails } from "@/services/email/api";
import type { EmailSearchResult } from "@/services/email/types";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

export const useSearchEmails = (query: string, enabled: boolean) => {
    return useQuery({
        queryKey: ["search-emails", query],
        queryFn: () =>
            searchEmails({
                query: query,
                limit: 5, // Fetch only 5 results for preview
            }),
        enabled: enabled && query.length > 0, // Enable only if query is non-empty
        staleTime: 30000, // 30 seconds
    });
};

export const useSemanticSearchEmails = (query: string, enabled: boolean) => {
    return useQuery({
        queryKey: ["semantic-search-emails", query],
        queryFn: () =>
            semanticSearchEmails({
                query: query,
                limit: 5, // Fetch only 5 results for preview
            }),
        enabled: enabled && query.length > 0, // Enable only if query is non-empty
        staleTime: 30000, // 30 seconds
    });
};

export const useInfiniteEmailSearch = (query: string, enabled: boolean) => {
    return useInfiniteQuery({
        queryKey: ["email-search-infinite", query],
        queryFn: ({ pageParam = 1 }) =>
            searchEmails({
                query,
                page: pageParam,
                limit: 20, // 20 results per page
            }),
        enabled: enabled && query.length >= 1,
        getNextPageParam: (lastPage, allPages) => {
            console.log("🚀 ~ useInfiniteEmailSearch ~ lastPage:", lastPage);
            if (!lastPage) {
                return undefined;
            }
            // If no totalResult, check if we got full page
            if (lastPage.totalResult !== null && lastPage.totalResult !== undefined) {
                const totalFetched = allPages.reduce((acc, page) => acc + page.data.length, 0);
                console.log("🚀 ~ useInfiniteEmailSearch ~ totalFetched:", totalFetched);
                return totalFetched < lastPage.totalResult ? lastPage.page + 1 : undefined;
            }

            const nextPage =
                lastPage.data.length === lastPage.limit ? lastPage.page + 1 : undefined;
            // Fallback: if we got full page of results, assume there's more

            console.log("Next page:", nextPage);

            return nextPage;
        },
        initialPageParam: 1,
        staleTime: 30000,
    });
};

export const useInfiniteEmailSemanticSearch = (query: string, enabled: boolean) => {
    return useInfiniteQuery({
        queryKey: ["semantic-email-search-infinite", query],
        queryFn: ({ pageParam = 1 }) =>
            semanticSearchEmails({
                query,
                page: pageParam,
                limit: 20, // 20 results per page
            }),
        enabled: enabled && query.length >= 1,
        getNextPageParam: (lastPage, allPages) => {
            console.log("🚀 ~ useInfiniteEmailSearch ~ lastPage:", lastPage);
            if (!lastPage) {
                return undefined;
            }
            // If no totalResult, check if we got full page
            if (lastPage.totalResult !== null && lastPage.totalResult !== undefined) {
                const totalFetched = allPages.reduce((acc, page) => acc + page.data.length, 0);
                console.log("🚀 ~ useInfiniteEmailSearch ~ totalFetched:", totalFetched);
                return totalFetched < lastPage.totalResult ? lastPage.page + 1 : undefined;
            }

            const nextPage =
                lastPage.data.length === lastPage.limit ? lastPage.page + 1 : undefined;
            // Fallback: if we got full page of results, assume there's more

            console.log("Next page:", nextPage);

            return nextPage;
        },
        initialPageParam: 1,
        staleTime: 30000,
    });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const flattenSearchResults = (data: any) => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page: EmailSearchResult) => page.data);
};
