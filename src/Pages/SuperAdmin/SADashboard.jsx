import React from 'react'

const SuperAdmin = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-[600px] text-center">
        <h1 className="text-2xl font-bold text-purple-700 mb-2">Super Admin</h1>
        <p className="text-gray-700">No role found in database. Logged in as <span className="font-semibold">super-admin</span>.</p>
      </div>
    </div>
  )
}

export default SuperAdmin
