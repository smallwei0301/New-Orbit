/** Centered card layout for auth screens (sign-in / sign-up / forgot / reset). */
import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orbit-warm to-orbit-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="h-3 w-3 animate-breathe rounded-full bg-orbit-primary" />
          <span className="font-logo text-2xl font-semibold tracking-wide text-orbit-900">Orbit</span>
        </div>
        <div className="orbit-card p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
