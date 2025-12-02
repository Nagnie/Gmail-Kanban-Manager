export {
    useMarkAsReadMutation,
    useMarkAsUnreadMutation,
    useStarEmailMutation,
    useUnstarEmailMutation,
    useDeleteEmailMutation,
    useBatchDeleteEmailsMutation,
    useModifyEmailMutation,
    useBatchModifyEmailsMutation,
} from "./useEmailMutations";
export {
    markEmailAsRead,
    markEmailAsUnread,
    starEmail,
    unstarEmail,
    deleteEmail,
    batchDeleteEmails,
    modifyEmail,
    batchModifyEmails,
    moveEmailToTrash,
    moveEmailToInbox,
    archiveEmail,
    untrashEmail,
    sendEmail,
} from "./api";
export type {
    DeleteBatchEmailDto,
    BatchModifyEmailDto,
    ModifyEmailDto,
    BatchOperationResponse,
} from "./types";
