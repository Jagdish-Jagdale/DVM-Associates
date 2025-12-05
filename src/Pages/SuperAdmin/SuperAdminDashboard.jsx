import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../../../firebase.js";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { FiDatabase, FiAlertTriangle, FiClock } from "react-icons/fi";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const allMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const defaultBranches = [
  "Sangli",
  "Belgaum",
  "Kolhapur",
  "Pune",
  "Bengaluru",
  "Mumbai",
  "Hyderabad",
  "Indore",
  "Satara",
  "Vijyapur",
];

const normalizeMonth = (monthStr, dateStr) => {
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return allMonths[d.getMonth()];
  }
  if (!monthStr) return "Unknown";
  const s = String(monthStr).trim().toLowerCase();
  const nameMap = {
    january: 0,
    jan: 0,
    february: 1,
    feb: 1,
    march: 2,
    mar: 2,
    april: 3,
    apr: 3,
    may: 4,
    june: 5,
    jun: 5,
    july: 6,
    jul: 6,
    august: 7,
    aug: 7,
    september: 8,
    sept: 8,
    sep: 8,
    october: 9,
    oct: 9,
    november: 10,
    nov: 10,
    december: 11,
    dec: 11,
  };
  for (const key of Object.keys(nameMap)) {
    if (s.includes(key)) return allMonths[nameMap[key]];
  }
  const m = s.match(/(?:^|\D)(1[0-2]|0?[1-9])(?!\d)/);
  if (m) {
    const idx = parseInt(m[1], 10) - 1;
    if (idx >= 0 && idx < 12) return allMonths[idx];
  }
  return "Unknown";
};

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
  });

  const [selectedMonth, setSelectedMonth] = useState("All");
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const recordsRef = ref(db, "excel_records");
    const unsubscribe = onValue(recordsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setStats({
          totalRecords: 0,
          pendingCount: 0,
          cancelCount: 0,
          locationCounts: {},
          locationCancelCounts: {},
          locationPendingCounts: {},
          monthCounts: {},
          monthPendingCounts: {},
          monthCancelCounts: {},
        });
        return;
      }

      const records = Object.values(data).map((record) => ({
        ...record,
        Location:
          record.Location === "PCMC" ? "Pune" : record.Location || "Unknown",
        ReportStatus: record.ReportStatus || "",
        BillStatus: record.BillStatus || "",
        Month: record.Month || "Unknown",
        VisitDate: record.VisitDate || "",
        createdAt: record.createdAt || "",
      }));

      const filtered = records.filter((r) => {
        const recordMonth = normalizeMonth(r.Month, r.createdAt);
        const dateForYear = r.createdAt;
        const recordYear = dateForYear
          ? new Date(dateForYear).getFullYear().toString()
          : "Unknown";
        const matchMonth =
          selectedMonth === "All" || recordMonth === selectedMonth;
        const matchYear = !selectedYear || recordYear === selectedYear;
        return matchMonth && matchYear;
      });

      const totalRecords = filtered.length;
      const cancelCount = filtered.filter(
        (r) => r.ReportStatus === "Case Cancel"
      ).length;
      const pendingCount = filtered.filter(
        (r) => r.BillStatus === "Pending"
      ).length;

      const locationCounts = filtered.reduce((acc, r) => {
        acc[r.Location] = (acc[r.Location] || 0) + 1;
        return acc;
      }, {});

      const locationCancelCounts = filtered.reduce((acc, r) => {
        if (r.ReportStatus === "Case Cancel") {
          acc[r.Location] = (acc[r.Location] || 0) + 1;
        }
        return acc;
      }, {});

      const locationPendingCounts = filtered.reduce((acc, r) => {
        if ((r.BillStatus || "") === "Pending") {
          acc[r.Location] = (acc[r.Location] || 0) + 1;
        }
        return acc;
      }, {});

      const monthCounts = filtered.reduce((acc, r) => {
        const m = normalizeMonth(r.Month, r.createdAt);
        acc[m] = (acc[m] || 0) + 1;
        return acc;
      }, {});

      const monthCancelCounts = filtered.reduce((acc, r) => {
        if (r.ReportStatus === "Case Cancel") {
          const m = normalizeMonth(r.Month, r.createdAt);
          acc[m] = (acc[m] || 0) + 1;
        }
        return acc;
      }, {});

      const monthPendingCounts = filtered.reduce((acc, r) => {
        if (r.BillStatus === "Pending") {
          const m = normalizeMonth(r.Month, r.createdAt);
          acc[m] = (acc[m] || 0) + 1;
        }
        return acc;
      }, {});

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
      });
    });

    return () => unsubscribe();
  }, [selectedMonth, selectedYear]);

  const branchLabels = defaultBranches;
  const chartData = {
    labels: branchLabels,
    datasets: [
      {
        label: "Total Records",
        data: branchLabels.map((b) => stats.locationCounts[b] || 0),
        backgroundColor: "rgba(124, 58, 237, 0.6)",
      },
      {
        label: "Pending",
        data: branchLabels.map((b) => stats.locationPendingCounts[b] || 0),
        backgroundColor: "rgba(245, 158, 11, 0.6)",
      },
      {
        label: "Cancelled Cases",
        data: branchLabels.map((b) => stats.locationCancelCounts[b] || 0),
        backgroundColor: "rgba(239, 68, 68, 0.6)",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        bottom: windowWidth < 640 ? 20 : 10,
      },
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          boxWidth: windowWidth < 640 ? 10 : 12,
          padding: windowWidth < 640 ? 6 : 8,
          font: {
            size: windowWidth < 640 ? 9 : windowWidth < 1024 ? 11 : 12,
          },
        },
      },
      title: {
        display: true,
        text: "Branch Performance Overview By Branch",
        font: {
          size: windowWidth < 640 ? 11 : windowWidth < 1024 ? 14 : 16,
          weight: "bold",
        },
        padding: {
          top: 5,
          bottom: windowWidth < 640 ? 15 : 10,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: windowWidth < 640 ? 6 : 8,
        titleFont: {
          size: windowWidth < 640 ? 11 : 12,
        },
        bodyFont: {
          size: windowWidth < 640 ? 10 : 11,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: windowWidth < 640 ? 8 : windowWidth < 1024 ? 10 : 11,
          },
          maxRotation: windowWidth < 640 ? 45 : 0,
          minRotation: windowWidth < 640 ? 45 : 0,
          autoSkip: false,
          padding: windowWidth < 640 ? 5 : 8,
        },
        grid: {
          display: true,
          color: "rgba(0, 0, 0, 0.08)",
          lineWidth: 1,
        },
      },
      y: {
        beginAtZero: true,
        suggestedMax: 10,
        ticks: {
          stepSize: 1,
          precision: 0,
          font: {
            size: windowWidth < 640 ? 9 : windowWidth < 1024 ? 10 : 11,
          },
        },
        grid: {
          display: true,
          color: "rgba(0, 0, 0, 0.08)",
          lineWidth: 1,
        },
      },
    },
    categoryPercentage: 0.8,
    barPercentage: 0.75,
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] p-2 xs:p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-[1400px] mx-auto">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div className="flex flex-col">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800">
                Super Admin Dashboard
              </h2>
              <p className="mt-1 text-xs sm:text-sm md:text-base text-gray-600">
                Manage Excel records, track pending entries, and oversee admins,
                executives, and branches from a unified control panel.
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 lg:flex-shrink-0">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded px-3 sm:px-4 py-2 text-xs sm:text-sm md:text-base bg-white outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="All">All Months</option>
                {allMonths.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Year"
                value={selectedYear}
                inputMode="numeric"
                maxLength={4}
                onChange={(e) => {
                  const v = (e.target.value || "")
                    .replace(/\D/g, "")
                    .slice(0, 4);
                  setSelectedYear(v);
                }}
                className="border border-gray-300 rounded px-3 sm:px-4 py-2 text-xs sm:text-sm md:text-base bg-white outline-none w-20 sm:w-24 md:w-28 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
          <div className="mt-3 border-t border-gray-300" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg shadow flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-700 mb-1">
                Total Records
              </h3>
              <p className="text-2xl sm:text-3xl font-bold text-purple-600">
                {stats.totalRecords}
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-full bg-purple-100 flex-shrink-0">
              <FiDatabase className="text-purple-600" size={24} />
            </div>
          </div>
          <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg shadow flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-700 mb-1">
                Pending Records
              </h3>
              <p className="text-2xl sm:text-3xl font-bold text-amber-600">
                {stats.pendingCount}
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-full bg-amber-100 flex-shrink-0">
              <FiClock className="text-amber-600" size={24} />
            </div>
          </div>
          <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg shadow flex items-center justify-between sm:col-span-2 lg:col-span-1">
            <div>
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-700 mb-1">
                Cancelled Cases
              </h3>
              <p className="text-2xl sm:text-3xl font-bold text-red-500">
                {stats.cancelCount}
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-full bg-red-100 flex-shrink-0">
              <FiAlertTriangle className="text-red-500" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-2 xs:p-3 sm:p-4 md:p-6 rounded-lg shadow-sm">
          <div className="overflow-x-auto sm:overflow-x-visible -mx-2 xs:-mx-3 sm:mx-0">
            <div className="min-w-[600px] sm:min-w-0">
              <div className="relative h-56 xs:h-64 sm:h-72 md:h-80 lg:h-96 xl:h-[28rem]">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
