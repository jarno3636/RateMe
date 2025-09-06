'use client'

import { Toaster } from 'react-hot-toast'
import React from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      {children}
    </>
  )
}
