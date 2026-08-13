import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Button, Field, Input } from '../../components/ui/index.jsx'
import { auth as t, common } from '../../i18n/strings.js'
import { authService } from '../../lib/services.js'
import { errorMessage } from '../../lib/useApi.js'
import { auth } from '../../lib/auth.js'
import { setMe } from '../../store/index.js'

/** Sign-in — reference implementation using the production copy. */
export default function SignIn() {
  const { orgSlug } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [email, setEmail] = useState('demo@orbit.test')
  const [password, setPassword] = useState('demo1234')
  const [magic, setMagic] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const prefix = orgSlug ? `/${orgSlug}` : ''

  async function handleSubmit(e) {
    e.preventDefault()
    if (magic) return
    setSubmitting(true)
    setError('')
    try {
      const res = await authService.signIn(email, password)
      auth.setTokens(res.token, res.refreshToken)
      const staff = auth.decode(res.token)?.staff || []
      dispatch(setMe({ user: res.user, staff }))
      const targetSlug = orgSlug || staff[0]?.orgSlug || 'midao'
      navigate(`/${targetSlug}/dashboard`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-orbit-900">{t.signIn.heading}</h1>
      <p className="mt-2 text-sm text-orbit-400">{t.signIn.title}</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Field label={t.signIn.email}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        {!magic && (
          <Field label={t.signIn.password}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.signIn.passwordPlaceholder}
            />
          </Field>
        )}

        <div className="flex justify-end">
          <Link to={`${prefix}/forgot-password`} className="text-sm text-orbit-primary hover:underline">
            {t.signIn.forgot}
          </Link>
        </div>

        {error && (
          <div className="rounded-xl bg-orbit-danger/10 text-orbit-danger text-sm p-3">{error}</div>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? common.processing : magic ? '送出登入連結' : t.signIn.submit}
        </Button>

        <button
          type="button"
          onClick={() => setMagic((m) => !m)}
          className="w-full text-center text-sm text-orbit-500 hover:text-orbit-700"
        >
          {magic ? '收不到登入連結，改用密碼登入' : t.signIn.magicLink}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-orbit-400">測試帳號：demo@orbit.test / demo1234</p>

      <p className="mt-6 text-center text-sm text-orbit-400">
        {t.signIn.noAccount}{' '}
        <Link to={`${prefix}/sign-up`} className="text-orbit-primary hover:underline">
          {t.signIn.createAccount}
        </Link>
      </p>
    </div>
  )
}
