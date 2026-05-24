interface UnreadDotProps {
  unread?: boolean
}

export function UnreadDot({ unread }: UnreadDotProps) {
  if (!unread) return null
  
  return (
    <div className="w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-background/50 shrink-0" />
  )
}
