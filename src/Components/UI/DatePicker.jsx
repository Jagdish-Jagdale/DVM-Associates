import React, { useMemo, useRef, useState, useEffect } from 'react'
import { FiCalendar, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi'

const pad = (n)=> String(n).padStart(2,'0')
const toIso = (d)=> `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
const fromIso = (s)=>{
  if(!s) return null
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if(!m) return null
  const y = parseInt(m[1],10), mo = parseInt(m[2],10)-1, da = parseInt(m[3],10)
  const d = new Date(y, mo, da)
  if(isNaN(d.getTime())) return null
  return d
}

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
const dow = ['S','M','T','W','T','F','S']

export default function DatePicker({ value, onChange, onClear, disabled=false, label='Filter by Date' }){
  const selected = useMemo(()=> fromIso(value) , [value])
  const today = useMemo(()=> new Date(), [])
  const [open, setOpen] = useState(false)
  const initial = selected || today
  const [yy, setYy] = useState(initial.getFullYear())
  const [mm, setMm] = useState(initial.getMonth()) // 0-11
  const rootRef = useRef(null)

  useEffect(()=>{
    const onDocClick = (e)=>{ if(open && rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return ()=> document.removeEventListener('mousedown', onDocClick)
  },[open])

  useEffect(()=>{ if(selected){ setYy(selected.getFullYear()); setMm(selected.getMonth()) } },[selected])

  const start = useMemo(()=> new Date(yy, mm, 1), [yy, mm])
  const grid = useMemo(()=>{
    const firstDow = start.getDay() // 0 Sun
    const daysInMonth = new Date(yy, mm+1, 0).getDate()
    const prevDays = new Date(yy, mm, 0).getDate()
    const cells = []
    // leading
    for(let i=firstDow-1;i>=0;i--){ cells.push({ y: yy, m: mm-1, d: prevDays - i, off:true }) }
    // current
    for(let d=1; d<=daysInMonth; d++){ cells.push({ y: yy, m: mm, d, off:false }) }
    // trailing to fill 6 weeks
    while(cells.length % 7 !== 0) cells.push({ y: yy, m: mm+1, d: cells.length % 7, off:true })
    while(cells.length < 42){
      const last = cells[cells.length-1]
      const nxt = new Date(last.y, last.m, last.d)
      nxt.setDate(nxt.getDate()+1)
      cells.push({ y: nxt.getFullYear(), m: nxt.getMonth(), d: nxt.getDate(), off:true })
    }
    return cells
  },[start, yy, mm])

  const selectDay = (cell)=>{
    const d = new Date(cell.y, cell.m, cell.d)
    if(onChange) onChange(toIso(d))
    setOpen(false)
  }

  const display = selected ? `${pad(selected.getDate())}-${pad(selected.getMonth()+1)}-${selected.getFullYear()}` : ''
  const isSameDay = (a,b)=> a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()

  return (
    <div className="relative" ref={rootRef}>
      <label className="block text-gray-700 mb-1 text-sm">{label}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={()=> setOpen(v=>!v)}
          className={`flex-1 inline-flex items-center justify-between px-3 py-2 border rounded-md text-sm bg-white ${disabled?'opacity-60 cursor-not-allowed':'hover:bg-gray-50'}`}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className={`truncate ${display? 'text-gray-800':'text-gray-500'}`}>{display || 'Select date'}</span>
          <FiCalendar className="text-gray-600" />
        </button>
        {value && (
          <button type="button" onClick={()=> onClear && onClear()} className="p-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300" title="Clear date" aria-label="Clear date">
            <FiX />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={()=> setMm(m=>{ if(m===0){ setYy(y=>y-1); return 11 } return m-1 })} className="p-2 rounded hover:bg-gray-100" aria-label="Previous month"><FiChevronLeft/></button>
            <div className="font-semibold text-gray-800">{monthNames[mm]} {yy}</div>
            <button type="button" onClick={()=> setMm(m=>{ if(m===11){ setYy(y=>y+1); return 0 } return m+1 })} className="p-2 rounded hover:bg-gray-100" aria-label="Next month"><FiChevronRight/></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
            {dow.map(d=> <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((c,i)=>{
              const d = new Date(c.y, c.m, c.d)
              const isSel = selected && isSameDay(d, selected)
              const isTod = isSameDay(d, today)
              const inMonth = c.m===mm && c.y===yy
              return (
                <button
                  type="button"
                  key={i}
                  onClick={()=> selectDay(c)}
                  className={`py-2 text-sm rounded-md ${inMonth? '':'text-gray-400'} ${isSel? 'bg-indigo-600 text-white':'hover:bg-indigo-50'} ${isTod && !isSel ? 'ring-1 ring-indigo-300':''}`}
                >{c.d}</button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
