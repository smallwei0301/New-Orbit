import { Link, useParams } from 'react-router-dom'
import { Button, Field, Input } from '../../components/ui/index.jsx'
import { auth as t } from '../../i18n/strings.js'

export default function SignUp() {
  const { orgSlug } = useParams()
  const prefix = orgSlug ? `/${orgSlug}` : ''
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-orbit-900">{t.signUp.heading}</h1>
      <p className="mt-2 text-sm text-orbit-400">{t.signUp.title}</p>
      <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Field label="手機號碼">
          <Input type="tel" placeholder="0912345678" />
        </Field>
        <Field label="商家名稱" hint="商家帳號需要一組 Email 作為日後主要聯繫方式">
          <Input placeholder="例如：瑜珈工作室" />
        </Field>
        <Field label="Email">
          <Input type="email" placeholder="you@example.com" />
        </Field>
        <Field label="密碼">
          <Input type="password" placeholder="至少 8 個字元，包含數字" />
        </Field>
        <Field label="確認密碼">
          <Input type="password" placeholder="再一次輸入密碼" />
        </Field>
        <p className="text-xs text-orbit-400">
          建立帳號即表示您同意
          <Link to={`${prefix}/vendor-terms`} className="text-orbit-primary hover:underline">
            商家服務條款
          </Link>
        </p>
        <Button type="submit" className="w-full">
          {t.signUp.submit}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-orbit-400">
        {t.signUp.haveAccount}{' '}
        <Link to={`${prefix}/sign-in`} className="text-orbit-primary hover:underline">
          登入
        </Link>
      </p>
    </div>
  )
}
