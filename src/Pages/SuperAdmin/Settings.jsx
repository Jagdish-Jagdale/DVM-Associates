import React, { useEffect, useMemo, useState } from "react";
import { ref, onValue, set, remove } from "firebase/database";
import { db } from "../../../firebase.js";
import {
  FiUserPlus,
  FiSettings,
  FiPlus,
  FiX,
  FiEdit,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

const Settings = () => {
  const items = [
    { key: "engineers", title: "Engineers" },
    { key: "technical_executives", title: "Technical Executives" },
    { key: "business_executives", title: "Business Executives" },
    { key: "received_methods", title: "Received Methods" },
    { key: "branches", title: "Branches" },
  ];

  const [selected, setSelected] = useState("engineers");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false });
  const [form, setForm] = useState({ name: "", phone: "" });
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [confirm, setConfirm] = useState({ open: false, key: "", name: "" });
  const [edit, setEdit] = useState({ open: false, row: null, saving: false });

  const formatDateToDDMMYYYY = (timestamp) => {
    if (!timestamp) return "-";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "-";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const formattedHours = String(hours).padStart(2, "0");
      return `${day}/${month}/${year} ${formattedHours}:${minutes}:${seconds} ${ampm}`;
    } catch {
      return "-";
    }
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onValue(
      ref(db, `settings/${selected}`),
      (snap) => {
        const data = snap.val() || {};
        const out = Object.keys(data).map((k) => ({
          key: k,
          ...(data[k] || {}),
        }));
        out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRows(out);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, [selected]);

  useEffect(() => {
    setPage(1);
  }, [selected]);

  const openAdd = () => {
    setForm({ name: "", phone: "" });
    setModal({ open: true });
  };
  const closeAdd = () => setModal({ open: false });

  const onSave = async (e) => {
    e.preventDefault();
    const nm = (form.name || "").trim();
    if (!nm) return;
    let key =
      nm
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || String(Date.now());
    if (rows.some((r) => r.key === key)) key = key + "-" + Date.now();
    const value = { name: nm, createdAt: Date.now() };
    if (selected === "business_executives") {
      await set(ref(db, `settings/business_executives/${key}`), value);
    } else {
      await set(ref(db, `settings/${selected}/${key}`), value);
    }
    closeAdd();
  };

  const columns = useMemo(() => {
    return ["Name", "Created"];
  }, [selected]);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  const pageItems = rows.slice(start, start + pageSize);
  const showActions = selected !== "branches";
  const colCount = columns.length + 1 + (showActions ? 1 : 0); // Sr No + (optional Actions)

  return (
    <div className="w-full min-h-screen p-2 sm:p-4 md:p-6 lg:max-w-[1400px] lg:mx-auto">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <FiSettings className="text-xl sm:text-2xl text-indigo-600" />
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
          Settings
        </h2>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => setSelected(it.key)}
            className={`group text-left p-3 sm:p-4 rounded-xl border ${
              selected === it.key
                ? "border-indigo-400 ring-1 ring-indigo-200"
                : "border-gray-200"
            } bg-white hover:border-indigo-300 hover:shadow-md transition h-full`}
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <FiUserPlus className="text-base sm:text-xl text-indigo-600 flex-shrink-0" />
              <div className="text-sm sm:text-lg font-semibold text-gray-800 line-clamp-2">
                {it.title}
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-600 line-clamp-1">
              Manage {it.title.toLowerCase()}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm -mx-2 sm:mx-0">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
          <div className="text-base sm:text-lg font-semibold text-gray-800">
            {items.find((i) => i.key === selected)?.title}
          </div>
          {selected !== "branches" && (
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-xs sm:text-sm whitespace-nowrap"
            >
              <FiPlus className="text-sm sm:text-base" />
              <span>Add</span>
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] xs:text-xs sm:text-sm border-collapse min-w-[400px]">
            <thead className="bg-indigo-600 text-white sticky top-0 z-10">
              <tr>
                <th className="px-2 sm:px-3 py-2 text-center font-semibold border border-indigo-500 whitespace-nowrap">
                  Sr
                </th>
                {columns.map((c) => (
                  <th
                    key={c}
                    className={`px-2 sm:px-3 py-2 font-semibold border border-indigo-500 whitespace-nowrap ${
                      c === "Created" ? "text-center" : "text-left"
                    }`}
                  >
                    {c}
                  </th>
                ))}
                {showActions && (
                  <th className="px-2 sm:px-3 py-2 text-center font-semibold border border-indigo-500 whitespace-nowrap">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="px-4 py-6 sm:py-8 text-center text-gray-600"
                  >
                    Loading...
                  </td>
                </tr>
              ) : pageItems.length ? (
                pageItems.map((r, i) => (
                  <tr
                    key={r.key}
                    className={
                      (i % 2 === 0 ? "bg-white" : "bg-gray-50") +
                      " transition-colors hover:bg-gray-100"
                    }
                  >
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 align-top text-center">
                      {start + i + 1}
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 align-top">
                      <div
                        className="max-w-[120px] sm:max-w-[200px] md:max-w-[260px] whitespace-nowrap overflow-hidden text-ellipsis"
                        title={r.name || "-"}
                      >
                        {r.name || "-"}
                      </div>
                    </td>
                    <td
                      className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 align-top text-center whitespace-nowrap text-[9px] xs:text-[10px] sm:text-xs"
                      title={
                        r.createdAt
                          ? new Date(r.createdAt).toLocaleString()
                          : "-"
                      }
                    >
                      {formatDateToDDMMYYYY(r.createdAt)}
                    </td>
                    {showActions && (
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 align-top">
                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEdit({ open: true, row: r, saving: false })
                            }
                            className="p-1 sm:p-2 rounded-md bg-amber-500 text-white hover:bg-amber-600"
                            title="Edit"
                            aria-label="Edit"
                          >
                            <FiEdit className="text-xs sm:text-base" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirm({
                                open: true,
                                key: r.key,
                                name: r.name,
                              })
                            }
                            className="p-1 sm:p-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                            title="Delete"
                            aria-label="Delete"
                          >
                            <FiTrash2 className="text-xs sm:text-base" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={colCount}
                    className="px-4 py-6 sm:py-8 text-center text-gray-600 text-xs sm:text-sm"
                  >
                    No records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!loading && total > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 px-3 sm:px-4 py-2 sm:py-3 border-t border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
              Showing {start + 1}-{Math.min(start + pageSize, total)} of {total}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 order-1 sm:order-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={current === 1}
                className={`p-1.5 sm:p-2 rounded-md border ${
                  current === 1
                    ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                title="Previous"
              >
                <FiChevronLeft className="text-sm sm:text-base" />
              </button>
              <div className="text-xs sm:text-sm text-gray-700 px-2">
                {current} / {totalPages}
              </div>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={current === totalPages}
                className={`p-1.5 sm:p-2 rounded-md border ${
                  current === totalPages
                    ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                title="Next"
              >
                <FiChevronRight className="text-sm sm:text-base" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals - Add p-2 sm:p-4 to all modal containers */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4">
          <form
            onSubmit={onSave}
            className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800">
                Add{" "}
                {selected === "branches"
                  ? "Branch"
                  : items.find((i) => i.key === selected)?.title.slice(0, -1)}
              </h3>
              <button
                type="button"
                onClick={closeAdd}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow letters and spaces
                    const filtered = value.replace(/[^A-Za-z\s]/g, "");
                    setForm((prev) => ({ ...prev, name: filtered }));
                  }}
                  onKeyPress={(e) => {
                    // Prevent non-alphabetic characters from being entered
                    if (!/[A-Za-z\s]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder={`Enter ${
                    selected === "branches"
                      ? "branch"
                      : items
                          .find((i) => i.key === selected)
                          ?.title.slice(0, -1)
                          .toLowerCase()
                  } name`}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={closeAdd}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {edit.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!edit.row) return;
              const nm = (edit.row.name || "").trim();
              if (!nm) return;
              try {
                edit.saving = true;
                const value = {
                  name: nm,
                  createdAt: edit.row.createdAt || Date.now(),
                };
                if (selected === "business_executives") {
                  await set(
                    ref(db, `settings/business_executives/${edit.row.key}`),
                    value
                  );
                } else {
                  await set(
                    ref(db, `settings/${selected}/${edit.row.key}`),
                    value
                  );
                }
                setEdit({ open: false, row: null, saving: false });
              } catch {
                setEdit((prev) => ({ ...prev, saving: false }));
              }
            }}
            className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800">Edit</h3>
              <button
                type="button"
                onClick={() =>
                  setEdit({ open: false, row: null, saving: false })
                }
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  autoFocus
                  value={edit.row?.name || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow letters and spaces
                    const filtered = value.replace(/[^A-Za-z\s]/g, "");
                    setEdit((prev) => ({
                      ...prev,
                      row: { ...(prev.row || {}), name: filtered },
                    }));
                  }}
                  onKeyPress={(e) => {
                    // Prevent non-alphabetic characters from being entered
                    if (!/[A-Za-z\s]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder={`Enter ${
                    selected === "branches"
                      ? "branch"
                      : items
                          .find((i) => i.key === selected)
                          ?.title.slice(0, -1)
                          .toLowerCase()
                  } name`}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() =>
                  setEdit({ open: false, row: null, saving: false })
                }
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                disabled={edit.saving}
                type="submit"
                className={`px-4 py-2 rounded-md bg-indigo-600 text-white ${
                  edit.saving ? "opacity-60" : "hover:bg-indigo-700"
                }`}
              >
                {edit.saving ? "Updating..." : "Update"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirm */}
      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800">
                Confirm Delete
              </h3>
              <button
                type="button"
                onClick={() => setConfirm({ open: false, key: "", name: "" })}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              Delete <span className="font-semibold">{confirm.name}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm({ open: false, key: "", name: "" })}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (selected === "business_executives") {
                      await remove(
                        ref(db, `settings/business_executives/${confirm.key}`)
                      );
                    } else {
                      await remove(
                        ref(db, `settings/${selected}/${confirm.key}`)
                      );
                    }
                  } catch {}
                  setConfirm({ open: false, key: "", name: "" });
                }}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
