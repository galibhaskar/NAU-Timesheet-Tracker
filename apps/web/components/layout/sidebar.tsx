'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const TA_NAV: NavItem[] = [
  { label: 'My Dashboard', href: '/ta', icon: '⊞' },
  { label: 'Submit Week', href: '/ta', icon: '✓' },
  { label: 'Export', href: '/ta', icon: '↓' },
];

const INSTRUCTOR_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/instructor', icon: '⊞' },
  { label: 'Pending Review', href: '/instructor', icon: '◷' },
  { label: 'My Courses', href: '/instructor', icon: '📚' },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: '⊞' },
  { label: 'Users', href: '/admin/users', icon: '👥' },
  { label: 'Settings', href: '/admin/settings', icon: '⚙' },
  { label: 'Audit Log', href: '/admin/audit', icon: '📋' },
];

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  TA: TA_NAV,
  INSTRUCTOR: INSTRUCTOR_NAV,
  ADMIN: ADMIN_NAV,
};

interface SidebarProps {
  role: string;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const navItems = NAV_BY_ROLE[role] ?? [];

  return (
    <aside className="flex h-full w-64 flex-col bg-nau-navy text-white">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-white/10 px-6 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nau-gold font-bold text-nau-navy text-sm">
          NAU
        </div>
        <span className="text-lg font-bold text-white">Timesheet</span>
      </div>

      {/* Role label */}
      <div className="px-6 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
          {role === 'TA' ? 'Teaching Assistant' : role === 'INSTRUCTOR' ? 'Instructor' : 'Admin'}
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-6 py-4">
        <p className="text-xs text-white/40">Northern Arizona University</p>
      </div>
    </aside>
  );
}
