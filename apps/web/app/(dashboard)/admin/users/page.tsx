import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { InviteUserForm } from './invite-user-form';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  assignmentCount: number;
}

// ─── Server component ─────────────────────────────────────────────────────────

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { role?: string };
  if (user.role !== 'ADMIN') {
    redirect('/admin');
  }

  let users: UserRow[] = [];
  let fetchError: string | null = null;

  try {
    const dbUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        courseAssignments: {
          select: { id: true },
        },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    users = dbUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      assignmentCount: u.courseAssignments.length,
    }));
  } catch {
    fetchError = 'Failed to load users';
  }

  const ROLE_BADGE: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-800',
    INSTRUCTOR: 'bg-blue-100 text-blue-800',
    TA: 'bg-green-100 text-green-800',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-sm text-gray-500 hover:text-nau-navy hover:underline"
            >
              ← Admin
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">{users.length} registered users</p>
        </div>
      </div>

      {/* Invite new user */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Invite New User</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <InviteUserForm />
        </div>
      </section>

      {/* Users table */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">All Users</h2>

        {fetchError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700">
            {fetchError}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Assignments
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.assignmentCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {format(new Date(u.createdAt), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
