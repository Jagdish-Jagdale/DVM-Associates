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
import { FiDatabase, FiAlertTriangle, FiClock } from 'react-icons/fi'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const allMonths = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const defaultBranches = ['Sangli','Belgaum','Kolhapur','Pune','Bengaluru','Mumbai','Hyderabad','Indore','Satara','Vijayapur']

const normalizeMonth = (monthStr, dateStr) => {
  if (dateStr) {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return allMonths[d.getMonth()]
  }
  if (!monthStr) return 'Unknown'
  const s = String(monthStr).trim().toLowerCase()
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
  const m = s.match(/(?:^|\D)(1[0-2]|0?[1-9])(?!\d)/)
  if (m) {
    const idx = parseInt(m[1], 10) - 1
    if (idx >= 0 && idx < 12) return allMonths[idx]
  }
  return 'Unknown'
}

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({
    totalRecords: 0,
    pendingCount: 0,
    cancelCount: 0,
    locationCounts: {},
    locationCancelCounts: {},
    locationPendingCounts: {},
    monthCounts: {},
    monthPendingCounts: {},
    monthCancelCounts: {},
  })

  const [selectedMonth, setSelectedMonth] = useState('All')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())

  useEffect(() => {
    const recordsRef = ref(db, 'excel_records')
    const unsubscribe = onValue(recordsRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        setStats({ totalRecords: 0, pendingCount: 0, cancelCount: 0, locationCounts: {}, locationCancelCounts: {}, locationPendingCounts: {}, monthCounts: {}, monthPendingCounts: {}, monthCancelCounts: {} })
        return
      }

      const records = Object.values(data).map((record) => ({
        ...record,
        Location: record.Location === 'PCMC' ? 'Pune' : (record.Location || 'Unknown'),
        ReportStatus: record.ReportStatus || '',
        BillStatus: record.BillStatus || '',
        Month: record.Month || 'Unknown',
        VisitDate: record.VisitDate || '',
      }))

      const filtered = records.filter((r) => {
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
      const pendingCount = filtered.filter((r) => r.BillStatus === 'Pending').length

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

      const locationPendingCounts = filtered.reduce((acc, r) => {
        if ((r.BillStatus || '') === 'Pending') {
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

      const monthPendingCounts = filtered.reduce((acc, r) => {
        if (r.BillStatus === 'Pending') {
          const m = normalizeMonth(r.Month, r.VisitDate || r.ReportDate)
          acc[m] = (acc[m] || 0) + 1
        }
        return acc
      }, {})

      setStats({
        totalRecords,
        pendingCount,
        cancelCount,
        locationCounts,
        locationCancelCounts,
        locationPendingCounts,
        monthCounts,
        monthPendingCounts,
        monthCancelCounts,
      })
    })

    return () => unsubscribe()
  }, [selectedMonth, selectedYear])

  const branchLabels = defaultBranches
  const chartData = {
    labels: branchLabels,
    datasets: [
      {
        label: 'Total Records',
        data: branchLabels.map((b) => stats.locationCounts[b] || 0),
        backgroundColor: 'rgba(124, 58, 237, 0.6)',
      },
      {
        label: 'Pending',
        data: branchLabels.map((b) => stats.locationPendingCounts[b] || 0),
        backgroundColor: 'rgba(245, 158, 11, 0.6)',
      },
      {
        label: 'Canceled Cases',
        data: branchLabels.map((b) => stats.locationCancelCounts[b] || 0),
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Total, Pending and Canceled Records by Branch' },
    },
    scales: {
      y: { beginAtZero: true, suggestedMax: 10, ticks: { stepSize: 1, precision: 0 } },
    },
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] p-4 flex justify-center">
      <div className="w-full max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-4xl font-bold text-gray-800">Super Admin Dashboard</h2>
          <div className="flex items-center gap-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded px-4 py-2 text-base bg-white outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="All">All Months</option>
              {allMonths.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Year"
              value={selectedYear}
              inputMode="numeric"
              maxLength={4}
              onChange={(e) => {
                const v = (e.target.value || '').replace(/\D/g, '').slice(0, 4)
                setSelectedYear(v)
              }}
              className="border border-gray-300 rounded px-4 py-2 text-base bg-white outline-none w-28 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
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
              <h3 className="text-lg font-semibold text-gray-700 mb-1">Pending Records</h3>
              <p className="text-3xl font-bold text-amber-600">{stats.pendingCount}</p>
            </div>
            <div className="p-3 rounded-full bg-amber-100">
              <FiClock className="text-amber-600" size={28} />
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

        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="relative h-80 md:h-[28rem]">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SuperAdminDashboard
