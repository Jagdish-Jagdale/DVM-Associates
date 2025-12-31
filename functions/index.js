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
    schedule: "35 17 * * *",
    timeZone: "Asia/Kolkata",
}, async (event) => {
    const db = admin.database();
    const ref = db.ref("excel_records");

    try {
        // 1. Get max RefNo
        // Scanning all records can be expensive if large. 
        // Ideally we should keep a counter, but for now standard scan as per user "calculate last ref no+1"
        const snapshot = await ref.once("value");
        let maxRef = 0;
        snapshot.forEach(child => {
            const val = child.val();
            if (val && val.RefNo) {
                // Should extract number if it's mixed string "Ref 123"
                // Assuming it's numeric based on "calculate"
                const num = parseInt(val.RefNo, 10);
                if (!isNaN(num) && num > maxRef) maxRef = num;
            }
        });

        const nextRef = Math.max(maxRef, 6500) + 1;
        const nextRefStr = String(nextRef).padStart(3, '0');

        // 2. Calculate Office No
        // Format: DVM/RESERVED/(server current year short - server next year short)
        // e.g. DVM/RESERVED/25-26
        const d = new Date();
        // Financial Year Logic (Apr 1 - Mar 31)
        // If current month is April (3) or later, FY starts this year. 
        // If Jan-Mar (0-2), FY started previous year.
        const currentMonthIndex = d.getMonth();
        const currentYear = d.getFullYear();

        let startYear, endYear;
        if (currentMonthIndex >= 3) {
            startYear = currentYear;
            endYear = currentYear + 1;
        } else {
            startYear = currentYear - 1;
            endYear = currentYear;
        }

        const yShort = startYear % 100;
        const nextY = endYear % 100;
        const padNextY = String(nextY).padStart(2, '0');
        const officeNo = `DVM/RESERVED/${yShort}-${padNextY}`;

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const currentMonth = monthNames[d.getMonth()];

        // 3. Add to DB
        // Format: DVM-RESERVED-YY-YY-NNN
        const key = `${officeNo.replace(/\//g, '-')}-${nextRefStr}`;

        await ref.child(key).set({
            RefNo: nextRefStr,
            OfficeNo: officeNo,
            committedRefNo: nextRefStr,
            createdAt: new Date().toISOString(),
            ClientName: "",
            Month: currentMonth,
            isReserved: true,

            // Initialize other fields to empty/default
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
            ReportStatus: "Pending",
            BillStatus: "Pending"
        });

        console.log(`Auto-created Reserved Row with key ${key}: ${officeNo} Ref: ${nextRef}`);
    } catch (error) {
        console.error("Error in autoReservedRow:", error);
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
