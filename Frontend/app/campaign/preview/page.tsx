'use client'

import { Suspense } from 'react'
import PreviewPageImpl from './PreviewPageImpl'

function PreviewPageContent() {
  return <PreviewPageImpl fromCreationFlow={true} />
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PreviewPageContent />
    </Suspense>
  )
}

