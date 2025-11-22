import React, { useEffect, useMemo, useState } from "react";
import { ref, onValue, update, remove, set, get } from "firebase/database";
import { db } from "../../../firebase.js";
import * as XLSX from "xlsx";
import { ThreeDots } from "react-loader-spinner";

import {
  FiEdit,
  FiTrash2,
  FiDownload,
  FiChevronLeft,
  FiChevronRight,
  FiArrowUp,
  FiArrowDown,
  FiX,
  FiPlus,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import PageHeader from "../../Components/UI/PageHeader.jsx";

const Admins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirm, setConfirm] = useState({ open: false, mobile: "", name: "" });
  const [edit, setEdit] = useState({
    open: false,
    mobile: "",
    name: "",
    branch: "",
    role: "admin",
    password: "",
    createdAt: "",
    saving: false,
  });
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    type: "success",
  });
  const [sortBy, setSortBy] = useState("branch");
  const [sortDir, setSortDir] = useState("asc");
  const [branchFilter, setBranchFilter] = useState("");
  const [branches, setBranches] = useState([]);

  const validateMobile = (value) => /^\d{10}$/.test(value || "");
  const [create, setCreate] = useState({
    open: false,
    name: "",
    branch: "",
    mobile: "",
    password: "",
    saving: false,
  });
  const [showCreatePwd, setShowCreatePwd] = useState(false);

  useEffect(() => {
    if (!snack.open) return;
    const t = setTimeout(() => setSnack((s) => ({ ...s, open: false })), 2500);
    return () => clearTimeout(t);
  }, [snack.open]);

  useEffect(() => {
    const unsub = onValue(
      ref(db, "admins"),
      (snap) => {
        const data = snap.val() || {};
        const rows = Object.keys(data).map((key) => ({
          mobile: key,
          name: data[key]?.name || "",
          branch: data[key]?.branch || "",
          role: data[key]?.role || "admin",
          createdAt: data[key]?.createdAt || "",
          password: data[key]?.password || "",
        }));
        rows.sort(
          (a, b) =>
            a.branch.localeCompare(b.branch) || a.name.localeCompare(b.name)
        );
        setAdmins(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load admins", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(
      ref(db, "settings/branches"),
      (snap) => {
        const data = snap.val() || {};
        const list = Object.keys(data)
          .map((k) => data[k]?.name)
          .filter(Boolean);
        list.sort((a, b) => a.localeCompare(b));
        setBranches(list);
      },
      () => {}
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let arr = admins;
    if (branchFilter) arr = arr.filter((a) => a.branch === branchFilter);
    if (!q.trim()) return arr;
    const s = q.trim().toLowerCase();
    return arr.filter(
      (a) =>
        a.name.toLowerCase().includes(s) ||
        a.branch.toLowerCase().includes(s) ||
        a.mobile.includes(s) ||
        a.role.toLowerCase().includes(s)
    );
  }, [admins, q, branchFilter]);

  const uniqueBranches = useMemo(() => {
    const set = new Set(admins.map((a) => a.branch).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [admins]);

  const branchOptions = useMemo(() => {
    return branches && branches.length ? branches : uniqueBranches;
  }, [branches, uniqueBranches]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "branch") {
        cmp =
          (a.branch || "").localeCompare(b.branch || "") ||
          (a.name || "").localeCompare(b.name || "");
      } else if (sortBy === "name") {
        cmp =
          (a.name || "").localeCompare(b.name || "") ||
          (a.branch || "").localeCompare(b.branch || "");
      } else if (sortBy === "created") {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        cmp = ta - tb;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [q, pageSize, sortBy, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  const pageItems = sorted.slice(start, start + pageSize);

  const exportToExcel = () => {
    const data = sorted.map((a) => ({
      Name: a.name,
      Branch: a.branch,
      Mobile: a.mobile,
      Role: a.role,
      Created: a.createdAt ? new Date(a.createdAt).toLocaleString() : "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Admins");
    XLSX.writeFile(wb, "Admins.xlsx");
  };

  const openCreate = () =>
    setCreate({ open: true, name: "", branch: "", mobile: "", password: "", saving: false });
  const closeCreate = () =>
    setCreate({ open: false, name: "", branch: "", mobile: "", password: "", saving: false });

  const saveCreate = async (e) => {
    e.preventDefault();
    if (create.saving) return;
    const name = (create.name || "").trim();
    const branch = (create.branch || "").trim();
    const mobile = (create.mobile || "").trim();
    const password = create.password || "";
    if (!name || !branch || !mobile || !password) {
      setSnack({ open: true, message: "Please fill all fields", type: "error" });
      return;
    }
    if (!validateMobile(mobile)) {
      setSnack({ open: true, message: "Mobile must be 10 digits", type: "error" });
      return;
    }
    if (password.length < 6) {
      setSnack({ open: true, message: "Password must be at least 6 characters", type: "error" });
      return;
    }
    try {
      setCreate((c) => ({ ...c, saving: true }));
      const adminRef = ref(db, `admins/${mobile}`);
      const existing = await get(adminRef);
      if (existing.exists()) {
        setSnack({ open: true, message: "This mobile is already registered", type: "error" });
        setCreate((c) => ({ ...c, saving: false }));
        return;
      }
      await set(adminRef, {
        name,
        branch,
        mobile,
        password,
        role: "admin",
        createdAt: new Date().toISOString(),
      });
      closeCreate();
      setSnack({ open: true, message: "Admin added", type: "success" });
    } catch (err) {
      setCreate((c) => ({ ...c, saving: false }));
      setSnack({ open: true, message: `Create failed: ${err.message}`, type: "error" });
    }
  };

  const openEdit = (a) => {
    setEdit({
      open: true,
      mobile: a.mobile,
      name: a.name,
      branch: a.branch,
      role: a.role || "admin",
      password: a.password || "",
      createdAt: a.createdAt || "",
      saving: false,
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!edit.mobile) return;
    setEdit((prev) => ({ ...prev, saving: true }));
    try {
      let createdAtVal = edit.createdAt;
      try {
        const d = new Date(edit.createdAt);
        if (!isNaN(d.getTime())) createdAtVal = d.toISOString();
      } catch {}
      await update(ref(db, `admins/${edit.mobile}`), {
        name: (edit.name || "").trim(),
        branch: (edit.branch || "").trim(),
        role: edit.role || "admin",
        password: edit.password || "",
        createdAt: createdAtVal,
      });
      setEdit({
        open: false,
        mobile: "",
        name: "",
        branch: "",
        role: "admin",
        password: "",
        createdAt: "",
        saving: false,
      });
      setSnack({ open: true, message: "Admin updated", type: "success" });
    } catch (err) {
      console.error(err);
      setEdit((prev) => ({ ...prev, saving: false }));
      setSnack({
        open: true,
        message: `Update failed: ${err.message}`,
        type: "error",
      });
    }
  };

  const askDelete = (a) =>
    setConfirm({ open: true, mobile: a.mobile, name: a.name });
  const cancelDelete = () => setConfirm({ open: false, mobile: "", name: "" });
  const doDelete = async () => {
    if (!confirm.mobile) return;
    try {
      await remove(ref(db, `admins/${confirm.mobile}`));
      setSnack({ open: true, message: "Admin deleted", type: "success" });
    } catch (err) {
      console.error(err);
      setSnack({
        open: true,
        message: `Delete failed: ${err.message}`,
        type: "error",
      });
    } finally {
      cancelDelete();
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6">
      <PageHeader
        title="Admins"
        subtitle="Search, filter, edit and export administrator accounts."
        right={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 text-sm shadow-sm"
          >
            <FiPlus className="text-base" />
            <span>Add Admins</span>
          </button>
        }
      />
      <div className="mb-4 w-full">
        <div className="flex flex-wrap items-center gap-3 w-full">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, branch, mobile..."
            className="flex-1 min-w-[200px] border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <label className="text-sm text-gray-700">Branch:</label>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Branches</option>
            {branchOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="inline-flex items-center justify-center p-2 rounded-md border border-gray-300 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title={`Sort ${sortDir === "asc" ? "ascending" : "descending"}`}
            aria-label={`Toggle sort direction`}
          >
            {sortDir === "asc" ? <FiArrowUp /> : <FiArrowDown />}
          </button>

          <button
            type="button"
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-sm shadow-sm"
          >
            <FiDownload className="text-base" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center my-4">
          <ThreeDots
            height="60"
            width="60"
            color="#4F46E5" // Indigo color
            ariaLabel="loading-indicator"
          />
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-indigo-600 text-white">
              <tr>
                <th className="px-3 py-3 text-left font-semibold border border-gray-200">
                  Sr No
                </th>
                <th className="px-3 py-3 text-left font-semibold border border-gray-200">
                  Name
                </th>
                <th className="px-3 py-3 text-left font-semibold border border-gray-200">
                  Branch
                </th>
                <th className="px-3 py-3 text-left font-semibold border border-gray-200">
                  Mobile
                </th>
                <th className="px-3 py-3 text-left font-semibold border border-gray-200">
                  Role
                </th>
                <th className="px-3 py-3 text-left font-semibold border border-gray-200">
                  Created
                </th>
                <th className="px-3 py-3 text-left font-semibold border border-gray-200">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length ? (
                pageItems.map((a, i) => (
                  <tr
                    key={a.mobile}
                    className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-3 py-2 border border-gray-200 align-top">
                      {start + i + 1}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 align-top">
                      {a.name}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 align-top">
                      {a.branch}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 align-top">
                      {a.mobile}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 align-top">
                      {a.role}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 align-top">
                      {a.createdAt
                        ? new Date(a.createdAt).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 align-top">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          className="p-2 rounded-md bg-amber-500 text-white hover:bg-amber-600"
                          title="Edit"
                          aria-label="Edit"
                        >
                          <FiEdit className="text-base" />
                        </button>
                        <button
                          type="button"
                          onClick={() => askDelete(a)}
                          className="p-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                          title="Delete"
                          aria-label="Delete"
                        >
                          <FiTrash2 className="text-base" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-3 py-4 text-center text-gray-600"
                    colSpan={6}
                  >
                    No admins found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && total > 10 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Showing {start + 1}-{Math.min(start + pageSize, total)} of {total}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value, 10) || 10)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              {[10, 20, 50, 100].map((s) => (
                <option key={s} value={s}>
                  {s} / page
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={current === 1}
              className={`p-2 rounded-md border ${
                current === 1
                  ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              title="Previous"
            >
              <FiChevronLeft />
            </button>
            <div className="text-sm text-gray-700">
              Page {current} of {totalPages}
            </div>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={current === totalPages}
              className={`p-2 rounded-md border ${
                current === totalPages
                  ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              title="Next"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {create.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={saveCreate} className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800">Add Admin</h3>
              <button onClick={closeCreate} type="button" className="p-1 rounded hover:bg-gray-100" aria-label="Close">
                <FiX />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={create.name}
                  onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <select
                  value={create.branch}
                  onChange={(e) => setCreate((c) => ({ ...c, branch: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                >
                  <option value="">Select Branch</option>
                  {branchOptions.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                <input
                  value={create.mobile}
                  onChange={(e) => {
                    const digits = (e.target.value || "").replace(/\D/g, "").slice(0, 10);
                    setCreate((c) => ({ ...c, mobile: digits }));
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  onKeyDown={(e) => { if (["e","E","+","-","."," "].includes(e.key)) e.preventDefault(); }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showCreatePwd ? "text" : "password"}
                    value={create.password}
                    onChange={(e) => setCreate((c) => ({ ...c, password: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 pr-10"
                    placeholder="Enter password (min 6 characters)"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePwd((s) => !s)}
                    className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                    aria-label="Toggle password visibility"
                  >
                    {showCreatePwd ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={closeCreate} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300">
                Cancel
              </button>
              <button disabled={create.saving} type="submit" className={`px-4 py-2 rounded-md bg-indigo-600 text-white ${create.saving ? "opacity-60" : "hover:bg-indigo-700"}`}>
                {create.saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl ring-1 ring-gray-200 p-6 md:p-7 w-full max-w-md transform transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Delete
              </h3>
              <button
                onClick={cancelDelete}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>
            <p className="text-gray-700 mb-3">
              Type <span className="font-semibold">DELETE ADMIN</span> to
              confirm deletion of{" "}
              <span className="font-semibold">{confirm.name}</span> (
              {confirm.mobile}).
            </p>
            <input
              type="text"
              value={confirm.text || ""}
              onChange={(e) =>
                setConfirm((prev) => ({ ...prev, text: e.target.value }))
              }
              placeholder="DELETE ADMIN"
              autoFocus
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={doDelete}
                disabled={(confirm.text || "").trim() !== "DELETE ADMIN"}
                className={`px-4 py-2 rounded-md ${
                  (confirm.text || "").trim() === "DELETE ADMIN"
                    ? "bg-red-600 text-white hover:bg-red-700 shadow-sm"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {edit.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form
            onSubmit={saveEdit}
            className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800">
                Edit Admin
              </h3>
              <button
                onClick={() =>
                  setEdit({
                    open: false,
                    mobile: "",
                    name: "",
                    branch: "",
                    role: "admin",
                    password: "",
                    createdAt: "",
                    saving: false,
                  })
                }
                type="button"
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile
                </label>
                <input
                  value={edit.mobile}
                  disabled
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  value={edit.name}
                  onChange={(e) =>
                    setEdit((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <select
                  value={edit.branch || ""}
                  onChange={(e) =>
                    setEdit((prev) => ({ ...prev, branch: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                >
                  <option value="">Select Branch</option>
                  {branchOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  {edit.branch && !branchOptions.includes(edit.branch) && (
                    <option value={edit.branch}>{edit.branch}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={edit.role}
                  onChange={(e) =>
                    setEdit((prev) => ({ ...prev, role: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="admin">admin</option>
                  <option value="super-admin">super-admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  value={edit.password}
                  onChange={(e) =>
                    setEdit((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Set/Update password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Created At
                </label>
                <input
                  value={edit.createdAt}
                  onChange={(e) =>
                    setEdit((prev) => ({ ...prev, createdAt: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="ISO date e.g., 2025-01-01T10:00:00.000Z"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() =>
                  setEdit({
                    open: false,
                    mobile: "",
                    name: "",
                    branch: "",
                    role: "admin",
                    password: "",
                    createdAt: "",
                    saving: false,
                  })
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
                {edit.saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Snackbar */}
      <div
        className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl ring-1 ring-black/10 transition ${
          snack.open
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none"
        } ${
          snack.type === "success"
            ? "bg-green-600 text-white"
            : "bg-red-600 text-white"
        }`}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <span className="font-medium">{snack.message}</span>
          {snack.open && (
            <button
              onClick={() => setSnack((s) => ({ ...s, open: false }))}
              className="p-1 rounded hover:bg-white/10 focus:outline-none"
              aria-label="Close"
            >
              <FiX className="text-white text-lg" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admins;
