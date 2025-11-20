import React, { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { ref, get } from 'firebase/database'
import { auth, db } from '../../firebase.js'
import { useNavigate, Link } from 'react-router-dom'

const Login = ({ onLogin }) => {
  const navigate = useNavigate()
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mobileError, setMobileError] = useState('')
  const [dirty, setDirty] = useState(false)

  const validateMobile = (value) => /^\d{10}$/.test(value)
  const formatEmail = (value) => `${value}@admin.com`

  const handleMobileChange = (e) => {
    const value = e.target.value.trim()
    setMobile(value)
    if (value && !validateMobile(value)) {
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
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-[400px]">
        <h2 className="text-purple-700 text-center mb-6 text-2xl font-bold">
          Admin Login
        </h2>

        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-center">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="mobile" className="block text-purple-700 mb-2 font-medium">
            Mobile Number
          </label>
          <input
            type="text"
            id="mobile"
            name="mobile"
            placeholder="Enter 10-digit mobile number"
            value={mobile}
            onChange={handleMobileChange}
            className={`w-full p-3 border ${mobileError ? 'border-red-600' : 'border-gray-300'} rounded text-base`}
            disabled={isLoading}
            maxLength={10}
            required
          />
          {mobileError && (
            <div className="text-red-600 text-sm mt-1">{mobileError}</div>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-purple-700 mb-2 font-medium">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Enter password (min 6 characters)"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setDirty(true) }}
            className="w-full p-3 border border-gray-300 rounded text-base"
            disabled={isLoading}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full p-3 bg-purple-700 text-white rounded text-base font-medium disabled:opacity-60 disabled:cursor-not-allowed mb-4"
          disabled={isLoading || !canSubmit}
        >
          {isLoading ? 'Processing...' : 'Login'}
        </button>

        <div className="text-center">
          <Link
            to="/signup"
            onClick={() => { resetForm() }}
            className="bg-transparent inline-block text-purple-700 cursor-pointer text-sm underline mb-2"
          >
            Don't have an account? Sign Up
          </Link>
        </div>
      </form>
    </div>
  )
}

export default Login
