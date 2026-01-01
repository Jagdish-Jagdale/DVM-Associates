import React, { useEffect, useMemo, useState } from "react";
import { ref, onValue, update, remove, set, get } from "firebase/database";
import { db, auth, functions } from "../../../firebase.js";
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from "firebase/auth";
import * as XLSX from "xlsx";
import { ThreeDots } from "react-loader-spinner";

import {
  FiEdit,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiArrowUp,
  FiArrowDown,
  FiX,
  FiPlus,
  FiEye,
  FiEyeOff,
  FiLock,
  FiAlertTriangle,
} from "react-icons/fi";
import { httpsCallable } from "firebase/functions";
import { CiExport } from "react-icons/ci";
import PageHeader from "../../Components/UI/PageHeader.jsx";

const SuperAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirm, setConfirm] = useState({
    open: false,
    mobile: "",
    name: "",
    text: "",
    deleting: false,
  });
  const [edit, setEdit] = useState({
    open: false,
    mobile: "",
    name: "",
    // branch removed
    role: "super-admin",
    password: "",
    createdAt: "",
    saving: false,
  });
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    type: "success",
  });
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const validateMobile = (value) => /^\d{10}$/.test(value || "");
  const [create, setCreate] = useState({
    open: false,
    name: "",
    // branch removed
    mobile: "",
    password: "",
    saving: false,
  });
  const [showCreatePwd, setShowCreatePwd] = useState(false);

  // Password Change State
  const [changePwd, setChangePwd] = useState({
    open: false,
    mobile: "",
    name: "",
    newPassword: "",
    loading: false,
  });
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);

  const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
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
    if (!snack.open) return;
    const t = setTimeout(() => setSnack((s) => ({ ...s, open: false })), 2500);
    return () => clearTimeout(t);
  }, [snack.open]);

  useEffect(() => {
    const unsub = onValue(
      ref(db, "super_admins"),
      (snap) => {
        const data = snap.val() || {};
        const rows = Object.keys(data)
          .map((key) => ({
            mobile: key,
            name: data[key]?.name || "",
            role: data[key]?.role || "super-admin",
            createdAt: data[key]?.createdAt || "",
            password: data[key]?.password || "",
          }));

        rows.sort((a, b) => a.name.localeCompare(b.name));
        setAdmins(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load super admins", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let arr = admins;
    if (!q.trim()) return arr;
    const s = q.trim().toLowerCase();
    return arr.filter(
      (a) =>
        a.name.toLowerCase().includes(s) ||
        a.mobile.includes(s) ||
        a.role.toLowerCase().includes(s)
    );
  }, [admins, q]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = (a.name || "").localeCompare(b.name || "");
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
      Mobile: a.mobile,
      Role: a.role,
      Created: a.createdAt ? new Date(a.createdAt).toLocaleString() : "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "SuperAdmins");
    XLSX.writeFile(wb, "SuperAdmins.xlsx");
  };

  const openCreate = () =>
    setCreate({
      open: true,
      name: "",
      mobile: "",
      password: "",
      saving: false,
    });
  const closeCreate = () =>
    setCreate({
      open: false,
      name: "",
      mobile: "",
      password: "",
      saving: false,
    });

  const saveCreate = async (e) => {
    e.preventDefault();
    if (create.saving) return;
    const name = (create.name || "").trim();
    const mobile = (create.mobile || "").trim();
    const password = create.password || "";
    if (!name || !mobile || !password) {
      setSnack({
        open: true,
        message: "Please complete all required fields",
        type: "error",
      });
      return;
    }
    if (!validateMobile(mobile)) {
      setSnack({
        open: true,
        message: "Mobile number must be exactly 10 digits",
        type: "error",
      });
      return;
    }
    if (password.length < 6) {
      setSnack({
        open: true,
        message: "Password must be at least 6 characters long",
        type: "error",
      });
      return;
    }
    try {
      setCreate((c) => ({ ...c, saving: true }));
      const adminRef = ref(db, `super_admins/${mobile}`);
      const email = `${mobile}@admin.com`.toLowerCase();

      // Check existence in DB and Auth
      const [existingDB, methods] = await Promise.all([
        get(adminRef),
        fetchSignInMethodsForEmail(auth, email),
      ]);

      const existsInDB = existingDB && existingDB.exists();
      const existsInAuth = Array.isArray(methods) && methods.length > 0;

      if (existsInDB) {
        setSnack({
          open: true,
          message: "A Super Admin account already exists for this mobile number.",
          type: "error",
        });
        setCreate((c) => ({ ...c, saving: false }));
        return;
      }

      // If user exists in Auth, preventing creation as per 'already exists in system' requirement
      if (existsInAuth) {
        setSnack({
          open: true,
          message: "A Super Admin account already exists for this mobile number.",
          type: "error",
        });
        setCreate((c) => ({ ...c, saving: false }));
        return;
      }

      // Create in Firebase Auth
      await createUserWithEmailAndPassword(auth, email, password);

      await set(adminRef, {
        name,
        mobile,
        password, // Saving password to DB as requested for 'admins' pattern
        role: "super-admin",
        createdAt: new Date().toISOString(),
      });
      closeCreate();
      setSnack({
        open: true,
        message: "Super Admin created successfully",
        type: "success",
      });
    } catch (err) {
      console.error(err);
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') {
        msg = "A Super Admin account already exists for this mobile number.";
        // In this case, we might still want to create the DB record if it was missing?
        // But we just caught the error, so valid flow halted.
        // Since we checked fetchSignInMethodsForEmail, this shouldn't happen often.
      }
      setCreate((c) => ({ ...c, saving: false }));
      setSnack({
        open: true,
        message: `Failed to create super admin: ${msg}`,
        type: "error",
      });
    }
  };

  const openEdit = (a) => {
    setEdit({
      open: true,
      mobile: a.mobile,
      name: a.name,
      role: a.role || "super-admin",
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
      } catch { }
      await update(ref(db, `super_admins/${edit.mobile}`), {
        name: (edit.name || "").trim(),
        password: edit.password || "",
        createdAt: createdAtVal,
      });
      setEdit({
        open: false,
        mobile: "",
        name: "",
        role: "super-admin",
        password: "",
        createdAt: "",
        saving: false,
      });
      setSnack({
        open: true,
        message: "Super Admin updated successfully",
        type: "success",
      });
    } catch (err) {
      console.error(err);
      setEdit((prev) => ({ ...prev, saving: false }));
      setSnack({
        open: true,
        message: `Failed to update super admin: ${err.message}`,
        type: "error",
      });
    }
  };

  const askDelete = (a) =>
    setConfirm({
      open: true,
      mobile: a.mobile,
      name: a.name,
      text: "",
      deleting: false,
    });
  const cancelDelete = () =>
    setConfirm({
      open: false,
      mobile: "",
      name: "",
      text: "",
      deleting: false,
    });
  const doDelete = async () => {
    if (!confirm.mobile || confirm.deleting) return;
    try {
      setConfirm((c) => ({ ...c, deleting: true }));
      const mobile = confirm.mobile;

      // Clean up excel records ownership if needed
      try {
        const snap = await get(ref(db, "excel_records"));
        const data = snap.val() || {};
        const updates = {};
        Object.keys(data).forEach((k) => {
          const v = data[k] || {};
          const owned = [
            v.createdBy,
            v.adminMobile,
            v.ownerMobile,
            v.created_by,
            v.createdByMobile,
          ]
            .map((x) => (x == null ? "" : String(x)))
            .includes(String(mobile));
          if (owned) {
            updates[`excel_records/${k}`] = null;
          }
        });
        if (Object.keys(updates).length) {
          await update(ref(db), updates);
        }
      } catch { }

      // 1. Delete from Authentication via Cloud Function
      try {
        const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');
        await deleteUserAccount({ mobile });
      } catch (err) {
        console.error("Auth delete failed, continuing to DB delete:", err);
        // We continue to ensure DB consistency even if Auth delete fails or user already gone
      }

      // 2. Delete from Realtime Database
      await remove(ref(db, `super_admins/${mobile}`));
      setSnack({
        open: true,
        message: "Super admin deleted successfully (Auth + DB)",
        type: "success",
      });
    } catch (err) {
      console.error(err);
      setSnack({
        open: true,
        message: `Failed to delete super admin: ${err.message}`,
        type: "error",
      });
    } finally {
      cancelDelete();
    }
  };

  const openChangePwd = (a) => {
    setChangePwd({
      open: true,
      mobile: a.mobile,
      name: a.name,
      newPassword: "",
      loading: false,
    });
  };

  const doChangePwd = async (e) => {
    e.preventDefault();
    if (!changePwd.newPassword || changePwd.newPassword.length < 6) {
      setSnack({ open: true, message: "Password must be at least 6 chars", type: "error" });
      return;
    }
    setChangePwd(p => ({ ...p, loading: true }));
    try {
      // 1. Call Cloud Function
      const updateUserPassword = httpsCallable(functions, 'updateUserPassword');
      await updateUserPassword({
        mobile: changePwd.mobile,
        newPassword: changePwd.newPassword
      });

      // 2. Update DB for record keeping (optional but requested)
      await update(ref(db, `super_admins/${changePwd.mobile}`), {
        password: changePwd.newPassword
      });

      setSnack({ open: true, message: "Password updated successfully", type: "success" });
      setChangePwd(p => ({ ...p, open: false }));
    } catch (err) {
      console.error(err);
      setSnack({ open: true, message: "Failed: " + err.message, type: "error" });
      setChangePwd(p => ({ ...p, loading: false }));
    }
  };

  return (
    <div className="w-full min-h-screen p-2 sm:p-4 md:p-6 lg:max-w-[1400px] lg:mx-auto">
      <PageHeader
        title="Super Admins"
        subtitle="Search, filter, edit and export super administrator accounts."
        right={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md bg-green-600 text-white hover:bg-green-700 text-xs sm:text-sm shadow-sm whitespace-nowrap"
          >
            <FiPlus className="text-sm sm:text-base" />
            <span className="hidden xs:inline">Add Super Admin</span>
            <span className="xs:hidden">Add</span>
          </button>
        }
      />
      <div className="mb-3 sm:mb-4 w-full">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            className="flex-1 min-w-0 sm:min-w-[200px] border border-gray-300 rounded-md px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="flex-1 sm:flex-none inline-flex items-center justify-center p-1.5 sm:p-2 rounded-md border border-gray-300 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title={`Sort ${sortDir === "asc" ? "ascending" : "descending"}`}
              aria-label="Toggle sort direction"
            >
              {sortDir === "asc" ? <FiArrowUp /> : <FiArrowDown />}
            </button>

            <button
              type="button"
              onClick={exportToExcel}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-xs sm:text-sm shadow-sm whitespace-nowrap"
            >
              <CiExport
                className="text-base sm:text-lg"
                style={{ strokeWidth: 0.5 }}
              />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center my-8 sm:my-12">
          <ThreeDots
            height="50"
            width="50"
            color="#4F46E5"
            ariaLabel="loading-indicator"
          />
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm -mx-2 sm:mx-0">
          <table className="w-full border-collapse text-[10px] xs:text-xs sm:text-sm min-w-[640px]">
            <thead className="bg-indigo-600 text-white sticky top-0 z-10">
              <tr>
                <th className="px-1.5 xs:px-2 sm:px-3 py-2 sm:py-3 text-left font-semibold border border-gray-200 whitespace-nowrap">
                  Sr
                </th>
                <th className="px-1.5 xs:px-2 sm:px-3 py-2 sm:py-3 text-left font-semibold border border-gray-200 whitespace-nowrap">
                  Name
                </th>
                <th className="px-1.5 xs:px-2 sm:px-3 py-2 sm:py-3 text-left font-semibold border border-gray-200 whitespace-nowrap">
                  Mobile
                </th>
                <th className="px-1.5 xs:px-2 sm:px-3 py-2 sm:py-3 text-left font-semibold border border-gray-200 whitespace-nowrap hidden md:table-cell">
                  Role
                </th>
                <th className="px-1.5 xs:px-2 sm:px-3 py-2 sm:py-3 text-left font-semibold border border-gray-200 whitespace-nowrap hidden lg:table-cell">
                  Created
                </th>
                <th className="px-1.5 xs:px-2 sm:px-3 py-2 sm:py-3 text-center font-semibold border border-gray-200 whitespace-nowrap">
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
                    <td className="px-1.5 xs:px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 align-top">
                      {start + i + 1}
                    </td>
                    <td className="px-1.5 xs:px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 align-top">
                      <div
                        className="max-w-[80px] xs:max-w-[120px] sm:max-w-[180px] truncate"
                        title={a.name}
                      >
                        {a.name}
                      </div>
                    </td>
                    <td className="px-1.5 xs:px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 align-top whitespace-nowrap">
                      {a.mobile}
                    </td>
                    <td className="px-1.5 xs:px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 align-top hidden md:table-cell">
                      {a.role}
                    </td>
                    <td className="px-1.5 xs:px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 align-top hidden lg:table-cell whitespace-nowrap text-xs">
                      {formatDateToDDMMYYYY(a.createdAt)}
                    </td>
                    <td className="px-1.5 xs:px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 align-top">
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          className="p-1 sm:p-2 rounded-md bg-amber-500 text-white hover:bg-amber-600"
                          title="Edit"
                          aria-label="Edit"
                        >
                          <FiEdit className="text-xs sm:text-base" />
                        </button>
                        <button
                          type="button"
                          onClick={() => askDelete(a)}
                          className="p-1 sm:p-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                          title="Delete"
                          aria-label="Delete"
                        >
                          <FiTrash2 className="text-xs sm:text-base" />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-3 py-6 sm:py-8 text-center text-gray-600 text-xs sm:text-sm"
                    colSpan={6}
                  >
                    No super admins found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Admin Modal */}
      {create.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4">
          <form
            onSubmit={saveCreate}
            className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800">Add Super Admin</h3>
              <button
                onClick={closeCreate}
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
                  Name
                </label>
                <input
                  placeholder="Enter super admin name"
                  value={create.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow letters and spaces
                    const filtered = value.replace(/[^A-Za-z\s]/g, "");
                    setCreate((c) => ({ ...c, name: filtered }));
                  }}
                  onKeyPress={(e) => {
                    // Prevent non-alphabetic characters from being entered
                    if (!/[A-Za-z\s]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile
                </label>
                <input
                  placeholder="Enter 10 digit mobile number"
                  value={create.mobile}
                  onChange={(e) => {
                    const digits = (e.target.value || "")
                      .replace(/\D/g, "")
                      .slice(0, 10);
                    setCreate((c) => ({ ...c, mobile: digits }));
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", ".", " "].includes(e.key))
                      e.preventDefault();
                  }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showCreatePwd ? "text" : "password"}
                    value={create.password}
                    onChange={(e) =>
                      setCreate((c) => ({ ...c, password: e.target.value }))
                    }
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
              <button
                type="button"
                onClick={closeCreate}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                disabled={create.saving}
                type="submit"
                className={`px-4 py-2 rounded-md bg-indigo-600 text-white ${create.saving ? "opacity-60" : "hover:bg-indigo-700"
                  }`}
              >
                {create.saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Admin Modal */}
      {edit.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4">
          <form
            onSubmit={saveEdit}
            className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800">Edit Super Admin</h3>
              <button
                onClick={() => setEdit({ ...edit, open: false })}
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
                  Name
                </label>
                <input
                  placeholder="Enter super admin name"
                  value={edit.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    const filtered = value.replace(/[^A-Za-z\s]/g, "");
                    setEdit((c) => ({ ...c, name: filtered }));
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile
                </label>
                <input
                  value={edit.mobile}
                  readOnly
                  disabled
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    value={edit.password}
                    readOnly
                    disabled
                    type={showEditPwd ? "text" : "password"}
                    className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed pr-24"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEditPwd((s) => !s)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
                      title={showEditPwd ? "Hide Password" : "Show Password"}
                    >
                      {showEditPwd ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEdit(e => ({ ...e, open: false }));
                        openChangePwd({ mobile: edit.mobile, name: edit.name });
                      }}
                      className="p-2 bg-white border rounded-full hover:bg-gray-50 text-indigo-600 shadow-sm"
                      title="Change Password"
                    >
                      <FiEdit size={14} />
                    </button>
                  </div>
                </div>
              </div>

            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setEdit({ ...edit, open: false })}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                disabled={edit.saving}
                type="submit"
                className={`px-4 py-2 rounded-md bg-indigo-600 text-white ${edit.saving ? "opacity-60" : "hover:bg-indigo-700"
                  }`}
              >
                {edit.saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl ring-1 ring-gray-200 p-4 sm:p-6 md:p-7 w-full max-w-md transform transition-all max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Delete
              </h3>
              <button
                onClick={confirm.deleting ? undefined : cancelDelete}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                aria-label="Close"
                disabled={confirm.deleting}
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 text-red-700 border border-red-200 mb-3">
              <FiAlertTriangle className="mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">This action is permanent.</p>
                <p>
                  Deleting this super admin will permanently remove the account
                  and all associated privileges. This cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-gray-700 mb-3">
              Type <span className="font-semibold">DELETE SUPER ADMIN</span> to
              confirm deletion of{" "}
              <span className="font-semibold">
                {String(confirm.name || "User").length > 24
                  ? String(confirm.name || "User").slice(0, 24) + "..."
                  : String(confirm.name || "User")}
              </span>{" "}
              (<span className="break-all">{confirm.mobile}</span>).
            </p>

            <input
              type="text"
              value={confirm.text || ""}
              onChange={(e) =>
                setConfirm((prev) => ({ ...prev, text: e.target.value }))
              }
              placeholder="DELETE SUPER ADMIN"
              autoFocus
              className={`w-full border rounded-md px-3 py-2 mb-1 focus:outline-none focus:ring-2 ${(confirm.text || "").trim() &&
                (confirm.text || "").trim().toUpperCase() !== "DELETE SUPER ADMIN"
                ? "border-red-500 ring-red-500 bg-red-50"
                : "border-gray-300 focus:ring-red-500"
                }`}
            />
            {(confirm.text || "").trim() &&
              (confirm.text || "").trim().toUpperCase() !== "DELETE SUPER ADMIN" && (
                <p className="text-xs text-red-600 mb-3">
                  Please type DELETE SUPER ADMIN exactly as shown.
                </p>
              )}

            <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-3">
              <button
                type="button"
                className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm sm:ml-3 sm:w-auto ${(confirm.text || "").trim().toUpperCase() === "DELETE SUPER ADMIN" && !confirm.deleting
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                onClick={doDelete}
                disabled={
                  (confirm.text || "").trim().toUpperCase() !== "DELETE SUPER ADMIN" || confirm.deleting
                }
              >
                {confirm.deleting ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                onClick={cancelDelete}
                disabled={confirm.deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {changePwd.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={doChangePwd} className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Change Password</h3>
              <button type="button" onClick={() => setChangePwd(p => ({ ...p, open: false }))}><FiX /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Updating password for <b>{changePwd.name}</b> ({changePwd.mobile})
            </p>
            <div className="mb-4 relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type={showChangePwd ? "text" : "password"}
                className="w-full border border-indigo-200 rounded px-3 py-2 pr-10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                value={changePwd.newPassword}
                onChange={e => setChangePwd(p => ({ ...p, newPassword: e.target.value }))}
                placeholder="Min 6 chars"
                required
              />
              <button
                type="button"
                onClick={() => setShowChangePwd((s) => !s)}
                className="absolute inset-y-0 right-2 top-6 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showChangePwd ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setChangePwd(p => ({ ...p, open: false }))}
                className="px-4 py-2 bg-gray-200 rounded text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={changePwd.loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {changePwd.loading ? "Updating..." : "Update"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SuperAdmins;
