"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SeparatorProps {
  text: string;
  className?: string;
  bg?: string;
}

function Separator({ text, className, bg }: SeparatorProps) {
  return (
    <div
      className={cn(
        "relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border mb-4",
        className
      )}
    >
      <span className={cn("relative z-10 px-2 text-muted-foreground", bg ?? "bg-background")}>
        {text}
      </span>
    </div>
  )
}

export { Separator }


