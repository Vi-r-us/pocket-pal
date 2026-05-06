import { format, parse } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type TransactionsDatePickerProps = {
  id: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

const toDate = (value: string) => {
  if (!value) return undefined;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export const TransactionsDatePicker = ({
  id,
  value,
  placeholder,
  onChange,
}: TransactionsDatePickerProps) => {
  const selectedDate = toDate(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          data-empty={!selectedDate}
          className={cn(
            "w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground",
          )}
        >
          {selectedDate ? (
            format(selectedDate, "PPP")
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronDownIcon
            className="size-4 text-muted-foreground"
            aria-hidden
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        <Calendar
          className="rounded-lg w-fit mx-auto"
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) return;
            onChange(format(date, "yyyy-MM-dd"));
          }}
          defaultMonth={selectedDate}
        />
      </PopoverContent>
    </Popover>
  );
};
