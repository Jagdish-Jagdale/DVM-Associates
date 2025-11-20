import React from 'react'

export default function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-6 md:mb-8">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800">{title}</h1>
      {subtitle ? (
        <p className="text-gray-500 mt-1 text-sm md:text-base">{subtitle}</p>
      ) : null}
    </div>
  )
}
