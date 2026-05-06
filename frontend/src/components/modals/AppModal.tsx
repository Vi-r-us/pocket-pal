import type { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const SIZE_CLASS_MAP = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
} as const

type AppModalSize = keyof typeof SIZE_CLASS_MAP

type AppModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: AppModalSize
  contentClassName?: string
  footerClassName?: string
  showCloseButton?: boolean
}

export const AppModal = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  contentClassName,
  footerClassName,
  showCloseButton = true,
}: AppModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={showCloseButton}
        className={cn(SIZE_CLASS_MAP[size], contentClassName)}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
        {footer ? (
          <DialogFooter className={footerClassName}>{footer}</DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
