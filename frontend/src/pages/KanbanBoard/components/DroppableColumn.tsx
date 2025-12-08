import { useDroppable } from "@dnd-kit/core";

export const DroppableColumn = ({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 p-4 overflow-y-auto transition-colors ${
        isOver ? "bg-blue-50 dark:bg-blue-950/30" : ""
      }`}
    >
      {children}
    </div>
  );
};