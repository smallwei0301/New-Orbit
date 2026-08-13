import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-orbit-bg text-center">
      <h1 className="font-serif text-4xl font-semibold text-orbit-900">404</h1>
      <p className="text-sm text-orbit-400">找不到這個頁面</p>
      <Link to="/" className="text-orbit-primary hover:underline">
        返回首頁
      </Link>
    </div>
  )
}
