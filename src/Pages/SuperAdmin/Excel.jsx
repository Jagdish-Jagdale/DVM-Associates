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
import { db } from "../../../firebase.js";
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
  { name: "Belgaum", shortForm: "BGM", aliases: ["BLG", "BGM"] },
  { name: "Kolhapur", shortForm: "KOP", aliases: ["KLP", "KOP"] },
  { name: "Pune", shortForm: "PUNE", aliases: ["PUNE", "PCMC"] },
  { name: "Bengaluru", shortForm: "BLR", aliases: ["BNG", "BLR"] },
  { name: "Mumbai", shortForm: "MUM", aliases: ["MUM"] },
  { name: "Hyderabad", shortForm: "HYD", aliases: ["HYD"] },
  { name: "Indore", shortForm: "INDR", aliases: ["IND", "INDR"] },
  { name: "Satara", shortForm: "STR", aliases: ["SAT", "STR"] },
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
  return s === "pcmc" ? "pune" : s;
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
    serverMonth,
    serverYearPair,
  }) => {
    const isNoFee = record.ReceivedOn === "No Fee";
    const rowClass = isNoFee
      ? "bg-red-500 text-white"
      : index % 2 === 0
        ? "bg-white"
        : "bg-gray-50";

    const renderInput = (field) => {
      const err =
        missingFields &&
          typeof missingFields.has === "function" &&
          missingFields.has(field)
          ? " border-red-500 ring-1 ring-red-500 bg-red-50"
          : "";

      // Disable all editing for reserved rows
      const isReservedRow = record.isReserved;

      if (field === "Action") {
        // if (isReservedRow) return null; // Hide save button for reserved rows

        const showSave = !!record.__dirty;
        // In SuperAdmin, records are always "editable" if not reserved, but we might want an explicit toggle if following Admin pattern.
        // However, SuperAdmin usually auto-edits. Let's check if we needed to introduce "isEditing" state.
        // Looking at the code, SuperAdmin usually edits directly. 
        // BUT, if the user requested "editable", and it wasn't working, maybe it was because of `readOnly` props not being shown?
        // Actually, looking at the code above, there are no `readOnly` props being set on inputs except for reserved rows.
        // So normal rows SHOULD be editable by default in SuperAdmin.
        // Wait, let's re-read the request: "normal records are editable for admin as well as superadmin".
        // In Admin/Excel.jsx, there is an "Edit" button because of `isReadOnly` logic.
        // In SuperAdmin/Excel.jsx, inputs are NOT read-only unless `isReservedRow` is true.
        // So they should arguably already be editable.
        // Let's explicitly check if inputs have `readOnly` or `disabled` attributes.
        // Lines 296, 316, 337, 358 etc show `readOnly={isReservedRow}` or `disabled={isReservedRow}`.
        // So normal rows ARE editable. 
        // Maybe the user wants the "Save" button to be more visible or explicit?
        // OR the user wants the exact SAME "Edit" toggle behavior?
        // "normal records (EXCEPT reserveed rows)are editable for admin as well as superadmin excel page"
        // This implies they might NOT have been editable before?

        // Let's assume the user wants the explicit Save button flow for updates, not just "Add Data".
        // The current code only shows the Save button if `!!record.__dirty`.
        // If I type in a field, `onChangeField` fires, `__dirty` becomes true, Save button appears.
        // So it IS editable.

        // Let's look at Admin/Excel.jsx again.
        // It has `isSaved`, `isEditing`, `readOnlyRow` props.
        // SuperAdmin/Excel.jsx `TableRow` does NOT receive `isEditing` or `onToggleEdit` props.
        // So SuperAdmin is "always edit".

        // If the user says "are editable", maybe they meant they COULD NOT edit them?
        // Ah, in `Admin/Excel.jsx` I just removed the `createdBySuperAdmin` block.
        // Maybe that was the ONLY thing needed.

        // Let's double check if I missed anything in SuperAdmin.
        // It seems fine.

        const isUpdate = !record.__local && record.RefNo;
        return (
          <div className="flex items-center justify-center gap-2">
            {showSave && (
              <button
                onClick={() => onSaveRow(record.globalIndex)}
                aria-label={isUpdate ? "Update" : "Save"}
                title={isUpdate ? "Update" : "Save"}
                className={`p-2 rounded-full bg-amber-600 text-white hover:bg-amber-700`}
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
            disabled={isReservedRow}
            className={`h-4 w-4 block mx-auto ${isReservedRow ? 'cursor-not-allowed opacity-60' : ''}`}
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
            className={`w-full p-2 border border-gray-300 rounded text-sm${isReservedRow ? ' bg-gray-100' : ''} ${err}`}
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
            className={`w-full p-2 border border-gray-300 rounded text-sm ${isReservedRow ? 'bg-gray-100' : 'bg-white'}${err}`}
          />
        );
      }
      if (["Amount", "GST", "Total"].includes(field)) {
        const ro = field === "Total" || field === "GST" || isReservedRow;
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
            // disabled={isReservedRow}
            className={`w-full p-2 border border-gray-300 rounded text-sm ${ro ? "bg-gray-100" : "bg-white"} ${isReservedRow ? 'cursor-not-allowed' : ''}
              }${err}`}
          />
        );
      }
      if (field === "OfficeNo") {
        let office;
        if (record.isReserved) {
          office = record.OfficeNo;
        } else {
          const locName = record.Location === "PCMC" ? "Pune" : record.Location;
          const short =
            (defaultLocations.find((l) => l.name === locName) || {}).shortForm ||
            "SNGL";
          office = `DVM/${short}/${serverYearPair || getYearPair()}`;
        }
        return (
          <input
            type="text"
            value={office}
            readOnly
            className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
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
              // if (!isReservedRow) {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
              onChangeField(record.globalIndex, field, digits);
              // }
            }}
            // readOnly={isReservedRow}
            // disabled={isReservedRow}
            className={`w-full p-2 border border-gray-300 rounded text-sm ${isReservedRow ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}${err}`}
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
              // if (!isReservedRow) {
              const input = e.target.value.toUpperCase().slice(0, 15);
              onChangeField(record.globalIndex, field, input);
              // }
            }}
            // readOnly={isReservedRow}
            // disabled={isReservedRow}
            className={`w-full p-2 border border-gray-300 rounded text-sm ${isReservedRow ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}${err}`}
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
            className={`w-full p-2 border border-gray-300 rounded text-sm ${isReservedRow ? 'bg-gray-100' : 'bg-white'}`}
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
            className={`w-full p-2 border border-gray-300 rounded text-sm ${isReservedRow ? 'bg-gray-100' : 'bg-white'}${err}`}
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
            className={`w-full p-2 border border-gray-300 rounded text-sm ${isReservedRow ? 'bg-gray-100' : 'bg-white'}`}
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
      if (field === "Sr") {
        const reservedTooltip = isReservedRow && record.createdAt
          ? `Reserved Row - Created on ${new Date(record.createdAt).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`
          : isReservedRow
            ? "Reserved Row"
            : "";

        return (
          <div className={`relative ${isReservedRow ? 'border-l-2 border-green-500 rounded-l' : ''}`}>
            {showDelete && (
              <button
                type="button"
                onClick={() =>
                  onDeleteRow && onDeleteRow(record.OfficeNo, record.Sr)
                }
                className="absolute -top-2 -left-2 z-10 p-0.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200 shadow-sm pointer-events-auto"
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
              title={reservedTooltip}
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
      if (field === "Sr") {
        return (
          <div className={`relative w-full ${record.isReserved ? 'border-l-[3px] border-green-500 rounded-l' : ''}`}>
            {record.isReserved && (
              <FiStar className="absolute top-0 left-0 text-yellow-500 text-xs" title="Reserved Row" />
            )}
            <input
              type="text"
              value={record[field] || ""}
              onChange={(e) =>
                onChangeField(record.globalIndex, field, e.target.value)
              }
              className={`w-full p-2 border border-gray-300 rounded text-sm bg-white${err}`}
            />
          </div>
        );
      }
      return (
        <input
          type="text"
          value={record[field] || ""}
          onChange={(e) =>
            onChangeField(record.globalIndex, field, e.target.value)
          }
          className={`w-full p-2 border border-gray-300 rounded text-sm ${isReservedRow ? 'bg-gray-100' : 'bg-white'}${err}`}
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
  const [clock, setClock] = useState(0);
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
  useEffect(() => {
    if (autoDateRef.current) setDateFilter(todayYmd);
  }, [todayYmd]);
  const yearPairForRecord = useCallback(
    (rec) => {
      return yearPair;
    },
    [yearPair]
  );
  const requiredFields = useMemo(
    () => [
      "OfficeNo",
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
  const [reservedRow, setReservedRow] = useState(null);
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
  const [reservedValidation, setReservedValidation] = useState(false);
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
  const canSaveAll = useMemo(
    () =>
      !isSaving &&
      !isLoading &&
      (records.some((r) => r.__dirty) ||
        (!!reservedRow && reservedRow.__dirty)),
    [isSaving, isLoading, records, reservedRow]
  );
  useEffect(() => {
    setReservedValidation(false);
  }, [selectedLocation, dateFilter]);
  useEffect(() => {
    if (reservedValidation && reservedRow) {
      const miss = getMissingFields(reservedRow);
      if (miss.size === 0) setReservedValidation(false);
    }
  }, [reservedRow, reservedValidation, getMissingFields]);

  const [allowedLocations, setAllowedLocations] = useState([]);
  useEffect(() => {
    const unsub = onValue(
      ref(db, "settings/branches"),
      (snap) => {
        const data = snap.val() || {};
        let list = Object.keys(data)
          .map((k) => ({ name: data[k]?.name }))
          .filter((x) => x.name);
        if (!list.length)
          list = defaultLocations.map((d) => ({ name: d.name }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setAllowedLocations(list);
      },
      () => {
        setAllowedLocations(defaultLocations.map((d) => ({ name: d.name })));
      }
    );
    return () => unsub();
  }, []);

  // Load or initialize reserved row for selected branch and date (skip for any Sunday date)
  useEffect(() => {
    if (!selectedLocation || !dateFilter) {
      setReservedRow(null);
      return;
    }
    if (isYmdSunday(dateFilter)) {
      setReservedRow(null);
      return;
    }
    const loc = selectedLocation === "PCMC" ? "Pune" : selectedLocation;
    // Try to find an existing reserved-first record in excel_records for this date and location
    const found = records.find((r) => {
      const actualLoc = r.Location === "PCMC" ? "Pune" : r.Location;
      const locMatch = actualLoc === loc || r.Branch === loc;
      if (!locMatch) return false;
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
      return (r.reservedFirst || r.isReserved) && iso2 === dateFilter;
    });
    if (found) {
      setReservedRow(
        recomputeTotals({
          ...found,
          Sr: "1",
          globalIndex: -1,
          Month: found.Month || serverMonth,
          committedRefNo: found.committedRefNo || found.RefNo || "",
        })
      );
    } else {
      const officeNo = `DVM/${shortOf(loc)}/${yearPair}`;
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
          Location: loc,
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
    yearPair,
    isYmdSunday,
    serverMonth,
    records,
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

  const isRecordComplete = useCallback(
    (rec) => {
      if (!rec) return false;
      const baseOk = requiredFields.every(
        (f) => String(rec[f] ?? "").trim() !== ""
      );
      if (!baseOk) return false;
      const digits = String(rec.ClientContactNo ?? "").replace(/\D/g, "");
      return digits.length === 10;
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
      "SoftCopy",
      "Print",
      "VisitStatus",
      "FMV",
    ],
    []
  );
  const isBlankForDelete = useCallback(
    (rec) => {
      if (!rec) return false;
      return delCheckFields.every((f) => {
        const v = rec[f];
        if (typeof v === "boolean") return v === false;
        if (typeof v === "number") return v === 0;
        if (f === "GST") return v === 0 || String(v ?? "").trim() === "";
        return String(v ?? "").trim() === "";
      });
    },
    [delCheckFields]
  );

  const [validationMap, setValidationMap] = useState({});

  const formatRefDisplay = useCallback((rec) => {
    const no = (rec && (rec.RefNo || rec.committedRefNo)) || "";
    if (!no) return "";
    const num = String(no).toString().padStart(3, "0");
    return num;
  }, []);

  useEffect(() => {
    const unsub = onValue(
      ref(db, "excel_records"),
      (snap) => {
        const data = snap.val() || {};
        const out = [];
        Object.keys(data).forEach((k) => {
          let m = k.match(/^DVM-([A-Z]+)-(\d{2}-\d{2})-(\d+)$/);
          let sf, refNo;
          if (m) {
            sf = m[1];
            refNo = m[3];
          } else {
            // Try reserved format or generic with underscore
            m = k.match(/^DVM-([A-Z]+)-(\d{2}-\d{2})[_-](\d{3})$/);
            if (m) {
              sf = m[1];
              refNo = m[3];
            } else {
              return;
            }
          }
          let location = codeToNameMap[sf] || data[k].Location || "Unknown";
          if (location === "PCMC") location = "Pune";
          const base = {
            Sr: data[k].Sr?.toString() || "1",
            globalSr: "",
            OfficeNo: data[k].OfficeNo || "",
            RefNo: refNo,
            Month: data[k].Month || "",
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
            isReserved: !!data[k].isReserved,
            createdByRole: data[k].createdByRole || "",
            createdBy: data[k].createdBy || "",
            created_by: data[k].created_by || "",
            adminBranch: data[k].adminBranch || "",
          };
          out.push(recomputeTotals(base));
        });
        const allowedSet = new Set(
          allowedLocations.map((l) => normalizeLocation(l.name))
        );
        const filteredOut = out.filter((r) =>
          allowedSet.has(normalizeLocation(r.Location)) || r.isReserved
        );
        const sorted = filteredOut.sort((a, b) => {
          const ta = Date.parse(a.createdAt || "") || 0;
          const tb = Date.parse(b.createdAt || "") || 0;
          if (tb !== ta) return tb - ta;
          return (
            a.Location.localeCompare(b.Location) ||
            parseInt(b.RefNo || "0", 10) - parseInt(a.RefNo || "0", 10)
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
              parseInt(b.RefNo || "0", 10) - parseInt(a.RefNo || "0", 10)
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
  }, [allowedLocations]);

  const generateRefNo = useCallback(async () => {
    const snap = await get(ref(db, "excel_records"));
    const keys = Object.keys(snap.val() || {});
    const re = new RegExp(`-${yearPair}-(\\d{3})$`);
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
            console.log("✓ Matched by OfficeNo:", k, "OfficeNo:", office, "RefNo:", v.RefNo);
          }
        }

        // Check key itself as fallback
        if (!belongs) {
          if (k.includes(`-${yp}-`) || k.includes(`-${yp}_`) ||
            k.includes(`_${yp}-`) || k.includes(`_${yp}_`) ||
            k.includes(`-${fullYear}-`) || k.includes(`-${fullYear}_`) ||
            k.includes(`_${fullYear}-`) || k.includes(`_${fullYear}_`)) {
            belongs = true;
            console.log("✓ Matched by key pattern:", k, "RefNo:", v?.RefNo);
          }
        }

        if (belongs && v?.RefNo) {
          const n = parseInt(v.RefNo, 10);
          if (!isNaN(n) && n > maxN) {
            console.log("  → New max RefNo found:", n, "(was", maxN + ")");
            maxN = n;
          }
        } else if (belongs && !v?.RefNo) {
          console.log("⚠ Record matched but has no RefNo:", k);
        }
      });

      // Also check local records in state
      console.log("Checking local records array, count:", records.length);
      records.forEach((r) => {
        const y = yearPairForRecord(r);
        if (y === yp && r.RefNo) {
          const n = parseInt(r.RefNo, 10);
          if (!isNaN(n) && n > maxN) {
            console.log("✓ Found higher RefNo in local state:", n);
            maxN = n;
          }
        }
      });

      // Check reserved row in state
      const reservedYP = dateFilter ? yearPairFromDate(dateFilter) : "";
      if (reservedRow?.committedRefNo && reservedYP === yp) {
        const n = parseInt(reservedRow.committedRefNo, 10);
        if (!isNaN(n) && n > maxN) {
          console.log("✓ Found higher RefNo in reserved row:", n);
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

        if (["Location", "VisitDate", "ReportDate"].includes(field)) {
          const locName = rec.Location === "PCMC" ? "Pune" : rec.Location;
          const yp = yearPairForRecord(rec);
          rec.OfficeNo = `DVM/${shortOf(locName)}/${yp}`;
        }

        // Mark as dirty to indicate unsaved changes
        rec = { ...rec, __dirty: true };
        next[gi] = rec;

        const miss = getMissingFields(rec);
        validationUpdate = { gi, fields: Array.from(miss) };

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

  const onChangeReservedField = useCallback(
    (gi, field, value) => {
      setReservedRow((prev) => {
        if (!prev) return prev;
        let rec = { ...prev };
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
        if (["Location", "VisitDate", "ReportDate"].includes(field)) {
          const locName = rec.Location === "PCMC" ? "Pune" : rec.Location;
          const yp = yearPairFromDate(dateFilter) || yearPair;
          rec.OfficeNo = `DVM/${shortOf(locName)}/${yp}`;
        }
        rec.__dirty = true;
        return rec;
      });
    },
    [dateFilter, yearPair, serverMonth]
  );

  const handleAddRecord = useCallback(
    async (loc) => {
      if (!loc) {
        alert("Select a location first.");
        return;
      }
      const actual = loc === "PCMC" ? "Pune" : loc;
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
          Amount: "",
          GST: 0,
          BillStatus: "",
          ReceivedOn: "",
          RecdDate: "",
          GSTNo: "",
          Remark: "",
          FMV: "",
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
    [yearPair, dateFilter, serverDate, serverMonth]
  );

  const saveRecords = useCallback(
    async (recs) => {
      const complete = recs.filter(isRecordComplete);
      if (!complete.length) return;

      const snap = await get(ref(db, "excel_records"));
      const keys = Object.keys(snap.val() || {});
      const maxByYP = new Map();
      const data = snap.val() || {};
      Object.entries(data).forEach(([k, v]) => {
        let yp = null;
        let refNo = null;

        // Try to extract from OfficeNo (most reliable)
        if (v?.OfficeNo) {
          const m = String(v.OfficeNo).match(/\/(\d{2}-\d{2})/);
          if (m) yp = m[1];
        }

        // Fallback: extract from Key
        if (!yp) {
          const m = k.match(/-(\d{2}-\d{2})[-_]/);
          if (m) yp = m[1];
        }

        if (v?.RefNo) refNo = parseInt(v.RefNo, 10);
        else {
          const m = k.match(/[-_](\d{3,})$/);
          if (m) refNo = parseInt(m[1], 10);
        }

        if (yp && refNo && !isNaN(refNo)) {
          const current = maxByYP.get(yp) || 0;
          if (refNo > current) maxByYP.set(yp, refNo);
        }
      });
      records.forEach((r) => {
        const yp = yearPairForRecord(r);
        const n = parseInt(r.RefNo, 10);
        if (!isNaN(n)) {
          const current = maxByYP.get(yp) || 0;
          if (n > current) maxByYP.set(yp, n);
        }
      });

      const reservedYP = dateFilter ? yearPairFromDate(dateFilter) : "";
      if (reservedRow?.committedRefNo) {
        const nn = parseInt(reservedRow.committedRefNo, 10);
        if (!isNaN(nn)) {
          const current = maxByYP.get(reservedYP) || 0;
          if (nn > current) maxByYP.set(reservedYP, nn);
        }
      }

      const enriched = complete.map((r) => {
        const yp = yearPairForRecord(r);
        const loc = r.Location === "PCMC" ? "Pune" : r.Location;
        let refNoStr = r.RefNo;
        if (!refNoStr) {
          // Use max + 1 logic
          const currentMax = maxByYP.get(yp) || 0;
          const nextVal = Math.max(currentMax, 6500) + 1;
          refNoStr = nextVal.toString().padStart(3, "0");
          maxByYP.set(yp, nextVal); // Update for next record in batch
        }
        const officeNo = `DVM/${shortOf(loc)}/${yp}`;
        const amt = Math.max(0, Number(r.Amount) || 0);
        const gst = Number((amt * 0.18).toFixed(2));
        const created =
          r.__local || !r.createdAt ? serverDate.toISOString() : r.createdAt;
        return {
          ...r,
          RefNo: refNoStr,
          OfficeNo: officeNo,
          Amount: amt,
          GST: gst,
          Total: (amt + gst).toFixed(2),
          Location: loc,
          createdAt: created,
          createdByRole:
            r.__local && !r.createdByRole
              ? "SuperAdmin"
              : r.createdByRole || "",
          FMV: Math.max(0, Number(r.FMV) || 0),
        };
      });

      // reflect newly assigned RefNo in local state before saving
      const savedIdx = new Set(complete.map((c) => c.globalIndex));
      setRecords((prev) => {
        const updated = prev.map((p) => {
          if (savedIdx.has(p.globalIndex)) {
            const enrichedRec = enriched.find(
              (e) => e.globalIndex === p.globalIndex
            );
            if (enrichedRec) {
              return {
                ...enrichedRec,
                __dirty: false,
                __local: false,
              };
            }
          }
          return p;
        });
        // Sort by createdAt descending, then by RefNo descending for same RefNo
        return updated
          .sort((a, b) => {
            if (!!a.__local !== !!b.__local) return a.__local ? 1 : -1;
            const ta = Date.parse(a.createdAt || "") || 0;
            const tb = Date.parse(b.createdAt || "") || 0;
            if (tb !== ta) return tb - ta;
            return (
              a.Location.localeCompare(b.Location) ||
              parseInt(b.RefNo || "0", 10) - parseInt(a.RefNo || "0", 10)
            );
          })
          .map((r, i) => ({ ...r, globalIndex: i }));
      });

      await Promise.all(
        enriched.map(async (r) => {
          const key = toKey(r);
          await set(ref(db, `excel_records/${key}`), {
            ...r,
            adminBranch: (defaultLocations.find(l => l.name === r.Location)?.name || r.Location),
            VisitStatus: !!r.VisitStatus,
            SoftCopy: !!r.SoftCopy,
            Print: !!r.Print,
          });
        })
      );
    },
    [yearPairForRecord, records, isRecordComplete, serverDate]
  );

  const doSave = useCallback(
    async (recList) => {
      const updates = {};
      recList.forEach((r) => {
        const miss = getMissingFields(r);
        if (miss.size) updates[r.globalIndex] = Array.from(miss);
      });
      setValidationMap((prev) => {
        const next = { ...prev };
        recList.forEach((r) => {
          if (updates[r.globalIndex]?.length)
            next[r.globalIndex] = updates[r.globalIndex];
          else delete next[r.globalIndex];
        });
        return next;
      });

      const complete = recList.filter(isRecordComplete);
      const count = complete.length;

      if (count === 0) {
        setErrorSnack({
          open: true,
          message: "Please fill all required fields to save records",
        });
        return;
      }

      setIsSaving(true);

      try {
        await saveRecords(complete);

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

  const handleSaveAll = useCallback(() => {
    const dirtyRecords = records.filter((r) => r.__dirty);
    const hasReservedChanges = reservedRow && reservedRow.__dirty;

    if (dirtyRecords.length === 0 && !hasReservedChanges) {
      setErrorSnack({
        open: true,
        message: "No changes to save",
      });
      return;
    }
    setConfirmState({ open: true, scope: "all", rowIndex: null });
  }, [records, reservedRow]);

  const handleSaveRow = useCallback(
    (gi) => {
      if (gi === -1) {
        // Saving reserved row
        if (!reservedRow || !reservedRow.__dirty) {
          setErrorSnack({
            open: true,
            message: "No changes to save",
          });
          return;
        }
        setConfirmState({ open: true, scope: "row", rowIndex: -1 });
        return;
      }

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
    [records, reservedRow]
  );

  const saveReservedRow = useCallback(async () => {
    if (!selectedLocation || !dateFilter || !reservedRow) return false;
    if (isYmdSunday(dateFilter)) {
      setErrorSnack({
        open: true,
        message: "Reserved row disabled on Sundays",
      });
      return false;
    }
    const miss = getMissingFields(reservedRow);
    if (miss.size) {
      setReservedValidation(true);
      setErrorSnack({ open: true, message: "Please fill all required fields" });
      return false;
    }
    try {
      const locName =
        reservedRow.Location === "PCMC" ? "Pune" : reservedRow.Location;
      const yp = yearPairFromDate(dateFilter) || yearPair;
      let committed = reservedRow.committedRefNo;
      if (!committed) {
        committed = await getNextRefNoForYP(yp);
      }
      const amt = Math.max(0, Number(reservedRow.Amount) || 0);
      const gst = Number((amt * 0.18).toFixed(2));
      const data = {
        ...reservedRow,
        OfficeNo: `DVM/${shortOf(locName)}/${yp}`,
        RefNo: committed,
        committedRefNo: committed,
        FMV: Math.max(0, Number(reservedRow.FMV) || 0),
        Amount: amt,
        GST: gst,
        Total: (amt + gst).toFixed(2),
        Location: locName,
        createdAt: dateFilter,
        reservedFirst: true,
        createdByRole: "SuperAdmin",
        adminBranch: (defaultLocations.find(l => l.name === locName)?.name || locName),
        __dirty: false,
      };
      const key = `DVM-${shortOf(locName)}-${yp}-${committed}`;
      await set(ref(db, `excel_records/${key}`), {
        ...data,
        VisitStatus: !!data.VisitStatus,
        SoftCopy: !!data.SoftCopy,
        Print: !!data.Print,
      });
      setReservedRow(recomputeTotals(data));
      return true;
    } catch (e) {
      console.error(e);
      setErrorSnack({ open: true, message: "Save failed" });
      return false;
    }
  }, [
    selectedLocation,
    dateFilter,
    reservedRow,
    getMissingFields,
    getNextRefNoForYP,
    yearPair,
    isYmdSunday,
  ]);

  const filtered = useMemo(() => {
    const base = records.filter(
      (r) => !selectedLocation || r.Location === selectedLocation || r.Branch === selectedLocation
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
    if (sortBy === "pending" || sortBy === "credit") {
      const target = sortBy === "pending" ? "pending" : "credit";
      arr = arr.filter(
        (r) => String(r.BillStatus || "").toLowerCase() === target
      );
    }
    // Sort by RefNo descending, then by createdAt descending for same RefNo
    arr.sort((a, b) => {
      if (!!a.__local !== !!b.__local) return a.__local ? 1 : -1;
      const refA = parseInt(a.RefNo || "0", 10);
      const refB = parseInt(b.RefNo || "0", 10);
      if (refB !== refA) return refB - refA;
      const ta = Date.parse(a.createdAt || "") || 0;
      const tb = Date.parse(b.createdAt || "") || 0;
      if (tb !== ta) return tb - ta;
      return a.Location.localeCompare(b.Location);
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
    if (!selectedLocation || !dateFilter) return filtered;
    if (isYmdSunday(dateFilter)) return filtered;

    // Remove reserved row logic as per request.
    // Just return the filtered records.
    return filtered;
  }, [
    filtered,
    selectedLocation,
    dateFilter,
    isYmdSunday
  ]);
  const groups = useMemo(() => {
    if (!filtered.length) return [];
    if (!selectedLocation && allowedLocations.length > 1) {
      return [
        {
          location: "",
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
    } catch { }
    window.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("resize", calc);
      try {
        ro && ro.disconnect();
      } catch { }
    };
  }, [displayRows.length, groups.length]);

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
        "Ref No": formatRefDisplay(r),
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
        GST: Number(r.GST) || 0,
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
            <span className="text-indigo-700">{selectedLocation || "All"}</span>
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
                  title="Save All"
                  onClick={handleSaveAll}
                  disabled={!canSaveAll}
                  className={`px-3 py-2 rounded-md text-sm ${!canSaveAll
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-amber-600 text-white hover:bg-amber-700"
                    }`}
                >
                  Save All
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
            <div className="shrink-0">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full md:w-auto min-w-[180px] border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                title="Filter by Branch"
                aria-label="Filter by Branch"
              >
                <option value="">All Branches</option>
                {allowedLocations.map((l) => (
                  <option key={l.name} value={l.name}>
                    {l.name}
                  </option>
                ))}
              </select>
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
                    {headers.map((h) => (
                      <th
                        key={h}
                        className={`px-2 py-2 sm:py-3 text-center font-bold border border-gray-200 whitespace-nowrap ${minw(
                          h
                        )}`}
                      >
                        {h === "Sr"
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
                                                                ? "GST"
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
                <tbody className="divide-y divide-gray-100">
                  {selectedLocation ? (
                    displayRows.length ? (
                      displayRows.map((rec, idx) => {
                        const isReserved = rec.globalIndex === -1;
                        const showDelete = isReserved
                          ? false
                          : isBlankForDelete(rec);
                        return (
                          <TableRow
                            key={`row-${idx}-${rec.globalIndex}`}
                            record={rec}
                            index={idx}
                            onChangeField={
                              isReserved ? onChangeReservedField : onChangeField
                            }
                            onSaveRow={handleSaveRow}
                            groupRecords={displayRows}
                            dropdownOptions={uiOptions}
                            formatRef={formatRefDisplay}
                            missingFields={
                              isReserved
                                ? reservedValidation
                                  ? getMissingFields(rec)
                                  : new Set()
                                : new Set(validationMap[rec.globalIndex] || [])
                            }
                            showDelete={showDelete}
                            onDeleteRow={(officeNo, sr) => {
                              setRecords((prev) =>
                                prev.filter(
                                  (r) =>
                                    !(
                                      r.OfficeNo === officeNo &&
                                      String(r.Sr) === String(sr)
                                    )
                                )
                              );
                              setDeleteSnack({
                                open: true,
                                message: "Row deleted",
                              });
                            }}
                            serverMonth={serverMonth}
                            serverYearPair={yearPair}
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
                    )
                  ) : filtered.length ? (
                    groups.map((g, gi) => (
                      <React.Fragment key={`grp-${gi}`}>
                        {g.records.length ? (
                          g.records.map((rec, idx) => {
                            const showDelete = isBlankForDelete(rec);
                            return (
                              <TableRow
                                key={`row-${rec.globalIndex}`}
                                record={rec}
                                index={idx}
                                onChangeField={onChangeField}
                                onSaveRow={handleSaveRow}
                                groupRecords={g.records}
                                dropdownOptions={uiOptions}
                                formatRef={formatRefDisplay}
                                missingFields={
                                  new Set(validationMap[rec.globalIndex] || [])
                                }
                                showDelete={showDelete}
                                onDeleteRow={(officeNo, sr) => {
                                  setRecords((prev) =>
                                    prev.filter(
                                      (r) =>
                                        !(
                                          r.OfficeNo === officeNo &&
                                          String(r.Sr) === String(sr)
                                        )
                                    )
                                  );
                                  setDeleteSnack({
                                    open: true,
                                    message: "Row deleted",
                                  });
                                }}
                                serverMonth={serverMonth}
                                serverYearPair={yearPair}
                              />
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={headers.length}
                              className="px-4 py-6 text-center text-gray-600"
                            >
                              No records
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
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
            {false && <div />}
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
                  {confirmState.scope === "all"
                    ? `You are about to save all changes.
Please ensure that all entered data is correct before continuing.`
                    : confirmState.rowIndex === -1
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
                    onClick={async () => {
                      const isRow = confirmState.scope === "row";
                      const isAll = confirmState.scope === "all";
                      const isReserved = isRow && confirmState.rowIndex === -1;
                      setConfirmState({
                        open: false,
                        scope: "",
                        rowIndex: null,
                      });
                      try {
                        if (isReserved) {
                          const ok = await saveReservedRow();
                          if (ok)
                            setSuccessSnack({
                              open: true,
                              message: "Reserved row saved successfully",
                            });
                        } else if (isAll) {
                          if (selectedLocation && reservedRow?.__dirty) {
                            try {
                              await saveReservedRow();
                            } catch (e) {
                              console.error("Reserved row save failed:", e);
                            }
                          }
                          const dirtyRecords = records.filter((r) => r.__dirty);
                          if (dirtyRecords.length > 0) {
                            await doSave(dirtyRecords);
                          }
                        } else {
                          const rec = records.find(
                            (r) => r.globalIndex === confirmState.rowIndex
                          );
                          if (rec) await doSave([rec]);
                        }
                      } catch (e) {
                        console.error(e);
                        setErrorSnack({ open: true, message: "Save failed" });
                      }
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
            className={`fixed top-16 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ring-1 ring-black/10 transition ${errorSnack.open
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
