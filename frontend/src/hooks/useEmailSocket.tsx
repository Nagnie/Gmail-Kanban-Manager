import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { kanbanKeys } from "@/hooks/useKanbanQueries";

export interface EmailNewEvent {
    emailIds: string[];
    timestamp: string;
}

export interface UseEmailSocketOptions {
    userEmail: string;
    onEmailNew?: (event: EmailNewEvent) => void;
    onConnected?: () => void;
    onDisconnected?: () => void;
    enabled?: boolean;
}

export function useEmailSocket({
    userEmail,
    onEmailNew,
    onConnected,
    onDisconnected,
    enabled = true,
}: UseEmailSocketOptions) {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const queryClient = useQueryClient();

    const onEmailNewRef = useRef(onEmailNew);
    const onConnectedRef = useRef(onConnected);
    const onDisconnectedRef = useRef(onDisconnected);

    useEffect(() => {
        onEmailNewRef.current = onEmailNew;
        onConnectedRef.current = onConnected;
        onDisconnectedRef.current = onDisconnected;
    }, [onEmailNew, onConnected, onDisconnected]);

    const connect = useCallback(() => {
        if (!enabled || !userEmail || socketRef.current) return;

        console.log("🔌 Connecting to Email Socket...");

        const socket = io(`${import.meta.env.VITE_API_URL}/snooze`, {
            transports: ["websocket"],
            reconnection: true,
            auth: {
                token: localStorage.getItem("access_token"),
            },
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Email Socket Connected");
            setIsConnected(true);

            socket.emit("join", { userEmail }, () => {
                console.log("Joined email room");
                onConnectedRef.current?.();
            });
        });

        socket.on("disconnect", () => {
            console.log("Email Socket Disconnected");
            setIsConnected(false);
            onDisconnectedRef.current?.();
        });

        socket.on("email:new", (event: EmailNewEvent) => {
            console.log("New email received:", event);

            if (event.emailIds.length === 0) return;

            // Invalidate mailboxes queries để refresh danh sách hòm thư
            queryClient.invalidateQueries({ queryKey: ["mailboxes"] });

            // Invalidate mailbox emails queries để refresh emails trong các label
            queryClient.invalidateQueries({ queryKey: ["mailbox-emails"] });

            const inboxColumnId = localStorage.getItem("inboxColumnId");
            if (inboxColumnId) {
                queryClient.invalidateQueries({
                    queryKey: kanbanKeys.column(+inboxColumnId, {
                        search: "",
                    }),
                });
            }

            // Gọi callback nếu có
            onEmailNewRef.current?.(event);
        });
    }, [enabled, userEmail, queryClient]);

    const disconnect = useCallback(() => {
        if (!socketRef.current) return;

        socketRef.current.emit("leave", { userEmail });
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
    }, [userEmail]);

    useEffect(() => {
        if (enabled && userEmail) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [enabled, userEmail, connect, disconnect]);

    return {
        socket: socketRef.current,
        isConnected,
        reconnect: connect,
        disconnect,
    };
}
