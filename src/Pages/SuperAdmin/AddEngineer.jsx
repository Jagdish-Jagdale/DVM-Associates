import React, { useState } from 'react'
import { ref, set } from 'firebase/database'
import { db } from '../../../firebase.js'

const AddEngineer = () => {
  const [name, setName] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setStatus('')
    const nm = (name || '').trim()
    if (!nm) { setStatus('Name is required'); return }
    setLoading(true)
    try {
      const key = nm.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || String(Date.now())
      await set(ref(db, `settings/engineers/${key}`), { name: nm, createdAt: Date.now() })
      setStatus('Saved')
      setName('')
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h3 className="text-2xl font-bold text-gray-800 mb-4">Add Engineer</h3>
      <form onSubmit={onSubmit} className="space-y-4 bg-white p-6 rounded-lg border border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" placeholder="Engineer Name" />
        </div>
        <div className="flex items-center gap-2">
          <button disabled={loading} type="submit" className={`px-4 py-2 rounded bg-indigo-600 text-white ${loading? 'opacity-60': 'hover:bg-indigo-700'}`}>{loading? 'Saving...':'Save'}</button>
          {status && <span className={`text-sm ${status.startsWith('Error')? 'text-red-600':'text-green-600'}`}>{status}</span>}
        </div>
      </form>
    </div>
  )
}

export default AddEngineer
