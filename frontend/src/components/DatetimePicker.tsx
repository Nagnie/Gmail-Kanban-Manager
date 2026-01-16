"use client";

import * as React from "react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CalendarDaysIcon } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface DateTimePicker24hProps {
    value?: Date;
    onChange?: (date: Date | undefined) => void;
    disabled?: (date: Date) => boolean;
    placeholder?: string;
}

export function DateTimePicker24h({
    value,
    onChange,
    disabled,
    placeholder = "MM/DD/YYYY hh:mm",
}: DateTimePicker24hProps) {
    const [date, setDate] = React.useState<Date | undefined>(value);
    const [isOpen, setIsOpen] = React.useState(false);

    // Sync internal state with external value
    React.useEffect(() => {
        setDate(value);
    }, [value]);

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            const newDate = date ? new Date(date) : new Date(selectedDate);
            newDate.setFullYear(selectedDate.getFullYear());
            newDate.setMonth(selectedDate.getMonth());
            newDate.setDate(selectedDate.getDate());
            setDate(newDate);
            onChange?.(newDate);
        }
    };

    const handleTimeChange = (type: "hour" | "minute", value: string) => {
        if (date) {
            const newDate = new Date(date);
            if (type === "hour") {
                newDate.setHours(parseInt(value));
            } else if (type === "minute") {
                newDate.setMinutes(parseInt(value));
            }
            setDate(newDate);
            onChange?.(newDate);
        } else {
            // If no date selected, create one with current date
            const newDate = new Date();
            if (type === "hour") {
                newDate.setHours(parseInt(value));
            } else if (type === "minute") {
                newDate.setMinutes(parseInt(value));
            }
            setDate(newDate);
            onChange?.(newDate);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal cursor-pointer",
                        !date && "text-muted-foreground"
                    )}
                >
                    <CalendarDaysIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "MM/dd/yyyy HH:mm") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0"
                onInteractOutside={(e) => {
                    // Prevent closing when clicking inside Dialog
                    const target = e.target as HTMLElement;
                    if (target.closest('[role="dialog"]')) {
                        e.preventDefault();
                    }
                }}
            >
                <div className="sm:flex">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        disabled={disabled}
                        initialFocus
                    />
                    <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
                        <ScrollArea className="w-64 sm:w-auto">
                            <div className="flex sm:flex-col p-2">
                                {hours.reverse().map((hour) => (
                                    <Button
                                        key={hour}
                                        size="icon"
                                        variant={
                                            date && date.getHours() === hour ? "default" : "ghost"
                                        }
                                        className="sm:w-full shrink-0 aspect-square cursor-pointer"
                                        onClick={() => handleTimeChange("hour", hour.toString())}
                                    >
                                        {hour}
                                    </Button>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" className="sm:hidden" />
                        </ScrollArea>
                        <ScrollArea className="w-64 sm:w-auto">
                            <div className="flex sm:flex-col p-2">
                                {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                                    <Button
                                        key={minute}
                                        size="icon"
                                        variant={
                                            date && date.getMinutes() === minute
                                                ? "default"
                                                : "ghost"
                                        }
                                        className="sm:w-full shrink-0 aspect-square cursor-pointer"
                                        onClick={() =>
                                            handleTimeChange("minute", minute.toString())
                                        }
                                    >
                                        {minute.toString().padStart(2, "0")}
                                    </Button>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" className="sm:hidden" />
                        </ScrollArea>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

interface DateTimePickerInlineProps {
    value?: Date;
    onChange?: (date: Date | undefined) => void;
    disabled?: (date: Date) => boolean;
}

export function DateTimePickerInline({ value, onChange, disabled }: DateTimePickerInlineProps) {
    const [date, setDate] = React.useState<Date | undefined>(value);

    // Sync internal state with external value
    React.useEffect(() => {
        setDate(value);
    }, [value]);

    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Check if selected date is today
    const isToday = (selectedDate?: Date) => {
        if (!selectedDate) return false;
        const today = new Date();
        return (
            selectedDate.getDate() === today.getDate() &&
            selectedDate.getMonth() === today.getMonth() &&
            selectedDate.getFullYear() === today.getFullYear()
        );
    };

    // Check if hour should be disabled
    const isHourDisabled = (hour: number) => {
        if (!date || !isToday(date)) return false;
        const now = new Date();
        return hour < now.getHours();
    };

    // Check if minute should be disabled
    const isMinuteDisabled = (minute: number) => {
        if (!date || !isToday(date)) return false;
        const now = new Date();
        if (date.getHours() !== now.getHours()) return false;
        return minute < now.getMinutes();
    };

    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            const newDate = date ? new Date(date) : new Date(selectedDate);
            newDate.setFullYear(selectedDate.getFullYear());
            newDate.setMonth(selectedDate.getMonth());
            newDate.setDate(selectedDate.getDate());

            // If selecting today, ensure time is not in the past
            if (isToday(newDate)) {
                const now = new Date();
                if (
                    newDate.getHours() < now.getHours() ||
                    (newDate.getHours() === now.getHours() &&
                        newDate.getMinutes() < now.getMinutes())
                ) {
                    newDate.setHours(now.getHours());
                    newDate.setMinutes(now.getMinutes() + 1); // Set to next minute
                }
            }

            setDate(newDate);
            onChange?.(newDate);
        }
    };

    const handleTimeChange = (type: "hour" | "minute", value: string) => {
        if (date) {
            const newDate = new Date(date);
            if (type === "hour") {
                newDate.setHours(parseInt(value));
            } else if (type === "minute") {
                newDate.setMinutes(parseInt(value));
            }
            setDate(newDate);
            onChange?.(newDate);
        } else {
            // If no date selected, create one with current date
            const newDate = new Date();
            if (type === "hour") {
                newDate.setHours(parseInt(value));
            } else if (type === "minute") {
                newDate.setMinutes(parseInt(value));
            }
            setDate(newDate);
            onChange?.(newDate);
        }
    };

    return (
        <div className="border rounded-lg flex justify-center">
            <div className="sm:flex">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    disabled={disabled}
                    initialFocus
                />
                <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
                    <ScrollArea className="w-64 sm:w-auto">
                        <div className="flex sm:flex-col p-2">
                            {hours.reverse().map((hour) => (
                                <Button
                                    key={hour}
                                    size="icon"
                                    variant={date && date.getHours() === hour ? "default" : "ghost"}
                                    className="sm:w-full shrink-0 aspect-square cursor-pointer"
                                    onClick={() => handleTimeChange("hour", hour.toString())}
                                    disabled={isHourDisabled(hour)}
                                >
                                    {hour}
                                </Button>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="sm:hidden" />
                    </ScrollArea>
                    <ScrollArea className="w-64 sm:w-auto">
                        <div className="flex sm:flex-col p-2">
                            {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                                <Button
                                    key={minute}
                                    size="icon"
                                    variant={
                                        date && date.getMinutes() === minute ? "default" : "ghost"
                                    }
                                    className="sm:w-full shrink-0 aspect-square cursor-pointer"
                                    onClick={() => handleTimeChange("minute", minute.toString())}
                                    disabled={isMinuteDisabled(minute)}
                                >
                                    {minute.toString().padStart(2, "0")}
                                </Button>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="sm:hidden" />
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}

interface DateTimePickerDialogProps {
    value?: Date;
    onChange?: (date: Date | undefined) => void;
    disabled?: (date: Date) => boolean;
    buttonText?: string;
    dialogTitle?: string;
}

export function DateTimePickerDialog({
    value,
    onChange,
    disabled,
    buttonText = "Select date and time",
    dialogTitle = "Choose Date & Time",
}: DateTimePickerDialogProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [tempDate, setTempDate] = React.useState<Date | undefined>(value);

    React.useEffect(() => {
        setTempDate(value);
    }, [value]);

    const handleConfirm = () => {
        onChange?.(tempDate);
        setIsOpen(false);
    };

    const handleCancel = () => {
        setTempDate(value);
        setIsOpen(false);
    };

    return (
        <>
            <Button
                variant="outline"
                className={cn(
                    "w-full justify-start text-left font-normal cursor-pointer",
                    !value && "text-muted-foreground"
                )}
                onClick={() => setIsOpen(true)}
            >
                <CalendarDaysIcon className="mr-2 h-4 w-4" />
                {value ? format(value, "MM/dd/yyyy HH:mm") : buttonText}
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-fit p-4">
                    <DialogHeader className="pb-2">
                        <DialogTitle className="text-center">{dialogTitle}</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center">
                        <DateTimePickerInline
                            value={tempDate}
                            onChange={setTempDate}
                            disabled={disabled}
                        />
                    </div>
                    <DialogFooter className="pt-4">
                        <Button variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirm}>Confirm</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
