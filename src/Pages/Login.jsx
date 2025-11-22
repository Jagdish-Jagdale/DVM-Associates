import React, { useEffect, useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { ref, get } from 'firebase/database'
import { auth, db } from '../../firebase.js'
import { useNavigate } from 'react-router-dom'
import { FiPhone, FiLock } from 'react-icons/fi'

const Login = ({ onLogin }) => {
  const navigate = useNavigate()
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mobileError, setMobileError] = useState('')
  const [dirty, setDirty] = useState(false)

  const [snack, setSnack] = useState({ open: false, message: '', type: 'error' })

  useEffect(() => {
    if (!snack.open) return
    const t = setTimeout(() => setSnack((s) => ({ ...s, open: false })), 3000)
    return () => clearTimeout(t)
  }, [snack.open])

  useEffect(() => {
    if (!error) return
    setSnack({ open: true, message: error, type: 'error' })
  }, [error])

  const validateMobile = (value) => /^\d{10}$/.test(value)
  const formatEmail = (value) => `${value}@admin.com`

  const handleMobileChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setMobile(digits)
    if (digits && !validateMobile(digits)) {
      setMobileError('Mobile number must be 10 digits')
    } else {
      setMobileError('')
    }
    setDirty(true)
  }

  const resetForm = () => {
    setMobile('')
    setPassword('')
    setMobileError('')
    setError('')
    setDirty(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!mobile || !password) {
      setError('Please enter both mobile number and password')
      setIsLoading(false)
      return
    }

    if (!validateMobile(mobile)) {
      setError('Please enter a valid 10-digit mobile number')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setIsLoading(false)
      return
    }

    try {
      const email = formatEmail(mobile)

      // Login: check RTDB first by phone + password
      const adminRef = ref(db, `admins/${mobile}`)
      const adminSnap = await get(adminRef)
      if (adminSnap.exists()) {
        const record = adminSnap.val()
        if (record.password !== password) {
          setError('Incorrect password.')
          return
        }
        const role = record.role === 'admin' ? 'admin' : 'super-admin'
        setMobile('')
        setPassword('')
        setMobileError('')
        try {
          localStorage.setItem('authRole', role)
          sessionStorage.setItem('authRole', role)
          if (record.branch) {
            localStorage.setItem('authBranch', record.branch)
            sessionStorage.setItem('authBranch', record.branch)
          }
          localStorage.setItem('authMobile', mobile)
          sessionStorage.setItem('authMobile', mobile)
        } catch {}
        onLogin && onLogin({ phone: mobile }, role)
        navigate(role === 'admin' ? '/admin/dashboard' : '/super-admin', { replace: true })
        return
      }

      // If phone not found in DB, try Firebase Auth with email+password
      try {
        await signInWithEmailAndPassword(auth, email, password)
        setMobile('')
        setPassword('')
        setMobileError('')
        try { localStorage.setItem('authRole', 'super-admin'); sessionStorage.setItem('authRole', 'super-admin') } catch {}
        onLogin && onLogin({ phone: mobile }, 'super-admin')
        navigate('/super-admin', { replace: true })
      } catch (authError) {
        switch (authError.code) {
          case 'auth/user-not-found':
            setError('No account found. Please sign up.')
            break
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            setError('Invalid mobile number or password.')
            break
          case 'auth/too-many-requests':
            setError('Too many attempts. Try again later.')
            break
          default:
            setError(`Error: ${authError.message}`)
        }
      }
    } catch (error) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('This mobile number is already registered. Try signing in.')
          break
        case 'auth/invalid-credential':
          setError('Invalid mobile number or password.')
          break
        case 'auth/user-not-found':
          setError('No account found. Please sign up.')
          break
        case 'auth/wrong-password':
          setError('Incorrect password.')
          break
        case 'auth/too-many-requests':
          setError('Too many attempts. Try again later.')
          break
        default:
          setError(`Error: ${error.message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const canSubmit = dirty && validateMobile(mobile) && password.length >= 6 && !mobileError

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4" style={{fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'}}>
      <form onSubmit={handleSubmit} className="w-full max-w-[420px] bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 px-8 py-10">
        <div className="flex flex-col items-center mb-8">
          <img src="/src/assets/DVMAssociates.png" alt="DVM & Associates" className="h-20 w-20 rounded-full shadow-sm bg-white ring-1 ring-gray-200 object-contain p-1" />
          <h2 className="mt-4 text-2xl font-semibold text-gray-900" style={{fontFamily: 'Poppins, Inter, sans-serif'}}>Welcome back</h2>
          <p className="text-gray-500 text-sm">Sign in to your dashboard</p>
        </div>

        {false && (
          <div className="hidden">{error}</div>
        )}

        <div className="mb-5">
          <label htmlFor="mobile" className="block text-gray-700 mb-2 text-sm font-medium">
            Mobile Number
          </label>
          <div className={`relative rounded-lg shadow-sm ${mobileError ? 'ring-1 ring-red-500' : ''}`}>
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <FiPhone />
            </span>
            <input
              type="text"
              id="mobile"
              name="mobile"
              placeholder="10-digit mobile number"
              value={mobile}
              onChange={handleMobileChange}
              className={`w-full pl-10 pr-3 py-3 border ${mobileError ? 'border-red-500' : 'border-gray-300'} rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              disabled={isLoading}
              maxLength={10}
              inputMode="numeric"
              pattern="[0-9]{10}"
              onKeyDown={(e) => { if(['e','E','+','-','.',' '].includes(e.key)) e.preventDefault() }}
              required
            />
          </div>
          {false && (
            <div className="hidden">{mobileError}</div>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-700 mb-2 text-sm font-medium">
            Password
          </label>
          <div className="relative rounded-lg shadow-sm">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <FiLock />
            </span>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter password (min 6 characters)"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setDirty(true) }}
              className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition disabled:opacity-60 disabled:cursor-not-allowed mb-4"
          disabled={isLoading || !canSubmit}
        >
          {isLoading ? 'Processing...' : 'Sign In'}
        </button>

        

      </form>
      <div
        className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-md shadow transition ${snack.open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'} ${snack.type === 'error' ? 'bg-red-600' : snack.type === 'success' ? 'bg-emerald-600' : snack.type === 'warning' ? 'bg-amber-500' : 'bg-gray-800'} text-white`}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <span className="font-medium">{snack.message}</span>
        </div>
      </div>
    </div>
  )
}

export default Login
