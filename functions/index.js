const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();

// Set max instances to control costs
setGlobalOptions({ maxInstances: 10 });

/**
 * Callable function to update a user's password.
 * Can be called by Super Admins from the frontend.
 *
 * payload: { uid: string, newPassword: string }
 */
exports.updateUserPassword = onCall(async (request) => {
    // 1. Validation
    const { uid, mobile, newPassword } = request.data;
    if ((!uid && !mobile) || !newPassword) {
        throw new HttpsError(
            "invalid-argument",
            "UID (or Mobile) and new password are required.",
        );
    }

    // 2. Authorization
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "The function must be called while authenticated.",
        );
    }

    try {
        let targetUid = uid;

        // If UID not provided, look up by mobile
        if (!targetUid && mobile) {
            const email = `${mobile}@admin.com`;
            try {
                const userRecord = await admin.auth().getUserByEmail(email);
                targetUid = userRecord.uid;
            } catch (e) {
                if (e.code === 'auth/user-not-found') {
                    throw new HttpsError("not-found", `User with mobile ${mobile} not found.`);
                }
                throw e;
            }
        }

        // 3. Update the user
        await admin.auth().updateUser(targetUid, {
            password: newPassword,
        });

        return {
            success: true,
            message: `Password updated for user ${targetUid}`
        };
    } catch (error) {
        console.error("Error updating password:", error);
        // Return explicit error message to frontend
        throw new HttpsError("internal", error.message);
    }
});

exports.deleteUserAccount = onCall(async (request) => {
    const { mobile } = request.data;
    if (!mobile) {
        throw new HttpsError("invalid-argument", "Mobile number is required.");
    }
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be authenticated.");
    }

    try {
        const email = `${mobile}@admin.com`;
        let targetUid;
        try {
            const user = await admin.auth().getUserByEmail(email);
            targetUid = user.uid;
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                return { success: true, message: "User not found in Auth, proceeding to DB delete." };
            }
            throw e;
        }

        await admin.auth().deleteUser(targetUid);
        return { success: true, message: `User ${mobile} deleted from Auth.` };
    } catch (error) {
        console.error("Error deleting user:", error);
        throw new HttpsError("internal", error.message);
    }
});

exports.autoReservedRow = onSchedule({
    schedule: "0 0 * * *",
    timeZone: "Asia/Kolkata",
}, async (event) => {
    // Check if today is Sunday in IST (0 = Sunday)
    const now = new Date();
    const istDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    if (istDate.getDay() === 0) {
        console.log("Skipping autoReservedRow because it is Sunday (IST).");
        return;
    }

    const db = admin.database();

    // 1. Calculate Banking Year (Apr-Mar)
    // Use Server Time for year calculation
    const currentMonthIndex = now.getMonth();
    const currentYear = now.getFullYear();

    let startYear;
    if (currentMonthIndex >= 3) {
        startYear = currentYear;
    } else {
        startYear = currentYear - 1;
    }

    const y1 = startYear % 100;
    const y2 = (startYear + 1) % 100;
    const yearPair = `${y1}-${String(y2).padStart(2, '0')}`; // e.g., "25-26"

    try {
        // 2. Transactional Counter
        // Use EXACT SAME counter path as createExcelRecord
        const counterRef = db.ref(`metadata/counters/${yearPair}`);
        let assignedRefNo = 0;

        const result = await counterRef.transaction((current) => {
            if (current === null) {
                return -1; // Flag for lazy init
            }
            return current + 1;
        });

        if (result.committed) {
            if (result.snapshot.val() === -1) {
                // Initialize counter logic (Same as createExcelRecord)
                const excelRef = db.ref("excel_records");
                const snapshot = await excelRef.once("value");
                let maxRef = 0;

                // Scan logic (Global Scan for Continuity)
                snapshot.forEach(child => {
                    const val = child.val();
                    if (val && val.RefNo) {
                        const n = parseInt(val.RefNo, 10);
                        if (!isNaN(n) && n > maxRef) {
                            maxRef = n;
                        }
                    }
                });

                const startVal = Math.max(maxRef, 6500) + 1;

                const initResult = await counterRef.transaction((curr) => {
                    if (curr !== null && curr !== -1) return curr + 1;
                    return startVal;
                });

                if (initResult.committed) {
                    assignedRefNo = initResult.snapshot.val();
                } else {
                    console.error("autoReservedRow failed to init counter");
                    return;
                }
            } else {
                assignedRefNo = result.snapshot.val();
            }
        } else {
            console.error("autoReservedRow transaction failed");
            return;
        }

        const nextRefStr = String(assignedRefNo).padStart(3, '0');
        const officeNo = `DVM/RESERVED/${yearPair}`;
        const key = `DVM-RESERVED-${yearPair}-${nextRefStr}`;
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const currentMonth = monthNames[now.getMonth()];

        // 3. Save Reserved Row
        await db.ref(`excel_records/${key}`).set({
            RefNo: nextRefStr,
            OfficeNo: officeNo,
            committedRefNo: nextRefStr,
            createdAt: now.toISOString(),
            ClientName: "",
            Month: currentMonth,
            isReserved: true,
            createdByRole: "System",

            // Defaults
            VisitDate: "",
            ReportDate: "",
            TechnicalExecutive: "",
            Bank: "",
            Branch: "",
            ClientContactNo: "",
            Locations: "",
            Location: "",
            CaseInitiated: "",
            Engineer: "",
            FMV: "",
            SoftCopy: false,
            Print: false,
            Amount: "",
            GST: "",
            Total: "",
            ReceivedOn: "",
            RecdDate: "",
            GSTNo: "",
            Remark: "",
            VisitStatus: "Pending",
            ReportStatus: "",
            BillStatus: ""
        });

        console.log(`Auto-created Reserved Row with key ${key}: ${officeNo} Ref: ${nextRefStr}`);
    } catch (error) {
        console.error("Error in autoReservedRow:", error);
    }
});

exports.createExcelRecord = onCall(async (request) => {
    // 1. Validation
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be authenticated.");
    }
    const data = request.data;
    if (!data.Location) {
        throw new HttpsError("invalid-argument", "Location is required.");
    }

    const getLocationShort = (loc) => {
        const map = {
            "Belgaum": "BGM",
            "Bengaluru": "BLR",
            "Hyderabad": "HYD",
            "Indore": "INDR",
            "Kolhapur": "KOP",
            "Mumbai": "MUM",
            "Pune": "PUNE",
            "Sangli": "SNGL",
            "Satara": "STR",
            "Vijayapur": "VJP",
            // Keep existing ones if needed, or remove if strictly limited to image
            "Ch. Sambhajinagar": "SAM",
            "Dharashiv": "DHA",
            "Ahilyanagar": "AHI",
            "Solapur": "SOL"
        };
        // Default to first 3 letters upper case if not found
        return map[loc] || loc.substring(0, 3).toUpperCase();
    };

    try {
        const db = admin.database();

        // 2. Banking Year Logic (Apr 1 - Mar 31)
        const dateStr = data.createdAt || new Date().toISOString();
        const dateObj = new Date(dateStr);
        const month = dateObj.getMonth(); // 0 = Jan, 3 = April
        const year = dateObj.getFullYear();

        let startYear;
        // If Jan(0), Feb(1), Mar(2) -> belongs to PREVIOUS financial start year
        if (month < 3) {
            startYear = year - 1;
        } else {
            startYear = year;
        }

        const y1 = startYear % 100;
        const y2 = (startYear + 1) % 100;
        const yearPair = `${y1}-${String(y2).padStart(2, '0')}`; // e.g., "25-26"

        // 3. Transactional Counter
        const counterRef = db.ref(`metadata/counters/${yearPair}`);
        let assignedRefNo = 0;

        const result = await counterRef.transaction((current) => {
            if (current === null) {
                // Return non-null to abort and initialize outside
                return -1;
            }
            return current + 1;
        });

        if (result.committed) {
            if (result.snapshot.val() === -1) {
                // Counter didn't exist, we aborted transaction. Proceed to initialize.
                // Need to find max RefNo from existing records
                const excelRef = db.ref("excel_records");
                const snapshot = await excelRef.once("value");
                let maxRef = 0;

                // Scan logic (Global Scan for Continuity)
                snapshot.forEach(child => {
                    const val = child.val();
                    if (val && val.RefNo) {
                        const n = parseInt(val.RefNo, 10);
                        if (!isNaN(n) && n > maxRef) {
                            maxRef = n;
                        }
                    }
                });

                // Initialize counter. Base is 6500.
                const startVal = Math.max(maxRef, 6500) + 1;

                // Now try to set it safely?
                // We can just use transaction again to initialize if still null
                const initResult = await counterRef.transaction((curr) => {
                    // If someone else initialized it in between, just increment
                    if (curr !== null && curr !== -1) return curr + 1;
                    return startVal;
                });

                if (initResult.committed) {
                    assignedRefNo = initResult.snapshot.val();
                } else {
                    throw new HttpsError("aborted", "Failed to initialize counter.");
                }
            } else {
                assignedRefNo = result.snapshot.val();
            }
        } else {
            throw new HttpsError("aborted", "Transaction failed.");
        }

        const refNoStr = String(assignedRefNo).padStart(3, '0');

        // 4. Construct Data
        // DVM-{LOC SHORT}-{YP}-{REFNO}
        const locShort = getLocationShort(data.Location);
        const officeNo = `DVM/${locShort}/${yearPair}`;
        const key = `DVM-${locShort}-${yearPair}-${refNoStr}`;

        const newRecord = {
            ...data,
            RefNo: refNoStr,
            OfficeNo: officeNo,
            createdAt: dateStr,
            created_by: request.auth.token.phone_number || request.auth.uid, // Track creator
            createdBy: request.auth.uid
        };

        // 5. Save to DB
        await db.ref(`excel_records/${key}`).set(newRecord);

        return {
            success: true,
            refNo: refNoStr,
            key: key,
            officeNo: officeNo
        };

    } catch (err) {
        console.error("createExcelRecord error:", err);
        throw new HttpsError("internal", err.message);
    }
});
