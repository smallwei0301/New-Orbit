/**
 * Design-system primitives — built on the orbit-* tokens.
 * These match the look of the production components (rounded cards, pill
 * buttons, warm palette). Extend as needed when fleshing out pages.
 */
import { clsx } from './clsx.js'

export function Button({ variant = 'primary', className, ...props }) {
  const base = 'orbit-btn'
  const variants = {
    primary: 'orbit-btn-primary',
    ghost: 'orbit-btn-ghost',
    danger: 'orbit-btn text-white bg-orbit-danger hover:opacity-90',
    outline:
      'orbit-btn border border-orbit-border text-orbit-700 bg-white hover:bg-orbit-warm',
  }
  return <button className={clsx(base, variants[variant], className)} {...props} />
}

export function Card({ className, hover, children, ...rest }) {
  return (
    <div className={clsx('orbit-card p-6', hover && 'orbit-card-hover', className)} {...rest}>
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {title && (
          <h1 className="font-serif text-2xl font-semibold text-orbit-900">{title}</h1>
        )}
        {subtitle && <p className="mt-1 text-sm text-orbit-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Badge({ tone = 'default', children }) {
  const tones = {
    default: 'bg-orbit-warm text-orbit-500',
    success: 'bg-orbit-success-bg text-orbit-success',
    danger: 'bg-orbit-danger/10 text-orbit-danger',
    info: 'bg-orbit-info-bg text-orbit-500 border border-orbit-info-border',
  }
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs', tones[tone])}>
      {children}
    </span>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-orbit-700">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-orbit-400">{hint}</span>}
    </label>
  )
}

export function Input({ className, ...props }) {
  return (
    <input
      className={clsx(
        'w-full rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700',
        'placeholder:text-orbit-300 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30',
        className
      )}
      {...props}
    />
  )
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {label && <div className="text-sm font-medium text-orbit-700">{label}</div>}
        {hint && <div className="mt-0.5 text-xs text-orbit-400">{hint}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange?.(!checked)}
        className={clsx(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-orbit-primary' : 'bg-orbit-border'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  )
}
