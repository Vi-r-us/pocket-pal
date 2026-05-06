import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type TransactionRowActionsProps = {
  onEdit: () => void
  onClone: () => void
  onDelete: () => void
}

export const TransactionRowActions = ({
  onEdit,
  onClone,
  onDelete,
}: TransactionRowActionsProps) => {
  return (
    <DropdownMenu >
      <DropdownMenuTrigger asChild>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Open transaction actions">
          <MoreHorizontal className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="size-4" aria-hidden />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onClone}>
          <Copy className="size-4" aria-hidden />
          Clone
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} variant="destructive">
          <Trash2 className="size-4" aria-hidden />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
