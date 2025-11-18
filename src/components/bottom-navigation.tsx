'use client';

import type React from 'react';
import { Home, Bookmark, Bell, User } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface BottomNavigationProps {
  unreadCount?: number;
}

export function BottomNavigation({ unreadCount = 0 }: BottomNavigationProps): React.JSX.Element {
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: 'Anasayfa', href: '/', active: pathname === '/' },
    { icon: Bookmark, label: 'İzlenenler', href: '/watchlist', active: pathname === '/watchlist' },
    { icon: Bell, label: 'Bildirimler', href: '/alerts', active: pathname === '/alerts', badge: unreadCount },
    { icon: User, label: 'Profil', href: '/profile', active: pathname === '/profile' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        background: 'rgba(255, 255, 255, 0.72)',
        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              onClick={() => {
                // Navigation logic here
                if (item.href === '/') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className={`
                flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200
                ${item.active 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
              aria-label={item.label}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className="text-xs font-medium"
                style={{
                  fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </nav>
  );
}
