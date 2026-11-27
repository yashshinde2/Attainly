export default function StudentLoading() {
  return (
    <div className="min-h-screen bg-background p-6 lg:pl-[272px]">
      <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
        <div className="h-24 rounded-2xl bg-muted/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-28 rounded-2xl bg-muted/60" />
          <div className="h-28 rounded-2xl bg-muted/60" />
          <div className="h-28 rounded-2xl bg-muted/60" />
          <div className="h-28 rounded-2xl bg-muted/60" />
        </div>
        <div className="h-72 rounded-2xl bg-muted/60" />
      </div>
    </div>
  )
}
