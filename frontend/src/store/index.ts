import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import { authMiddleware } from "@/store/middleware/authMiddleware.ts";
import { mailboxesApi } from "@/services/mailboxes/api";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        [mailboxesApi.reducerPath]: mailboxesApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().prepend(authMiddleware.middleware).concat(mailboxesApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
