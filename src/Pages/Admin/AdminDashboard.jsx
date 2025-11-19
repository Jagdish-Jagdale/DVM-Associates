import React, { useState, useEffect } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../../../firebase.js'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { FiDatabase, FiAlertTriangle } from 'react-icons/fi'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

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

const allMonths = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const abbrMonths = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

// Normalize location names for consistent comparison
const normalizeLocation = (name) => {
  if (!name) return ''
  const s = String(name).toLowerCase().trim()
  return s === 'pcmc' ? 'pune' : s
}

// Normalize a record's month into a full month name from allMonths.
// Priority: derive from VisitDate/ReportDate if present; else parse Month field (abbr or numeric).
const normalizeMonth = (monthStr, dateStr) => {
  // From dateStr (expects yyyy-mm-dd or ISO)
  if (dateStr) {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return allMonths[d.getMonth()]
  }
  if (!monthStr) return 'Unknown'
  const s = String(monthStr).trim().toLowerCase()
  // Look for month name/abbr anywhere in the string
  const nameMap = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sept: 8, sep: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  }
  for (const key of Object.keys(nameMap)) {
    if (s.includes(key)) return allMonths[nameMap[key]]
  }
  // Try numeric month within the string
  const m = s.match(/(?:^|\D)(1[0-2]|0?[1-9])(?!\d)/)
  if (m) {
    const idx = parseInt(m[1], 10) - 1
    if (idx >= 0 && idx < 12) return allMonths[idx]
  }
  return 'Unknown'
}

const Admin = () => {
  const [stats, setStats] = useState({
    totalRecords: 0,
    cancelCount: 0,
    locationCounts: {},
    locationCancelCounts: {},
    monthCounts: {},
    monthCancelCounts: {},
  })

  const [selectedMonth, setSelectedMonth] = useState('All')
  const [selectedYear, setSelectedYear] = useState('')

  useEffect(() => {
    const bankVisitsRef = ref(db, 'excel_records')
    const unsubscribe = onValue(bankVisitsRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        setStats({ totalRecords: 0, cancelCount: 0, locationCounts: {}, locationCancelCounts: {}, monthCounts: {}, monthCancelCounts: {} })
        return
      }

      const records = Object.values(data).map((record) => ({
        ...record,
        // Normalize PCMC to Pune; keep original otherwise
        Location: record.Location === 'PCMC' ? 'Pune' : (record.Location || 'Unknown'),
        ReportStatus: record.ReportStatus || '',
        Month: record.Month || 'Unknown',
        VisitDate: record.VisitDate || '',
      }))

      // Read the authenticated branch (if set) and filter records to that branch only
      let authBranch = ''
      try {
        authBranch = (localStorage.getItem('authBranch') || sessionStorage.getItem('authBranch') || '').trim()
      } catch {}
      const normBranch = normalizeLocation(authBranch)
      const branchFiltered = normBranch
        ? records.filter(r => normalizeLocation(r.Location) === normBranch)
        : records

      const filtered = branchFiltered.filter((r) => {
        const dateForMonth = r.VisitDate || r.ReportDate || ''
        const recordMonth = normalizeMonth(r.Month, dateForMonth)
        const dateForYear = r.VisitDate || r.ReportDate
        const recordYear = dateForYear ? new Date(dateForYear).getFullYear().toString() : 'Unknown'
        const matchMonth = selectedMonth === 'All' || recordMonth === selectedMonth
        const matchYear = !selectedYear || recordYear === selectedYear
        return matchMonth && matchYear
      })

      const totalRecords = filtered.length
      const cancelCount = filtered.filter((r) => r.ReportStatus === 'Case Cancel').length

      const locationCounts = filtered.reduce((acc, r) => {
        acc[r.Location] = (acc[r.Location] || 0) + 1
        return acc
      }, {})

      const locationCancelCounts = filtered.reduce((acc, r) => {
        if (r.ReportStatus === 'Case Cancel') {
          acc[r.Location] = (acc[r.Location] || 0) + 1
        }
        return acc
      }, {})

      const monthCounts = filtered.reduce((acc, r) => {
        const m = normalizeMonth(r.Month, r.VisitDate || r.ReportDate)
        acc[m] = (acc[m] || 0) + 1
        return acc
      }, {})

      const monthCancelCounts = filtered.reduce((acc, r) => {
        if (r.ReportStatus === 'Case Cancel') {
          const m = normalizeMonth(r.Month, r.VisitDate || r.ReportDate)
          acc[m] = (acc[m] || 0) + 1
        }
        return acc
      }, {})

      setStats({
        totalRecords,
        cancelCount,
        locationCounts,
        locationCancelCounts,
        monthCounts,
        monthCancelCounts,
      })
    })

    return () => unsubscribe()
  }, [selectedMonth, selectedYear])

  const chartData = {
    labels: abbrMonths,
    datasets: [
      {
        label: 'Total Records',
        data: allMonths.map((m) => stats.monthCounts[m] || 0),
        backgroundColor: 'rgba(124, 58, 237, 0.6)',
      },
      {
        label: 'Canceled Cases',
        data: allMonths.map((m) => stats.monthCancelCounts[m] || 0),
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Total and Canceled Records by Month',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: 10,
        ticks: {
          stepSize: 1,
          precision: 0,
        },
      },
    },
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] p-4 flex justify-center">
      <div className="w-full max-w-6xl">
        {/* Header with title and filters */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-4xl font-bold text-gray-800">Dashboard</h2>
          <div className="flex items-center gap-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded px-4 py-2 text-base bg-white outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="All">All Months</option>
              {allMonths.map((month, idx) => (
                <option key={month} value={month}>
                  {abbrMonths[idx]}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="border border-gray-300 rounded px-4 py-2 text-base bg-white outline-none w-28 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">Total Records</h3>
              <p className="text-3xl font-bold text-purple-600">{stats.totalRecords}</p>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <FiDatabase className="text-purple-600" size={28} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">Canceled Cases</h3>
              <p className="text-3xl font-bold text-red-500">{stats.cancelCount}</p>
            </div>
            <div className="p-3 rounded-full bg-red-100">
              <FiAlertTriangle className="text-red-500" size={28} />
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="relative h-80 md:h-[28rem]">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Admin
