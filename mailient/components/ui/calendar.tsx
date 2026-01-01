"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  month: controlledMonth,
  onMonthChange,
  ...props
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = React.useState<Date>(
    controlledMonth || new Date()
  );

  const month = controlledMonth || internalMonth;
  const handleMonthChange = onMonthChange || setInternalMonth;

  // Custom caption component with year dropdown
  const CaptionWithYear = React.useCallback((captionProps: { displayMonth: Date }) => {
    const { displayMonth } = captionProps;
    const currentYear = displayMonth.getFullYear();
    const currentMonth = displayMonth.getMonth();
    
    // Generate years in descending order (current year to 100 years ago)
    const currentYearNum = new Date().getFullYear();
    const years = Array.from({ length: 101 }, (_, i) => currentYearNum - i);
    
    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newYear = parseInt(e.target.value);
      const newDate = new Date(newYear, currentMonth, 1);
      handleMonthChange(newDate);
    };

    return (
      <div className="flex justify-center items-center gap-3 pt-1 relative w-full mb-2">
        <select
          value={currentYear}
          onChange={handleYearChange}
          className="bg-[#1a1a1a] border border-gray-700 text-white text-sm font-medium px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-white/20 cursor-pointer appearance-none pr-8 hover:border-gray-600 transition-colors z-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.5rem center',
            paddingRight: '2rem',
            minWidth: '90px'
          }}
        >
          {years.map((year) => (
            <option key={year} value={year} className="bg-[#1a1a1a] text-white">
              {year}
            </option>
          ))}
        </select>
        <span className="text-base font-semibold text-white">
          {format(displayMonth, "MMMM")}
        </span>
      </div>
    );
  }, [handleMonthChange]);

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      month={month}
      onMonthChange={handleMonthChange}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-4 min-h-[3rem]",
        caption_label: "text-sm font-medium text-white hidden",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white border-gray-700"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex w-full",
        head_cell:
          "text-gray-400 font-normal text-[0.8rem] text-center flex-1 flex items-center justify-center p-0 h-8 min-w-0",
        row: "flex w-full mt-1",
        cell: "flex-1 text-center text-sm p-0 relative flex items-center justify-center h-9 min-w-0 [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-800/50 [&:has([aria-selected])]:bg-gray-800 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 text-gray-300 hover:text-white mx-auto"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-white text-black hover:bg-white hover:text-black focus:bg-white focus:text-black",
        day_today: "bg-gray-800 text-white border border-gray-600",
        day_outside:
          "day-outside text-gray-500 opacity-50 aria-selected:bg-gray-800/50 aria-selected:text-gray-400 aria-selected:opacity-30",
        day_disabled: "text-gray-600 opacity-50",
        day_range_middle:
          "aria-selected:bg-gray-800 aria-selected:text-white",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        Caption: (captionProps: any) => {
          if (captionProps?.displayMonth) {
            return <CaptionWithYear displayMonth={captionProps.displayMonth} />;
          }
          return null;
        },
      } as any}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
