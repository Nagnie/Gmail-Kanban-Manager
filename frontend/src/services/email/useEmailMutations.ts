import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { mailboxesKeys } from "@/services/mailboxes/queryKeys";
import type { ModifyEmailDto } from "./types";
import type {
    EmailMessage,
    EmailsData,
    ThreadDetail,
    ThreadMessage,
    Mailbox,
} from "@/services/mailboxes/types";
import {
    markEmailAsRead,
    markEmailAsUnread,
    starEmail,
    unstarEmail,
    deleteEmail,
    batchDeleteEmails,
    modifyEmail,
    batchModifyEmails,
    sendEmail,
} from "./api";

// Helper type for update function
type EmailsDataOrInfinite = EmailsData | InfiniteData<EmailsData, string | undefined>;

const updateEmailInCache = (
    oldData: EmailsDataOrInfinite | undefined,
    emailId: string,
    updateFn: (email: EmailMessage) => EmailMessage
): EmailsDataOrInfinite | undefined => {
    if (!oldData) return oldData;

    // Handle infinite query
    if ("pages" in oldData) {
        return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
                ...page,
                emails: page.emails.map((e: EmailMessage) => (e.id === emailId ? updateFn(e) : e)),
            })),
        };
    }

    // Handle regular query
    if ("emails" in oldData) {
        return {
            ...oldData,
            emails: oldData.emails.map((e: EmailMessage) => (e.id === emailId ? updateFn(e) : e)),
        };
    }

    return oldData;
};

// Helper function to update thread detail cache
const updateThreadDetailInCache = (
    threadDetail: ThreadDetail | undefined,
    messageId: string,
    updateFn: (message: ThreadMessage) => ThreadMessage
): ThreadDetail | undefined => {
    if (!threadDetail) return threadDetail;

    return {
        ...threadDetail,
        messages: threadDetail.messages.map((msg) => (msg.id === messageId ? updateFn(msg) : msg)),
    };
};

// Helper function to update mailboxes list cache
const updateMailboxesInCache = (
    mailboxes: Mailbox[] | undefined,
    labelIds: string[],
    unreadDifference: number
): Mailbox[] | undefined => {
    if (!mailboxes || unreadDifference === 0) return mailboxes;

    return mailboxes.map((mailbox) => {
        if (labelIds.includes(mailbox.id)) {
            return {
                ...mailbox,
                messagesUnread: Math.max(0, mailbox.messagesUnread + unreadDifference),
            };
        }
        return mailbox;
    });
};

// Mutation: Mark email as read
export const useMarkAsReadMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: markEmailAsRead,
        onMutate: async (emailId: string) => {
            // Cancel ongoing queries
            await queryClient.cancelQueries({ queryKey: mailboxesKeys.emails() });
            await queryClient.cancelQueries({ queryKey: mailboxesKeys.threads() });
            await queryClient.cancelQueries({ queryKey: mailboxesKeys.list() });

            // Snapshot old data
            const previousEmailsData = queryClient.getQueriesData({
                queryKey: mailboxesKeys.emails(),
            });

            const previousThreadsData = queryClient.getQueriesData({
                queryKey: mailboxesKeys.threads(),
            });

            const previousMailboxesData = queryClient.getQueriesData({
                queryKey: mailboxesKeys.list(),
            });

            // Get the email to check current unread status
            let emailLabelIds: string[] = [];
            let wasUnread = false;

            for (const [, data] of previousEmailsData) {
                if (data && typeof data === "object" && "pages" in data) {
                    for (const page of (data as InfiniteData<EmailsData>).pages) {
                        const email = page.emails.find((e: EmailMessage) => e.id === emailId);
                        if (email) {
                            emailLabelIds = email.labelIds;
                            wasUnread = email.isUnread;
                            break;
                        }
                    }
                } else if (data && typeof data === "object" && "emails" in data) {
                    const email = (data as EmailsData).emails.find(
                        (e: EmailMessage) => e.id === emailId
                    );
                    if (email) {
                        emailLabelIds = email.labelIds;
                        wasUnread = email.isUnread;
                        break;
                    }
                }
            }

            // Optimistic update - update all email queries
            queryClient.setQueriesData(
                { queryKey: mailboxesKeys.emails() },
                (oldData: EmailsDataOrInfinite | undefined) => {
                    return updateEmailInCache(oldData, emailId, (e) => ({
                        ...e,
                        isUnread: false,
                    }));
                }
            );

            // Optimistic update - update thread detail
            queryClient.setQueriesData(
                { queryKey: mailboxesKeys.threads() },
                (oldData: ThreadDetail | undefined) => {
                    return updateThreadDetailInCache(oldData, emailId, (msg) => ({
                        ...msg,
                        isUnread: false,
                    }));
                }
            );

            // Optimistic update - update mailboxes unread count
            const unreadDifference = wasUnread ? -1 : 0;
            queryClient.setQueriesData(
                { queryKey: mailboxesKeys.list() },
                (oldData: Mailbox[] | undefined) =>
                    updateMailboxesInCache(oldData, emailLabelIds, unreadDifference)
            );

            return { previousEmailsData, previousThreadsData, previousMailboxesData };
        },
        onError: (_err, _variables, context) => {
            // Rollback on error
            if (context?.previousEmailsData) {
                context.previousEmailsData.forEach(([key, value]) => {
                    queryClient.setQueryData(key, value);
                });
            }
            if (context?.previousThreadsData) {
                context.previousThreadsData.forEach(([key, value]) => {
                    queryClient.setQueryData(key, value);
                });
            }
            if (context?.previousMailboxesData) {
                context.previousMailboxesData.forEach(([key, value]) => {
                    queryClient.setQueryData(key, value);
                });
            }
        },
        onSuccess: () => {
            // Refetch to sync with server
            queryClient.invalidateQueries({ queryKey: mailboxesKeys.emails() });
            queryClient.invalidateQueries({ queryKey: mailboxesKeys.threads() });
            // queryClient.invalidateQueries({ queryKey: mailboxesKeys.list() });
        },
    });
};

// Mutation: Mark email as unread
export const useMarkAsUnreadMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: markEmailAsUnread,
        onMutate: async (emailId: string) => {
            // Cancel ongoing queries
            await queryClient.cancelQueries({ queryKey: mailboxesKeys.emails() });
            await queryClient.cancelQueries({ queryKey: mailboxesKeys.threads() });
            await queryClient.cancelQueries({ queryKey: mailboxesKeys.list() });

            // Snapshot old data
            const previousEmailsData = queryClient.getQueriesData({
                queryKey: mailboxesKeys.emails(),
            });

            const previousThreadsData = queryClient.getQueriesData({
                queryKey: mailboxesKeys.threads(),
            });

            const previousMailboxesData = queryClient.getQueriesData({
                queryKey: mailboxesKeys.list(),
            });

            // Get the email to check current unread status
            let emailLabelIds: string[] = [];
            let wasUnread = false;

            for (const [, data] of previousEmailsData) {
                if (data && typeof data === "object" && "pages" in data) {
                    for (const page of (data as InfiniteData<EmailsData>).pages) {
                        const email = page.emails.find((e: EmailMessage) => e.id === emailId);
                        if (email) {
                            emailLabelIds = email.labelIds;
                            wasUnread = email.isUnread;
                            break;
                        }
                    }
                } else if (data && typeof data === "object" && "emails" in data) {
                    const email = (data as EmailsData).emails.find(
                        (e: EmailMessage) => e.id === emailId
                    );
                    if (email) {
                        emailLabelIds = email.labelIds;
                        wasUnread = email.isUnread;
                        break;
                    }
                }
            }

            // Optimistic update - update all email queries
            queryClient.setQueriesData(
                { queryKey: mailboxesKeys.emails() },
                (oldData: EmailsDataOrInfinite | undefined) => {
                    return updateEmailInCache(oldData, emailId, (e) => ({
                        ...e,
                        isUnread: true,
                    }));
                }
            );

            // Optimistic update - update thread detail
            queryClient.setQueriesData(
                { queryKey: mailboxesKeys.threads() },
                (oldData: ThreadDetail | undefined) => {
                    return updateThreadDetailInCache(oldData, emailId, (msg) => ({
                        ...msg,
                        isUnread: true,
                    }));
                }
            );

            // Optimistic update - update mailboxes unread count
            const unreadDifference = !wasUnread ? 1 : 0;
            queryClient.setQueriesData(
                { queryKey: mailboxesKeys.list() },
                (oldData: Mailbox[] | undefined) =>
                    updateMailboxesInCache(oldData, emailLabelIds, unreadDifference)
            );

            return { previousEmailsData, previousThreadsData, previousMailboxesData };
        },
        onError: (_err, _variables, context) => {
            // Rollback on error
            if (context?.previousEmailsData) {
                context.previousEmailsData.forEach(([key, value]) => {
                    queryClient.setQueryData(key, value);
                });
            }
            if (context?.previousThreadsData) {
                context.previousThreadsData.forEach(([key, value]) => {
                    queryClient.setQueryData(key, value);
                });
            }
            if (context?.previousMailboxesData) {
                context.previousMailboxesData.forEach(([key, value]) => {
                    queryClient.setQueryData(key, value);
                });
            }
        },
        onSuccess: () => {
            // Refetch to sync with server
            queryClient.invalidateQueries({ queryKey: mailboxesKeys.emails() });
            queryClient.invalidateQueries({ queryKey: mailboxesKeys.threads() });
            // queryClient.invalidateQueries({ queryKey: mailboxesKeys.list() });
        },
    });
};

// Mutation: Star email
export const useStarEmailMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: starEmail,
        onMutate: async (emailId: string) => {
            await queryClient.cancelQueries({ queryKey: mailboxesKeys.emails() });
            await queryClient.cancelQueries({ queryKey: mailboxesKeys.threads() });

            const previousEmailsData = queryClient.getQueriesData({
                queryKey: mailboxesKeys.emails(),
            });

            const previousThreadsData = queryClient.getQueriesData({
                queryKey: mailboxesKeys.threads(),
            });

            queryClient.setQueriesData(
                { queryKey: mailboxesKeys.emails() },
                (oldData: EmailsDataOrInfinite | undefined) => {
                    return updateEmailInCache(oldData, emailId, (e) => ({
                        ...e,
                        isStarred: true,
                    }));
                }
            );

            queryClient.setQueriesData(
                { queryKey: mailboxesKeys.threads() },
                (oldData: ThreadDetail | undefined) => {
                    return updateThreadDetailInCache(oldData, emailId, (msg) => ({
                        ...msg,
                        isStarred: true,
                    }));
                }
            );

            return { previousEmailsData, previousThreadsData };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousEmailsData) {
                context.previousEmailsData.forEach(([key, value]) => {
                    queryClient.setQueryData(key, value);
                });
            }
            if (context?.previousThreadsData) {
                context.previousThreadsData.forEach(([key, value]) => {
                    queryClient.setQueryData(key, value);
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: mailboxesKeys.emails() });
            queryClient.invalidateQueries({ queryKey: mailboxesKeys.threads() });
        },
    });
};

// Mutation: Unstar email
export const useUnstarEmailMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: unstarEmail,
        onMutate: async (emailId: string) => {
            await queryClient.cancelQueries({ queryKey: mailboxesKeys.emails() });
            await queryClient.cancelQueries({ queryKey: mailboxesKeys.threads() });

            const previousEmailsData = queryClient.getQueriesData({
                queryKey: mailboxesKeys.emails(),
            });

            const previousThreadsData = queryClient.getQueriesData({
                queryKey: mailboxesKeys.threads(),
            });

            queryClient.setQueriesData(
                { queryKey: mailboxesKeys.emails() },
                (oldData: EmailsDataOrInfinite | undefined) => {
                    return updateEmailInCache(oldData, emailId, (e) => ({
                        ...e,
                        isStarred: false,
                    }));
                }
            );

            queryClient.setQueriesData(
                { queryKey: mailboxesKeys.threads() },
                (oldData: ThreadDetail | undefined) => {
                    return updateThreadDetailInCache(oldData, emailId, (msg) => ({
                        ...msg,
                        isStarred: false,
                    }));
                }
            );

            return { previousEmailsData, previousThreadsData };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousEmailsData) {
                context.previousEmailsData.forEach(([key, value]) => {
                    queryClient.setQueryData(key, value);
                });
            }
            if (context?.previousThreadsData) {
                context.previousThreadsData.forEach(([key, value]) => {
                    queryClient.setQueryData(key, value);
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: mailboxesKeys.emails() });
            queryClient.invalidateQueries({ queryKey: mailboxesKeys.threads() });
        },
    });
};

// Mutation: Delete email
export const useDeleteEmailMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteEmail,
        onMutate: async (emailId: string) => {
            await queryClient.cancelQueries({ queryKey: mailboxesKeys.emails() });
            await queryClient.cancelQueries({ queryKey: mailboxesKeys.threads() });

            const previousEmailsData = queryClient.getQueriesData({
                queryKey: mailboxesKeys.emails(),
            });

            const previousThreadsData = queryClient.getQueriesData({
                queryKey: mailboxesKeys.threads(),
            });

            // Optimistic update - remove from emails
            queryClient.setQueriesData(
                { queryKey: mailboxesKeys.emails() },
                (oldData: EmailsDataOrInfinite | undefined) => {
                    if (!oldData) return oldData;

                    if ("pages" in oldData) {
                        return {
                            ...oldData,
                            pages: oldData.pages.map((page) => ({
                                ...page,
                                emails: page.emails.filter((e: EmailMessage) => e.id !== emailId),
                            })),
                        };
                    }

                    if ("emails" in oldData) {
                        return {
                            ...oldData,
                            emails: oldData.emails.filter((e: EmailMessage) => e.id !== emailId),
                        };
                    }

                    return oldData;
                }
            );

            // Optimistic update - remove from thread
            queryClient.setQueriesData(
                { queryKey: mailboxesKeys.threads() },
                (oldData: ThreadDetail | undefined) => {
                    if (!oldData) return oldData;

                    return {
                        ...oldData,
                        messages: oldData.messages.filter((msg) => msg.id !== emailId),
                    };
                }
            );

            return { previousEmailsData, previousThreadsData };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousEmailsData) {
                context.previousEmailsData.forEach(([key, value]) => {
                    queryClient.setQueryData(key, value);
                });
            }
            if (context?.previousThreadsData) {
                context.previousThreadsData.forEach(([key, value]) => {
                    queryClient.setQueryData(key, value);
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: mailboxesKeys.emails() });
            queryClient.invalidateQueries({ queryKey: mailboxesKeys.threads() });
        },
    });
};

// Mutation: Batch delete emails
export const useBatchDeleteEmailsMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: batchDeleteEmails,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: mailboxesKeys.emails() });
            queryClient.invalidateQueries({ queryKey: mailboxesKeys.threads() });
        },
    });
};

// Mutation: Modify email
export const useModifyEmailMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ emailId, modifyDto }: { emailId: string; modifyDto: ModifyEmailDto }) =>
            modifyEmail(emailId, modifyDto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: mailboxesKeys.emails() });
            queryClient.invalidateQueries({ queryKey: mailboxesKeys.threads() });
        },
    });
};

// Mutation: Batch modify emails
export const useBatchModifyEmailsMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: batchModifyEmails,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: mailboxesKeys.emails() });
            queryClient.invalidateQueries({ queryKey: mailboxesKeys.threads() });
        },
    });
};

export const useSendEmailMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: sendEmail,
        onSuccess: () => {
            // Invalidate để refresh danh sách email
            queryClient.invalidateQueries({ queryKey: ['emails'] });
            queryClient.invalidateQueries({ queryKey: ['mailboxes'] });
        },
    });
};
