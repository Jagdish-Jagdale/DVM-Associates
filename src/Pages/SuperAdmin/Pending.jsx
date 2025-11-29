import React, { useEffect, useMemo, useState, memo, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../../../firebase.js";
import * as XLSX from "xlsx";
import { FiDownload, FiSearch, FiX, FiStar } from "react-icons/fi";
import PageHeader from "../../Components/UI/PageHeader.jsx";
import SearchActionsCard from "../../Components/UI/SearchActionsCard.jsx";
import { ThreeDots } from "react-loader-spinner";

const locationBgClass = (loc) => {
  switch (loc) {
    case "Sangli":
      return "bg-blue-50";
    case "Belgaum":
      return "bg-blue-50";
    case "Kolhapur":
      return "bg-blue-50";
    case "Pune":
      return "bg-blue-50";
    case "Bengaluru":
      return "bg-blue-50";
    case "Mumbai":
      return "bg-blue-50";
    case "Hyderabad":
      return "bg-blue-50";
    case "Indore":
      return "bg-blue-50";
    case "Satara":
      return "bg-blue-50";
    default:
      return "bg-white";
  }
};

const locShortMap = {
  Sangli: "SNGL",
  Belgaum: "BGM",
  Kolhapur: "KOP",
  Pune: "PUNE",
  Bengaluru: "BLR",
  Mumbai: "MUM",
  Hyderabad: "HYD",
  Indore: "INDR",
  Satara: "STR",
};
const shortOf = (loc) => locShortMap[loc] || "SNGL";
const getYearPair = (d = new Date()) => {
  const y = d.getFullYear() % 100;
  const next = (y + 1) % 100;
  const f = (n) => n.toString().padStart(2, "0");
  return `${f(y)}-${f(next)}`;
};

const minw = (h) => {
  switch (h) {
    case "RefNo":
      return "min-w-[160px]";
    case "OfficeNo":
      return "min-w-[150px]";
    case "VisitDate":
      return "min-w-[120px]";
    case "ReportDate":
      return "min-w-[120px]";
    case "ClientName":
      return "min-w-[150px]";
    case "ClientContactNo":
      return "min-w-[120px]";
    case "CaseInitiated":
      return "min-w-[140px]";
    case "Engineer":
      return "min-w-[120px]";
    case "ReceivedOn":
      return "min-w-[140px]";
    case "RecdDate":
      return "min-w-[120px]";
    case "GSTNo":
      return "min-w-[140px]";
    case "Remark":
      return "min-w-[200px]";
    default:
      return "min-w-[80px]";
  }
};

const monthAbbrFromAny = (val) => {
  if (!val) return "";
  const s = String(val).trim().toLowerCase();
  const map = {
    january: "Jan",
    jan: "Jan",
    february: "Feb",
    feb: "Feb",
    march: "Mar",
    mar: "Mar",
    april: "Apr",
    apr: "Apr",
    may: "May",
    june: "Jun",
    jun: "Jun",
    july: "Jul",
    jul: "Jul",
    august: "Aug",
    aug: "Aug",
    september: "Sep",
    sept: "Sep",
    sep: "Sep",
    october: "Oct",
    oct: "Oct",
    november: "Nov",
    nov: "Nov",
    december: "Dec",
    dec: "Dec",
  };
  if (map[s]) return map[s];
  const m = s.match(/^(1[0-2]|0?[1-9])$/);
  if (m)
    return [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][parseInt(m[1], 10) - 1];
  return s.slice(0, 1).toUpperCase() + s.slice(1, 3).toLowerCase();
};

const toIso = (s) => {
  if (!s) return "";
  const t = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    let yy = m[3];
    if (yy.length === 2) yy = (2000 + parseInt(yy, 10)).toString();
    return `${yy}-${mm}-${dd}`;
  }
  const d = new Date(t);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
};

const toDisplayDate = (s) => {
  const ymd = toIso(s);
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
};

const formatCurrency = (n) => {
  const num = Number(n) || 0;
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

const TableRow = memo(
  ({
    record,
    index,
    handleInputChange,
    dropdownOptions,
    headers,
    formatRef,
  }) => {
    const [localRecord, setLocalRecord] = useState(record);

    useEffect(() => {
      setLocalRecord(record);
    }, [record]);

    const onChange = (field, value) => {
      setLocalRecord((prev) => ({ ...prev, [field]: value }));
      handleInputChange(record.globalIndex, field, value);
    };

    return (
      <tr key={`${record.RefNo}-${index}`}>
        {headers.map((field) => (
          <td
            key={field}
            className={`p-2 border border-gray-300 align-top ${minw(field)}`}
          >
            {field === "SoftCopy" ||
            field === "Print" ||
            field === "VisitStatus" ? (
              <input
                type="checkbox"
                id={`checkbox-${field}-${record.globalIndex}`}
                name={field}
                checked={!!localRecord[field]}
                onChange={(e) => onChange(field, e.target.checked)}
                className="h-4 w-4"
                disabled
              />
            ) : field === "RefNo" ? (
              <input
                type="text"
                id={`text-${field}-${record.globalIndex}`}
                name={field}
                value={
                  typeof formatRef === "function"
                    ? formatRef(localRecord)
                    : localRecord[field] || ""
                }
                readOnly
                className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
              />
            ) : field === "OfficeNo" ? (
              <input
                type="text"
                id={`text-${field}-${record.globalIndex}`}
                name={field}
                value={`DVM/${shortOf(
                  localRecord.Location === "PCMC" ? "Pune" : localRecord.Location
                )}/${getYearPair()}`}
                readOnly
                className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
              />
            ) : field === "Sr" ? (
              (() => {
                const reserved = !!localRecord.reservedFirst;
                const anyData = [
                  localRecord.Month,
                  localRecord.VisitDate,
                  localRecord.ReportDate,
                  localRecord.TechnicalExecutive,
                  localRecord.Bank,
                  localRecord.Branch,
                  localRecord.ClientName,
                  localRecord.ClientContactNo,
                  localRecord.Locations,
                  localRecord.CaseInitiated,
                  localRecord.Engineer,
                  localRecord.ReportStatus,
                  localRecord.BillStatus,
                  localRecord.ReceivedOn,
                  localRecord.RecdDate,
                  localRecord.GSTNo,
                  localRecord.Remark,
                  localRecord.Amount,
                  localRecord.GST,
                  localRecord.Total,
                  localRecord.SoftCopy,
                  localRecord.Print,
                  localRecord.VisitStatus,
                ].some((v) => {
                  if (typeof v === "boolean") return v;
                  if (typeof v === "number") return v > 0;
                  const s = String(v ?? "").trim();
                  if (s === "" || s === "0" || s === "0.0" || s === "0.00")
                    return false;
                  return true;
                });
                const borderCls = reserved
                  ? anyData
                    ? "border-green-500"
                    : "border-red-500"
                  : "";
                const titleText = reserved
                  ? anyData
                    ? "Reserved row saved"
                    : "Reserved row not saved"
                  : "";
                return (
                  <div
                    className={`relative ${
                      borderCls ? "border-l-[3px] rounded-l " + borderCls : ""
                    }`}
                    title={titleText}
                  >
                    {(() => {
                      const bySuper = String(localRecord.createdByRole || "").toLowerCase() === "superadmin";
                      const showStar = bySuper || !!localRecord.reservedFirst;
                      return showStar ? (
                        <FiStar className="absolute top-0 left-0 z-10 text-amber-500 text-[10px]" />
                      ) : null;
                    })()}
                    <input
                      type="text"
                      id={`text-${field}-${record.globalIndex}`}
                      name={field}
                      value={String(index + 1)}
                      readOnly
                      className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100 text-center`}
                    />
                  </div>
                );
              })()
            ) : field === "Month" ? (
              <input
                type="text"
                id={`text-${field}-${record.globalIndex}`}
                name={field}
                value={monthAbbrFromAny(localRecord[field])}
                readOnly
                className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
              />
            ) : field === "VisitDate" ||
              field === "ReportDate" ||
              field === "RecdDate" ? (
              <input
                type="text"
                id={`text-${field}-${record.globalIndex}`}
                name={field}
                value={toDisplayDate(localRecord[field])}
                readOnly
                className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
              />
            ) : ["TechnicalExecutive", "Bank", "Branch"].includes(field) ? (
              <input
                type="text"
                id={`text-${field}-${record.globalIndex}`}
                name={field}
                value={localRecord[field] || ""}
                readOnly
                className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
              />
            ) : ["Amount", "GST", "Total"].includes(field) ? (
              <input
                type="text"
                id={`number-${field}-${record.globalIndex}`}
                name={field}
                value={
                  localRecord[field] === "" || localRecord[field] === null || typeof localRecord[field] === "undefined"
                    ? ""
                    : `₹ ${formatCurrency(localRecord[field])}`
                }
                readOnly
                className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100 text-right`}
              />
            ) : (
              <input
                type="text"
                id={`text-${field}-${record.globalIndex}`}
                name={field}
                value={localRecord[field] || ""}
                onChange={(e) => onChange(field, e.target.value)}
                readOnly
                className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
              />
            )}
          </td>
        ))}
      </tr>
    );
  }
);

const Pending = () => {
  const [allRecords, setAllRecords] = useState([]);
  const [pendingRecords, setPendingRecords] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [isLoading, setIsLoading] = useState(true);
  const tableRef = useRef(null);
  const [scrollMaxHeight, setScrollMaxHeight] = useState(0);

  const defaultLocations = [
    { name: "Sangli" },
    { name: "Belgaum" },
    { name: "Kolhapur" },
    { name: "Pune" },
    { name: "Bengaluru" },
    { name: "Mumbai" },
    { name: "Hyderabad" },
    { name: "Indore" },
    { name: "Satara" },
  ];

  const [allowedLocations, setAllowedLocations] = useState(defaultLocations);
  useEffect(() => {
    const unsub = onValue(
      ref(db, "settings/branches"),
      (snap) => {
        const data = snap.val() || {};
        let list = Object.keys(data)
          .map((k) => ({ name: data[k]?.name }))
          .filter((x) => x.name);
        if (!list.length) list = defaultLocations;
        list.sort((a, b) => a.name.localeCompare(b.name));
        setAllowedLocations(list);
      },
      () => setAllowedLocations(defaultLocations)
    );
    return () => unsub();
  }, []);

  const normalizeLocation = (name) => {
    if (!name) return "";
    const s = String(name).toLowerCase().trim();
    return s === "pcmc" ? "pune" : s;
  };

  const dropdownOptions = useMemo(
    () => ({
      Bank: [
        "Ajinkya Sahakari",
        "BOB",
        "BOI",
        "BOM",
        "Buldhana Urban",
        "CBI",
        "Cosmos",
        "DCC",
        "Fabtech",
        "PNB",
        "Private",
        "RBC",
        "SBI",
        "Shriram",
        "UBI",
        "Vidarbh Kokan",
      ].sort(),
      Branch: [
        "Amarai road Sangli",
        "Amrai Road",
        "Atpadi",
        "Chandani Chouk",
        "Chinchani",
        "Civil Hospital",
        "Clg Corner",
        "College Corner",
        "Gaonbhag",
        "Jawala",
        "Jaysingpur",
        "K.Piran",
        "Karad",
        "Kavathe ekand",
        "Kavathe Mahankal",
        "Khanapur",
        "Kolhapur Rd",
        "Langare",
        "Lengare",
        "Madhavnagar",
        "Main Sangli",
        "Majarde",
        "Maruti Road",
        "Mhaishal",
        "Miraj",
        "Nelkaranje",
        "Patel Chowk",
        "Peth",
        "Sangli",
        "Savlaj",
        "Tasgaon",
        "Thane",
        "Udyog bhavan",
        "Vishrambag",
        "Vita",
        "Zare",
        "patel chowk Sangli",
        "vishrambag, Sangli",
      ].sort(),
      TechnicalExecutive: ["AA", "SK", "SM"].sort(),
    }),
    []
  );

  const headers = [
    "Sr",
    "Month",
    "OfficeNo",
    "RefNo",
    "VisitDate",
    "ReportDate",
    "TechnicalExecutive",
    "Bank",
    "Branch",
    "ClientName",
    "ClientContactNo",
    "Location",
    "CaseInitiated",
    "Engineer",
    "VisitStatus",
    "FMV",
    "ReportStatus",
    "SoftCopy",
    "Print",
    "Amount",
    "GST",
    "Total",
    "BillStatus",
    "ReceivedOn",
    "RecdDate",
    "GSTNo",
    "Remark",
  ];

  const recomputeTotals = (rec) => ({
    ...rec,
    Total: Number(rec.Amount || 0) + Number(rec.GST || 0),
  });

  const formatRefDisplay = (rec) => {
    const ref = rec && (rec.RefNo || rec.committedRefNo);
    if (!ref) return "";
    return String(ref).padStart(3, "0");
  };

  useEffect(() => {
    const unsubscribe = onValue(
      ref(db, "excel_records"),
      (snapshot) => {
        const data = snapshot.val() || {};
        const out = [];
        Object.keys(data).forEach((key) => {
          const rec = data[key] || {};
          const loc =
            (rec.Location === "PCMC" ? "Pune" : rec.Location) || "Unknown";
          const m = key.match(/^DVM-([A-Z]{3,5})-(\d{2}-\d{2})-(\d{3})$/);
          const officeNo = rec.OfficeNo || (m ? `DVM/${m[1]}/${m[2]}` : "");
          const refNo = rec.RefNo || (m ? m[3] : key);
          const base = {
            Sr: rec.Sr?.toString() || "",
            Month: rec.Month || "",
            OfficeNo: officeNo,
            RefNo: refNo,
            VisitDate: rec.VisitDate || "",
            ReportDate: rec.ReportDate || "",
            TechnicalExecutive: rec.TechnicalExecutive || "",
            Bank: rec.Bank || "",
            Branch: rec.Branch || "",
            ClientName: rec.ClientName || "",
            ClientContactNo: rec.ClientContactNo || "",
            Locations: rec.Locations || loc,
            CaseInitiated: rec.CaseInitiated || "",
            Engineer: rec.Engineer || "",
            VisitStatus: !!rec.VisitStatus,
            FMV: Number(rec.FMV) || 0,
            SoftCopy: !!rec.SoftCopy,
            Print: !!rec.Print,
            Amount: Number(rec.Amount) || 0,
            GST: Number(rec.GST) || 0,
            Total:
              Number(rec.Total) ||
              (Number(rec.Amount) || 0) + (Number(rec.GST) || 0),
            BillStatus: rec.BillStatus || "",
            ReceivedOn: rec.ReceivedOn || "",
            RecdDate: rec.RecdDate || "",
            GSTNo: rec.GSTNo || "",
            Remark: rec.Remark || "",
            Location: loc,
            ReportStatus: rec.ReportStatus || "",
            reservedFirst: !!rec.reservedFirst,
            createdAt: rec.createdAt || "",
            createdByRole: rec.createdByRole || "",
          };
          out.push(base);
        });
        const allowedSet = new Set(
          allowedLocations.map((l) => normalizeLocation(l.name))
        );
        const filtered = out.filter((r) =>
          allowedSet.has(normalizeLocation(r.Location))
        );
        const sorted = filtered.sort((a, b) => {
          const ta = Date.parse(a.createdAt || "") || 0;
          const tb = Date.parse(b.createdAt || "") || 0;
          if (tb !== ta) return tb - ta;
          return (
            a.Location.localeCompare(b.Location) ||
            parseInt(a.RefNo || "0", 10) - parseInt(b.RefNo || "0", 10)
          );
        });
        setAllRecords(sorted);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching pending data:", error);
        alert(`Error fetching pending tasks: ${error.message}`);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [allowedLocations]);

  const displayRecords = useMemo(() => {
    let arr = allRecords.filter(
      (r) => String(r.BillStatus || "").toLowerCase() === "pending"
    );
    if (selectedBranch && selectedBranch !== "All Branches") {
      const sel = normalizeLocation(selectedBranch);
      arr = arr.filter((r) => normalizeLocation(r.Location) === sel);
    }
    if (dateFilter) {
      arr = arr.filter((r) => {
        const v = toIso(r.VisitDate);
        const rp = toIso(r.ReportDate);
        return (v && v === dateFilter) || (rp && rp === dateFilter);
      });
    }
    if (searchText && searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      arr = arr.filter((r) => {
        const refDisp = formatRefDisplay(r).toLowerCase();
        const client = String(r.ClientName || "").toLowerCase();
        const gst = String(r.GSTNo || "").toLowerCase();
        return refDisp.includes(q) || client.includes(q) || gst.includes(q);
      });
    }
    arr = arr.sort((a, b) => {
      const ta = Date.parse(a.createdAt || "") || 0;
      const tb = Date.parse(b.createdAt || "") || 0;
      if (tb !== ta) return tb - ta;
      return (
        String(a.Location || "").localeCompare(String(b.Location || "")) ||
        parseInt(a.RefNo || "0", 10) - parseInt(b.RefNo || "0", 10)
      );
    });
    return arr.map((record, index) => ({ ...record, globalIndex: index }));
  }, [allRecords, selectedBranch, dateFilter, searchText]);

  const totalPendingAmount = useMemo(() => {
    return displayRecords.reduce((sum, r) => {
      const t = Number(r.Total);
      if (!isNaN(t) && t > 0) return sum + t;
      const a = Number(r.Amount) || 0;
      const g = Number(r.GST) || 0;
      return sum + a + g;
    }, 0);
  }, [displayRecords]);

  const formattedTotalPending = formatCurrency(totalPendingAmount);
  const totalPendingDigits = useMemo(() => {
    const n = Math.floor(Math.abs(Number(totalPendingAmount) || 0));
    return n.toString().length;
  }, [totalPendingAmount]);

  useEffect(() => {
    const calc = () => {
      const scroller = tableRef.current;
      if (!scroller) return;
      const thead = scroller.querySelector("thead");
      const row = scroller.querySelector("tbody tr");
      const headH = thead
        ? Math.ceil(thead.getBoundingClientRect().height)
        : 44;
      const rowH = row ? Math.ceil(row.getBoundingClientRect().height) : 44;
      setScrollMaxHeight(headH + rowH * 7 + 2);
    };
    calc();
    let ro = null;
    try {
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(calc);
        if (tableRef.current) ro.observe(tableRef.current);
      }
    } catch {}
    window.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("resize", calc);
      try {
        ro && ro.disconnect();
      } catch {}
    };
  }, [displayRecords.length]);

  const handleInputChange = (globalIndex, field, value) => {
    const updated = [...pendingRecords];
    if (globalIndex < 0 || globalIndex >= updated.length) return;
    let rec = { ...updated[globalIndex], [field]: value };
    if (field === "Amount" || field === "GST") rec = recomputeTotals(rec);
    updated[globalIndex] = rec;
    setPendingRecords(updated);
  };

  const handleDownloadPending = () => {
    const data = displayRecords.map((record, index) => ({
      "Sr No": index + 1,
      Month: record.Month || "",
      Office: (() => {
        const loc = record.Location === "PCMC" ? "Pune" : record.Location;
        return `DVM/${shortOf(loc)}/${getYearPair()}`;
      })(),
      "Ref No": formatRefDisplay(record) || "",
      "Visit Date": toDisplayDate(record.VisitDate),
      "Report Date": toDisplayDate(record.ReportDate),
      "Technical Executive": record.TechnicalExecutive || "",
      Bank: record.Bank || "",
      Branch: record.Branch || "",
      "Client Name": record.ClientName || "",
      Contact: record.ClientContactNo || "",
      Location:
        record.Locations ||
        (record.Location === "PCMC" ? "Pune" : record.Location) ||
        "",
      "Case Initiated": record.CaseInitiated || "",
      Engineer: record.Engineer || "",
      "Visit Status": record.VisitStatus ? "Yes" : "No",
      FMV: Number(record.FMV) || 0,
      "Case Report Status": record.ReportStatus || "",
      "Soft Copy": record.SoftCopy ? "Yes" : "No",
      Print: record.Print ? "Yes" : "No",
      Amount: record.Amount || 0,
      "GST (18%)": record.GST || 0,
      Total: record.Total || 0,
      "Bill Status": record.BillStatus || "",
      "Received On": record.ReceivedOn || "",
      "Received Date": toDisplayDate(record.RecdDate),
      "GST No": record.GSTNo || "",
      Remark: record.Remark || "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 8 }, // Sr No
      { wch: 8 }, // Month
      { wch: 20 }, // Office
      { wch: 15 }, // Ref No
      { wch: 12 }, // Visit Date
      { wch: 12 }, // Report Date
      { wch: 20 }, // Technical Executive
      { wch: 15 }, // Bank
      { wch: 20 }, // Branch
      { wch: 25 }, // Client Name
      { wch: 15 }, // Contact
      { wch: 20 }, // Location
      { wch: 15 }, // Case Initiated
      { wch: 15 }, // Engineer
      { wch: 12 }, // Visit Status
      { wch: 20 }, // Case Report Status
      { wch: 12 }, // Soft Copy
      { wch: 8 }, // Print
      { wch: 12 }, // Amount
      { wch: 12 }, // GST (18%)
      { wch: 12 }, // Total
      { wch: 15 }, // Bill Status
      { wch: 15 }, // Received On
      { wch: 15 }, // Received Date
      { wch: 20 }, // GST No
      { wch: 40 }, // Remark
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Pending Tasks");
    const fileName = `Pending_Records_${searchText ? "Search" : "All"}_${
      dateFilter || "AllDates"
    }.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6">
      <PageHeader
        title="Pending List"
        subtitle="View and export pending records. Use filters to refine results."
      />
      {isLoading && (
        <div className="flex justify-center my-4">
          <ThreeDots
            height="60"
            width="60"
            color="#4F46E5" // Indigo color
            ariaLabel="loading-indicator"
          />
        </div>
      )}

      {!isLoading && (
        <>
          <SearchActionsCard
            recordsCount={displayRecords.length}
            contentClassName="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3"
            rightPrimary={
              <div className="flex items-center gap-4">
                <div
                  className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 h-10 shadow text-sm flex flex-col justify-center relative group"
                >
                  <div className="opacity-90 text-[11px] leading-none">Total Pending</div>
                  <div
                    className="font-bold text-base leading-tight"
                    style={{ fontFamily: "'Inter', 'Segoe UI', Roboto, Arial, 'Helvetica Neue', sans-serif" }}
                  >
                    <div className="flex items-center gap-1">
                      <span>₹</span>
                      <span
                        className={totalPendingDigits >= 8 ? "inline-block max-w-[14ch] truncate align-bottom" : ""}
                      >
                        {formattedTotalPending}
                      </span>
                    </div>
                    {totalPendingDigits >= 8 && (
                      <div className="absolute left-0 top-full mt-1 z-50 pointer-events-none bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-normal break-all max-w-[16ch] invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-150">
                        ₹ {formattedTotalPending}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleDownloadPending}
                  disabled={displayRecords.length === 0}
                  className={`h-10 px-4 rounded-md inline-flex items-center gap-2 text-sm ${
                    displayRecords.length === 0
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                  title="Download"
                  aria-label="Download"
                >
                  <FiDownload />
                  <span>Download</span>
                </button>
              </div>
            }
          >
            <div className="flex-1 min-w-0">
              <label className="block text-gray-700 mb-1 text-sm">Search</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search by Ref No, Client Name, GST No"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="shrink-0 sm:min-w-[180px]">
              <label className="block text-gray-700 mb-1 text-sm">
                Filter by Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full pl-2 pr-8 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {dateFilter && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDateFilter("");
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label="Clear date filter"
                    type="button"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="shrink-0 sm:min-w-[180px]">
              <label className="block text-gray-700 mb-1 text-sm">Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full pl-2 pr-8 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All Branches">All Branches</option>
                {allowedLocations.map((l) => (
                  <option key={l.name} value={l.name}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </SearchActionsCard>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div
              className="overflow-auto"
              ref={tableRef}
              style={{
                maxHeight: scrollMaxHeight ? `${scrollMaxHeight}px` : undefined,
              }}
            >
              <table className="w-full border-collapse text-xs sm:text-sm">
                <thead className="bg-indigo-600 text-white sticky top-0 z-30">
                  <tr>
                    {headers.map((header) => (
                      <th
                        key={header}
                        className={`px-2 py-2 sm:py-3 text-center font-bold border border-gray-200 whitespace-nowrap ${minw(
                          header
                        )}`}
                      >
                        {header === "Sr"
                          ? "Sr No"
                          : header === "Month"
                          ? "Month"
                          : header === "OfficeNo"
                          ? "Office"
                          : header === "RefNo"
                          ? "Ref No"
                          : header === "VisitDate"
                          ? "Visit Date"
                          : header === "ReportDate"
                          ? "Report Date"
                          : header === "TechnicalExecutive"
                          ? "Technical Executive"
                          : header === "Bank"
                          ? "Bank"
                          : header === "Branch"
                          ? "Branch"
                          : header === "ClientName"
                          ? "Client Name"
                          : header === "ClientContactNo"
                          ? "Contact"
                          : header === "Location"
                          ? "Location"
                          : header === "CaseInitiated"
                          ? "Case Initiated"
                          : header === "Engineer"
                          ? "Engineer"
                          : header === "VisitStatus"
                          ? "Visit Status"
                          : header === "ReportStatus"
                          ? "Case Report Status"
                          : header === "SoftCopy"
                          ? "Soft Copy"
                          : header === "Print"
                          ? "Print"
                          : header === "Amount"
                          ? "Amount"
                          : header === "GST"
                          ? "GST (18%)"
                          : header === "Total"
                          ? "Total"
                          : header === "BillStatus"
                          ? "Bill Status"
                          : header === "ReceivedOn"
                          ? "Received On"
                          : header === "RecdDate"
                          ? "Received Date"
                          : header === "GSTNo"
                          ? "GST No"
                          : header === "Remark"
                          ? "Remark"
                          : header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayRecords.length ? (
                    displayRecords.map((record, index) => (
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
                      <td
                        colSpan={headers.length}
                        className="px-4 py-6 text-center text-gray-600"
                      >
                        No records found
                        {searchText ? ` matching "${searchText}"` : ""}
                        {dateFilter ? ` for ${dateFilter}` : ""}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Pending;
