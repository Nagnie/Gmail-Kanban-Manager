export { queryClient } from "./queryClient";
// Mailboxes exports
export {
    useGetMailboxesQuery,
    useGetMailboxEmailsQuery,
    useInfiniteQueryGetMailboxEmails,
    useGetThreadDetailQuery,
} from "@/services/mailboxes/useMailboxesQueries";
export { mailboxesKeys } from "@/services/mailboxes/queryKeys";
// Email exports
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
// Attachment exports
export { useDownloadAttachmentMutation } from "@/services/attachment/useAttachmentQueries";
export { attachmentKeys } from "@/services/attachment/queryKeys";
