import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './Pages/Login.jsx'
import MainLayout from './Pages/Admin/MainLayout.jsx'
import SAMainLayout from './Pages/SuperAdmin/MainLayout.jsx'

function RequireRole({ allowed, children }) {
  const role = (typeof window !== 'undefined' && (localStorage.getItem('authRole') || sessionStorage.getItem('authRole'))) || null
  if (!role || (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(role))) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/*" element={<RequireRole allowed={['admin']}><MainLayout /></RequireRole>} />
      <Route path="/super-admin/*" element={<RequireRole allowed={['super-admin']}><SAMainLayout /></RequireRole>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App

