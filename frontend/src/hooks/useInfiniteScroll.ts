import { useEffect, useRef } from "react";

interface UseInfiniteScrollOptions {
    threshold?: number;
    hasMore: boolean;
    isLoading: boolean;
    onLoadMore: () => void;
}

export const useInfiniteScroll = ({
    threshold = 0.1,
    hasMore,
    isLoading,
    onLoadMore,
}: UseInfiniteScrollOptions) => {
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                // Load more when sentinel is visible and we have more items to load
                if (entry.isIntersecting && hasMore && !isLoading) {
                    console.log("Loading more items...");
                    onLoadMore();
                }
            },
            {
                root: null,
                threshold: threshold,
                rootMargin: "1000px",
            }
        );

        const sentinel = sentinelRef.current;
        if (sentinel) {
            observer.observe(sentinel);
        }

        return () => {
            if (sentinel) {
                observer.unobserve(sentinel);
            }
        };
    }, [hasMore, isLoading, onLoadMore, threshold]);

    return sentinelRef;
};
