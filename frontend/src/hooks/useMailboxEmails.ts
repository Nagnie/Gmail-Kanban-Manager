import { useInfiniteQueryGetMailboxEmails } from "@/services/tanstack-query";

interface UseMailboxEmailsOptions {
    labelId: string;
    q?: string;
}

/**
 * Hook để lấy emails với infinite scroll
 * Replaces RTK Query useMailboxEmailsInfinite hook
 */
export const useMailboxEmails = ({ labelId, q }: UseMailboxEmailsOptions) => {
    const { data, hasNextPage, fetchNextPage, isFetching, isPending, error, isError, refetch } =
        useInfiniteQueryGetMailboxEmails(labelId, q);

    // Flatten pages into single array
    const emails = data?.pages.flatMap((page) => page.emails) || [];

    return {
        emails,
        isLoading: isPending,
        isFetching,
        error: isError ? error?.message : null,
        hasNextPage: hasNextPage ?? false,
        loadNextPage: fetchNextPage,
        resetPagination: () => {
            // TanStack Query handles this automatically on refetch
        },
        refetch,
    };
};
