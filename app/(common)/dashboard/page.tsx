import React from 'react'
import Dashboard from '@/components/Pages/Dashboard/Dashboard'
import HeaderTwo from '@/components/Shared/HeaderTwo'
import { ProtectedRoute } from '@/src/auth/ProtectedRoute'

export default function page() {
  return (
      <ProtectedRoute>
          <HeaderTwo />
          <Dashboard />
      </ProtectedRoute>
  )
}
