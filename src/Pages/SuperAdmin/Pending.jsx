import React, { useEffect, useMemo, useState, memo } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../../../firebase.js'
import * as XLSX from 'xlsx'
import { FiDownload } from 'react-icons/fi'

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
    case 'RefNo': return 'min-w-[160px]'
    case 'OfficeNo': return 'min-w-[150px]'
    case 'VisitDate': return 'min-w-[120px]'
    case 'ReportDate': return 'min-w-[120px]'
    case 'ClientName': return 'min-w-[150px]'
    case 'ClientContactNo': return 'min-w-[120px]'
    case 'CaseInitiated': return 'min-w-[140px]'
    case 'Engineer': return 'min-w-[120px]'
    case 'ReceivedOn': return 'min-w-[140px]'
    case 'RecdDate': return 'min-w-[120px]'
    case 'GSTNo': return 'min-w-[140px]'
    case 'Remark': return 'min-w-[200px]'
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

const TableRow = memo(({ record, index, handleInputChange, dropdownOptions, headers, formatRef }) => {
  const [localRecord, setLocalRecord] = useState(record)

  useEffect(() => { setLocalRecord(record) }, [record])

  const onChange = (field, value) => {
    setLocalRecord((prev) => ({ ...prev, [field]: value }))
    handleInputChange(record.globalIndex, field, value)
  }

  return (
    <tr key={`${record.RefNo}-${index}`}>
      {headers.map((field) => (
        <td key={field} className={`p-2 border border-gray-300 align-top ${minw(field)}`}>
          {(field === 'SoftCopy' || field === 'Print' || field === 'VisitStatus') ? (
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
              value={typeof formatRef === 'function' ? formatRef(localRecord) : (localRecord[field] || '')}
              readOnly
              className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
            />
          ) : (field === 'OfficeNo') ? (
            <input
              type="text"
              id={`text-${field}-${record.globalIndex}`}
              name={field}
              value={(localRecord.Location === 'PCMC' ? 'Pune' : localRecord.Location) || ''}
              readOnly
              className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
            />
          ) : (field === 'Sr') ? (
            <input
              type="text"
              id={`text-${field}-${record.globalIndex}`}
              name={field}
              value={String(index + 1)}
              readOnly
              className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100 text-center`}
            />
          ) : (field === 'Month') ? (
            <input
              type="text"
              id={`text-${field}-${record.globalIndex}`}
              name={field}
              value={monthAbbrFromAny(localRecord[field])}
              readOnly
              className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
            />
          ) : (['TechnicalExecutive', 'Bank', 'Branch'].includes(field)) ? (
            <input
              type="text"
              id={`text-${field}-${record.globalIndex}`}
              name={field}
              value={localRecord[field] || ''}
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

  const dropdownOptions = useMemo(() => ({
    Bank: ['Ajinkya Sahakari', 'BOB', 'BOI', 'BOM', 'Buldhana Urban', 'CBI', 'Cosmos', 'DCC', 'Fabtech', 'PNB', 'Private', 'RBC', 'SBI', 'Shriram', 'UBI', 'Vidarbh Kokan'].sort(),
    Branch: ['Amarai road Sangli', 'Amrai Road', 'Atpadi', 'Chandani Chouk', 'Chinchani', 'Civil Hospital', 'Clg Corner', 'College Corner', 'Gaonbhag', 'Jawala', 'Jaysingpur', 'K.Piran', 'Karad', 'Kavathe ekand', 'Kavathe Mahankal', 'Khanapur', 'Kolhapur Rd', 'Langare', 'Lengare', 'Madhavnagar', 'Main Sangli', 'Majarde', 'Maruti Road', 'Mhaishal', 'Miraj', 'Nelkaranje', 'Patel Chowk', 'Peth', 'Sangli', 'Savlaj', 'Tasgaon', 'Thane', 'Udyog bhavan', 'Vishrambag', 'Vita', 'Zare', 'patel chowk Sangli', 'vishrambag, Sangli'].sort(),
    TechnicalExecutive: ['AA', 'SK', 'SM'].sort()
  }), [])

  const headers = [
    'Sr', 'Month', 'OfficeNo', 'RefNo', 'VisitDate', 'ReportDate', 'TechnicalExecutive', 'Bank', 'Branch',
    'ClientName', 'ClientContactNo', 'CaseInitiated', 'Engineer', 'VisitStatus', 'ReportStatus', 'SoftCopy', 'Print', 'Amount', 'GST', 'Total', 'BillStatus', 'ReceivedOn', 'RecdDate', 'GSTNo', 'Remark'
  ]

  const recomputeTotals = (rec) => ({ ...rec, Total: Number(rec.Amount || 0) + Number(rec.GST || 0) })

  const formatRefDisplay = (rec) => {
    const office = rec.OfficeNo || ''
    const ref = rec.RefNo || ''
    const num = String(ref).padStart(3, '0')
    if (office) return `${office}_${num}`
    return num
  }

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'excel_records'), (snapshot) => {
      const data = snapshot.val() || {}
      const out = []
      Object.keys(data).forEach((key) => {
        const rec = data[key] || {}
        const loc = (rec.Location === 'PCMC' ? 'Pune' : rec.Location) || 'Unknown'
        const m = key.match(/^DVM-([A-Z]{3,5})-(\d{2}-\d{2})-(\d{3})$/)
        const officeNo = rec.OfficeNo || (m ? `DVM/${m[1]}/${m[2]}` : '')
        const refNo = rec.RefNo || (m ? m[3] : key)
        const base = {
          Sr: (rec.Sr?.toString()) || '',
          Month: rec.Month || '',
          OfficeNo: officeNo,
          RefNo: refNo,
          VisitDate: rec.VisitDate || '',
          ReportDate: rec.ReportDate || '',
          TechnicalExecutive: rec.TechnicalExecutive || '',
          Bank: rec.Bank || '',
          Branch: rec.Branch || '',
          ClientName: rec.ClientName || '',
          ClientContactNo: rec.ClientContactNo || '',
          Locations: rec.Locations || loc,
          CaseInitiated: rec.CaseInitiated || '',
          Engineer: rec.Engineer || '',
          VisitStatus: !!rec.VisitStatus,
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
          ReportStatus: rec.ReportStatus || '',
        }
        out.push(base)
      })
      const allowedSet = new Set(defaultLocations.map(l => normalizeLocation(l.name)))
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
  }, [])

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
      'Sr': record.Sr,
      'Month': record.Month,
      'Office': (record.Location === 'PCMC' ? 'Pune' : record.Location),
      'RefNo': record.RefNo,
      'VisitDate': record.VisitDate,
      'ReportDate': record.ReportDate,
      'Technical Executive': record.TechnicalExecutive,
      'Bank': record.Bank,
      'Branch': record.Branch,
      'Client Name': record.ClientName,
      'Client Contact No': record.ClientContactNo,
      'Locations': record.Locations,
      'CaseInitiated': record.CaseInitiated,
      'Engineer': record.Engineer,
      'VisitStatus': record.VisitStatus ? 'TRUE' : 'FALSE',
      'ReportStatus': record.ReportStatus,
      'Soft Copy': record.SoftCopy ? 'TRUE' : 'FALSE',
      'Print': record.Print ? 'TRUE' : 'FALSE',
      'Amount': record.Amount,
      'GST': record.GST,
      'Total': record.Total,
      'BillStatus': record.BillStatus,
      'ReceivedOn': record.ReceivedOn,
      'RecdDate': record.RecdDate,
      'GSTNo': record.GSTNo,
      'Remark': record.Remark
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [
      { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 20 },
      { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 30 },
      { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 40 }
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Pending Tasks')
    const fileName = `Pending_Records_${selectedLocation || 'All'}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6">
      <div className="w-full flex justify-end mb-6 md:mb-8">
        <div className="flex items-center gap-2 text-base md:text-base text-gray-700 whitespace-nowrap border border-gray-300 rounded-full px-4 py-1.5 bg-white">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-600" aria-hidden="true"></span>
          <span className="font-bold">Branch:</span> <span className="text-indigo-700">{selectedLocation || 'All'}</span>
        </div>
      </div>

      <h2 className="text-4xl font-bold text-gray-800 mb-4 text-center">Pending List</h2>
      {isLoading && <p className="text-center text-gray-600">Loading data from Firebase...</p>}

      {!isLoading && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="text-xl font-bold text-gray-800">
              {selectedLocation || 'All Locations'} ({pendingRecords.length} records)
            </div>
            <button
              onClick={handleDownloadPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
            >
              <FiDownload className="text-base" />
              <span>Download</span>
            </button>
          </div>

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
                      dropdownOptions={dropdownOptions}
                      headers={headers}
                      formatRef={formatRefDisplay}
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
