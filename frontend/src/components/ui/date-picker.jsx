import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

// Standard shadcn imports (ensure these paths match your setup)
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DatePicker({ date, setDate, label = "Pick a date" }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal p-3 h-auto border-gray-300 rounded-md hover:bg-green-50 hover:text-[#1B6A31] focus:ring-2 focus:ring-[#8CC63F] focus:border-[#4A9E46]",
            !date && "text-gray-500"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-[#4A9E46]" />
          {date ? format(date, "PPP") : <span>{label}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white border-gray-200" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          // Applying your brand colors to the calendar
          className="text-gray-800"
          classNames={{
            day_selected: "bg-[#1B6A31] text-white hover:bg-[#4A9E46] hover:text-white focus:bg-[#1B6A31] focus:text-white",
            day_today: "bg-green-50 text-[#1B6A31] font-bold",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}