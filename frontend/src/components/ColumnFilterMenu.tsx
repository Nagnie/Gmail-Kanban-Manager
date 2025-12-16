import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColumnSettings } from "@/pages/KanbanBoard";
import { SlidersHorizontal, Clock, Mail, MailOpen, Paperclip, X } from "lucide-react";

type ColumnFilterMenuProps = {
    columnId: string;
    settings: ColumnSettings;
    onChange: (next: ColumnSettings) => void;
};

export const ColumnFilterMenu: React.FC<ColumnFilterMenuProps> = ({ settings, onChange }) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                    <SlidersHorizontal className="w-4 h-4" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                    value={settings.sortBy}
                    onValueChange={(value) =>
                        onChange({ ...settings, sortBy: value as ColumnSettings["sortBy"] })
                    }
                >
                    <DropdownMenuRadioItem value="date-desc">
                        <Clock className="w-4 h-4 mr-2" />
                        Newest first
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="date-asc">
                        <Clock className="w-4 h-4 mr-2" />
                        Oldest first
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="sender">
                        <Mail className="w-4 h-4 mr-2" />
                        By sender
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />

                <DropdownMenuLabel>Filters</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                    checked={settings.filterUnread}
                    onCheckedChange={(checked) =>
                        onChange({ ...settings, filterUnread: Boolean(checked) })
                    }
                >
                    <MailOpen className="w-4 h-4 mr-2" />
                    Unread only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                    checked={settings.filterAttachments}
                    onCheckedChange={(checked) =>
                        onChange({ ...settings, filterAttachments: Boolean(checked) })
                    }
                >
                    <Paperclip className="w-4 h-4 mr-2" />
                    Has attachments
                </DropdownMenuCheckboxItem>

                {(settings.filterUnread ||
                    settings.filterAttachments ||
                    settings.sortBy !== "date-desc" ||
                    settings.search.trim()) && (
                    <>
                        <DropdownMenuSeparator />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start cursor-pointer"
                            onClick={() =>
                                onChange({
                                    sortBy: "date-desc",
                                    filterUnread: false,
                                    filterAttachments: false,
                                    search: "",
                                })
                            }
                        >
                            <X className="w-4 h-4 mr-2" />
                            Clear all
                        </Button>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
