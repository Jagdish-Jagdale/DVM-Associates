import React, { useEffect, useMemo, useState } from 'react'
import { ref, onValue, set, remove } from 'firebase/database'
import { db } from '../../../firebase.js'
import { FiUserPlus, FiSettings, FiPlus, FiX, FiEdit, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

const Settings = () => {
  const items = [
    { key: 'engineers', title: 'Engineers' },
    { key: 'technical_executives', title: 'Technical Executives' },
    { key: 'case_executives', title: 'Case Executives' },
    { key: 'branches', title: 'Branches' },
  ]

  const [selected, setSelected] = useState('engineers')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false })
  const [form, setForm] = useState({ name: '', phone: '' })
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [confirm, setConfirm] = useState({ open: false, key: '', name: '' })
  const [edit, setEdit] = useState({ open: false, row: null, saving: false })

  useEffect(() => {
    setLoading(true)
    const unsubscribe = onValue(ref(db, `settings/${selected}`), (snap) => {
      const data = snap.val() || {}
      const out = Object.keys(data).map(k => ({ key: k, ...(data[k]||{}) }))
      out.sort((a,b) => (b.createdAt||0) - (a.createdAt||0))
      setRows(out)
      setLoading(false)
    }, () => setLoading(false))
    return () => unsubscribe()
  }, [selected])

  useEffect(() => { setPage(1) }, [selected])

  const openAdd = () => { setForm({ name: '', phone: '' }); setModal({ open: true }) }
  const closeAdd = () => setModal({ open: false })

  const onSave = async (e) => {
    e.preventDefault()
    const nm = (form.name||'').trim()
    if (!nm) return
    let key = nm.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || String(Date.now())
    if (rows.some(r => r.key === key)) key = key + '-' + Date.now()
    const value = { name: nm, createdAt: Date.now() }
    await set(ref(db, `settings/${selected}/${key}`), value)
    closeAdd()
  }

  const columns = useMemo(() => {
    return ['Name', 'Created']
  }, [selected])

  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(page, totalPages)
  const start = (current - 1) * pageSize
  const pageItems = rows.slice(start, start + pageSize)
  const showActions = selected !== 'branches'
  const colCount = columns.length + 1 + (showActions ? 1 : 0) // Sr No + (optional Actions)

  return (
    <div className="min-h-[60vh]">
      <div className="flex items-center gap-3 mb-6">
        <FiSettings className="text-2xl text-indigo-600" />
        <h2 className="text-3xl font-bold text-gray-800">Settings</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => setSelected(it.key)}
            className={`group text-left p-6 rounded-xl border ${selected===it.key?'border-indigo-400 ring-1 ring-indigo-200':'border-gray-200'} bg-white hover:border-indigo-300 hover:shadow-md transition`}
          >
            <div className="flex items-center gap-3 mb-2">
              <FiUserPlus className="text-xl text-indigo-600" />
              <div className="text-lg font-semibold text-gray-800">{it.title}</div>
            </div>
            <div className="text-sm text-gray-600">Manage {it.title.toLowerCase()}</div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="text-lg font-semibold text-gray-800">{items.find(i=>i.key===selected)?.title}</div>
          <button type="button" onClick={openAdd} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-sm">
            <FiPlus className="text-base" />
            <span>Add</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-indigo-600 text-white">
              <tr>
                <th className="px-3 py-2 text-center font-semibold border border-indigo-500">Sr No</th>
                {columns.map(c => (
                  <th key={c} className={`px-3 py-2 font-semibold border border-indigo-500 ${c==='Created' ? 'text-center' : 'text-left'}`}>{c}</th>
                ))}
                {showActions && (
                  <th className="px-3 py-2 text-left font-semibold border border-indigo-500">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={colCount} className="px-4 py-4 text-gray-600">Loading...</td></tr>
              ) : pageItems.length ? (
                pageItems.map((r, i) => (
                  <tr key={r.key} className={(i%2===0? 'bg-white':'bg-gray-50') + ' transition-colors hover:bg-gray-100'}>
                    <td className="px-3 py-2 border border-gray-200 align-top text-center">{start + i + 1}</td>
                    <td className="px-3 py-2 border border-gray-200 align-top">
                      <div className="max-w-[260px] whitespace-nowrap overflow-hidden text-ellipsis" title={r.name || '-'}>
                        {r.name || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-2 border border-gray-200 align-top text-center whitespace-nowrap" title={r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}
                    </td>
                    {showActions && (
                      <td className="px-3 py-2 border border-gray-200 align-top">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEdit({ open: true, row: r, saving: false })}
                            className="p-2 rounded-md bg-amber-500 text-white hover:bg-amber-600"
                            title="Edit"
                            aria-label="Edit"
                          >
                            <FiEdit className="text-base" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirm({ open: true, key: r.key, name: r.name })}
                            className="p-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                            title="Delete"
                            aria-label="Delete"
                          >
                            <FiTrash2 className="text-base" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={colCount} className="px-4 py-6 text-center text-gray-600">No records</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {!loading && total > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">Showing {start + 1}-{Math.min(start + pageSize, total)} of {total}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={current === 1}
                className={`p-2 rounded-md border ${current===1? 'text-gray-400 bg-gray-100 cursor-not-allowed':'text-gray-700 hover:bg-gray-100'}`}
                title="Previous"
              >
                <FiChevronLeft />
              </button>
              <div className="text-sm text-gray-700">Page {current} of {totalPages}</div>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={current === totalPages}
                className={`p-2 rounded-md border ${current===totalPages? 'text-gray-400 bg-gray-100 cursor-not-allowed':'text-gray-700 hover:bg-gray-100'}`}
                title="Next"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={onSave} className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800">Add {selected==='branches' ? 'Branch' : items.find(i=>i.key===selected)?.title.slice(0,-1)}</h3>
              <button type="button" onClick={closeAdd} className="p-1 rounded hover:bg-gray-100" aria-label="Close"><FiX /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={form.name} onChange={(e)=>setForm(prev=>({...prev, name: e.target.value}))} className="w-full border border-gray-300 rounded px-3 py-2" required />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={closeAdd} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Save</button>
            </div>
          </form>
        </div>
      )}

      

      {/* Edit Modal */}
      {edit.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!edit.row) return
              const nm = (edit.row.name || '').trim()
              if (!nm) return
              try {
                edit.saving = true
                const value = { name: nm, createdAt: edit.row.createdAt || Date.now() }
                await set(ref(db, `settings/${selected}/${edit.row.key}`), value)
                setEdit({ open: false, row: null, saving: false })
              } catch {
                setEdit(prev => ({ ...prev, saving: false }))
              }
            }}
            className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800">Edit</h3>
              <button type="button" onClick={()=> setEdit({ open:false, row:null, saving:false })} className="p-1 rounded hover:bg-gray-100" aria-label="Close"><FiX /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={edit.row?.name || ''} onChange={(e)=> setEdit(prev => ({ ...prev, row: { ...(prev.row||{}), name: e.target.value } }))} className="w-full border border-gray-300 rounded px-3 py-2" required />
              </div>
              
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={()=> setEdit({ open:false, row:null, saving:false })} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
              <button disabled={edit.saving} type="submit" className={`px-4 py-2 rounded-md bg-indigo-600 text-white ${edit.saving? 'opacity-60':'hover:bg-indigo-700'}`}>{edit.saving? 'Saving...':'Save'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirm */}
      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800">Confirm Delete</h3>
              <button type="button" onClick={()=> setConfirm({ open:false, key:'', name:'' })} className="p-1 rounded hover:bg-gray-100" aria-label="Close"><FiX /></button>
            </div>
            <p className="text-sm text-gray-700 mb-4">Delete <span className="font-semibold">{confirm.name}</span>?</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={()=> setConfirm({ open:false, key:'', name:'' })} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
              <button
                type="button"
                onClick={async ()=>{
                  try { await remove(ref(db, `settings/${selected}/${confirm.key}`)) } catch {}
                  setConfirm({ open:false, key:'', name:'' })
                }}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
