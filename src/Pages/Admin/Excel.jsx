import React, {
  memo,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { ThreeDots } from "react-loader-spinner";

import { ref, set, onValue, get } from "firebase/database";
import { db, functions, auth } from "../../../firebase.js";
import { httpsCallable } from "firebase/functions";
import * as XLSX from "xlsx";
import {
  FiSave,
  FiDownload,
  FiPlus,
  FiX,
  FiCheckCircle,
  FiTrash2,
  FiSearch,
  FiAlertTriangle,
  FiStar,
} from "react-icons/fi";
import PageHeader from "../../Components/UI/PageHeader.jsx";
import SearchActionsCard from "../../Components/UI/SearchActionsCard.jsx";
import DatePicker from "../../Components/UI/DatePicker.jsx";

const defaultLocations = [
  { name: "Sangli", shortForm: "SNGL", aliases: ["SNGL"] },
  { name: "Belgaum", shortForm: "BGM", aliases: ["BGM"] },
  { name: "Kolhapur", shortForm: "KOP", aliases: ["KOP"] },
  { name: "Pune", shortForm: "PUNE", aliases: ["PUNE"] },
  { name: "Bengaluru", shortForm: "BLR", aliases: ["BLR"] },
  { name: "Mumbai", shortForm: "MUM", aliases: ["MUM"] },
  { name: "Hyderabad", shortForm: "HYD", aliases: ["HYD"] },
  { name: "Indore", shortForm: "INDR", aliases: ["INDR"] },
  { name: "Satara", shortForm: "STR", aliases: ["STR"] },
  { name: "Vijayapur", shortForm: "VJP", aliases: ["VJP"] },
];

const codeToNameMap = defaultLocations.reduce(
  (acc, { name, shortForm, aliases }) => {
    acc[shortForm] = name;
    (aliases || []).forEach((a) => (acc[a] = name));
    return acc;
  },
  {}
);

const getYearPair = (d = new Date()) => {
  const m = d.getMonth(); // 0-11
  const y = d.getFullYear();
  let startYear = y;
  let endYear = y + 1;

  if (m < 3) {
    // Jan, Feb, Mar -> previous FY
    startYear = y - 1;
    endYear = y;
  }

  const y1 = (startYear % 100).toString().padStart(2, "0");
  const y2 = (endYear % 100).toString().padStart(2, "0");
  return `${y1}-${y2}`;
};

const yearPairFromDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "" : getYearPair(d);
};

const yearPairFromOffice = (officeNo) => {
  if (!officeNo) return "";
  const m = String(officeNo).match(/(\d{2}-\d{2})/);
  return m ? m[1] : "";
};

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
  "Locations",
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
  "Action",
];

const minw = (h) => {
  switch (h) {
    case "OfficeNo":
      return "min-w-[150px]";
    case "RefNo":
      return "min-w-[160px]";
    case "ClientName":
      return "min-w-[240px]";
    case "Branch":
    case "Locations":
      return "min-w-[200px]";
    case "TechnicalExecutive":
      return "min-w-[200px]";
    case "GSTNo":
    case "Bank":
      return "min-w-[150px]";
    case "ClientContactNo":
    case "Remark":
      return "min-w-[200px]";
    case "VisitDate":
    case "ReportDate":
    case "RecdDate":
      return "min-w-[120px]";
    default:
      return "min-w-[90px]";
  }
};

const normalizeLocation = (name) => {
  if (!name) return "";
  const s = String(name).toLowerCase().trim();
  return s;
};

const monthOptions = [
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
];

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
  if (m) return monthOptions[parseInt(m[1], 10) - 1];
  return s.slice(0, 1).toUpperCase() + s.slice(1, 3).toLowerCase();
};

const formatDateForInput = (val) => {
  if (!val) return "";
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    let yy = m[3];
    if (yy.length === 2) yy = (2000 + parseInt(yy, 10)).toString();
    return `${yy}-${mm}-${dd}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
};

const toDisplayDate = (val) => {
  const ymd = formatDateForInput(val);
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
};

const TableRow = memo(
  ({
    record,
    index,
    onChangeField,
    onSaveRow,
    groupRecords,
    dropdownOptions,
    formatRef,
    missingFields,
    showDelete,
    onDeleteRow,
    readOnlyRow,
    serverMonth,
    serverYearPair,
    isComplete,
    editingRows,
    onToggleEdit,
  }) => {
    const isNoFee = record.ReceivedOn === "No Fee";
    const rowClass = isNoFee
      ? "bg-red-500 text-white"
      : index % 2 === 0
        ? "bg-white"
        : "bg-gray-50";

    const isSaved = !record.__local && !record.__dirty;
    const isEditing = editingRows.has(record.globalIndex);

    // Check if record is a reserved row (should be read-only for Admin)
    const isReservedRow = !!(record.isReserved || record.reservedFirst);

    // Make row read-only if `readOnlyRow` prop is true (removed isReservedRow check)
    const isReadOnly = readOnlyRow;

    const renderInput = (field) => {
      const err =
        missingFields &&
          typeof missingFields.has === "function" &&
          missingFields.has(field)
          ? " border-red-500 ring-1 ring-red-500 bg-red-50"
          : "";
      if (field === "Action") {
        // Allow action buttons for Reserved rows now
        // if (isReservedRow) return null;

        const showSave =
          !!record.__dirty &&
          !readOnlyRow &&
          record.Location === groupRecords[0]?.Location;

        if (!showSave) return null;

        return (
          <div className="flex items-center justify-center gap-2">
            {showSave && (
              <button
                onClick={() => onSaveRow(record.globalIndex)}
                aria-label={!record.__local && record.RefNo ? "Update" : "Save"}
                title={!record.__local && record.RefNo ? "Update" : "Save"}
                className="p-2 rounded-full bg-amber-600 text-white hover:bg-amber-700"
              >
                <FiSave className="text-base" />
              </button>
            )}
          </div>
        );
      }
      if (["SoftCopy", "Print", "VisitStatus"].includes(field)) {
        return (
          <input
            type="checkbox"
            checked={!!record[field]}
            onChange={(e) =>
              onChangeField(record.globalIndex, field, e.target.checked)
            }
            disabled={isReadOnly}
            className="h-4 w-4 block mx-auto"
          />
        );
      }
      if (["VisitDate", "ReportDate", "RecdDate"].includes(field)) {
        return (
          <input
            type="date"
            value={formatDateForInput(record[field])}
            onChange={(e) =>
              onChangeField(record.globalIndex, field, e.target.value)
            }
            disabled={isReadOnly}
            className={`w-full p-2 border border-gray-300 rounded text-sm${isReadOnly ? " bg-gray-100" : ""
              }${err}`}
          />
        );
      }
      if (field === "FMV") {
        return (
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            onKeyDown={(e) => {
              if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
            }}
            value={record[field] === 0 || record[field] ? record[field] : ""}
            onChange={(e) =>
              onChangeField(record.globalIndex, field, e.target.value)
            }
            disabled={isReadOnly}
            className={`w-full p-2 border border-gray-300 rounded text-sm bg-white${err}`}
          />
        );
      }
      if (["Amount", "GST", "Total"].includes(field)) {
        const ro = readOnlyRow || field === "Total" || field === "GST";
        return (
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            onKeyDown={(e) => {
              if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
            }}
            value={record[field] === 0 || record[field] ? record[field] : ""}
            onChange={(e) =>
              onChangeField(record.globalIndex, field, e.target.value)
            }
            readOnly={ro}
            className={`w-full p-2 border border-gray-300 rounded text-sm ${ro ? "bg-gray-100" : "bg-white"
              }${err}`}
          />
        );
      }
      if (field === "ClientContactNo") {
        const val = String(record[field] ?? "");
        return (
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            onKeyDown={(e) => {
              if (["e", "E", "+", "-", ".", " "].includes(e.key))
                e.preventDefault();
            }}
            value={val}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
              onChangeField(record.globalIndex, field, digits);
            }}
            readOnly={isReadOnly}
            className={`w-full p-2 border border-gray-300 rounded text-sm bg-white${err}`}
          />
        );
      }
      if (field === "GSTNo") {
        const val = String(record[field] ?? "");
        return (
          <input
            type="text"
            value={val}
            maxLength={15}
            onChange={(e) => {
              const input = e.target.value.toUpperCase().slice(0, 15);
              onChangeField(record.globalIndex, field, input);
            }}
            readOnly={isReadOnly}
            className={`w-full p-2 border border-gray-300 rounded text-sm bg-white${err}`}
          />
        );
      }
      if (field === "Month") {
        const display = record.Month || serverMonth || "";
        return (
          <input
            type="text"
            value={display}
            readOnly
            className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100${err}`}
          />
        );
      }
      if (["ReportStatus", "BillStatus"].includes(field)) {
        return (
          <select
            value={record[field] || ""}
            onChange={(e) =>
              onChangeField(record.globalIndex, field, e.target.value)
            }
            disabled={isReadOnly}
            className={`w-full p-2 border border-gray-300 rounded text-sm${isReadOnly ? " bg-gray-100" : " bg-white"
              }`}
          >
            <option value="">
              Select {field.replace(/([A-Z])/g, " $1").trim()}
            </option>
            {dropdownOptions[field].map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      }
      if (["TechnicalExecutive", "Engineer", "CaseInitiated"].includes(field)) {
        return (
          <select
            value={record[field] || ""}
            onChange={(e) =>
              onChangeField(record.globalIndex, field, e.target.value)
            }
            disabled={isReadOnly}
            className={`w-full p-2 border border-gray-300 rounded text-sm${isReadOnly ? " bg-gray-100" : " bg-white"
              }${err}`}
          >
            <option value="">
              Select {field.replace(/([A-Z])/g, " $1").trim()}
            </option>
            {(dropdownOptions[field] || []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      }
      if (field === "ReceivedOn") {
        return (
          <select
            value={record[field] || ""}
            onChange={(e) =>
              onChangeField(record.globalIndex, field, e.target.value)
            }
            disabled={isReadOnly}
            className={`w-full p-2 border border-gray-300 rounded text-sm${isReadOnly ? " bg-gray-100" : " bg-white"
              }`}
          >
            <option value="">Select Received On</option>
            {(dropdownOptions[field] || []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      }
      if (field === "OfficeNo") {
        const locName = record.Location === "PCMC" ? "Pune" : record.Location;
        const short =
          (defaultLocations.find((l) => l.name === locName) || {}).shortForm ||
          "SNGL";
        const office = `DVM/${short}/${serverYearPair || getYearPair()}`;
        return (
          <input
            type="text"
            value={office}
            readOnly
            className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
          />
        );
      }
      if (field === "Sr") {
        return (
          <div className="relative">
            {showDelete && (
              <button
                type="button"
                onClick={() =>
                  onDeleteRow && onDeleteRow(record.OfficeNo, record.Sr)
                }
                className="absolute -top-2 -left-2 z-0 p-0.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200 shadow-sm"
                title="Delete blank row"
                aria-label="Delete row"
              >
                <FiX className="text-xs" />
              </button>
            )}
            <input
              type="text"
              value={(index + 1).toString()}
              readOnly
              aria-readonly="true"
              tabIndex={-1}
              className={`w-full px-2 py-1.5 text-center text-slate-600 rounded-md text-sm bg-slate-100 border border-slate-200 shadow-inner cursor-not-allowed`}
            />
          </div>
        );
      }
      if (field === "RefNo") {
        const display =
          typeof formatRef === "function"
            ? formatRef(record)
            : record[field] || "";
        return (
          <input
            type="text"
            value={display}
            readOnly
            className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
          />
        );
      }
      return (
        <input
          type="text"
          value={record[field] || ""}
          onChange={(e) =>
            onChangeField(record.globalIndex, field, e.target.value)
          }
          readOnly={isReadOnly}
          className={`w-full p-2 border border-gray-300 rounded text-sm${isReadOnly ? " bg-gray-100" : " bg-white"
            }${err}`}
        />
      );
    };

    return (
      <tr className={`${rowClass} border-b border-gray-200`}>
        {headers.map((h) => {
          const isCB = ["SoftCopy", "Print", "VisitStatus"].includes(h);
          return (
            <td
              key={h}
              className={`p-2 border border-gray-300 ${isCB ? "text-center align-middle" : "align-top"
                } ${minw(h)}`}
            >
              {renderInput(h)}
            </td>
          );
        })}
      </tr>
    );
  }
);

const Excel = () => {
  const dropdownOptions = useMemo(
    () => ({
      ReportStatus: ["Case Cancel", "Done", "On hold", "Pending"].sort(),
      ReceivedOn: [
        "CBI CC",
        "BOL LLP",
        "Office Cash",
        "Cash Mali Sir",
        "DVM OL",
        "AL Fee",
        "No Fee",
        "Same Account",
      ].sort(),
      BillStatus: ["Credit", "Pending"],
    }),
    []
  );

  const [engOptions, setEngOptions] = useState([]);
  const [teOptions, setTeOptions] = useState([]);
  const [ceOptions, setCeOptions] = useState([]);
  const [recOptions, setRecOptions] = useState([]);

  useEffect(() => {
    const unsubs = [];
    const watch = (path, setter) => {
      const u = onValue(
        ref(db, path),
        (snap) => {
          const data = snap.val() || {};
          const list = Object.keys(data)
            .map((k) => data[k]?.name)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
          setter(list);
        },
        () => setter([])
      );
      unsubs.push(u);
    };
    watch("settings/engineers", setEngOptions);
    watch("settings/technical_executives", setTeOptions);
    watch("settings/business_executives", setCeOptions);
    watch("settings/received_methods", setRecOptions);
    return () => {
      try {
        unsubs.forEach((u) => u());
      } catch { }
    };
  }, []);

  const uiOptions = useMemo(
    () => ({
      ...dropdownOptions,
      TechnicalExecutive: teOptions,
      Engineer: engOptions,
      CaseInitiated: ceOptions,
      ReceivedOn: recOptions,
    }),
    [dropdownOptions, teOptions, engOptions, ceOptions, recOptions]
  );

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [sortBy, setSortBy] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const tableRef = useRef(null);
  const [scrollMaxHeight, setScrollMaxHeight] = useState(0);
  const [serverOffset, setServerOffset] = useState(0);
  const [clock, setClock] = useState(0);
  useEffect(() => {
    const offRef = ref(db, ".info/serverTimeOffset");
    const unsub = onValue(
      offRef,
      (snap) => {
        const v =
          typeof snap.val() === "number" ? snap.val() : Number(snap.val()) || 0;
        setServerOffset(v);
      },
      () => setServerOffset(0)
    );
    return () => unsub();
  }, []);
  useEffect(() => {
    const id = setInterval(() => setClock((c) => c + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const serverDate = useMemo(
    () => new Date(Date.now() + serverOffset),
    [serverOffset, clock]
  );
  const serverMonth = useMemo(
    () => monthOptions[serverDate.getMonth()],
    [serverDate]
  );
  const yearPair = useMemo(() => getYearPair(serverDate), [serverDate]);
  const displayDate = useMemo(() => {
    const d = serverDate;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }, [serverDate]);
  const todayYmd = useMemo(() => {
    const d = serverDate;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, [serverDate]);
  const isServerSunday = useMemo(() => serverDate.getDay() === 0, [serverDate]);
  const isYmdSunday = useCallback((ymd) => {
    const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return false;
    const d = new Date(
      parseInt(m[1], 10),
      parseInt(m[2], 10) - 1,
      parseInt(m[3], 10)
    );
    return d.getDay() === 0;
  }, []);
  const autoDateRef = useRef(true);
  const locInitRef = useRef(true);
  useEffect(() => {
    if (autoDateRef.current) setDateFilter(todayYmd);
  }, [todayYmd]);
  const yearPairForRecord = useCallback(
    (rec) => {
      return yearPair;
    },
    [yearPair, serverMonth]
  );
  const [confirmState, setConfirmState] = useState({
    open: false,
    scope: "",
    rowIndex: null,
  });
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmShowing, setConfirmShowing] = useState(false);
  useEffect(() => {
    let enterTimer;
    let exitTimer;
    if (confirmState.open) {
      setConfirmVisible(true);
      enterTimer = setTimeout(() => setConfirmShowing(true), 10);
    } else {
      setConfirmShowing(false);
      exitTimer = setTimeout(() => setConfirmVisible(false), 200);
    }
    return () => {
      if (enterTimer) clearTimeout(enterTimer);
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, [confirmState.open]);
  const [successSnack, setSuccessSnack] = useState({
    open: false,
    message: "",
  });
  const [errorSnack, setErrorSnack] = useState({ open: false, message: "" });
  const [deleteSnack, setDeleteSnack] = useState({ open: false, message: "" });
  useEffect(() => {
    if (successSnack.open) {
      const t = setTimeout(
        () => setSuccessSnack((s) => ({ ...s, open: false })),
        2500
      );
      return () => clearTimeout(t);
    }
  }, [successSnack.open]);
  useEffect(() => {
    if (errorSnack.open) {
      const t = setTimeout(
        () => setErrorSnack((s) => ({ ...s, open: false })),
        2500
      );
      return () => clearTimeout(t);
    }
  }, [errorSnack.open]);
  useEffect(() => {
    if (deleteSnack.open) {
      const t = setTimeout(
        () => setDeleteSnack((s) => ({ ...s, open: false })),
        2000
      );
      return () => clearTimeout(t);
    }
  }, [deleteSnack.open]);

  const [reservedRow, setReservedRow] = useState(null);

  const authBranch = useMemo(() => {
    try {
      return (
        localStorage.getItem("authBranch") ||
        sessionStorage.getItem("authBranch") ||
        ""
      ).trim();
    } catch {
      return "";
    }
  }, []);
  const allowedLocations = useMemo(() => {
    const norm = normalizeLocation(authBranch);
    if (!authBranch || !norm) return defaultLocations;
    const filtered = defaultLocations.filter(
      (l) => normalizeLocation(l.name) === norm
    );
    return filtered.length ? filtered : defaultLocations;
  }, [authBranch]);
  useEffect(() => {
    if (
      locInitRef.current &&
      !selectedLocation &&
      allowedLocations.length > 0
    ) {
      setSelectedLocation(allowedLocations[0].name);
      locInitRef.current = false;
    }
  }, [allowedLocations, selectedLocation]);

  // Watch SuperAdmin reserved row for the selected branch and date (skip for any Sunday date)
  useEffect(() => {
    if (!selectedLocation || !dateFilter) {
      setReservedRow(null);
      return;
    }
    if (isYmdSunday(dateFilter)) {
      setReservedRow(null);
      return;
    }
    const loc = selectedLocation;
    // Check if reserved row already exists in excel_records for this date and location
    const existingReserved = records.find((r) => {
      const actualLoc = r.Location;
      const locMatch = actualLoc === loc || r.Branch === loc;
      if (!locMatch) return false;

      // Filter by adminBranch (authBranch)
      if (authBranch && r.Branch && r.Branch !== authBranch) return false;

      const s2 = String(r.createdAt || "").trim();
      const iso2 = /^\d{4}-\d{2}-\d{2}$/.test(s2)
        ? s2
        : (function () {
          if (!s2) return "";
          const d = new Date(s2);
          if (isNaN(d.getTime())) return "";
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        })();
      return r.reservedFirst && iso2 === dateFilter;
    });

    if (existingReserved) {
      // Use the existing reserved row from records
      setReservedRow(
        recomputeTotals({
          ...existingReserved,
          Sr: "1",
          globalIndex: -1,
          Month: existingReserved.Month || serverMonth,
          committedRefNo:
            existingReserved.committedRefNo || existingReserved.RefNo || "",
        })
      );
    } else {
      // No reserved row exists from SuperAdmin, create a synthetic one for display
      const actual = loc;
      const officeNo = `DVM/${shortOf(actual)}/${yearPair}`;
      setReservedRow(
        recomputeTotals({
          Sr: "1",
          globalSr: "",
          OfficeNo: officeNo,
          RefNo: "",
          Month: serverMonth,
          VisitDate: "",
          ReportDate: "",
          TechnicalExecutive: "",
          Bank: "",
          Branch: "",
          ClientName: "",
          ClientContactNo: "",
          Locations: "",
          Location: actual,
          CaseInitiated: "",
          Engineer: "",
          VisitStatus: false,
          ReportStatus: "",
          SoftCopy: false,
          Print: false,
          FMV: "",
          Amount: "",
          GST: 0,
          BillStatus: "",
          ReceivedOn: "",
          RecdDate: "",
          GSTNo: "",
          Remark: "",
          createdAt: dateFilter,
          globalIndex: -1,
          committedRefNo: "",
        })
      );
    }
  }, [
    selectedLocation,
    dateFilter,
    isYmdSunday,
    serverMonth,
    records,
    yearPair,
  ]);

  const recomputeTotals = (rec) => {
    const amount = Math.max(0, Number(rec.Amount) || 0);
    const gst = Number((amount * 0.18).toFixed(2));
    return { ...rec, GST: gst, Total: (amount + gst).toFixed(2) };
  };

  const shortOf = (loc) =>
    defaultLocations.find((l) => l.name === (loc === "PCMC" ? "Pune" : loc))
      ?.shortForm || "SNGL";

  const toKey = (rec) =>
    `DVM-${shortOf(rec.Location)}-${yearPairForRecord(rec)}-${rec.RefNo}`;

  const requiredFields = useMemo(
    () => [
      "VisitDate",
      "ReportDate",
      "TechnicalExecutive",
      "Bank",
      "Branch",
      "ClientName",
      "ClientContactNo",
      "Locations",
      "CaseInitiated",
      "Engineer",
    ],
    []
  );
  const isRecordComplete = useCallback(
    (rec) => {
      if (!rec) return false;
      return requiredFields.every((f) => String(rec[f] ?? "").trim() !== "");
    },
    [requiredFields]
  );

  const delCheckFields = useMemo(
    () => [
      "VisitDate",
      "ReportDate",
      "TechnicalExecutive",
      "Bank",
      "Branch",
      "ClientName",
      "ClientContactNo",
      "Locations",
      "CaseInitiated",
      "Engineer",
      "ReportStatus",
      "BillStatus",
      "ReceivedOn",
      "RecdDate",
      "GSTNo",
      "Remark",
      "Amount",
      "FMV",
      "SoftCopy",
      "Print",
      "VisitStatus",
    ],
    []
  );
  const isBlankForDelete = useCallback(
    (rec) => {
      if (!rec) return false;
      return delCheckFields.every((f) => {
        const v = rec[f];
        if (typeof v === "boolean") return v === false;
        if (f === "GST") return v === 0 || String(v ?? "").trim() === "";
        return String(v ?? "").trim() === "";
      });
    },
    [delCheckFields]
  );

  const getMissingFields = useCallback(
    (rec) => {
      const set = new Set();
      requiredFields.forEach((f) => {
        if (String(rec[f] ?? "").trim() === "") set.add(f);
      });
      const digits = String(rec.ClientContactNo ?? "").replace(/\D/g, "");
      if (digits.length !== 10) set.add("ClientContactNo");
      return set;
    },
    [requiredFields]
  );
  const [validationMap, setValidationMap] = useState({});
  const [editingRows, setEditingRows] = useState(new Set());

  const formatRefDisplay = useCallback((rec) => {
    const refStr = (rec && (rec.RefNo || rec.committedRefNo)) || "";
    if (!refStr) return "";
    const num = String(refStr).toString().padStart(3, "0");
    return num;
  }, []);

  useEffect(() => {
    const unsub = onValue(
      ref(db, "excel_records"),
      (snap) => {
        const data = snap.val() || {};
        const out = [];
        Object.keys(data).forEach((k) => {
          // Try reserved format or generic with underscore
          const m = k.match(/^DVM-([A-Z]+)-(\d{2}-\d{2})[_-](\d{3,})$/);
          if (!m) return;
          const sf = m[1];
          const refNo = m[3];
          let location = codeToNameMap[sf] || data[k].Location || "Unknown";
          if (location === "PCMC") location = "Pune";
          const base = {
            Sr: data[k].Sr?.toString() || "1",
            globalSr: "",
            OfficeNo: data[k].OfficeNo || "",
            RefNo: refNo,
            Month: data[k].Month || serverMonth,
            VisitDate: data[k].VisitDate || "",
            ReportDate: data[k].ReportDate || "",
            TechnicalExecutive: data[k].TechnicalExecutive || "",
            Bank: data[k].Bank || "",
            Branch: data[k].Branch || "",
            ClientName: data[k].ClientName || "",
            ClientContactNo: data[k].ClientContactNo || "",
            Locations: data[k].Locations || "",
            Location: location,
            CaseInitiated: data[k].CaseInitiated || "",
            Engineer: data[k].Engineer || "",
            VisitStatus: !!data[k].VisitStatus,
            ReportStatus: data[k].ReportStatus || "",
            SoftCopy: !!data[k].SoftCopy,
            Print: !!data[k].Print,
            FMV: Number(data[k].FMV) || 0,
            Amount: Math.max(0, Number(data[k].Amount) || 0),
            GST: Number(data[k].GST) || 0,
            BillStatus: data[k].BillStatus || "",
            ReceivedOn: data[k].ReceivedOn || "",
            RecdDate: data[k].RecdDate || "",
            GSTNo: data[k].GSTNo || "",
            Remark: data[k].Remark || "",
            createdAt: data[k].createdAt || "",
            reservedFirst: !!data[k].reservedFirst,
            createdByRole: data[k].createdByRole || "",
          };
          out.push(recomputeTotals(base));
        });
        const allowedSet = new Set(
          allowedLocations.map((l) => normalizeLocation(l.name))
        );
        const filteredOut = out.filter((r) =>
          allowedSet.has(normalizeLocation(r.Location))
        );
        const sorted = filteredOut.sort((a, b) => {
          const ta = Date.parse(a.createdAt || "") || 0;
          const tb = Date.parse(b.createdAt || "") || 0;
          if (tb !== ta) return tb - ta;
          return (
            a.Location.localeCompare(b.Location) ||
            parseInt(a.RefNo || "0", 10) - parseInt(b.RefNo || "0", 10)
          );
        });
        const mapped = sorted.map((r, i) => ({ ...r, globalIndex: i }));
        setRecords((prev) => {
          const prevList = Array.isArray(prev) ? prev : [];
          const localUnsaved = prevList.filter(
            (x) =>
              x &&
              x.__local &&
              !mapped.some(
                (dbR) =>
                  dbR.OfficeNo === x.OfficeNo && String(dbR.Sr) === String(x.Sr)
              )
          );
          const merged = [...mapped, ...localUnsaved];
          const ordered = merged.sort((a, b) => {
            if (!!a.__local !== !!b.__local) return a.__local ? 1 : -1;
            const ta = Date.parse(a.createdAt || "") || 0;
            const tb = Date.parse(b.createdAt || "") || 0;
            if (tb !== ta) return tb - ta;
            return (
              a.Location.localeCompare(b.Location) ||
              parseInt(a.RefNo || "0", 10) - parseInt(b.RefNo || "0", 10)
            );
          });
          return ordered.map((r, i) => ({ ...r, globalIndex: i }));
        });
        setIsLoading(false);
      },
      (e) => {
        console.error(e);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, [allowedLocations, serverMonth]);
  const generateRefNo = useCallback(async () => {
    const snap = await get(ref(db, "excel_records"));
    const keys = Object.keys(snap.val() || {});
    const re = new RegExp(`-${yearPair}-(\\d{3,})$`);
    const nums = keys
      .map((k) => {
        const m = k.match(re);
        return m ? parseInt(m[1], 10) : null;
      })
      .filter((n) => n != null)
      .sort((a, b) => a - b);
    const maxVal = nums.length > 0 ? Math.max(...nums) : 0;
    const nextVal = Math.max(maxVal, 6500) + 1;
    return nextVal.toString().padStart(3, "0");
  }, [yearPair]);

  const getNextRefNoForYP = useCallback(
    async (yp) => {
      console.log("=== getNextRefNoForYP called with yp:", yp);
      const snap = await get(ref(db, "excel_records"));
      const data = snap.val() || {};
      console.log("Database records count:", Object.keys(data).length);
      let maxN = 0;

      // Extract year parts for flexible matching
      const [y1, y2] = yp.split("-");
      const fullYear = `${2000 + parseInt(y1)}-${y2}`;
      console.log("Searching for year patterns:", yp, "or", fullYear);

      Object.entries(data).forEach(([k, v]) => {
        // Check if this record belongs to the current year pair
        let belongs = false;

        // Check OfficeNo field (most reliable)
        if (v?.OfficeNo) {
          const office = String(v.OfficeNo);
          if (office.includes(`/${yp}`) || office.includes(`/${fullYear}`)) {
            belongs = true;
          }
        }

        // Check key itself as fallback
        if (!belongs) {
          if (k.includes(`-${yp}-`) || k.includes(`-${yp}_`) ||
            k.includes(`_${yp}-`) || k.includes(`_${yp}_`) ||
            k.includes(`-${fullYear}-`) || k.includes(`-${fullYear}_`) ||
            k.includes(`_${fullYear}-`) || k.includes(`_${fullYear}_`)) {
            belongs = true;
          }
        }

        if (belongs && v?.RefNo) {
          const n = parseInt(v.RefNo, 10);
          if (!isNaN(n) && n > maxN) {
            maxN = n;
          }
        }
      });

      // Also check local records in state
      records.forEach((r) => {
        const y = yearPairForRecord(r);
        if (y === yp && r.RefNo) {
          const n = parseInt(r.RefNo, 10);
          if (!isNaN(n) && n > maxN) {
            maxN = n;
          }
        }
      });

      // Check reserved row in state
      const reservedYP = dateFilter ? yearPairFromDate(dateFilter) : "";
      if (reservedRow?.committedRefNo && reservedYP === yp) {
        const n = parseInt(reservedRow.committedRefNo, 10);
        if (!isNaN(n) && n > maxN) {
          maxN = n;
        }
      }

      const nextRefNo = (Math.max(maxN, 6500) + 1).toString().padStart(3, "0");
      console.log("=== Final result: maxN =", maxN, ", returning:", nextRefNo);
      return nextRefNo;
    },
    [records, yearPairForRecord, reservedRow, dateFilter]
  );

  const assignRefNoImmediate = useCallback(
    async (gi, yp) => {
      try {
        const nextNo = await getNextRefNoForYP(yp);
        setRecords((prev) => {
          if (gi < 0 || gi >= prev.length) return prev;
          const next = [...prev];
          const rec = next[gi];
          // re-validate row is still complete and RefNo empty and YP unchanged
          if (
            isRecordComplete(rec) &&
            !rec.RefNo &&
            yearPairForRecord(rec) === yp
          ) {
            next[gi] = { ...rec, RefNo: nextNo };
          }
          return next;
        });
      } catch (e) {
        console.error("assignRefNoImmediate failed", e);
      }
    },
    [getNextRefNoForYP, isRecordComplete, yearPairForRecord]
  );

  const handleDeleteByOffice = useCallback((officeNo, sr) => {
    if (!officeNo) return;
    setRecords((prev) => {
      // Filter out the deleted row
      const filtered = prev.filter(
        (r) => !(r.OfficeNo === officeNo && String(r.Sr) === String(sr))
      );
      // Renumber the remaining rows
      return filtered.map((r, i) => ({
        ...r,
        Sr: (i + 1).toString(),
        globalIndex: i,
      }));
    });
    setDeleteSnack({ open: true, message: "Row deleted" });
  }, []);

  const onChangeField = useCallback(
    (gi, field, value) => {
      let assignInfo = null;
      let validationUpdate = null;
      setRecords((prev) => {
        if (gi < 0 || gi >= prev.length) return prev;
        const next = [...prev];
        let rec = { ...next[gi] };

        // Apply the field change
        if (field === "Amount") {
          if (value === "") {
            rec.Amount = "";
          } else {
            const n = Number(value);
            rec.Amount = isNaN(n) ? "" : Math.max(0, n);
          }
        } else if (field === "GST") rec.GST = value === "" ? "" : Number(value);
        else if (field === "FMV") {
          if (value === "") rec.FMV = "";
          else {
            const n = Number(value);
            rec.FMV = isNaN(n) ? "" : Math.max(0, n);
          }
        } else rec[field] = value;

        rec = recomputeTotals(rec);
        if (!rec.Month) rec.Month = serverMonth;

        // Keep OfficeNo in sync with current Location and year pair when relevant fields change
        if (["Location", "VisitDate", "ReportDate"].includes(field)) {
          const locName = rec.Location === "PCMC" ? "Pune" : rec.Location;
          const yp = yearPairForRecord(rec);
          rec.OfficeNo = `DVM/${shortOf(locName)}/${yp}`;
        }

        // Mark as dirty to indicate unsaved changes
        rec = { ...rec, __dirty: true };
        next[gi] = rec;

        // compute validation for this row
        const miss = getMissingFields(rec);
        validationUpdate = { gi, fields: Array.from(miss) };

        // If row has become complete and has no RefNo, schedule assignment
        if (isRecordComplete(rec) && !rec.RefNo) {
          const yp = yearPairForRecord(rec);
          assignInfo = { gi, yp };
        }

        return next;
      });

      if (validationUpdate) {
        setValidationMap((prev) => {
          const next = { ...prev };
          if (validationUpdate.fields.length > 0) {
            next[validationUpdate.gi] = validationUpdate.fields;
          } else {
            delete next[validationUpdate.gi];
          }
          return next;
        });
      }

      if (assignInfo) {
        assignRefNoImmediate(assignInfo.gi, assignInfo.yp);
      }
    },
    [
      assignRefNoImmediate,
      isRecordComplete,
      yearPairForRecord,
      getMissingFields,
      serverMonth,
      recomputeTotals,
      shortOf,
    ]
  );

  const handleAddRecord = useCallback(
    async (loc) => {
      if (!loc) {
        alert("Select a location first.");
        return;
      }
      const actual = loc;
      const OfficeNo = `DVM/${shortOf(actual)}/${yearPair}`;
      setRecords((prev) => {
        const sr =
          Math.max(
            0,
            ...prev
              .filter((r) => r.Location === actual)
              .map((r) => parseInt(r.Sr) || 0)
          ) + 1;
        const newRec = recomputeTotals({
          Sr: sr.toString(),
          globalSr: "",
          OfficeNo,
          RefNo: "",
          Month: serverMonth,
          VisitDate: "",
          ReportDate: "",
          TechnicalExecutive: "",
          Bank: "",
          Branch: "",
          ClientName: "",
          ClientContactNo: "",
          Locations: "",
          Location: actual,
          CaseInitiated: "",
          Engineer: "",
          VisitStatus: false,
          ReportStatus: "",
          SoftCopy: false,
          Print: false,
          FMV: "",
          Amount: "",
          GST: 0,
          BillStatus: "",
          ReceivedOn: "",
          RecdDate: "",
          GSTNo: "",
          Remark: "",
          createdAt: dateFilter || serverDate.toISOString(),
          __dirty: false,
          __local: true,
        });
        const merged = [...prev, newRec]
          .sort(
            (a, b) =>
              a.Location.localeCompare(b.Location) ||
              parseInt(a.Sr) - parseInt(b.Sr)
          )
          .map((r, i) => ({ ...r, globalIndex: i }));
        return merged;
      });
      setTimeout(() => {
        if (tableRef.current) {
          const last = tableRef.current.querySelector("tr:last-child");
          last && last.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    },
    [yearPair]
  );

  const saveRecords = useCallback(
    async (recs) => {
      const complete = recs.filter(isRecordComplete);
      if (!complete.length) return;

      // START VALIDATION: Check for 10-digit contact numbers
      for (const r of complete) {
        if (r.ClientContactNo) {
          const digits = r.ClientContactNo.replace(/\D/g, "");
          if (digits.length !== 10) {
            setErrorSnack({
              open: true,
              message: `ClientContactNo must be exactly 10 digits. Row Sr: ${r.Sr}`,
            });
            return false;
          }
        }
      }
      // END VALIDATION

      // Split into New (no RefNo) vs Existing (has RefNo)
      const newRecords = complete.filter(r => !r.RefNo);
      const existingRecords = complete.filter(r => r.RefNo);

      // 1. Handle New Records via Cloud Function
      if (newRecords.length > 0) {
        if (!auth.currentUser) {
          alert("You must be logged in to save new records. Please refresh the page or log in again.");
          return false;
        }
        const createExcelRecord = httpsCallable(functions, 'createExcelRecord');

        await Promise.all(newRecords.map(async (r) => {
          try {
            // Prepare payload - strip internal fields
            const payload = { ...r };
            delete payload.__dirty;
            delete payload.__local;
            delete payload.globalIndex;
            delete payload.RefNo; // Ensure we don't send empty string if present

            // Ensure defaults
            payload.Amount = payload.Amount || "";
            payload.GST = payload.GST || 0;
            payload.Total = payload.Total || "";
            payload.FMV = payload.FMV || "";

            const response = await createExcelRecord(payload);
            const result = response.data; // { success, refNo, key, officeNo }

            if (result && result.success) {
              // Update local state with returned values
              setRecords(prev => {
                const next = [...prev];
                const idx = next.findIndex(item => item.globalIndex === r.globalIndex);
                if (idx !== -1) {
                  next[idx] = {
                    ...next[idx],
                    RefNo: result.refNo,
                    OfficeNo: result.officeNo,
                    // Key isn't stored in record object usually, but helpful if we need it
                    __dirty: false,
                    __local: false
                  };
                }
                return next;
              });
            }
          } catch (err) {
            console.error("Failed to create record via function:", err);
            // Should we throw so outer catch block handles it?
            throw err;
          }
        }));
      }

      // 2. Handle Existing Records via Direct DB Update
      if (existingRecords.length > 0) {
        await Promise.all(
          existingRecords.map(async (r) => {
            const key = toKey(r); // Helper that constructs key from record
            await set(ref(db, `excel_records/${key}`), {
              ...r,
              VisitStatus: !!r.VisitStatus,
              SoftCopy: !!r.SoftCopy,
              Print: !!r.Print,
              __dirty: null, // Don't save these to DB
              __local: null,
              globalIndex: null
            });

            // Update local state to clean dirty flag
            setRecords(prev => {
              const next = [...prev];
              const idx = next.findIndex(item => item.globalIndex === r.globalIndex);
              if (idx !== -1) {
                next[idx] = { ...next[idx], __dirty: false, __local: false };
              }
              return next;
            });
          })
        );
      }
      return true;
    },
    [yearPairForRecord, records, isRecordComplete, serverDate]
  );

  const doSave = useCallback(
    async (recList) => {
      // update validation highlights for provided records
      const updates = {};
      recList.forEach((r) => {
        const miss = getMissingFields(r);
        if (miss.size) updates[r.globalIndex] = Array.from(miss);
      });
      setValidationMap((prev) => {
        const next = { ...prev };
        // apply updates for the targeted records only
        recList.forEach((r) => {
          if (updates[r.globalIndex]?.length)
            next[r.globalIndex] = updates[r.globalIndex];
          else delete next[r.globalIndex];
        });
        return next;
      });

      // Filter only complete records for saving
      const complete = recList.filter(isRecordComplete);
      const count = complete.length;

      // If no complete records, show error
      if (count === 0) {
        setErrorSnack({
          open: true,
          message: "Please fill all required fields to save records",
        });
        return;
      }

      setIsSaving(true);

      try {
        const success = await saveRecords(complete);
        if (success === false) return;

        // Clear editing state for saved rows
        setEditingRows((prev) => {
          const next = new Set(prev);
          complete.forEach((rec) => next.delete(rec.globalIndex));
          return next;
        });

        setSuccessSnack({
          open: true,
          message: `${count} record${count > 1 ? "s" : ""} saved successfully`,
        });
      } catch (error) {
        console.error("Error saving records:", error);

        setErrorSnack({
          open: true,
          message: "An error occurred while saving. Please try again.",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [saveRecords, isRecordComplete, getMissingFields]
  );

  const handleToggleEdit = useCallback((globalIndex) => {
    setEditingRows((prev) => {
      const next = new Set(prev);
      if (next.has(globalIndex)) {
        next.delete(globalIndex);
      } else {
        next.add(globalIndex);
      }
      return next;
    });
  }, []);



  const handleSaveRow = useCallback(
    (gi) => {
      const record = records.find((r) => r.globalIndex === gi);
      if (!record) {
        setErrorSnack({
          open: true,
          message: "Record not found",
        });
        return;
      }
      if (!record.__dirty) {
        setErrorSnack({
          open: true,
          message: "No changes to save",
        });
        return;
      }
      setConfirmState({ open: true, scope: "row", rowIndex: gi });
    },
    [records]
  );

  const filtered = useMemo(() => {
    const base = records.filter(
      (r) => !selectedLocation || r.Location === selectedLocation
    );
    let arr = base.slice();
    if (dateFilter) {
      arr = arr.filter((r) => {
        const s1 = String(r.ReportDate || r.VisitDate || "").trim();
        const iso1 = /^\d{4}-\d{2}-\d{2}$/.test(s1)
          ? s1
          : (function () {
            const m = s1.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
            if (!m) return "";
            const dd = m[1].padStart(2, "0");
            const mm = m[2].padStart(2, "0");
            let yy = m[3];
            if (yy.length === 2) yy = (2000 + parseInt(yy, 10)).toString();
            return `${yy}-${mm}-${dd}`;
          })();
        const s2 = String(r.createdAt || "").trim();
        const iso2 = /^\d{4}-\d{2}-\d{2}$/.test(s2)
          ? s2
          : (function () {
            if (!s2) return "";
            const d = new Date(s2);
            if (isNaN(d.getTime())) return "";
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
          })();
        if (iso2) return iso2 === dateFilter;
        if (iso1) return iso1 === dateFilter;
        return false;
      });
    }
    if (sortBy === "pending" || sortBy === "credit") {
      const target = sortBy === "pending" ? "pending" : "credit";
      arr = arr.filter(
        (r) => String(r.BillStatus || "").toLowerCase() === target
      );
    }
    if (searchText && searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      arr = arr.filter((r) => {
        const refDisp = String(formatRefDisplay(r) || "").toLowerCase();
        const refNo = String(r.RefNo || "").toLowerCase();
        const client = String(r.ClientName || "").toLowerCase();
        const gst = String(r.GSTNo || "").toLowerCase();
        return (
          refDisp.includes(q) ||
          refNo.includes(q) ||
          client.includes(q) ||
          gst.includes(q)
        );
      });
    }

    // Sort logic: if date filter is active, sort by createdAt desc then RefNo desc
    // If no date filter, sort by RefNo desc
    arr.sort((a, b) => {
      if (!!a.__local !== !!b.__local) return a.__local ? 1 : -1;

      if (dateFilter) {
        // When date filter is active, sort by createdAt descending first
        const ta = Date.parse(a.createdAt || "") || 0;
        const tb = Date.parse(b.createdAt || "") || 0;
        if (tb !== ta) return tb - ta;
        return (
          a.Location.localeCompare(b.Location) ||
          parseInt(b.RefNo || "0", 10) - parseInt(a.RefNo || "0", 10)
        );
      } else {
        // When no date filter, sort by RefNo descending only
        const refA = parseInt(a.RefNo || "0", 10);
        const refB = parseInt(b.RefNo || "0", 10);
        if (refB !== refA) return refB - refA;
        const ta = Date.parse(a.createdAt || "") || 0;
        const tb = Date.parse(b.createdAt || "") || 0;
        if (tb !== ta) return tb - ta;
        return a.Location.localeCompare(b.Location);
      }
    });
    return arr;
  }, [
    records,
    selectedLocation,
    sortBy,
    dateFilter,
    searchText,
    formatRefDisplay,
  ]);

  const displayRows = useMemo(() => {
    // Reserved row logic removed as per request.
    return filtered;
  }, [filtered]);

  useEffect(() => {
    const update = () => {
      const el = tableRef.current;
      if (!el) return;
      const thead = el.querySelector("thead");
      const row = el.querySelector("tbody tr");
      const headerH = thead ? thead.getBoundingClientRect().height : 44;
      const rowH = row ? row.getBoundingClientRect().height : 44;
      setScrollMaxHeight(Math.round(headerH + rowH * 10));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [displayRows.length]);

  const groups = useMemo(() => {
    if (!filtered.length) return [];
    if (!selectedLocation && allowedLocations.length > 1) {
      return [
        {
          location: "All Locations",
          records: filtered.map((r, i) => ({ ...r, Sr: (i + 1).toString() })),
        },
      ];
    }
    const map = new Map();
    filtered.forEach((r) => {
      if (!map.has(r.Location)) map.set(r.Location, []);
      map.get(r.Location).push(r);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([location, records]) => ({ location, records }));
  }, [filtered, selectedLocation, allowedLocations.length]);

  const downloadFor = useCallback(
    (_loc) => {
      const list = [...filtered].sort(
        (a, b) => parseInt(a.RefNo, 10) - parseInt(b.RefNo, 10)
      );
      const data = list.map((r, i) => ({
        Sr: selectedLocation ? r.Sr : (i + 1).toString(),
        Month: r.Month,
        Office: (() => {
          const loc = r.Location === "PCMC" ? "Pune" : r.Location;
          return `DVM/${shortOf(loc)}/${yearPair}`;
        })(),
        "Ref No": (() => {
          const refStr = r.RefNo || r.committedRefNo || "";
          return refStr ? String(refStr).padStart(3, "0") : "";
        })(),
        "Visit Date": toDisplayDate(r.VisitDate),
        "Report Date": toDisplayDate(r.ReportDate),
        "Technical Executive": r.TechnicalExecutive || "",
        Bank: r.Bank,
        Branch: r.Branch,
        "Client Name": r.ClientName,
        "Client Contact No": r.ClientContactNo,
        Locations: r.Locations || "",
        "Case Initiated": r.CaseInitiated || "",
        Engineer: r.Engineer || "",
        "Visit Status": r.VisitStatus ? "TRUE" : "FALSE",
        FMV: Number(r.FMV) || 0,
        "Report Status": r.ReportStatus,
        "Soft Copy": r.SoftCopy ? "TRUE" : "FALSE",
        Print: r.Print ? "TRUE" : "FALSE",
        Amount: Number(r.Amount) || 0,
        "GST (18%)": Number(r.GST) || 0,
        Total: (Number(r.Amount) + Number(r.GST)).toFixed(2),
        "Bill Status": r.BillStatus || "",
        "Received On": r.ReceivedOn,
        "Recd Date": toDisplayDate(r.RecdDate),
        "GST No": r.GSTNo || "",
        Remark: r.Remark,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bank Visits");
      XLSX.writeFile(wb, `Excel_Records_${selectedLocation || "All"}.xlsx`);
    },
    [filtered, selectedLocation, formatRefDisplay]
  );

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 ">
      <PageHeader
        title="Excel Sheets"
        subtitle="Search, filter, add and export bank visit records."
        right={
          <div className="px-4 py-1.5 rounded-full border border-gray-300 bg-white text-gray-700 text-base flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-600"
              aria-hidden="true"
            ></span>
            <span className="font-bold">Branch:</span>{" "}
            <span className="text-indigo-700">
              {selectedLocation
                ? selectedLocation === "PCMC"
                  ? "Pune"
                  : selectedLocation
                : "All"}
            </span>
          </div>
        }
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
            title="Search & Actions"
            recordsCount={filtered.length}
            recordsLabel="Excel Records"
            contentClassName="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3"
            rightPrimary={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  title="Add Data"
                  onClick={() => handleAddRecord(selectedLocation)}
                  disabled={!selectedLocation || dateFilter !== todayYmd}
                  className={`px-3 py-2 rounded-md text-sm flex items-center gap-2 ${!selectedLocation || dateFilter !== todayYmd
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                >
                  <FiPlus />
                  <span className="hidden sm:inline">Add Data</span>
                </button>

                <button
                  type="button"
                  title="Download"
                  aria-label="Download"
                  onClick={() => downloadFor(selectedLocation || "All")}
                  disabled={filtered.length === 0}
                  className={`px-3 py-2 rounded-md flex items-center gap-2 text-sm ${filtered.length === 0
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700"
                    }`}
                  style={{
                    fontFamily:
                      "'Inter', 'Segoe UI', Roboto, Arial, 'Helvetica Neue', sans-serif",
                  }}
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
            <div className="shrink-0 sm:min-w-[224px]">
              <DatePicker
                value={dateFilter}
                onChange={(val) => {
                  setDateFilter(val);
                  autoDateRef.current = false;
                }}
                onClear={() => {
                  setDateFilter("");
                  autoDateRef.current = false;
                }}
                label="Filter by Date"
              />
            </div>

            <div className="shrink-0 self-end">
              <div
                className="inline-flex rounded-md overflow-hidden border border-gray-300 bg-white"
                role="group"
                aria-label="Filter by Bill Status"
              >
                <button
                  type="button"
                  onClick={() => setSortBy("all")}
                  className={`px-3 py-2 text-sm border-r ${sortBy === "all"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("pending")}
                  className={`px-3 py-2 text-sm border-r ${sortBy === "pending"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("credit")}
                  className={`px-3 py-2 text-sm ${sortBy === "credit"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  Credit
                </button>
              </div>
            </div>
          </SearchActionsCard>

          <div
            className="overflow-x-auto overflow-y-auto bg-white rounded-lg border border-gray-200 shadow-sm"
            ref={tableRef}
            style={{
              maxHeight: scrollMaxHeight ? `${scrollMaxHeight}px` : undefined,
            }}
          >
            <table className="w-full border-collapse text-xs sm:text-sm">
              <thead className="bg-indigo-600 text-white sticky top-0 z-30">
                <tr>
                  {headers.map((h) => (
                    <th
                      key={h}
                      className={`px-2 py-2 sm:py-3 text-center font-bold border border-gray-200 whitespace-nowrap ${minw(
                        h
                      )}`}
                    >
                      {h === "Sr No"
                        ? "Sr No"
                        : h === "Month"
                          ? "Month"
                          : h === "OfficeNo"
                            ? "Office"
                            : h === "RefNo"
                              ? "Ref No"
                              : h === "VisitDate"
                                ? "Visit Date"
                                : h === "ReportDate"
                                  ? "Report Date"
                                  : h === "TechnicalExecutive"
                                    ? "Technical Executive"
                                    : h === "Bank"
                                      ? "Bank"
                                      : h === "Branch"
                                        ? "Branch"
                                        : h === "ClientName"
                                          ? "Client Name"
                                          : h === "ClientContactNo"
                                            ? "Contact"
                                            : h === "Locations"
                                              ? "Location"
                                              : h === "CaseInitiated"
                                                ? "Case Initiated"
                                                : h === "Engineer"
                                                  ? "Engineer"
                                                  : h === "VisitStatus"
                                                    ? "Visit Status"
                                                    : h === "ReportStatus"
                                                      ? "Case Report Status"
                                                      : h === "SoftCopy"
                                                        ? "Soft Copy"
                                                        : h === "Print"
                                                          ? "Print"
                                                          : h === "Amount"
                                                            ? "Amount"
                                                            : h === "GST"
                                                              ? "GST (18%)"
                                                              : h === "Total"
                                                                ? "Total"
                                                                : h === "BillStatus"
                                                                  ? "Bill Status"
                                                                  : h === "ReceivedOn"
                                                                    ? "Received On"
                                                                    : h === "RecdDate"
                                                                      ? "Received Date"
                                                                      : h === "GSTNo"
                                                                        ? "GST No"
                                                                        : h === "Remark"
                                                                          ? "Remark"
                                                                          : h === "Action"
                                                                            ? "Actions"
                                                                            : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.length ? (
                  displayRows.map((rec, idx) => {
                    const isSynthetic = rec.globalIndex === -1;
                    const showDelete = isSynthetic
                      ? false
                      : isBlankForDelete(rec);
                    return (
                      <TableRow
                        key={`row-${idx}-${rec.globalIndex}`}
                        record={rec}
                        index={idx}
                        onChangeField={onChangeField}
                        onSaveRow={handleSaveRow}
                        groupRecords={displayRows}
                        dropdownOptions={uiOptions}
                        formatRef={formatRefDisplay}
                        missingFields={
                          isSynthetic
                            ? new Set()
                            : new Set(validationMap[rec.globalIndex] || [])
                        }
                        showDelete={showDelete}
                        onDeleteRow={handleDeleteByOffice}
                        readOnlyRow={isSynthetic}
                        serverMonth={serverMonth}
                        serverYearPair={yearPair}
                        isComplete={isRecordComplete(rec)}
                        editingRows={editingRows}
                        onToggleEdit={handleToggleEdit}
                      />
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={headers.length}
                      className="px-4 py-6 text-center text-gray-600"
                    >
                      No records found
                      {selectedLocation ? ` for ${selectedLocation}` : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {confirmVisible && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${confirmShowing ? "opacity-100" : "opacity-0"
                  }`}
              />
              <div
                role="dialog"
                aria-modal="true"
                className={`relative bg-white rounded-lg shadow-lg p-6 w-full max-w-md transition-all duration-200 transform ${confirmShowing
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-95 -translate-y-1"
                  }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FiAlertTriangle className="text-amber-500 text-xl" />
                  <h3 className="text-lg font-semibold text-gray-800">
                    Confirm Save
                  </h3>
                </div>
                <p className="text-gray-600 mb-4 whitespace-pre-line">
                  {confirmState.rowIndex === -1
                    ? `You are about to save the reserved row.
Please verify all fields before saving.`
                    : `You are about to save changes to this row.
Please ensure the data is accurate before proceeding.`}
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() =>
                      setConfirmState({
                        open: false,
                        scope: "",
                        rowIndex: null,
                      })
                    }
                    className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const recs = [
                        records.find(
                          (r) => r.globalIndex === confirmState.rowIndex
                        ),
                      ].filter(Boolean);
                      setConfirmState({
                        open: false,
                        scope: "",
                        rowIndex: null,
                      });
                      doSave(recs);
                    }}
                    className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ring-1 ring-black/10 transition ${successSnack.open
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2 pointer-events-none"
              } bg-green-600 text-white`}
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              <FiCheckCircle className="text-white text-xl" />
              <span className="font-medium">{successSnack.message}</span>
              <button
                onClick={() => setSuccessSnack((s) => ({ ...s, open: false }))}
                className="ml-2 p-1 rounded hover:bg-white/10 focus:outline-none"
                aria-label="Close"
              >
                <FiX className="text-white text-lg" />
              </button>
            </div>
          </div>
          <div
            className={`fixed top-16 right-4 z-50 px-4 py-2 rounded-md shadow transition ${errorSnack.open
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2 pointer-events-none"
              } bg-red-600 text-white`}
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium">{errorSnack.message}</span>
              <button
                onClick={() => setErrorSnack((s) => ({ ...s, open: false }))}
                className="p-1 rounded hover:bg-white/10 focus:outline-none"
                aria-label="Close"
              >
                <FiX className="text-white text-lg" />
              </button>
            </div>
          </div>
          <div
            className={`fixed top-28 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ring-1 ring-black/10 transition ${deleteSnack.open
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2 pointer-events-none"
              } bg-slate-800 text-white`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              <FiTrash2 className="text-white text-xl" />
              <span className="font-medium">{deleteSnack.message}</span>
              <button
                onClick={() => setDeleteSnack((s) => ({ ...s, open: false }))}
                className="ml-2 p-1 rounded hover:bg-white/10 focus:outline-none"
                aria-label="Close"
              >
                <FiX className="text-white text-lg" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Excel;
