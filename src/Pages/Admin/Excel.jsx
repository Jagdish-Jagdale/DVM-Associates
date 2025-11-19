import React, { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ref, set, onValue, get } from 'firebase/database'
import { db } from '../../../firebase.js'
import * as XLSX from 'xlsx'
import { FiSave, FiDownload, FiPlus, FiX} from 'react-icons/fi'

const defaultLocations = [
  { name: 'Sangli', shortForm: 'SNGL', aliases: ['SNGL'] },
  { name: 'Belgaum', shortForm: 'BGM', aliases: ['BLG','BGM'] },
  { name: 'Kolhapur', shortForm: 'KOP', aliases: ['KLP','KOP'] },
  { name: 'Pune', shortForm: 'PUNE', aliases: ['PUNE','PCMC'] },
  { name: 'Bengaluru', shortForm: 'BLR', aliases: ['BNG','BLR'] },
  { name: 'Mumbai', shortForm: 'MUM', aliases: ['MUM'] },
  { name: 'Hyderabad', shortForm: 'HYD', aliases: ['HYD'] },
  { name: 'Indore', shortForm: 'INDR', aliases: ['IND','INDR'] },
  { name: 'Satara', shortForm: 'STR', aliases: ['SAT','STR'] },
  { name: 'Vijayapur', shortForm: 'VJP', aliases: ['VJP'] },
]

const codeToNameMap = defaultLocations.reduce((acc, { name, shortForm, aliases }) => {
  acc[shortForm] = name
  ;(aliases || []).forEach(a => acc[a] = name)
  return acc
}, {})

const getYearPair = (d = new Date()) => {
  const y = d.getFullYear() % 100
  const next = (y + 1) % 100
  const f = (n) => n.toString().padStart(2, '0')
  return `${f(y)}-${f(next)}`
}

const yearPairFromDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? '' : getYearPair(d)
}

const yearPairFromOffice = (officeNo) => {
  if (!officeNo) return ''
  const m = String(officeNo).match(/(\d{2}-\d{2})/) 
  return m ? m[1] : ''
}

const headers = [
  'Sr','Month','OfficeNo','RefNo','VisitDate','ReportDate','TechnicalExecutive','Bank','Branch','ClientName','ClientContactNo','Locations','CaseInitiated','Engineer','VisitStatus','ReportStatus','SoftCopy','Print','Amount','GST','Total','BillStatus','ReceivedOn','RecdDate','GSTNo','Remark','Action'
]

const minw = (h)=>{
  switch(h){
    case 'OfficeNo': return 'min-w-[150px]'
    case 'RefNo': return 'min-w-[160px]'
    case 'ClientName': return 'min-w-[240px]'
    case 'Branch':
    case 'Locations': return 'min-w-[200px]'
    case 'TechnicalExecutive': return 'min-w-[200px]'
    case 'GSTNo':
    case 'Bank': return 'min-w-[150px]'
    case 'ClientContactNo':
    case 'Remark': return 'min-w-[200px]'
    case 'VisitDate':
    case 'ReportDate':
    case 'RecdDate': return 'min-w-[120px]'
    default: return 'min-w-[90px]'
  }
}

const normalizeLocation = (name) => {
  if (!name) return ''
  const s = String(name).toLowerCase().trim()
  return s === 'pcmc' ? 'pune' : s
}

const monthOptions = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const monthAbbrFromAny = (val) => {
  if (!val) return ''
  const s = String(val).trim().toLowerCase()
  const map = {
    january: 'Jan', jan: 'Jan',
    february: 'Feb', feb: 'Feb',
    march: 'Mar', mar: 'Mar',
    april: 'Apr', apr: 'Apr',
    may: 'May',
    june: 'Jun', jun: 'Jun',
    july: 'Jul', jul: 'Jul',
    august: 'Aug', aug: 'Aug',
    september: 'Sep', sept: 'Sep', sep: 'Sep',
    october: 'Oct', oct: 'Oct',
    november: 'Nov', nov: 'Nov',
    december: 'Dec', dec: 'Dec',
  }
  if (map[s]) return map[s]
  const m = s.match(/^(1[0-2]|0?[1-9])$/)
  if (m) return monthOptions[parseInt(m[1], 10) - 1]
  return s.slice(0, 1).toUpperCase() + s.slice(1, 3).toLowerCase()
}

const formatDateForInput = (val) => {
  if (!val) return ''
  const s = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/)
  if (m) {
    const dd = m[1].padStart(2, '0')
    const mm = m[2].padStart(2, '0')
    let yy = m[3]
    if (yy.length === 2) yy = (2000 + parseInt(yy, 10)).toString()
    return `${yy}-${mm}-${dd}`
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  return ''
}

const TableRow = memo(({ record, index, onChangeField, onSaveRow, groupRecords, dropdownOptions, formatRef, missingFields, showDelete, onDeleteRow })=>{
  const isNoFee = record.ReceivedOn === 'No Fee'
  const rowClass = isNoFee ? 'bg-red-500 text-white' : (index%2===0?'bg-white':'bg-gray-50')

  const renderInput = (field)=>{
    const err = missingFields && typeof missingFields.has==='function' && missingFields.has(field) ? ' border-red-500 ring-1 ring-red-500 bg-red-50' : ''
    if (field==='Action'){
      const disabled = record.Location !== groupRecords[0]?.Location
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={()=>onSaveRow(record.globalIndex)}
            disabled={disabled}
            aria-label="Save"
            title="Save"
            className={`p-2 rounded-full ${disabled?'bg-gray-200 text-gray-400 cursor-not-allowed':'bg-amber-600 text-white hover:bg-amber-700'}`}
          >
            <FiSave className="text-base" />
          </button>
        </div>
      )
    }
    if (['SoftCopy','Print','VisitStatus'].includes(field)){
      return <input type="checkbox" checked={!!record[field]} onChange={e=>onChangeField(record.globalIndex, field, e.target.checked)} className="h-4 w-4 block mx-auto" />
    }
    if (['VisitDate','ReportDate','RecdDate'].includes(field)){
      return <input type="date" value={formatDateForInput(record[field])} onChange={e=>onChangeField(record.globalIndex, field, e.target.value)} className={`w-full p-2 border border-gray-300 rounded text-sm${err}`} />
    }
    if (['Amount','GST','Total'].includes(field)){
      const ro = field==='Total' || field==='GST'
      return <input
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        onKeyDown={e=>{ if(['e','E','+','-'].includes(e.key)) e.preventDefault() }}
        value={(record[field]===0||record[field])?record[field]:''}
        onChange={e=>onChangeField(record.globalIndex, field, e.target.value)}
        readOnly={ro}
        className={`w-full p-2 border border-gray-300 rounded text-sm ${ro?'bg-gray-100':'bg-white'}${err}`}
      />
    }
    if (field==='ClientContactNo'){
      const val = String(record[field] ?? '')
      return (
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{10}"
          maxLength={10}
          onKeyDown={e=>{ if(['e','E','+','-','.',' '].includes(e.key)) e.preventDefault() }}
          value={val}
          onChange={e=>{
            const digits = e.target.value.replace(/\D/g,'').slice(0,10)
            onChangeField(record.globalIndex, field, digits)
          }}
          className={`w-full p-2 border border-gray-300 rounded text-sm bg-white${err}`}
        />
      )
    }
    if (field==='Month'){
      const val = record.Month || ''
      const inOpts = monthOptions.includes(val)
      return (
        <select value={val} onChange={e=>onChangeField(record.globalIndex,'Month',e.target.value)} className={`w-full p-2 border border-gray-300 rounded text-sm bg-white${err}`}>
          <option value="">Select Month</option>
          {monthOptions.map(m=> <option key={m} value={m}>{m}</option>)}
          {!inOpts && val && (<option value={val}>{monthAbbrFromAny(val)}</option>)}
        </select>
      )
    }
    if (['ReportStatus','BillStatus'].includes(field)){
      return (
        <select value={record[field]||''} onChange={e=>onChangeField(record.globalIndex, field, e.target.value)} className={`w-full p-2 border border-gray-300 rounded text-sm bg-white`}>
          <option value="">Select {field.replace(/([A-Z])/g,' $1').trim()}</option>
          {dropdownOptions[field].map(o=> <option key={o} value={o}>{o}</option>)}
        </select>
      )
    }
    if (['TechnicalExecutive','Engineer','CaseInitiated'].includes(field)){
      return (
        <select value={record[field]||''} onChange={e=>onChangeField(record.globalIndex, field, e.target.value)} className={`w-full p-2 border border-gray-300 rounded text-sm bg-white${err}`}>
          <option value="">Select {field.replace(/([A-Z])/g,' $1').trim()}</option>
          {(dropdownOptions[field]||[]).map(o=> <option key={o} value={o}>{o}</option>)}
        </select>
      )
    }
    if (field==='ReceivedOn'){
      if (record.Location==='Sangli'){
        return (
          <select value={record[field]||''} onChange={e=>onChangeField(record.globalIndex, field, e.target.value)} className={`w-full p-2 border border-gray-300 rounded text-sm bg-white`}>
            <option value="">Select {field.replace(/([A-Z])/g,' $1').trim()}</option>
            {dropdownOptions[field].map(o=> <option key={o} value={o}>{o}</option>)}
          </select>
        )
      }
      return <input type="text" value={record[field]||''} onChange={e=>onChangeField(record.globalIndex, field, e.target.value)} className={`w-full p-2 border border-gray-300 rounded text-sm bg-white`} />
    }
    if (field==='OfficeNo'){
      const display = (record.Location==='PCMC'?'Pune':record.Location) || ''
      return <input type="text" value={display} readOnly className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`} />
    }
    if (field==='Sr'){
      return (
        <div className="relative">
          {showDelete && (
            <button
              type="button"
              onClick={()=> onDeleteRow && onDeleteRow(record.OfficeNo, record.Sr)}
              className="absolute -top-2 -left-2 z-10 p-0.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200 shadow-sm"
              title="Delete blank row"
              aria-label="Delete row"
            >
              <FiX className="text-xs" />
            </button>
          )}
          <input
            type="text"
            value={record[field]||''}
            readOnly
            aria-readonly="true"
            tabIndex={-1}
            className={`w-full px-2 py-1.5 text-center text-slate-600 rounded-md text-sm bg-slate-100 border border-slate-200 shadow-inner cursor-not-allowed`}
          />
        </div>
      )
    }
    if (field==='RefNo'){
      const display = typeof formatRef==='function' ? formatRef(record) : (record[field]||'')
      return <input type="text" value={display} readOnly className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`} />
    }
    return <input type="text" value={record[field]||''} onChange={e=>onChangeField(record.globalIndex, field, e.target.value)} className={`w-full p-2 border border-gray-300 rounded text-sm bg-white${err}`} />
  }

  return (
    <tr className={`${rowClass} border-b border-gray-200`}>
      {headers.map(h=> {
        const isCB = ['SoftCopy','Print','VisitStatus'].includes(h)
        return (
          <td key={h} className={`p-2 border border-gray-300 ${isCB?'text-center align-middle':'align-top'} ${minw(h)}`}>
            {renderInput(h)}
          </td>
        )
      })}
    </tr>
  )
})

const Excel = () => {
  const dropdownOptions = useMemo(()=>({
    ReportStatus: ['Case Cancel','Done','On hold','Pending','Tentative'].sort(),
    ReceivedOn: ['CBI CC','BOL LLP','Office Cash','Cash Mali Sir','DVM OL','AL Fee','No Fee','Same Account'].sort(),
    BillStatus: ['Credit','Pending']
  }),[])

  const [engOptions, setEngOptions] = useState([])
  const [teOptions, setTeOptions] = useState([])
  const [ceOptions, setCeOptions] = useState([])

  useEffect(() => {
    const unsubs = []
    const watch = (path, setter) => {
      const u = onValue(ref(db, path), (snap) => {
        const data = snap.val() || {}
        const list = Object.keys(data).map(k => data[k]?.name).filter(Boolean).sort((a,b)=> a.localeCompare(b))
        setter(list)
      }, () => setter([]))
      unsubs.push(u)
    }
    watch('settings/engineers', setEngOptions)
    watch('settings/technical_executives', setTeOptions)
    watch('settings/case_executives', setCeOptions)
    return () => { try { unsubs.forEach(u => u()) } catch {} }
  }, [])

  const uiOptions = useMemo(() => ({
    ...dropdownOptions,
    TechnicalExecutive: teOptions,
    Engineer: engOptions,
    CaseInitiated: ceOptions,
  }), [dropdownOptions, teOptions, engOptions, ceOptions])

  const [records,setRecords]=useState([])
  const [isLoading,setIsLoading]=useState(true)
  const [isSaving,setIsSaving]=useState(false)
  const [selectedLocation,setSelectedLocation]=useState('')
  const [sortBy, setSortBy] = useState('all')
  const tableRef = useRef(null)
  const [scrollMaxHeight, setScrollMaxHeight] = useState(0)
  const yearPair = useMemo(()=>getYearPair(),[])
  const yearPairForRecord = useCallback((rec)=>{
    return yearPairFromOffice(rec?.OfficeNo) || yearPairFromDate(rec?.VisitDate || rec?.ReportDate) || yearPair
  },[yearPair])
  const [confirmState, setConfirmState] = useState({ open: false, scope: '', rowIndex: null })
  const [snack, setSnack] = useState({ open: false, message: '', type: 'success' })
  useEffect(()=>{ if(snack.open){ const t=setTimeout(()=>setSnack(s=>({...s,open:false})),2500); return ()=>clearTimeout(t) } },[snack.open])

  const authBranch = useMemo(() => {
    try { return (localStorage.getItem('authBranch') || sessionStorage.getItem('authBranch') || '').trim() } catch { return '' }
  }, [])
  const allowedLocations = useMemo(() => {
    if (!authBranch) return defaultLocations
    const norm = normalizeLocation(authBranch)
    return defaultLocations.filter(l => normalizeLocation(l.name) === norm)
  }, [authBranch])
  useEffect(() => {
    if (!selectedLocation && allowedLocations.length > 0) {
      setSelectedLocation(allowedLocations[0].name)
    }
  }, [allowedLocations, selectedLocation])

  const recomputeTotals = (rec)=>{
    const amount = Math.max(0, Number(rec.Amount)||0)
    const gst = Number((amount * 0.18).toFixed(2))
    return { ...rec, GST: gst, Total: (amount+gst).toFixed(2) }
  }

  const shortOf = (loc)=> defaultLocations.find(l=>l.name===(loc==='PCMC'?'Pune':loc))?.shortForm || 'SNGL'

  const toKey = (rec)=> `DVM-${shortOf(rec.Location)}-${yearPairForRecord(rec)}-${rec.RefNo}`

  const requiredFields = useMemo(() => ([
    'Month','OfficeNo','VisitDate','ReportDate','TechnicalExecutive','Bank','Branch','ClientName','ClientContactNo','Locations','CaseInitiated','Engineer'
  ]), [])
  const isRecordComplete = useCallback((rec) => {
    if (!rec) return false
    return requiredFields.every(f => String(rec[f] ?? '').trim() !== '')
  }, [requiredFields])

  const delCheckFields = useMemo(()=> ([
    'Month','VisitDate','ReportDate','TechnicalExecutive','Bank','Branch','ClientName','ClientContactNo','Locations','CaseInitiated','Engineer','ReportStatus','BillStatus','ReceivedOn','RecdDate','GSTNo','Remark','Amount','SoftCopy','Print','VisitStatus'
  ]), [])
  const isBlankForDelete = useCallback((rec)=>{
    if(!rec) return false
    return delCheckFields.every(f => {
      const v = rec[f]
      if (typeof v === 'boolean') return v === false
      if (f === 'GST') return v === 0 || String(v ?? '').trim() === ''
      return String(v ?? '').trim() === ''
    })
  },[delCheckFields])

  const getMissingFields = useCallback((rec) => {
    const set = new Set()
    requiredFields.forEach(f => { if (String(rec[f] ?? '').trim() === '') set.add(f) })
    const digits = String(rec.ClientContactNo ?? '').replace(/\D/g,'')
    if (digits.length !== 10) set.add('ClientContactNo')
    return set
  }, [requiredFields])
  const [validationMap, setValidationMap] = useState({})

  const formatRefDisplay = useCallback((rec)=>{
    if (!rec || !isRecordComplete(rec) || !rec.RefNo) return ''
    const yp = yearPairForRecord(rec)
    const loc = rec.Location==='PCMC'?'Pune':rec.Location
    const short = shortOf(loc)
    const num = String(rec.RefNo).toString().padStart(3,'0')
    return `DVM/${short}/${yp}_${num}`
  },[yearPairForRecord, isRecordComplete])

  useEffect(()=>{
    const unsub = onValue(ref(db,'excel_records'),(snap)=>{
      const data = snap.val()||{}
      const out=[]
      Object.keys(data).forEach(k=>{
        const m=k.match(/^DVM-([A-Z]{3,5})-(\d{2}-\d{2})-(\d{3})$/)
        if(!m) return
        const sf=m[1]; const refNo=m[3]
        let location = codeToNameMap[sf] || data[k].Location || 'Unknown'
        if(location==='PCMC') location='Pune'
        const base = {
          Sr: (data[k].Sr?.toString())||'1', globalSr:'', OfficeNo: data[k].OfficeNo||'', RefNo: refNo,
          Month: data[k].Month||'', VisitDate: data[k].VisitDate||'', ReportDate: data[k].ReportDate||'',
          TechnicalExecutive: data[k].TechnicalExecutive||'', Bank: data[k].Bank||'', Branch: data[k].Branch||'',
          ClientName: data[k].ClientName||'', ClientContactNo: data[k].ClientContactNo||'', Locations: data[k].Locations||'',
          Location: location, CaseInitiated: data[k].CaseInitiated||'', Engineer: data[k].Engineer||'', VisitStatus: !!data[k].VisitStatus,
          ReportStatus: data[k].ReportStatus||'', SoftCopy: !!data[k].SoftCopy, Print: !!data[k].Print,
          Amount: Math.max(0, Number(data[k].Amount)||0), GST: Number(data[k].GST)||0, BillStatus: data[k].BillStatus||'',
          ReceivedOn: data[k].ReceivedOn||'', RecdDate: data[k].RecdDate||'', GSTNo: data[k].GSTNo||'', Remark: data[k].Remark||''
        }
        out.push(recomputeTotals(base))
      })
      const allowedSet = new Set(allowedLocations.map(l => normalizeLocation(l.name)))
      const filteredOut = out.filter(r => allowedSet.has(normalizeLocation(r.Location)))
      const sorted = filteredOut.sort((a,b)=> a.Location.localeCompare(b.Location) || parseInt(a.RefNo)-parseInt(b.RefNo))
      setRecords(sorted.map((r,i)=>({...r,globalIndex:i})))
      setIsLoading(false)
    },(e)=>{ console.error(e); setIsLoading(false) })
    return ()=>unsub()
  },[allowedLocations])
  const generateRefNo = useCallback(async()=>{
    const snap = await get(ref(db,'excel_records'))
    const keys = Object.keys(snap.val()||{})
    const re = new RegExp(`-${yearPair}-(\\d{3})$`)
    const nums = keys.map(k=>{ const m=k.match(re); return m?parseInt(m[1],10):null }).filter(n=>n!=null).sort((a,b)=>a-b)
    let n=1; while(nums.includes(n) && n<=999) n++
    return n.toString().padStart(3,'0')
  },[yearPair])
  const getNextRefNoForYP = useCallback(async(yp)=>{
    const snap = await get(ref(db,'excel_records'))
    const keys = Object.keys(snap.val()||{})
    const used = new Set()
    const re = new RegExp(`-(${yp})-(\\d{3})$`)
    keys.forEach(k=>{ const m=k.match(re); if(m){ used.add(parseInt(m[2],10)) } })
    // include numbers already in local state for same year pair
    records.forEach(r=>{ const y = yearPairForRecord(r); if(y===yp){ const n=parseInt(r.RefNo,10); if(!isNaN(n)) used.add(n) } })
    let n=1; while(used.has(n)) n++
    return n.toString().padStart(3,'0')
  },[records, yearPairForRecord])

  const assignRefNoImmediate = useCallback(async(gi, yp)=>{
    try{
      const nextNo = await getNextRefNoForYP(yp)
      setRecords(prev=>{
        if(gi<0||gi>=prev.length) return prev
        const next=[...prev]
        const rec = next[gi]
        // re-validate row is still complete and RefNo empty and YP unchanged
        if(isRecordComplete(rec) && !rec.RefNo && yearPairForRecord(rec)===yp){
          next[gi] = { ...rec, RefNo: nextNo }
        }
        return next
      })
    }catch(e){ console.error('assignRefNoImmediate failed', e) }
  },[getNextRefNoForYP, isRecordComplete, yearPairForRecord])

  const handleDeleteByOffice = useCallback((officeNo, sr)=>{
    if(!officeNo) return
    setRecords(prev=> {
      // Filter out the deleted row
      const filtered = prev.filter(r=> !(r.OfficeNo === officeNo && String(r.Sr) === String(sr)))
      // Renumber the remaining rows
      return filtered.map((r, i) => ({
        ...r,
        Sr: (i + 1).toString(),
        globalIndex: i
      }))
    })
  },[])

  const onChangeField = useCallback((gi,field,value)=>{
    let assignInfo = null
    let validationUpdate = null
    setRecords(prev=>{
      if(gi<0||gi>=prev.length) return prev
      const next=[...prev]
      let rec={...next[gi]}
      if(field==='Amount'){
        if(value===''){ rec.Amount='' }
        else {
          const n = Number(value)
          rec.Amount = isNaN(n) ? '' : Math.max(0, n)
        }
      }
      else if(field==='GST') rec.GST = value===''? '': Number(value)
      else rec[field]=value
      rec = recomputeTotals(rec)
      // Keep OfficeNo in sync with current Location and year pair when relevant fields change
      if(['Location','VisitDate','ReportDate'].includes(field)){
        const locName = rec.Location==='PCMC' ? 'Pune' : rec.Location
        const yp = yearPairForRecord(rec)
        rec.OfficeNo = `DVM/${shortOf(locName)}/${yp}`
      }
      next[gi]=rec
      // compute validation for this row
      const miss = getMissingFields(rec)
      validationUpdate = { gi, fields: Array.from(miss) }
      // If row has become complete and has no RefNo, schedule assignment
      if(isRecordComplete(rec) && !rec.RefNo){
        const yp = yearPairForRecord(rec)
        assignInfo = { gi, yp }
      }
      return next
    })
    if(validationUpdate){
      setValidationMap(prev=>{
        const next = { ...prev }
        if(validationUpdate.fields.length){ next[validationUpdate.gi] = validationUpdate.fields }
        else { delete next[validationUpdate.gi] }
        return next
      })
    }
    if(assignInfo){ assignRefNoImmediate(assignInfo.gi, assignInfo.yp) }
  },[assignRefNoImmediate, isRecordComplete, yearPairForRecord, getMissingFields])

  const handleAddRecord = useCallback(async(loc)=>{
    if(!loc){ alert('Select a location first.'); return }
    const actual = loc==='PCMC'?'Pune':loc
    const OfficeNo = `DVM/${shortOf(actual)}/${yearPair}`
    setRecords(prev=>{
      const sr = Math.max(0,...prev.filter(r=>r.Location===actual).map(r=>parseInt(r.Sr)||0))+1
      const newRec = recomputeTotals({ Sr: sr.toString(), globalSr:'', OfficeNo, RefNo: '', Month:'', VisitDate:'', ReportDate:'', TechnicalExecutive:'', Bank:'', Branch:'', ClientName:'', ClientContactNo:'', Locations:'', Location: actual, CaseInitiated:'', Engineer:'', VisitStatus:false, ReportStatus:'', SoftCopy:false, Print:false, Amount:'', GST:0, BillStatus:'', ReceivedOn:'', RecdDate:'', GSTNo:'', Remark:'' })
      const merged=[...prev,newRec].sort((a,b)=> a.Location.localeCompare(b.Location)||parseInt(a.Sr)-parseInt(b.Sr)).map((r,i)=>({...r,globalIndex:i}))
      return merged
    })
    setTimeout(()=>{ if(tableRef.current){ const last = tableRef.current.querySelector('tr:last-child'); last && last.scrollIntoView({behavior:'smooth',block:'center'})}},100)
  },[yearPair])

  const saveRecords = useCallback(async(recs)=>{
    const complete = recs.filter(isRecordComplete)
    if (!complete.length) return

    const snap = await get(ref(db,'excel_records'))
    const keys = Object.keys(snap.val()||{})
    const usedByYP = new Map()
    keys.forEach(k=>{
      const m = k.match(/^DVM-[A-Z]{3,5}-(\d{2}-\d{2})-(\d{3})$/)
      if(!m) return
      const yp = m[1]; const n = parseInt(m[2],10)
      if(!usedByYP.has(yp)) usedByYP.set(yp,new Set())
      usedByYP.get(yp).add(n)
    })
    // include numbers already present in local state
    records.forEach(r=>{
      const yp = yearPairForRecord(r)
      const n = parseInt(r.RefNo,10)
      if(!isNaN(n)){
        if(!usedByYP.has(yp)) usedByYP.set(yp,new Set())
        usedByYP.get(yp).add(n)
      }
    })

    const assignedInBatch = new Map()
    const enriched = complete.map(r=>{
      const yp = yearPairForRecord(r)
      const loc = r.Location==='PCMC'?'Pune':r.Location
      let refNoStr = r.RefNo
      if(!refNoStr){
        const s = usedByYP.get(yp) || new Set()
        const sb = assignedInBatch.get(yp) || new Set()
        let n = 1
        while(s.has(n) || sb.has(n)) n++
        refNoStr = n.toString().padStart(3,'0')
        sb.add(n); assignedInBatch.set(yp,sb)
      }
      const officeNo = `DVM/${shortOf(loc)}/${yp}`
      const amt = Math.max(0, Number(r.Amount)||0)
      const gst = Number((amt * 0.18).toFixed(2))
      return { ...r, RefNo: refNoStr, OfficeNo: officeNo, Amount: amt, GST: gst, Total: (amt+gst).toFixed(2), Location: loc }
    })

    // reflect newly assigned RefNo in local state before saving
    const updateMap = new Map()
    enriched.forEach(er=>{
      const orig = complete.find(x=>x.globalIndex===er.globalIndex)
      if(orig && !orig.RefNo && er.RefNo){ updateMap.set(er.globalIndex, er.RefNo) }
    })
    if(updateMap.size){
      setRecords(prev=> prev.map(p=> updateMap.has(p.globalIndex)? { ...p, RefNo: updateMap.get(p.globalIndex) } : p))
    }

    await Promise.all(enriched.map(async r=>{
      const key = toKey(r)
      await set(ref(db,`excel_records/${key}`), {
        ...r,
        VisitStatus: !!r.VisitStatus,
        SoftCopy: !!r.SoftCopy,
        Print: !!r.Print,
      })
    }))
  },[yearPairForRecord, records, isRecordComplete])

  const doSave = useCallback(async(recList)=>{
    // update validation highlights for provided records
    const updates = {}
    recList.forEach(r=>{
      const miss = getMissingFields(r)
      if(miss.size) updates[r.globalIndex] = Array.from(miss)
    })
    setValidationMap(prev=>{
      const next = { ...prev }
      // apply updates for the targeted records only
      recList.forEach(r=>{ if(updates[r.globalIndex]?.length) next[r.globalIndex] = updates[r.globalIndex]; else delete next[r.globalIndex] })
      return next
    })

    const complete = recList.filter(isRecordComplete)
    const count = complete.length
    if(count===0){ setSnack({open:true,message:'Please fill all required fields to generate Ref No',type:'error'}); return }
    setIsSaving(true)
    try{ await saveRecords(recList); setSnack({open:true,message:`Saved ${count} record(s)`,type:'success'}) }
    catch(e){ console.error(e); setSnack({open:true,message:'Save failed',type:'error'}) }
    finally{ setIsSaving(false) }
  },[saveRecords, isRecordComplete, getMissingFields])

  const handleSaveAll = useCallback(()=>{
    setConfirmState({ open: true, scope: 'all', rowIndex: null })
  },[])

  const handleSaveRow = useCallback((gi)=>{
    setConfirmState({ open: true, scope: 'row', rowIndex: gi })
  },[])

  const filtered = useMemo(()=> {
    const base = records.filter(r=> !selectedLocation || r.Location===selectedLocation)
    let arr = base.slice()
    if (sortBy==='pending' || sortBy==='credit'){
      const target = sortBy === 'pending' ? 'pending' : 'credit'
      arr = arr.filter(r => String(r.BillStatus||'').toLowerCase() === target)
    }
    arr.sort((a,b)=> a.Location.localeCompare(b.Location) || (parseInt(a.RefNo,10) - parseInt(b.RefNo,10)))
    return arr.map((r,i)=>({...r,globalIndex:i}))
  },[records,selectedLocation,sortBy])

  useEffect(()=>{
    const update = ()=>{
      const el = tableRef.current
      if(!el) return
      const thead = el.querySelector('thead')
      const row = el.querySelector('tbody tr')
      const headerH = thead ? thead.getBoundingClientRect().height : 44
      const rowH = row ? row.getBoundingClientRect().height : 44
      setScrollMaxHeight(Math.round(headerH + rowH * 10))
    }
    update()
    window.addEventListener('resize', update)
    return ()=> window.removeEventListener('resize', update)
  },[filtered.length])

  const groups = useMemo(()=>{
    if(!filtered.length) return []
    if(!selectedLocation && allowedLocations.length > 1){
      return [{ location:'All Locations', records: filtered.map((r,i)=>({...r,Sr:(i+1).toString()})) }]
    }
    const map = new Map()
    filtered.forEach(r=>{ if(!map.has(r.Location)) map.set(r.Location,[]); map.get(r.Location).push(r) })
    return Array.from(map.entries()).sort((a,b)=> a[0].localeCompare(b[0])).map(([location,records])=>({location,records}))
  },[filtered,selectedLocation,allowedLocations.length])

  const downloadFor = useCallback((loc)=>{
    const locRecs = records.filter(r=> loc==='All' ? true : r.Location===loc).sort((a,b)=> parseInt(a.RefNo)-parseInt(b.RefNo))
    const data = locRecs.map((r,i)=>({
      Sr: loc==='All'? (i+1).toString(): r.Sr,
      Month:r.Month, Office:r.OfficeNo, 'Ref No': formatRefDisplay(r), 'Visit Date': r.VisitDate||'', 'Report Date': r.ReportDate||'', 'Technical Executive': r.TechnicalExecutive||'', Bank:r.Bank, Branch:r.Branch, 'Client Name': r.ClientName, 'Client Contact No': r.ClientContactNo, Locations: r.Locations||'', 'Case Initiated': r.CaseInitiated||'', Engineer:r.Engineer||'', 'Visit Status': r.VisitStatus?'TRUE':'FALSE', 'Report Status': r.ReportStatus, 'Soft Copy': r.SoftCopy?'TRUE':'FALSE', Print: r.Print?'TRUE':'FALSE', Amount: Number(r.Amount)||0, GST: Number(r.GST)||0, Total: (Number(r.Amount)+Number(r.GST)).toFixed(2), 'Bill Status': r.BillStatus||'', 'Received On': r.ReceivedOn, 'Recd Date': r.RecdDate, 'GST No': r.GSTNo||'', Remark: r.Remark, Action:''
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Bank Visits');
    XLSX.writeFile(wb, `Excel_Records_${loc}.xlsx`)
  },[records])

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 ">
      <div className="w-full flex justify-end mb-6 md:mb-8">
        <div className="flex items-center gap-2 text-base md:text-base text-gray-700 whitespace-nowrap border border-gray-300 rounded-full px-4 py-1.5 bg-white">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-600" aria-hidden="true"></span>
          <span className="font-bold">Branch:</span> <span className="text-indigo-700">{selectedLocation || '—'}</span>
        </div>
      </div>
      <h1 className="text-4xl font-bold text-gray-800 text-center mb-4">Excel Sheets</h1>
      {isLoading && <p className="text-center text-gray-600">Loading data from Firebase...</p>}
      {!isLoading && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold text-gray-800">{selectedLocation} ({filtered.length} records)</h3>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e)=>setSortBy(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                title="Filter by Bill Status"
                aria-label="Filter by Bill Status"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="credit">Credit</option>
              </select>
              <button
                type="button"
                title="Download"
                aria-label="Download"
                onClick={()=>downloadFor(selectedLocation || 'All')}
                className="p-3 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <FiDownload className="text-xl" />
              </button>
              <button
                type="button"
                title="Add Data"
                onClick={()=>handleAddRecord(selectedLocation)}
                disabled={!selectedLocation}
                className={`px-4 py-2.5 rounded-md text-base flex items-center gap-2 ${!selectedLocation ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
              >
                <FiPlus className="text-xl" />
                <span className="hidden sm:inline">Add Data</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto bg-white rounded-lg border border-gray-200 shadow-sm" ref={tableRef} style={{ maxHeight: scrollMaxHeight ? `${scrollMaxHeight}px` : undefined }}>
            <table className="w-full border-collapse text-sm">
              <thead className="bg-indigo-600 text-white sticky top-0 z-10">
                <tr>
                  {headers.map(h=> (
                    <th key={h} className={`px-2 py-3 text-center font-bold border border-gray-200 whitespace-nowrap ${minw(h)}`}>
                      {h==='Sr'?'Sr No'
                        : h==='Month'?'Month'
                        : h==='OfficeNo'?'Office'
                        : h==='RefNo'?'Ref No'
                        : h==='VisitDate'?'Visit Date'
                        : h==='ReportDate'?'Report Date'
                        : h==='TechnicalExecutive'?'Technical Executive'
                        : h==='Bank'?'Bank'
                        : h==='Branch'?'Branch'
                        : h==='ClientName'?'Client Name'
                        : h==='ClientContactNo'?'Contact'
                        : h==='Locations'?'Location'
                        : h==='CaseInitiated'?'Case Initiated'
                        : h==='Engineer'?'Engineer'
                        : h==='VisitStatus'?'Visit Status'
                        : h==='ReportStatus'?'Case Report Status'
                        : h==='SoftCopy'?'Soft Copy'
                        : h==='Print'?'Print'
                        : h==='Amount'?'Amount'
                        : h==='GST'?'GST'
                        : h==='Total'?'Total'
                        : h==='BillStatus'?'Bill Status'
                        : h==='ReceivedOn'?'Received On'
                        : h==='RecdDate'?'Received Date'
                        : h==='GSTNo'?'GST No'
                        : h==='Remark'?'Remark'
                        : h==='Action'?'Actions'
                        : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length ? (
                  filtered.map((rec,idx)=> {
                    const showDelete = isBlankForDelete(rec)
                    return (
                      <TableRow
                        key={`row-${rec.globalIndex}`}
                        record={rec}
                        index={idx}
                        onChangeField={onChangeField}
                        onSaveRow={handleSaveRow}
                        groupRecords={filtered}
                        dropdownOptions={uiOptions}
                        formatRef={formatRefDisplay}
                        missingFields={new Set(validationMap[rec.globalIndex] || [])}
                        showDelete={showDelete}
                        onDeleteRow={handleDeleteByOffice}
                      />
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={headers.length} className="px-4 py-6 text-center text-gray-600">
                      No records found{selectedLocation?` for ${selectedLocation}`:''}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="text-center p-2">
              <button onClick={handleSaveAll} disabled={isSaving||isLoading} className={`px-4 py-2 rounded-md text-sm ${isSaving||isLoading?'bg-gray-300 text-gray-600 cursor-not-allowed':'bg-amber-600 text-white hover:bg-amber-700'}`}>{isSaving?'Saving...':'Save All'}</button>
            </div>
          </div>
          {confirmState.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Confirm Save</h3>
                <p className="text-gray-600 mb-4">{confirmState.scope==='all' ? 'Save all records to Firebase?' : 'Save this row to Firebase?'}</p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={()=> setConfirmState({ open:false, scope:'', rowIndex:null })}
                    className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
                  >Cancel</button>
                  <button
                    onClick={()=>{ const recs = confirmState.scope==='all' ? records : [records[confirmState.rowIndex]]; setConfirmState({ open:false, scope:'', rowIndex:null }); doSave(recs) }}
                    className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                  >Save</button>
                </div>
              </div>
            </div>
          )}
          <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-md shadow transition ${snack.open?'opacity-100 translate-y-0':'opacity-0 -translate-y-2 pointer-events-none'} ${snack.type==='success'?'bg-green-600 text-white':'bg-red-600 text-white'}`} role="alert" aria-live="polite">
            <div className="flex items-center gap-3">
              <span className="font-medium">{snack.message}</span>
              {snack.type==='success' && (
                <button onClick={()=>setSnack(s=>({...s,open:false}))} className="p-1 rounded hover:bg-white/10 focus:outline-none" aria-label="Close">
                  <FiX className="text-white text-lg" />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Excel
