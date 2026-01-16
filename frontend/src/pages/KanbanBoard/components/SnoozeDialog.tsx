import { useState } from "react";
import { Clock } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DateTimePickerDialog } from "@/components/DatetimePicker";
import type { SnoozePreset, SnoozeEmailDto } from "@/services/kanban/types";

interface SnoozeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (snoozeDto: SnoozeEmailDto) => void;
    emailSubject?: string;
}

export function SnoozeDialog({ open, onOpenChange, onConfirm, emailSubject }: SnoozeDialogProps) {
    const [selectedPreset, setSelectedPreset] = useState<SnoozePreset>("later_today");
    const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
    const [error, setError] = useState<string>("");

    const handleConfirm = () => {
        setError("");
        let snoozeDto: SnoozeEmailDto;

        if (selectedPreset === "custom") {
            if (!customDate) {
                setError("Please select a date and time for custom snooze");
                return;
            }

            snoozeDto = {
                preset: "custom",
                customDate: customDate.toISOString(),
            };
        } else {
            snoozeDto = {
                preset: selectedPreset,
            };
        }

        onConfirm(snoozeDto);
        onOpenChange(false);
    };

    const getPresetLabel = (preset: SnoozePreset) => {
        switch (preset) {
            case "later_today":
                return "Later Today (6pm)";
            case "tomorrow":
                return "Tomorrow (9am)";
            case "this_weekend":
                return "This Weekend";
            case "next_week":
                return "Next Week";
            case "custom":
                return "Custom Date & Time";
            default:
                return preset;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Snooze Email
                    </DialogTitle>
                    <DialogDescription>
                        {emailSubject ? (
                            <span className="text-sm line-clamp-1">"{emailSubject}"</span>
                        ) : (
                            "Choose when you want to see this email again"
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <RadioGroup
                        value={selectedPreset}
                        onValueChange={(value) => setSelectedPreset(value as SnoozePreset)}
                    >
                        {(
                            [
                                "later_today",
                                "tomorrow",
                                "this_weekend",
                                "next_week",
                                "custom",
                            ] as SnoozePreset[]
                        ).map((preset) => (
                            <div key={preset} className="flex items-center space-x-2">
                                <RadioGroupItem value={preset} id={preset} />
                                <Label
                                    htmlFor={preset}
                                    className="flex-1 cursor-pointer font-normal"
                                >
                                    {getPresetLabel(preset)}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>

                    {selectedPreset === "custom" && (
                        <div className="space-y-4 pt-4 border-t">
                            <div className="space-y-2">
                                <Label>Select Date & Time</Label>
                                <DateTimePickerDialog
                                    value={customDate}
                                    onChange={setCustomDate}
                                    disabled={(date) =>
                                        date < new Date(new Date().setHours(0, 0, 0, 0))
                                    }
                                    buttonText="Click to select date and time"
                                    dialogTitle="Choose Snooze Time"
                                />
                                {error && (
                                    <p className="text-sm text-red-500 font-medium">{error}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm}>
                        <Clock className="w-4 h-4 mr-2" />
                        Snooze
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
