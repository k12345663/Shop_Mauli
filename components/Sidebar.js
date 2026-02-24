'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const NAV_ITEMS = {
  admin: [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/shops', label: 'Manage Shops', icon: '🏪' },
    { href: '/admin/renters', label: 'Manage Renters', icon: '👤' },
    { href: '/admin/assign', label: 'Assign Shops', icon: '🔗' },
    { href: '/admin/payments', label: 'Payments Report', icon: '💰' },
  ],
  collector: [
    { href: '/collector', label: 'Search Renter', icon: '🔍' },
    { href: '/collector/history', label: 'Collection History', icon: '📋' },
  ],
  owner: [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/shops', label: 'Manage Shops', icon: '🏪' },
    { href: '/admin/renters', label: 'Manage Renters', icon: '👤' },
    { href: '/admin/assign', label: 'Assign Shops', icon: '🔗' },
    { href: '/admin/payments', label: 'Payments Report', icon: '💰' },
    { href: '/owner', label: 'Analytics', icon: '📈' },
  ],
  dba: [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/approvals', label: 'User Approvals', icon: '✅' },
    { href: '/admin/users', label: 'Manage Users', icon: '👥' },
  ],
};

export default function Sidebar({ role }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV_ITEMS[role] || [];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)', zIndex: 999, display: 'none'
          }}
          className="sidebar-backdrop"
        />
      )}

      {/* Mobile toggle */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-logo">🏢</span>
          <span className="sidebar-title">RentFlow</span>
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-role">{role?.toUpperCase()}</div>
              <div className="sidebar-user-email">{user?.email || ''}</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
            🚪 Logout
          </button>
        </div>

        <style jsx>{`
          .sidebar-mobile-toggle {
            display: none;
            position: fixed;
            top: 16px;
            left: 16px;
            z-index: 1100;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            font-size: 1.25rem;
            padding: 8px 12px;
            border-radius: var(--radius-md);
            cursor: pointer;
            box-shadow: var(--shadow-md);
          }

          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            width: var(--sidebar-width);
            height: 100vh;
            background: var(--bg-secondary);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            z-index: 1000;
            transition: transform 0.3s ease;
          }

          .sidebar-brand {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 24px 20px;
            border-bottom: 1px solid var(--border-color);
          }

          .sidebar-logo {
            font-size: 1.5rem;
          }

          .sidebar-title {
            font-size: 1.25rem;
            font-weight: 800;
            color: var(--text-primary);
          }

          .sidebar-nav {
            flex: 1;
            padding: 16px 12px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            overflow-y: auto;
          }

          .sidebar-link {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            border-radius: var(--radius-md);
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.2s ease;
          }

          .sidebar-link:hover {
            background: var(--bg-primary);
            color: var(--text-primary);
          }

          .sidebar-link.active {
            background: var(--accent-primary);
            color: white;
            font-weight: 600;
          }

          .sidebar-link-icon {
            font-size: 1.1rem;
          }

          .sidebar-footer {
            padding: 16px;
            border-top: 1px solid var(--border-color);
          }

          .sidebar-user {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
          }

          .sidebar-user-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: var(--accent-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 0.8rem;
            color: white;
            flex-shrink: 0;
          }

          .sidebar-user-role {
            font-size: 0.65rem;
            font-weight: 700;
            color: var(--accent-primary);
            text-transform: uppercase;
            letter-spacing: 0.025em;
          }

          .sidebar-user-email {
            font-size: 0.75rem;
            color: var(--text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 140px;
          }

          @media (max-width: 1024px) {
            .sidebar-mobile-toggle {
              display: flex;
            }
            .sidebar {
              transform: translateX(-100%);
            }
            .sidebar-open {
              transform: translateX(0);
              box-shadow: var(--shadow-lg);
            }
            .sidebar-backdrop {
              display: block !important;
            }
          }
        `}</style>
      </aside>
    </>
  );
}
