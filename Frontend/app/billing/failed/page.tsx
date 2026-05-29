'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MdErrorOutline } from 'react-icons/md'

function FailedPageImpl() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'The transaction was declined or canceled.'
  const campaignId = searchParams.get('campaignId') || ''

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(125%_125%_at_50%_101%,#ef4444_10.5%,#f87171_16%,#fca5a5_17.5%,#fecaca_25%,rgba(238,174,202,1)_40%,rgba(202,179,214,1)_65%,rgba(148,201,233,1)_100%)] relative overflow-hidden font-helvetica flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-slate-900/80 backdrop-blur-xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)] text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-center">
          <MdErrorOutline className="text-red-400 text-7xl animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl text-white font-bold tracking-tight">Payment Failed</h1>
          <p className="text-slate-400 text-sm">We couldn't process your transaction.</p>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3 text-sm text-left">
          <div className="flex flex-col gap-1">
            <span className="text-slate-400">Reason</span>
            <span className="text-white font-medium">{error}</span>
          </div>
          {campaignId && (
            <div className="flex justify-between border-t border-white/5 pt-2">
              <span className="text-slate-400">Campaign ID</span>
              <span className="text-white font-mono truncate max-w-[180px]">{campaignId}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link
            href={campaignId ? `/campaign/preview?campaignId=${campaignId}` : '/yourcampaigns'}
            className="block w-full py-3.5 px-6 rounded-xl bg-white hover:bg-white/95 text-black font-semibold transition text-sm shadow-[0_4px_12px_rgba(255,255,255,0.2)] cursor-pointer"
          >
            Retry Payment
          </Link>
          <Link
            href="/yourcampaigns"
            className="block w-full py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition text-sm cursor-pointer"
          >
            Go to Your Campaigns
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function FailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading...</div>}>
      <FailedPageImpl />
    </Suspense>
  )
}
