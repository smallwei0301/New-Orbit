/**
 * Public storefront shell (customer-facing).
 * Distinct from the dashboard: a light top bar with the vendor's name/logo and
 * a link to 我的預約, a centered content column, and a small footer.
 * Used for /:orgSlug, /:orgSlug/items/:itemId, /:orgSlug/calendar,
 * /:orgSlug/orders, /:orgSlug/payment-result, /:orgSlug/claim/:token.
 */
import { Link, Outlet, useParams } from 'react-router-dom'

export default function StoreLayout() {
  const { orgSlug } = useParams()
  const year = 2026
  // In production the org name/logo come from the `org` slice (Dr.getBySlug).
  const orgName = '示範商家'

  return (
    <div className="flex min-h-screen flex-col bg-orbit-bg">
      <header className="sticky top-0 z-30 border-b border-orbit-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to={`/${orgSlug}`} className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-orbit-warm font-logo text-sm font-semibold text-orbit-primary">
              {orgName.slice(0, 1)}
            </span>
            <span className="font-serif text-lg font-semibold text-orbit-900">{orgName}</span>
          </Link>
          <Link
            to={`/${orgSlug}/orders`}
            className="rounded-full bg-orbit-warm px-4 py-1.5 text-sm text-orbit-primary hover:bg-orbit-primary hover:text-white"
          >
            我的預約
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-orbit-border py-6 text-center text-xs text-orbit-300">
        © {year} Orbit. All rights reserved.
      </footer>
    </div>
  )
}
