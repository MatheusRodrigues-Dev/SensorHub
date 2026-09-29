import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthContext'
import { useAuth } from './features/auth/useAuth'
import { AuthLayout } from './layouts/AuthLayout'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

function AppRoutes() {
  const auth = useAuth()
  if (auth.status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200" role="status">Loading SensorHub…</div>
  }
  if (auth.status === 'error') {
    return <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-950 px-6 text-center text-slate-100"><h1 className="text-2xl font-semibold">Could not load your session</h1><p className="text-slate-400">Check your connection and try again.</p><button onClick={() => void auth.retry()} className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">Try again</button></main>
  }

  return <Routes>
    <Route path="/" element={<Navigate to={auth.status === 'authenticated' ? '/app' : '/login'} replace />} />
    <Route element={auth.status === 'authenticated' ? <Navigate to="/app" replace /> : <AuthLayout />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Route>
    <Route path="/app" element={auth.status === 'authenticated' ? <AppLayout /> : <Navigate to="/login" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

export default function App() {
  return <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>
}
