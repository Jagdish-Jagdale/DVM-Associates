import React, { useMemo, useState } from 'react'
import { useNavigate, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import SuperAdminDashboard from './SuperAdminDashboard.jsx'
import Excel from './Excel.jsx'
import Pending from './Pending.jsx'
import ReservedRows from './ReservedRows.jsx'
import Settings from './Settings.jsx'
import AddEngineer from './AddEngineer.jsx'
import AddTechnicalExecutive from './AddTechnicalExecutive.jsx'
import AddCaseExecutive from './AddCaseExecutive.jsx'
import Admins from './Admins.jsx'
import SuperAdmins from './SuperAdmins.jsx'
import { MdSpaceDashboard } from 'react-icons/md'
import { FiMenu, FiX, FiClock, FiSettings, FiUsers, FiCheckCircle } from 'react-icons/fi'
import { FaFileExcel } from 'react-icons/fa'
import { RiLogoutBoxRLine } from 'react-icons/ri'
import logo from '../../assets/D_V_Mane_Associates_removebg.png'
import { signOut } from 'firebase/auth'
import { auth } from '../../../firebase.js'
import ServerClock from '../../Components/UI/ServerClock.jsx'

const MainLayout = ({ onLogout }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sections = useMemo(
    () => [
      { name: 'Dashboard', path: '/super-admin/dashboard', icon: <MdSpaceDashboard className="text-lg md:text-xl" /> },
      { name: 'Excel', path: '/super-admin/excel', icon: <FaFileExcel className="text-lg md:text-xl" /> },
      { name: 'Pending', path: '/super-admin/pending', icon: <FiClock className="text-lg md:text-xl" /> },
      { name: 'Reserved Rows', path: '/super-admin/reserved-rows', icon: <FiCheckCircle className="text-lg md:text-xl" /> },
      { name: 'Admins', path: '/super-admin/admins', icon: <FiUsers className="text-lg md:text-xl" /> },
      { name: 'Super Admins', path: '/super-admin/super-admins', icon: <FiUsers className="text-lg md:text-xl" /> },
      { name: 'Settings', path: '/super-admin/settings', icon: <FiSettings className="text-lg md:text-xl" /> },
    ],
    []
  )

  const isActive = (path) => location.pathname === path

  return (
    <div className="flex flex-col h-[100dvh] font-sans bg-[#f0f2f5]">
      <div className="md:hidden h-14 px-4 flex items-center justify-between bg-white border-b border-gray-200">
        <button type="button" onClick={() => setSidebarOpen(true)} className="p-2 rounded-md hover:bg-gray-100">
          <FiMenu className="text-2xl" />
        </button>
        <button type="button" onClick={() => navigate('/super-admin/dashboard')}>
          <img src={logo} alt="DVMAssociation" className="h-10 w-auto object-contain" />
        </button>
        <div className="w-10" />
      </div>

      <div className="flex flex-1 min-h-0">
        <div
          className={`fixed inset-0 bg-black/40 z-30 ${sidebarOpen ? '' : 'hidden'}`}
          onClick={() => setSidebarOpen(false)}
        />
        <div
          className={`fixed z-40 inset-y-0 left-0 w-64 min-w-[16rem] bg-white border-r border-gray-200 shadow-sm transform transition-transform duration-200 ease-in-out md:hidden flex flex-col h-full overflow-y-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="h-20 px-4 border-b border-gray-200 bg-gradient-to-b from-white to-gray-50 flex items-center justify-between">
            <button type="button" onClick={() => { navigate('/super-admin/dashboard'); setSidebarOpen(false) }}>
              <img src={logo} alt="DVMAssociation" className="h-12 w-auto object-contain" />
            </button>
            <button type="button" onClick={() => setSidebarOpen(false)} className="p-2 rounded-md hover:bg-gray-100">
              <FiX className="text-2xl" />
            </button>
          </div>
          <nav className="px-2 pt-2 pb-4 flex flex-col gap-1">
            {sections.map((section) => {
              const active = isActive(section.path)
              return (
                <button
                  key={section.name}
                  type="button"
                  onClick={() => { navigate(section.path); setSidebarOpen(false) }}
                  className={[
                    'flex items-center justify-start gap-3 w-full text-left px-3 py-2 rounded-md font-medium transition-colors',
                    active
                      ? 'bg-indigo-50 text-indigo-600 border-l-4 border-indigo-500 pl-2'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-indigo-600',
                    'text-base'
                  ].join(' ')}
                >
                  <span className="transition-all">{section.icon}</span>
                  <span className="">{section.name}</span>
                </button>
              )
            })}
          </nav>
          <div className="mt-auto py-3 px-3 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col items-center gap-2 md:gap-3">
              <button
                type="button"
                className="flex items-center gap-2 border-2 border-gray-200 rounded-full bg-gray-50 text-gray-700 cursor-pointer text-base font-semibold tracking-wide transition-all hover:bg-red-500 hover:text-white hover:border-red-600 hover:-translate-y-0.5 hover:shadow-sm w-10 h-10 justify-center p-0 md:w-auto md:h-auto md:px-5 md:py-2"
                onClick={async () => {
                  try { await signOut(auth) } catch { }
                  try {
                    localStorage.removeItem('authRole')
                    sessionStorage.removeItem('authRole')
                    localStorage.clear()
                    sessionStorage.clear()
                  } catch { }
                  if (typeof onLogout === 'function') onLogout()
                  setSidebarOpen(false)
                  navigate('/login')
                }}
              >
                <RiLogoutBoxRLine size={24} />
                <span className="hidden md:inline">Logout</span>
              </button>
              <ServerClock />
            </div>
          </div>
        </div>

        <div className="hidden md:flex w-64 min-w-[16rem] shrink-0 bg-white border-r border-gray-200 flex-col h-screen sticky top-0 overflow-y-auto shadow-sm">
          <div className="h-24 md:h-28 px-6 md:px-8 mb-3 border-b border-gray-200 bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
            <button type="button" onClick={() => navigate('/super-admin/dashboard')}>
              <img src={logo} alt="DVMAssociation" className="max-h-20 md:max-h-24 w-auto object-contain" />
            </button>
          </div>

          <nav className="px-2 md:px-3 pt-2 pb-4 flex flex-col gap-1">
            {sections.map((section) => {
              const active = isActive(section.path)
              return (
                <button
                  key={section.name}
                  type="button"
                  onClick={() => { navigate(section.path); setSidebarOpen(false) }}
                  className={[
                    'flex items-center justify-start gap-3 w-full text-left px-3 py-2 rounded-md font-medium transition-colors',
                    active
                      ? 'bg-indigo-50 text-indigo-600 border-l-4 border-indigo-500 pl-2'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-indigo-600',
                    'text-base'
                  ].join(' ')}
                >
                  <span className="text-2xl transition-all">{section.icon}</span>
                  <span className="">{section.name}</span>
                </button>
              )
            })}
          </nav>

          <div className="mt-auto py-3 px-3 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col items-center gap-2 md:gap-3">
              <button
                type="button"
                className="flex items-center gap-2 border-2 border-gray-200 rounded-full bg-gray-50 text-gray-700 cursor-pointer text-base font-semibold tracking-wide transition-all hover:bg-red-500 hover:text-white hover:border-red-600 hover:-translate-y-0.5 hover:shadow-sm w-10 h-10 justify-center p-0 md:w-auto md:h-auto md:px-5 md:py-2"
                onClick={async () => {
                  try { await signOut(auth) } catch { }
                  try {
                    localStorage.removeItem('authRole')
                    sessionStorage.removeItem('authRole')
                    localStorage.clear()
                    sessionStorage.clear()
                  } catch { }
                  if (typeof onLogout === 'function') onLogout()
                  navigate('/login')
                }}
              >
                <RiLogoutBoxRLine size={24} />
                <span className="hidden md:inline">Logout</span>
              </button>
              <ServerClock />
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 m-4 md:m-6 xl:mx-auto xl:max-w-[1400px] bg-white rounded-2xl lg:rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] lg:shadow-2xl border border-gray-200 lg:border-gray-100 overflow-auto min-h-0 h-full p-4 md:p-6 lg:p-8">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="excel" element={<Excel />} />
            <Route path="pending" element={<Pending />} />
            <Route path="reserved-rows" element={<ReservedRows />} />
            <Route path="admins" element={<Admins />} />
            <Route path="super-admins" element={<SuperAdmins />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/add-engineer" element={<AddEngineer />} />
            <Route path="settings/add-technical-executive" element={<AddTechnicalExecutive />} />
            <Route path="settings/add-case-executive" element={<AddCaseExecutive />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default MainLayout
