import { useGetMailboxesQuery } from "@/services/mailboxes";

export const useMailboxes = () => {
    const { data: mailboxes, isLoading, error, isFetching, refetch } = useGetMailboxesQuery();

    return {
        mailboxes: mailboxes || [],
        isLoading,
        isFetching,
        error,
        refetch,
    };
};
