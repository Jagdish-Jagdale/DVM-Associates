import React from 'react'

export default function SearchActionsCard({ title = 'Search & Actions', recordsCount = 0, rightPrimary = null, children, contentClassName }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-5 mb-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Showing {recordsCount} {recordsCount === 1 ? 'record' : 'records'}</span>
          {rightPrimary}
        </div>
      </div>
      {children ? (
        <div className={contentClassName || 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'}>
          {children}
        </div>
      ) : null}
    </div>
  )
}
