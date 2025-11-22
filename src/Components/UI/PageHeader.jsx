import React from 'react'

export default function PageHeader({ title, subtitle, right }) {
  return (
    <div className="mb-6 md:mb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">{title}</h1>
          {subtitle ? (
            <p className="text-gray-500 mt-1 text-sm md:text-base">{subtitle}</p>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-3 border-t border-gray-200" />
    </div>
  )
}
