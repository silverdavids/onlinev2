import Promotions from '@/components/Pages/Promotions/Promotions'
import HeaderMain from '@/components/Shared/HeaderMain'
import { ProtectedRoute } from '@/src/auth/ProtectedRoute'
import React from 'react'

export default function page() {
  return (
      <>
          <HeaderMain />
          <ProtectedRoute>
            <Promotions />
          </ProtectedRoute>
      </>
  )
}
