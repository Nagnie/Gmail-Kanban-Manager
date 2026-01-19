export { queryClient } from "./queryClient";

export {
    useGetMailboxesQuery,
    useGetMailboxEmailsQuery,
    useInfiniteQueryGetMailboxEmails,
    useGetThreadDetailQuery,
} from "@/services/mailboxes/useMailboxesQueries";
export { mailboxesKeys } from "@/services/mailboxes/queryKeys";

export {
    useMarkAsReadMutation,
    useMarkAsUnreadMutation,
    useStarEmailMutation,
    useUnstarEmailMutation,
    useDeleteEmailMutation,
    useBatchDeleteEmailsMutation,
    useModifyEmailMutation,
    useBatchModifyEmailsMutation,
} from "@/services/email/useEmailMutations";
export { emailKeys } from "@/services/email/queryKeys";

export { useDownloadAttachmentMutation, useFetchAttachmentMutation } from "@/services/attachment/useAttachmentQueries";
export { attachmentKeys } from "@/services/attachment/queryKeys";
