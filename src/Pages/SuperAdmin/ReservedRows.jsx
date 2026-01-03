import React, {
  memo,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { ThreeDots } from "react-loader-spinner";

import { ref, set, onValue, get, push } from "firebase/database";
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
  { name: "Vijyapur", shortForm: "VJP", aliases: ["VJP"] },
];

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

const headers = [
  "Sr",
  "Month",
  "Branch",
  "OfficeNo",
  "RefNo",
  "VisitDate",
  "ReportDate",
  "TechnicalExecutive",
  "Bank",
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

const TableRow = memo(
  ({
    record,
    index,
    onChangeField,
    onSaveRow,
    dropdownOptions,
    formatRef,
    showDelete,
    onDeleteRow,
    serverYearPair,
  }) => {
    const isNoFee = record.ReceivedOn === "No Fee";
    const rowClass = isNoFee
      ? "bg-red-500 text-white"
      : index % 2 === 0
        ? "bg-white"
        : "bg-gray-50";

    const renderInput = (field) => {
      if (field === "Action") {
        const show = !!record.__dirty;
        if (!show) return null;
        const isUpdate = !record.__local && record.RefNo;
        return (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => onSaveRow(record.globalIndex)}
              aria-label={isUpdate ? "Update" : "Save"}
              title={isUpdate ? "Update" : "Save"}
              className={`p-2 rounded-full bg-amber-600 text-white hover:bg-amber-700`}
            >
              <FiSave className="text-base" />
            </button>
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
            className={`w-full p-2 border border-gray-300 rounded text-sm`}
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
            className={`w-full p-2 border border-gray-300 rounded text-sm bg-white`}
          />
        );
      }
      if (["Amount", "GST", "Total"].includes(field)) {
        const ro = field === "Total" || field === "GST";
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
              }`}
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
              const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
              onChangeField(record.globalIndex, field, digits);
            }}
            className={`w-full p-2 border border-gray-300 rounded text-sm bg-white`}
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
            className={`w-full p-2 border border-gray-300 rounded text-sm bg-white`}
          />
        );
      }
      if (field === "Month") {
        const display = record.Month || "";
        return (
          <input
            type="text"
            value={display}
            readOnly
            className={`w-full p-2 border border-gray-300 rounded text-sm bg-gray-100`}
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
            className={`w-full p-2 border border-gray-300 rounded text-sm bg-white`}
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
            className={`w-full p-2 border border-gray-300 rounded text-sm bg-white`}
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
            className={`w-full p-2 border border-gray-300 rounded text-sm bg-white`}
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
        return (
          <div className="relative">
            {showDelete && !record.isReserved && (
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
      if (field === "Branch") {
        return (
          <select
            value={record[field] || ""}
            onChange={(e) =>
              onChangeField(record.globalIndex, field, e.target.value)
            }
            className={`w-full p-2 border border-gray-300 rounded text-sm bg-white`}
          >
            <option value="">Select Branch</option>
            {(dropdownOptions[field] || []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      }
      return (
        <input
          type="text"
          value={record[field] || ""}
          onChange={(e) =>
            onChangeField(record.globalIndex, field, e.target.value)
          }
          className={`w-full p-2 border border-gray-300 rounded text-sm bg-white`}
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

const ReservedRows = () => {
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [dateFilter, setDateFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const tableRef = useRef(null);

  const [allowedLocations, setAllowedLocations] = useState(defaultLocations);
  const [branchOptions, setBranchOptions] = useState([]);

  useEffect(() => {
    const unsub = onValue(
      ref(db, "settings/branches"),
      (snap) => {
        const data = snap.val() || {};
        let list = Object.keys(data)
          .map((k) => {
            const val = data[k];
            const def = defaultLocations.find(
              (d) => d.name === val?.name || d.shortForm === val?.shortName
            );
            return def || { name: val?.name, shortForm: val?.shortName };
          })
          .filter((x) => x.name);
        if (!list.length) list = defaultLocations;
        list.sort((a, b) => a.name.localeCompare(b.name));
        setAllowedLocations(list);
      },
      (err) => {
        console.warn("Branch fetch error", err);
        setAllowedLocations(defaultLocations);
      }
    );
    return () => unsub();
  }, []);

  // Fetch branch names for dropdown
  useEffect(() => {
    const unsub = onValue(
      ref(db, "settings/branches"),
      (snap) => {
        const data = snap.val() || {};
        const branches = Object.keys(data)
          .map((k) => data[k]?.name)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        setBranchOptions(branches);
      },
      (err) => {
        console.warn("Branch options fetch error", err);
        setBranchOptions([]);
      }
    );
    return () => unsub();
  }, []);

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



  useEffect(() => {
    const unsub = onValue(
      ref(db, "excel_records"),
      (snapshot) => {
        const val = snapshot.val();
        if (!val) {
          setRecords([]);
          setIsLoading(false);
          return;
        }

        const arr = [];
        Object.keys(val).forEach((key) => {
          const r = val[key];
          // Key filter: MUST be a reserved row
          if (!r.reservedFirst && !r.isReserved) return;

          const locName = r.Location === "PCMC" ? "Pune" : r.Location;
          arr.push({
            ...r,
            key,
            Location: locName,
            __local: false,
            __dirty: false,
          });
        });

        const allowedSet = new Set(
          allowedLocations.map((l) => normalizeLocation(l.name))
        );
        const accessible = arr.filter((r) =>
          allowedSet.has(normalizeLocation(r.Location)) || r.isReserved === true
        );

        accessible.sort((a, b) => {
          // Sort strictly by createdAt descending
          const ta = Date.parse(a.createdAt || "") || 0;
          const tb = Date.parse(b.createdAt || "") || 0;
          return tb - ta;
        });

        setRecords(accessible);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching data:", error);
        alert(`Error fetching data: ${error.message}`);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, [allowedLocations]);

  useEffect(() => {
    let arr = [...records];

    if (selectedLocation) {
      const normSel = normalizeLocation(selectedLocation);
      arr = arr.filter((r) => normalizeLocation(r.Location) === normSel || r.isReserved === true);
    }

    if (dateFilter) {
      arr = arr.filter((r) => {
        if (!r.createdAt) return false;
        // Compare YYYY-MM-DD
        const iso = formatDateForInput(r.createdAt);
        return iso === dateFilter;
      });
    }

    if (searchText && searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      arr = arr.filter((r) => {
        const ref = String(r.RefNo || r.committedRefNo || "").toLowerCase();
        const client = String(r.ClientName || "").toLowerCase();
        const rem = String(r.Remark || "").toLowerCase();
        return ref.includes(q) || client.includes(q) || rem.includes(q);
      });
    }

    // Sort again to be sure after filtering (though filter maintains order usually)
    arr.sort((a, b) => {
      const ta = Date.parse(a.createdAt || "") || 0;
      const tb = Date.parse(b.createdAt || "") || 0;
      return tb - ta;
    });

    // Map to add index for UI operations
    const withIdx = arr.map((r, i) => ({
      ...r,
      globalIndex: i,
    }));

    setFiltered(withIdx);
  }, [records, selectedLocation, dateFilter, searchText]);

  /* Snackbars and Confirmation State */
  const [confirmState, setConfirmState] = useState({
    open: false,
    scope: "",
    rowIndex: null,
  });
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmShowing, setConfirmShowing] = useState(false);

  const [successSnack, setSuccessSnack] = useState({
    open: false,
    message: "",
  });
  const [errorSnack, setErrorSnack] = useState({ open: false, message: "" });
  const [deleteSnack, setDeleteSnack] = useState({ open: false, message: "" });

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

  /* Add Reserved Row State */
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addDate, setAddDate] = useState(new Date().toISOString().split("T")[0]);
  const [addBranch, setAddBranch] = useState("");

  useEffect(() => {
    if (addModalOpen && !addBranch && allowedLocations.length > 0) {
      setAddBranch(allowedLocations[0].name === "PCMC" ? "Pune" : allowedLocations[0].name);
    }
  }, [addModalOpen, allowedLocations, addBranch]);

  const saveNewReservedRow = async () => {
    if (!addDate || !addBranch) {
      setErrorSnack({ open: true, message: "Please select Date and Branch" });
      return;
    }

    try {
      const dbRef = ref(db, "excel_records");
      // Generate a push ID
      const newRef = push(dbRef);

      const mon = monthAbbrFromAny(new Date(addDate).toLocaleString('default', { month: 'short' }));

      const newRow = {
        reservedFirst: true,
        Location: addBranch,
        createdAt: addDate, // Using date as createdAt for sorting/filtering
        VisitDate: addDate, // Defaulting VisitDate to selected date
        Month: mon,
        // Other fields empty by default
        ReportStatus: "",
        BillStatus: "",
      };

      await set(newRef, newRow);

      setSuccessSnack({ open: true, message: "New reserved row created" });
      setAddModalOpen(false);
    } catch (e) {
      console.error(e);
      setErrorSnack({ open: true, message: "Creation failed: " + e.message });
    }
  };

  const handleChangeField = useCallback(
    (idx, field, val) => {
      const rec = filtered[idx];
      if (!rec) return;

      const updated = { ...rec, [field]: val, __dirty: true };

      if (field === "Amount" || field === "GST") {
        const amt = field === "Amount" ? Number(val) : Number(rec.Amount || 0);
        // Calculate 18% GST if Amount changed
        let gst = field === "GST" ? Number(val) : Number(rec.GST || 0);

        if (field === "Amount") {
          gst = Number((amt * 0.18).toFixed(2));
          updated.GST = gst;
        }

        updated.Total = (amt + gst).toFixed(2);
      }

      const newFiltered = [...filtered];
      newFiltered[idx] = updated;
      setFiltered(newFiltered);
    },
    [filtered]
  );

  // Helper for month strings
  const monthAbbrFromAny = (val) => {
    if (!val) return "";
    return String(val).slice(0, 3);
  };

  const handleSaveRow = useCallback(
    async (idx) => {
      const rec = filtered[idx];
      if (!rec) return;
      if (!rec.key) {
        setErrorSnack({ open: true, message: "Cannot identify record" });
        return;
      }

      // Strip UI props
      const { globalIndex, key, __dirty, __local, ...toSave } = rec;

      // Save the selected Branch field to adminBranch
      toSave.adminBranch = rec.Branch || "";


      try {
        await set(ref(db, `excel_records/${rec.key}`), toSave);
        const newFiltered = [...filtered];
        newFiltered[idx] = { ...rec, __dirty: false };
        setFiltered(newFiltered);
        setSuccessSnack({ open: true, message: "Reserved row saved successfully" });
      } catch (e) {
        console.error(e);
        setErrorSnack({ open: true, message: "Save failed: " + e.message });
      }
    },
    [filtered]
  );

  const handleDeleteRow = useCallback(
    async (idx) => {
      const rec = filtered[idx];
      if (!rec) return;
      if (!window.confirm("Are you sure you want to delete this reserved row?")) return;

      try {
        await set(ref(db, `excel_records/${rec.key}`), null);
        setDeleteSnack({ open: true, message: "Row deleted" });
      } catch (e) {
        console.error(e);
        setErrorSnack({ open: true, message: "Failed to delete: " + e.message });
      }
    },
    [filtered]
  );

  const dropdownOptions = useMemo(
    () => ({
      ReportStatus: ["Case Cancel", "Done", "On hold", "Pending"].sort(),
      ReceivedOn: recOptions,
      BillStatus: ["Credit", "Pending"],
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
      Branch: branchOptions,
      TechnicalExecutive: teOptions,
      Engineer: engOptions,
      CaseInitiated: ceOptions,
    }),
    [branchOptions, teOptions, engOptions, ceOptions, recOptions]
  );





  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 pb-20">
      <PageHeader
        title="Reserved Rows"
        subtitle="View and manage reserved rows."
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
            color="#4F46E5"
            ariaLabel="loading"
          />
        </div>
      )}

      {!isLoading && (
        <>
          <SearchActionsCard
            contentClassName="flex flex-col sm:flex-row sm:flex-wrap items-end gap-3 w-full"
            rightPrimary={null}
            showTotal={false}
          >
            <div className="flex-1 min-w-[200px]">
              <label className="block text-gray-700 mb-1 text-sm ml-1">Search</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search RefNo, Client, Remark..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white shadow-sm"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                {searchText && (
                  <button
                    onClick={() => setSearchText("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FiX />
                  </button>
                )}
              </div>
            </div>

            <div className="w-40">
              <DatePicker
                value={dateFilter}
                onChange={(val) => setDateFilter(val)}
                label="Filter by Date"
                placeholder="Select date"
              />
            </div>
          </SearchActionsCard>

          <div
            className="w-full overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white mt-4"
            ref={tableRef}
            style={{ maxHeight: "75vh", overflowY: "auto" }}
          >
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-indigo-600 text-white sticky top-0 z-20 shadow-sm">
                <tr>
                  {headers.map((h, i) => (
                    <th
                      key={h}
                      scope="col"
                      className={`font-semibold text-white p-2 border-r border-indigo-500 whitespace-nowrap bg-indigo-600 text-center align-middle ${minw(h)}`}
                    >
                      {h === "Sr" ? "Sr No" : h.replace(/([A-Z])/g, " $1").trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.length > 0 ? (
                  filtered.map((item, index) => (
                    <TableRow
                      key={item.key || index}
                      record={item}
                      index={index}
                      onChangeField={handleChangeField}
                      onSaveRow={() => handleSaveRow(index)}
                      dropdownOptions={dropdownOptions}
                      formatRef={(r) => r.RefNo || r.committedRefNo || ""}
                      showDelete={true}
                      onDeleteRow={() => handleDeleteRow(index)}
                      serverYearPair=""
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={headers.length}
                      className="p-8 text-center text-gray-500"
                    >
                      No reserved rows found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>


          {addModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/40 transition-opacity"
                onClick={() => setAddModalOpen(false)}
              />
              <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-sm transform transition-all scale-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Add Reserved Row
                  </h3>
                  <button
                    onClick={() => setAddModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="text-xl" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={addDate}
                      onChange={(e) => setAddDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Branch
                    </label>
                    <select
                      value={addBranch}
                      onChange={(e) => setAddBranch(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">Select Branch</option>
                      {allowedLocations.map((loc) => (
                        <option key={loc.name} value={loc.name}>
                          {loc.name === "PCMC" ? "Pune" : loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveNewReservedRow}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
                  >
                    Create
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

export default ReservedRows;
