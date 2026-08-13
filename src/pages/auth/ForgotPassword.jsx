import { Link, useParams } from 'react-router-dom'
import { Button, Field, Input } from '../../components/ui/index.jsx'
import { auth as t } from '../../i18n/strings.js'

export default function ForgotPassword() {
  const { orgSlug } = useParams()
  const prefix = orgSlug ? `/${orgSlug}` : ''
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-orbit-900">{t.forgot.heading}</h1>
      <p className="mt-2 text-sm text-orbit-400">{t.forgot.lead}</p>
      <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Field label="Email">
          <Input type="email" placeholder="you@example.com" />
        </Field>
        <Button type="submit" className="w-full">
          {t.forgot.submit}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link to={`${prefix}/sign-in`} className="text-orbit-primary hover:underline">
          {t.forgot.backToSignIn}
        </Link>
      </p>
    </div>
  )
}
