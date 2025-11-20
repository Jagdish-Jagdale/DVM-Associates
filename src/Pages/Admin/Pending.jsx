import React, { useEffect, useMemo, useState, memo, useCallback } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../../../firebase.js'
import * as XLSX from 'xlsx'
import { FiDownload } from 'react-icons/fi'
import PageHeader from '../../Components/UI/PageHeader.jsx'
import SearchActionsCard from '../../Components/UI/SearchActionsCard.jsx'

const locationBgClass = (loc) => {
  switch (loc) {
    case 'Sangli': return 'bg-purple-50'
    case 'Belgaum': return 'bg-green-50'
    case 'Kolhapur': return 'bg-blue-50'
    case 'Pune': return 'bg-yellow-50'
    case 'Bengaluru': return 'bg-orange-50'
    case 'Mumbai': return 'bg-red-50'
    case 'Hyderabad': return 'bg-teal-50'
    case 'Indore': return 'bg-pink-50'
    case 'Satara': return 'bg-indigo-50'
    default: return 'bg-white'
  }
}

const minw = (h) => {
  switch (h) {
    case 'RefNo': return 'min-w-[180px]'
    case 'OfficeNo': return 'min-w-[150px]'
    case 'ClientName': return 'min-w-[150px]'
    case 'Remark': return 'min-w-[200px]'
    case 'VisitDate':
    case 'ReportDate':
    case 'RecdDate': return 'min-w-[120px]'
    default: return 'min-w-[80px]'
  }
}

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
  if (m) return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m[1],10)-1]
  return s.slice(0,1).toUpperCase()+s.slice(1,3).toLowerCase()
}

const locShortMap = { Sangli:'SNGL', Belgaum:'BGM', Kolhapur:'KOP', Pune:'PUNE', Bengaluru:'BLR', Mumbai:'MUM', Hyderabad:'HYD', Indore:'INDR', Satara:'STR' }
const shortOf = (loc)=> locShortMap[loc] || 'SNGL'
const getYearPair = (d = new Date()) => {
  const y = d.getFullYear() % 100
  const next = (y + 1) % 100
  const f = (n) => n.toString().padStart(2,'0')
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

const TableRow = memo(({ record, index, handleInputChange, headers, formatRef }) => {
  const [localRecord, setLocalRecord] = useState(record)

  useEffect(() => { setLocalRecord(record) }, [record])

  const onChange = (field, value) => {
    setLocalRecord((prev) => ({ ...prev, [field]: value }))
    handleInputChange(record.globalIndex, field, value)
  }

  return (
    <tr key={`${record.RefNo}-${index}`} className={`${locationBgClass(record.Location)}`}>
      {headers.map((field) => (
        <td key={field} className={`p-2 border border-gray-300 align-top ${minw(field)}`}>
          {(field === 'SoftCopy' || field === 'Print' || field==='VisitStatus') ? (
            <input
              type="checkbox"
              id={`checkbox-${field}-${record.globalIndex}`}
              name={field}
              checked={!!localRecord[field]}
              onChange={(e) => onChange(field, e.target.checked)}
              className="h-4 w-4"
              disabled
            />
          ) : (field === 'RefNo') ? (
            <input
              type="text"
              id={`text-${field}-${record.globalIndex}`}
              name={field}
              value={typeof formatRef==='function' ? formatRef(localRecord) : (localRecord[field]||'')}
              readOnly
              className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
            />
          ) : (field === 'OfficeNo') ? (
            <input
              type="text"
              id={`text-${field}-${record.globalIndex}`}
              name={field}
              value={(localRecord.Location==='PCMC'?'Pune':localRecord.Location) || ''}
              readOnly
              className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
            />
          ) : (field === 'Sr') ? (
            (() => {
              const reserved = !!localRecord.reservedFirst
              const anyData = [
                localRecord.Month, localRecord.VisitDate, localRecord.ReportDate, localRecord.TechnicalExecutive,
                localRecord.Bank, localRecord.Branch, localRecord.ClientName, localRecord.ClientContactNo,
                localRecord.Locations, localRecord.CaseInitiated, localRecord.Engineer, localRecord.ReportStatus,
                localRecord.BillStatus, localRecord.ReceivedOn, localRecord.RecdDate, localRecord.GSTNo,
                localRecord.Remark, localRecord.Amount, localRecord.GST, localRecord.Total,
                localRecord.SoftCopy, localRecord.Print, localRecord.VisitStatus
              ].some(v => {
                if (typeof v === 'boolean') return v
                if (v === 0) return true
                return String(v ?? '').trim() !== ''
              })
              const borderCls = reserved ? (anyData ? 'border-green-500' : 'border-red-500') : ''
              const titleText = reserved ? (anyData ? 'Reserved row saved' : 'Reserved row not saved') : ''
              return (
                <div className={`relative ${borderCls ? 'border-l-[3px] rounded-l ' + borderCls : ''}`} title={titleText}>
                  <input
                    type="text"
                    id={`text-${field}-${record.globalIndex}`}
                    name={field}
                    value={String((index + 1))}
                    readOnly
                    className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100 text-center`}
                  />
                </div>
              )
            })()
          ) : (field === 'Month') ? (
            <input
              type="text"
              id={`text-${field}-${record.globalIndex}`}
              name={field}
              value={monthAbbrFromAny(localRecord[field])}
              readOnly
              className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
            />
          ) : (['Amount', 'GST', 'Total'].includes(field)) ? (
            <input
              type="number"
              id={`number-${field}-${record.globalIndex}`}
              name={field}
              value={localRecord[field] ?? ''}
              onChange={(e) => onChange(field, e.target.value === '' ? '' : Number(e.target.value))}
              readOnly
              className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
            />
          ) : (
            <input
              type="text"
              id={`text-${field}-${record.globalIndex}`}
              name={field}
              value={localRecord[field] || ''}
              onChange={(e) => onChange(field, e.target.value)}
              readOnly
              className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
            />
          )}
        </td>
      ))}
    </tr>
  )
})

const Pending = () => {
  const [allRecords, setAllRecords] = useState([])
  const [pendingRecords, setPendingRecords] = useState([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [billFilter, setBillFilter] = useState('all')

  const defaultLocations = [
    { name: 'Sangli' },
    { name: 'Belgaum' },
    { name: 'Kolhapur' },
    { name: 'Pune' },
    { name: 'Bengaluru' },
    { name: 'Mumbai' },
    { name: 'Hyderabad' },
    { name: 'Indore' },
    { name: 'Satara' },
  ]

  const normalizeLocation = (name) => {
    if (!name) return ''
    const s = String(name).toLowerCase().trim()
    return s === 'pcmc' ? 'pune' : s
  }

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

  const dropdownOptions = useMemo(() => ({
    Bank: ['Ajinkya Sahakari', 'BOB', 'BOI', 'BOM', 'Buldhana Urban', 'CBI', 'Cosmos', 'DCC', 'Fabtech', 'PNB', 'Private', 'RBC', 'SBI', 'Shriram', 'UBI', 'Vidarbh Kokan'].sort(),
    Branch: ['Amarai road Sangli', 'Amrai Road', 'Atpadi', 'Chandani Chouk', 'Chinchani', 'Civil Hospital', 'Clg Corner', 'College Corner', 'Gaonbhag', 'Jawala', 'Jaysingpur', 'K.Piran', 'Karad', 'Kavathe ekand', 'Kavathe Mahankal', 'Khanapur', 'Kolhapur Rd', 'Langare', 'Lengare', 'Madhavnagar', 'Main Sangli', 'Majarde', 'Maruti Road', 'Mhaishal', 'Miraj', 'Nelkaranje', 'Patel Chowk', 'Peth', 'Sangli', 'Savlaj', 'Tasgaon', 'Thane', 'Udyog bhavan', 'Vishrambag', 'Vita', 'Zare', 'patel chowk Sangli', 'vishrambag, Sangli'].sort(),
    TechnicalExecutive: ['AA', 'SK', 'SM'].sort()
  }), [])

  const headers = [
    'Sr','Month','OfficeNo','RefNo','VisitDate','ReportDate','TechnicalExecutive','Bank','Branch','ClientName','ClientContactNo','Locations','CaseInitiated','Engineer','VisitStatus','ReportStatus','SoftCopy','Print','Amount','GST','Total','BillStatus','ReceivedOn','RecdDate','GSTNo','Remark'
  ]

  const recomputeTotals = (rec) => ({ ...rec, Total: Number(rec.Amount || 0) + Number(rec.GST || 0) })

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'excel_records'), (snapshot) => {
      const data = snapshot.val() || {}
      const out = []
      Object.keys(data).forEach((key) => {
        const rec = data[key] || {}
        const loc = (rec.Location === 'PCMC' ? 'Pune' : rec.Location) || 'Unknown'
        const m = key.match(/-25-26-(\d{3})$/)
        const refNo = rec.RefNo || (m ? m[1] : key)
        const base = {
          RefNo: refNo,
          Month: rec.Month || '',
          OfficeNo: rec.OfficeNo || '',
          VisitDate: rec.VisitDate || '',
          ReportDate: rec.ReportDate || '',
          TechnicalExecutive: rec.TechnicalExecutive || '',
          Bank: rec.Bank || '',
          Branch: rec.Branch || '',
          ClientName: rec.ClientName || '',
          ClientContactNo: rec.ClientContactNo || '',
          Locations: rec.Locations || '',
          CaseInitiated: rec.CaseInitiated || '',
          Engineer: rec.Engineer || '',
          VisitStatus: !!rec.VisitStatus,
          ReportStatus: rec.ReportStatus || '',
          SoftCopy: !!rec.SoftCopy,
          Print: !!rec.Print,
          Amount: Number(rec.Amount) || 0,
          GST: Number(rec.GST) || 0,
          Total: Number(rec.Total) || ((Number(rec.Amount) || 0) + (Number(rec.GST) || 0)),
          BillStatus: rec.BillStatus || '',
          ReceivedOn: rec.ReceivedOn || '',
          RecdDate: rec.RecdDate || '',
          GSTNo: rec.GSTNo || '',
          Remark: rec.Remark || '',
          Location: loc,
          reservedFirst: !!rec.reservedFirst,
        }
        out.push(base)
      })
      const allowedSet = new Set(allowedLocations.map(l => normalizeLocation(l.name)))
      const filtered = out.filter(r => allowedSet.has(normalizeLocation(r.Location)))
      const sorted = filtered.sort((a, b) => parseInt(a.RefNo, 10) - parseInt(b.RefNo, 10))
      setAllRecords(sorted)
      setIsLoading(false)
    }, (error) => {
      console.error('Error fetching pending data:', error)
      alert(`Error fetching pending tasks: ${error.message}`)
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [allowedLocations])

  const formatRefDisplay = useCallback((rec)=>{
    if(!rec) return ''
    const yp = yearPairFromOffice(rec.OfficeNo) || yearPairFromDate(rec.VisitDate || rec.ReportDate) || ''
    if(!rec.RefNo || !yp) return rec.RefNo || ''
    const loc = rec.Location==='PCMC'?'Pune':rec.Location
    const num = String(rec.RefNo).toString().padStart(3,'0')
    return `DVM/${shortOf(loc)}/${yp}_${num}`
  },[])

  useEffect(() => {
    let filteredRecords = allRecords
    if (selectedLocation) {
      filteredRecords = filteredRecords.filter(record => record.Location === selectedLocation)
    }
    filteredRecords = filteredRecords.filter(r => String(r.BillStatus || '').toLowerCase() === 'pending')
    setPendingRecords(filteredRecords.map((record, index) => ({ ...record, globalIndex: index })))
  }, [selectedLocation, allRecords])

  const handleInputChange = (globalIndex, field, value) => {
    const updated = [...pendingRecords]
    if (globalIndex < 0 || globalIndex >= updated.length) return
    let rec = { ...updated[globalIndex], [field]: value }
    if (field === 'Amount' || field === 'GST') rec = recomputeTotals(rec)
    updated[globalIndex] = rec
    setPendingRecords(updated)
  }

  const handleDownloadPending = () => {
    const data = pendingRecords.map(record => ({
      'Ref.No': record.RefNo,
      Month: record.Month,
      'Technical Executive': record.TechnicalExecutive,
      Bank: record.Bank,
      Branch: record.Branch,
      'Client Name': record.ClientName,
      'Client Contact No': record.ClientContactNo,
      'Soft Copy': record.SoftCopy ? 'TRUE' : 'FALSE',
      Print: record.Print ? 'TRUE' : 'FALSE',
      Amount: record.Amount,
      GST: record.GST,
      'GST No': record.GSTNo,
      Total: record.Total,
      Remark: record.Remark
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [
      { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 20 },
      { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 40 }
    ]
    const hidden = XLSX.utils.aoa_to_sheet([
      dropdownOptions.Bank,
      dropdownOptions.Branch,
      dropdownOptions.TechnicalExecutive
    ].reduce((acc, curr) => {
      curr.forEach((item, i) => {
        acc[i] = acc[i] || []
        acc[i].push(item)
      })
      return acc
    }, []))
    hidden['!hidden'] = true
    XLSX.utils.book_append_sheet(wb, ws, 'Pending Tasks')
    XLSX.utils.book_append_sheet(wb, hidden, 'HiddenSheet')
    const fileName = `Pending_Records_${selectedLocation || 'All'}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6">
      <PageHeader title="Pending List" subtitle="View and export pending records. Use filters to refine results." />
      {isLoading && <p className="text-center text-gray-600">Loading data from Firebase...</p>}

      {!isLoading && (
        <>
          <SearchActionsCard
            title="Search & Actions"
            recordsCount={pendingRecords.length}
            rightPrimary={
              <button
                onClick={handleDownloadPending}
                className="px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-sm flex items-center gap-2"
                title="Download"
                aria-label="Download"
              >
                <span className="hidden sm:inline">Download</span>
                <FiDownload className="sm:hidden" />
              </button>
            }
          >
            <div>
              <select
                value={selectedLocation}
                onChange={(e)=> setSelectedLocation(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                title="Filter by Branch"
                aria-label="Filter by Branch"
              >
                <option value="">All Branches</option>
                {allowedLocations.map(l => (
                  <option key={l.name} value={l.name}>{l.name}</option>
                ))}
              </select>
            </div>
          </SearchActionsCard>

          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-indigo-600 text-white sticky top-0">
                <tr>
                  {headers.map((header) => (
                    <th
                      key={header}
                      className={`px-2 py-3 text-left font-semibold border border-gray-200 whitespace-nowrap ${minw(header)}`}
                    >
                      {header==='Sr'?'Sr No'
                        : header==='Month'?'Month'
                        : header==='OfficeNo'?'Office'
                        : header==='RefNo'?'Ref No'
                        : header==='VisitDate'?'Visit Date'
                        : header==='ReportDate'?'Report Date'
                        : header==='TechnicalExecutive'?'Technical Executive'
                        : header==='Bank'?'Bank'
                        : header==='Branch'?'Branch'
                        : header==='ClientName'?'Client Name'
                        : header==='ClientContactNo'?'Contact'
                        : header==='Locations'?'Location'
                        : header==='CaseInitiated'?'Case Initiated'
                        : header==='Engineer'?'Engineer'
                        : header==='VisitStatus'?'Visit Status'
                        : header==='ReportStatus'?'Case Report Status'
                        : header==='SoftCopy'?'Soft Copy'
                        : header==='Print'?'Print'
                        : header==='Amount'?'Amount'
                        : header==='GST'?'GST'
                        : header==='Total'?'Total'
                        : header==='BillStatus'?'Bill Status'
                        : header==='ReceivedOn'?'Received On'
                        : header==='RecdDate'?'Received Date'
                        : header==='GSTNo'?'GST No'
                        : header==='Remark'?'Remark'
                        : header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingRecords.length ? (
                  pendingRecords.map((record, index) => (
                    <TableRow
                      key={`${record.RefNo}-${index}`}
                      record={record}
                      index={index}
                      handleInputChange={handleInputChange}
                      headers={headers}
                      formatRef={formatRefDisplay}
                      dropdownOptions={dropdownOptions}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={headers.length} className="px-4 py-6 text-center text-gray-600">
                      No records found{selectedLocation ? ` for ${selectedLocation}` : ''}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default Pending
