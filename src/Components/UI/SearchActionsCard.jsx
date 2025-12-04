import React from "react";

export default function SearchActionsCard({
  title = "Search & Actions",
  recordsCount = 0,
  recordsLabel = "records",
  rightPrimary = null,
  children,
  contentClassName,
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-5 mb-4 font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-4">
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto sm:justify-end">
          <span className="text-sm text-gray-500">
            Total {recordsLabel}: {recordsCount}
          </span>
          {rightPrimary}
        </div>
      </div>
      <hr className="border-gray-200 my-3" />
      {children ? (
        <div
          className={
            contentClassName ||
            "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
          }
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
