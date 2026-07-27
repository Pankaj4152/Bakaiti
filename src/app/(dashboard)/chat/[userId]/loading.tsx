export default function ChatLoading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center gap-3 px-4 h-14 border-b flex-shrink-0">
        <div className="h-8 w-8 rounded-full bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
      </div>

      {/* Messages Skeleton */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="flex items-end gap-2 max-w-[70%]">
          <div className="h-7 w-7 rounded-full bg-muted shrink-0" />
          <div className="h-10 w-48 rounded-2xl bg-muted" />
        </div>
        <div className="flex items-end gap-2 max-w-[70%] ml-auto flex-row-reverse">
          <div className="h-10 w-64 rounded-2xl bg-muted/80" />
        </div>
        <div className="flex items-end gap-2 max-w-[70%]">
          <div className="h-7 w-7 rounded-full bg-muted shrink-0" />
          <div className="h-14 w-56 rounded-2xl bg-muted" />
        </div>
      </div>

      {/* Input Skeleton */}
      <div className="p-4 border-t">
        <div className="h-10 w-full rounded-md bg-muted" />
      </div>
    </div>
  )
}
