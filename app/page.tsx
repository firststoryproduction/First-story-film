'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Temporarily bypassing auth for front-end preview
    router.push('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0369A1] mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
