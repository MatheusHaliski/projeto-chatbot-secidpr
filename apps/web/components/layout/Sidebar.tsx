'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/sessions', label: 'Sessões', icon: ChatBubbleLeftRightIcon },
  { href: '/settings', label: 'Configurações', icon: Cog6ToothIcon },
  { href: '/admin', label: 'Admin', icon: ShieldCheckIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-primary-600 text-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-primary-500">
        <h1 className="text-xl font-bold">DECIA</h1>
        <p className="text-primary-200 text-xs mt-0.5">Decisão Coletiva com IA</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary-500 text-white'
                  : 'text-primary-100 hover:bg-primary-500 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-primary-500 text-xs text-primary-300">
        SEIA — Governo do Paraná
      </div>
    </aside>
  );
}
