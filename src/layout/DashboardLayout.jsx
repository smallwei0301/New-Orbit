/**
 * Dashboard shell — collapsible sidebar + mobile drawer + top bar + <Outlet>.
 * Structure mirrors production: w-56 expanded / w-14 collapsed desktop aside,
 * a mobile hamburger drawer, and a scrolling content area.
 */
import { useState } from 'react'
import { NavLink, Outlet, useParams, useLocation, Link, useNavigate } from 'react-router-dom'
import { NAV_ITEMS, NAV_FOOTER } from './nav.js'
import { config } from '../config/env.js'
import { auth } from '../lib/auth.js'
import { clsx } from '../components/ui/clsx.js'

function Logo({ collapsed }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 animate-breathe rounded-full bg-orbit-primary" />
      {!collapsed && (
        <span className="font-logo text-lg font-semibold tracking-wide text-orbit-900">Orbit</span>
      )}
    </div>
  )
}

function NavList({ orgSlug, collapsed, onNavigate }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={`/${orgSlug}/dashboard/${item.path}`}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-orbit-warm font-semibold text-orbit-primary'
                : 'text-orbit-500 hover:bg-orbit-warm/60'
            )
          }
        >
          <span
            className="inline-block h-5 w-5 shrink-0 rounded bg-orbit-border/60"
            title={item.icon}
            aria-hidden
          />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

export default function DashboardLayout() {
  const { orgSlug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('dashboard-menu-collapsed') === '1'
  )
  const [drawer, setDrawer] = useState(false)

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('dashboard-menu-collapsed', next ? '1' : '0')
  }

  const handleFooter = (action) => {
    if (action === 'logout') {
      auth.clear()
      navigate('/sign-in')
    } else if (action === 'view-store') {
      window.open(`/${orgSlug}`, '_blank')
    } else if (action === 'contact-support') {
      window.open(config.support.lineUrl, '_blank')
    }
  }

  const Footer = ({ collapsed }) => (
    <div className="border-t border-orbit-border p-2">
      {NAV_FOOTER.map((f) => (
        <button
          key={f.action}
          onClick={() => handleFooter(f.action)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-orbit-500 hover:bg-orbit-warm/60"
        >
          <span className="inline-block h-5 w-5 shrink-0 rounded bg-orbit-border/60" aria-hidden />
          {!collapsed && <span>{f.label}</span>}
        </button>
      ))}
    </div>
  )

  return (
    <div className="flex h-screen flex-col bg-orbit-bg" translate="no">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-orbit-border bg-white px-4 py-3 lg:hidden">
        <button aria-label="開啟選單" onClick={() => setDrawer(true)} className="text-orbit-700">
          ☰
        </button>
        <Link to={`/${orgSlug}/dashboard`}>
          <Logo />
        </Link>
        <span className="w-6" />
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col rounded-r-[40px] bg-white shadow-orbit-nav">
            <div className="flex items-center justify-between border-b border-orbit-border p-4">
              <Logo />
              <button aria-label="關閉選單" onClick={() => setDrawer(false)}>
                ✕
              </button>
            </div>
            <NavList orgSlug={orgSlug} collapsed={false} onNavigate={() => setDrawer(false)} />
            <Footer collapsed={false} />
          </aside>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <aside
          className={clsx(
            'hidden shrink-0 flex-col border-r border-orbit-border bg-white shadow-orbit-nav lg:flex',
            collapsed ? 'w-14' : 'w-56'
          )}
        >
          <div className="flex items-center justify-between p-3">
            {!collapsed && <Logo />}
            <button
              aria-label={collapsed ? '展開選單' : '收合選單'}
              onClick={toggleCollapse}
              className="text-orbit-400 hover:text-orbit-700"
            >
              ☰
            </button>
          </div>
          <NavList orgSlug={orgSlug} collapsed={collapsed} />
          <Footer collapsed={collapsed} />
        </aside>

        {/* Content */}
        <main key={location.pathname} className="flex-1 overflow-y-auto px-5 pb-20 pt-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
