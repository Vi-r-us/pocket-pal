import { MoreHorizontal, Pencil, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type AccountRowActionsProps = {
  isActive: boolean
  isSyncing?: boolean
  onEdit: () => void
  onToggleActive: () => void
  onSyncBalance: () => void
}

export const AccountRowActions = ({
  isActive,
  isSyncing = false,
  onEdit,
  onToggleActive,
  onSyncBalance,
}: AccountRowActionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Open account actions" disabled={isSyncing}>
          <MoreHorizontal className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="size-4" aria-hidden />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSyncBalance} disabled={isSyncing}>
          <RefreshCw className={isSyncing ? "size-4 animate-spin" : "size-4"} aria-hidden />
          Sync balance
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleActive}>
          {isActive ? <ToggleLeft className="size-4" aria-hidden /> : <ToggleRight className="size-4" aria-hidden />}
          {isActive ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
