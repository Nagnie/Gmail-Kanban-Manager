import { createApi, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import type { AxiosError } from "axios";
import { apiClient } from "@/services/core/api-client";
import type { Mailbox, MailboxesResponse } from "./types";

const axiosBaseQuery: BaseQueryFn<
    {
        url: string;
        method?: string;
        data?: unknown;
        params?: unknown;
    },
    unknown,
    unknown
> = async ({ url, method = "GET", data, params }) => {
    try {
        const client = apiClient.getClient();
        const result = await client({
            url,
            method,
            data,
            params,
        });
        return { data: result.data };
    } catch (axiosError) {
        const err = axiosError as AxiosError;
        return {
            error: {
                status: err.response?.status,
                message: err.message || "An unknown error occurred",
                data: err.response?.data,
            },
        };
    }
};

export const mailboxesApi = createApi({
    reducerPath: "mailboxesApi",
    baseQuery: axiosBaseQuery,
    tagTypes: ["Mailboxes"],
    endpoints: (builder) => ({
        // Get all mailboxes
        getMailboxes: builder.query<Mailbox[], void>({
            query: () => ({
                url: "/api/v1/mailboxes",
                method: "GET",
            }),
            transformResponse: (response: MailboxesResponse) => response.data,
            providesTags: ["Mailboxes"],
            // Cache strategy
            keepUnusedDataFor: 5 * 60, // 5 minutes
        }),
    }),
});

export const { useGetMailboxesQuery } = mailboxesApi;
