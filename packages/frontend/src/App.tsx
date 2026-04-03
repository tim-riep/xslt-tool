import { Routes, Route, Navigate } from 'react-router-dom'
import Tool from './pages/Tool'
import { lazy, type ReactNode } from 'react'
import { useApi } from './contexts/useApi'

const Login = lazy(()=>import('./pages/Login'))
const Register = lazy(()=>import('./pages/Register'))

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { accessToken } = useApi()
  if (!accessToken) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/app" element={<ProtectedRoute><Tool /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
