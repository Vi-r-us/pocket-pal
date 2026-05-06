import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type ColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
type ColStart = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13
type RowSpan = 1 | 2 | 3 | 4 | 5 | 6

const COL_SPAN: Record<ColSpan, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12",
}

const SM_COL_SPAN: Record<ColSpan, string> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  5: "sm:col-span-5",
  6: "sm:col-span-6",
  7: "sm:col-span-7",
  8: "sm:col-span-8",
  9: "sm:col-span-9",
  10: "sm:col-span-10",
  11: "sm:col-span-11",
  12: "sm:col-span-12",
}

const MD_COL_SPAN: Record<ColSpan, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  8: "md:col-span-8",
  9: "md:col-span-9",
  10: "md:col-span-10",
  11: "md:col-span-11",
  12: "md:col-span-12",
}

const LG_COL_SPAN: Record<ColSpan, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  9: "lg:col-span-9",
  10: "lg:col-span-10",
  11: "lg:col-span-11",
  12: "lg:col-span-12",
}

const XL_COL_SPAN: Record<ColSpan, string> = {
  1: "xl:col-span-1",
  2: "xl:col-span-2",
  3: "xl:col-span-3",
  4: "xl:col-span-4",
  5: "xl:col-span-5",
  6: "xl:col-span-6",
  7: "xl:col-span-7",
  8: "xl:col-span-8",
  9: "xl:col-span-9",
  10: "xl:col-span-10",
  11: "xl:col-span-11",
  12: "xl:col-span-12",
}

const COL_START: Record<ColStart, string> = {
  1: "col-start-1",
  2: "col-start-2",
  3: "col-start-3",
  4: "col-start-4",
  5: "col-start-5",
  6: "col-start-6",
  7: "col-start-7",
  8: "col-start-8",
  9: "col-start-9",
  10: "col-start-10",
  11: "col-start-11",
  12: "col-start-12",
  13: "col-start-13",
}

const SM_COL_START: Record<ColStart, string> = {
  1: "sm:col-start-1",
  2: "sm:col-start-2",
  3: "sm:col-start-3",
  4: "sm:col-start-4",
  5: "sm:col-start-5",
  6: "sm:col-start-6",
  7: "sm:col-start-7",
  8: "sm:col-start-8",
  9: "sm:col-start-9",
  10: "sm:col-start-10",
  11: "sm:col-start-11",
  12: "sm:col-start-12",
  13: "sm:col-start-13",
}

const MD_COL_START: Record<ColStart, string> = {
  1: "md:col-start-1",
  2: "md:col-start-2",
  3: "md:col-start-3",
  4: "md:col-start-4",
  5: "md:col-start-5",
  6: "md:col-start-6",
  7: "md:col-start-7",
  8: "md:col-start-8",
  9: "md:col-start-9",
  10: "md:col-start-10",
  11: "md:col-start-11",
  12: "md:col-start-12",
  13: "md:col-start-13",
}

const LG_COL_START: Record<ColStart, string> = {
  1: "lg:col-start-1",
  2: "lg:col-start-2",
  3: "lg:col-start-3",
  4: "lg:col-start-4",
  5: "lg:col-start-5",
  6: "lg:col-start-6",
  7: "lg:col-start-7",
  8: "lg:col-start-8",
  9: "lg:col-start-9",
  10: "lg:col-start-10",
  11: "lg:col-start-11",
  12: "lg:col-start-12",
  13: "lg:col-start-13",
}

const XL_COL_START: Record<ColStart, string> = {
  1: "xl:col-start-1",
  2: "xl:col-start-2",
  3: "xl:col-start-3",
  4: "xl:col-start-4",
  5: "xl:col-start-5",
  6: "xl:col-start-6",
  7: "xl:col-start-7",
  8: "xl:col-start-8",
  9: "xl:col-start-9",
  10: "xl:col-start-10",
  11: "xl:col-start-11",
  12: "xl:col-start-12",
  13: "xl:col-start-13",
}

const ROW_SPAN: Record<RowSpan, string> = {
  1: "row-span-1",
  2: "row-span-2",
  3: "row-span-3",
  4: "row-span-4",
  5: "row-span-5",
  6: "row-span-6",
}

export type GridItemProps = {
  span?: ColSpan
  smSpan?: ColSpan
  mdSpan?: ColSpan
  lgSpan?: ColSpan
  xlSpan?: ColSpan
  rowSpan?: RowSpan
  fill?: boolean
  colStart?: ColStart
  smStart?: ColStart
  mdStart?: ColStart
  lgStart?: ColStart
  xlStart?: ColStart
  className?: string
  children?: ReactNode
}

/**
 * Grid Item
 * @param span - The span of the grid item
 * @param smSpan - The span of the grid item on small screens
 * @param mdSpan - The span of the grid item on medium screens
 * @param lgSpan - The span of the grid item on large screens
 * @param xlSpan - The span of the grid item on extra large screens
 * @param rowSpan - The row span of the grid item
 * @param fill - Whether to fill the grid item
 * @param colStart - The column start of the grid item
 * @param smStart - The column start of the grid item on small screens
 * @param mdStart - The column start of the grid item on medium screens
 * @param lgStart - The column start of the grid item on large screens
 * @param xlStart - The column start of the grid item on extra large screens
 * @param className - The class name of the grid item
 * @param children - The children of the grid item
 */
export const GridItem = ({
  span,
  smSpan,
  mdSpan,
  lgSpan,
  xlSpan,
  rowSpan,
  fill = false,
  colStart,
  smStart,
  mdStart,
  lgStart,
  xlStart,
  className,
  children,
}: GridItemProps) => {
  const baseSpan = span ?? 12

  return (
    <div
      className={cn(
        COL_SPAN[baseSpan],
        smSpan !== undefined && SM_COL_SPAN[smSpan],
        mdSpan !== undefined && MD_COL_SPAN[mdSpan],
        lgSpan !== undefined && LG_COL_SPAN[lgSpan],
        xlSpan !== undefined && XL_COL_SPAN[xlSpan],
        colStart !== undefined && COL_START[colStart],
        smStart !== undefined && SM_COL_START[smStart],
        mdStart !== undefined && MD_COL_START[mdStart],
        lgStart !== undefined && LG_COL_START[lgStart],
        xlStart !== undefined && XL_COL_START[xlStart],
        rowSpan !== undefined && ROW_SPAN[rowSpan],
        fill && "h-full w-full [&>*]:h-full [&>*]:w-full",
        "min-h-0",
        className,
      )}
    >
      {children}
    </div>
  )
}
