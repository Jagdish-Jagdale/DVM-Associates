import React from "react";
import { FiX, FiCheckCircle, FiAlertCircle, FiInfo } from "react-icons/fi";

const ModernSnackbar = ({ snack, setSnack }) => {
  const icons = {
    success: <FiCheckCircle className="text-xl" />,
    error: <FiAlertCircle className="text-xl" />,
    info: <FiInfo className="text-xl" />,
    warning: <FiAlertCircle className="text-xl" />,
  };

  const colors = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
    warning: "bg-yellow-500 text-black",
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-[9999] px-4 py-3 rounded-lg shadow-xl
        text-white flex items-center gap-3 max-w-[320px]
        transition-all duration-300 transform select-none
        ${
          snack.open
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-3 pointer-events-none"
        }
        ${colors[snack.type] || "bg-gray-800"}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 flex-1">
        <div className="flex-shrink-0">{icons[snack.type]}</div>
        <span className="font-medium text-sm break-words">{snack.message}</span>
      </div>

      <button
        onClick={() => setSnack((s) => ({ ...s, open: false }))}
        className="hover:bg-white/20 p-1 rounded transition"
        aria-label="Close notification"
      >
        <FiX className="text-lg" />
      </button>
    </div>
  );
};

export default ModernSnackbar;
