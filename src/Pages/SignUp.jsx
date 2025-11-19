import React, { useEffect, useState } from 'react'
import { ref, set, get } from 'firebase/database'
import { signOut } from 'firebase/auth'
import { db, auth } from '../../firebase.js'
import { useNavigate, Link } from 'react-router-dom'

const SignUp = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [branch, setBranch] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mobileError, setMobileError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [branchesList, setBranchesList] = useState([])

  const validateMobile = (value) => /^\d{10}$/.test(value)
  const toTitleCase = (s) => s.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())
  
  useEffect(() => {
    (async () => {
      try {
        const snap = await get(ref(db, 'settings/branches'))
        const data = snap.val() || {}
        const list = Object.keys(data).map(k => data[k]?.name).filter(Boolean).sort((a,b)=> a.localeCompare(b))
        setBranchesList(list)
      } catch (_) {
        setBranchesList([])
      }
    })()
  }, [])

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
    setName('')
    setBranch('')
    setMobile('')
    setPassword('')
    setMobileError('')
    setDirty(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!name.trim() || !branch.trim() || !mobile || !password) {
      setError('Please enter name, branch, mobile number and password')
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
      const adminRef = ref(db, `admins/${mobile}`)
      const existing = await get(adminRef)
      if (existing.exists()) {
        setError('This mobile number is already registered as admin. Try logging in.')
        return
      }
      await set(adminRef, {
        name,
        branch,
        mobile,
        password,
        role: 'admin',
        createdAt: new Date().toISOString(),
      })
      try { await signOut(auth) } catch (_) {}
      resetForm()
      navigate('/login', { replace: true })
      return
    } catch (e) {
      setError(`Error: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const canSubmit = dirty && validateMobile(mobile) && password.length >= 6 && !!name.trim() && !!branch.trim() && !mobileError

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-[400px]">
        <h2 className="text-purple-700 text-center mb-6 text-2xl font-bold">Sign Up</h2>

        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-center">{error}</div>
        )}

        <div className="mb-6">
          <label htmlFor="name" className="block text-purple-700 mb-2 font-medium">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => { setName(toTitleCase(e.target.value)); setDirty(true) }}
            className="w-full p-3 border border-gray-300 rounded text-base capitalize"
            disabled={isLoading}
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="branch" className="block text-purple-700 mb-2 font-medium">Branch</label>
          <select
            id="branch"
            name="branch"
            value={branch}
            onChange={(e) => { setBranch(e.target.value); setDirty(true) }}
            className="w-full p-3 border border-gray-300 rounded text-base"
            disabled={isLoading}
            required
          >
            <option value="">Select branch</option>
            {branchesList.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label htmlFor="mobile" className="block text-purple-700 mb-2 font-medium">Mobile Number</label>
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
          <label htmlFor="password" className="block text-purple-700 mb-2 font-medium">Password</label>
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
          {isLoading ? 'Processing...' : 'Sign Up'}
        </button>

        <div className="text-center">
          <Link to="/login" onClick={() => { resetForm(); setError(''); }} className="bg-transparent inline-block text-purple-700 cursor-pointer text-sm underline">
            Already have an account? Login
          </Link>
        </div>
      </form>
    </div>
  )
}

export default SignUp
