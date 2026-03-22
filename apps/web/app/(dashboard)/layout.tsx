import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as {
    id: string;
    name: string;
    email: string;
    role: string;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar — purely presentational, rendered server-side, client child handles active link */}
      <Sidebar role={user.role} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userName={user.name ?? 'User'}
          userEmail={user.email ?? ''}
          role={user.role}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
