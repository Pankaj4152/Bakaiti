import { UserList } from "@/components/sidebar"

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full w-full">
      <aside className="w-72 border-r flex-shrink-0 hidden md:flex flex-col">
        <UserList />
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>
    </div>
  )
}
