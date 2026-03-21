export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-nau-navy text-white">
        <div className="p-4">
          <h2 className="text-lg font-bold text-nau-gold">NAU Timesheet</h2>
        </div>
        <nav className="mt-4">
          <p className="px-4 text-sm text-gray-400">Navigation — coming soon</p>
        </nav>
      </aside>
      <main className="flex-1 bg-gray-50 p-8">{children}</main>
    </div>
  );
}
