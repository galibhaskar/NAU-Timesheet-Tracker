'use client';

import { signOut } from 'next-auth/react';

interface HeaderProps {
  userName: string;
  userEmail: string;
  role: string;
}

const ROLE_LABEL: Record<string, string> = {
  TA: 'Teaching Assistant',
  INSTRUCTOR: 'Instructor',
  ADMIN: 'Administrator',
};

export function Header({ userName, userEmail, role }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Page context */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">{ROLE_LABEL[role] ?? role} Portal</span>
      </div>

      {/* User info + sign out */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{userName}</p>
          <p className="text-xs text-gray-500">{userEmail}</p>
        </div>
        <div className="h-8 w-8 rounded-full bg-nau-navy flex items-center justify-center text-white text-sm font-bold">
          {userName.charAt(0).toUpperCase()}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
