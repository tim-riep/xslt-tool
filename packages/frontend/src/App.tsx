import { Routes, Route, Navigate } from 'react-router-dom'
import Tool from './pages/Tool'
import { lazy } from 'react'

const Login = lazy(()=>import('./pages/Login'))
const Register = lazy(()=>import('./pages/Register'))


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/app" element={<Tool />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
