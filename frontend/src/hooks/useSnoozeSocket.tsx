import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

export interface EmailRestoredEvent {
    emailId: string;
    columnId: string;
    timestamp: string;
}

export interface UseSnoozeSocketOptions {
    userEmail: string;
    onEmailRestored?: (event: EmailRestoredEvent) => void;
    onConnected?: () => void;
    onDisconnected?: () => void;
    enabled?: boolean;
}

export function useSnoozeSocket({
    userEmail,
    onEmailRestored,
    onConnected,
    onDisconnected,
    enabled = true,
}: UseSnoozeSocketOptions) {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const onEmailRestoredRef = useRef(onEmailRestored);
    const onConnectedRef = useRef(onConnected);
    const onDisconnectedRef = useRef(onDisconnected);

    useEffect(() => {
        onEmailRestoredRef.current = onEmailRestored;
        onConnectedRef.current = onConnected;
        onDisconnectedRef.current = onDisconnected;
    }, [onEmailRestored, onConnected, onDisconnected]);

    const connect = useCallback(() => {
        if (!enabled || !userEmail || socketRef.current) return;

        console.log("🔌 Connecting to WebSocket...");

        const socket = io(`${import.meta.env.VITE_API_URL}/snooze`, {
            transports: ["websocket"],
            reconnection: true,
            auth: {
                token: localStorage.getItem("access_token"),
            },
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Connected");
            setIsConnected(true);

            socket.emit("join", { userEmail }, () => {
                console.log("Joined room");
                onConnectedRef.current?.();
            });
        });

        socket.on("disconnect", () => {
            console.log("Disconnected");
            setIsConnected(false);
            onDisconnectedRef.current?.();
        });

        socket.on("email:restored", (event: EmailRestoredEvent) => {
            console.log("Email restored:", event);
            onEmailRestoredRef.current?.(event);
        });
    }, [enabled, userEmail]);

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
