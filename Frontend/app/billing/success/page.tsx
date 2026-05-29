'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MdCheckCircle } from 'react-icons/md'

function SuccessPageImpl() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('paymentId') || 'pay_mock_123456789'
  const amount = searchParams.get('amount') || '0'
  const campaignId = searchParams.get('campaignId') || ''

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(125%_125%_at_50%_101%,rgba(245,87,2,1)_10.5%,rgba(245,120,2,1)_16%,rgba(245,140,2,1)_17.5%,rgba(245,170,100,1)_25%,rgba(238,174,202,1)_40%,rgba(202,179,214,1)_65%,rgba(148,201,233,1)_100%)] relative overflow-hidden font-helvetica flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-slate-900/80 backdrop-blur-xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)] text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-center">
          <MdCheckCircle className="text-emerald-400 text-7xl animate-bounce" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl text-white font-bold tracking-tight">Payment Successful!</h1>
          <p className="text-slate-400 text-sm">Your campaign transaction has been processed.</p>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3 text-sm text-left">
          <div className="flex justify-between">
            <span className="text-slate-400">Payment Reference</span>
            <span className="text-white font-mono font-medium truncate max-w-[200px]">{paymentId}</span>
          </div>
          {amount !== '0' && (
            <div className="flex justify-between">
              <span className="text-slate-400">Amount Paid</span>
              <span className="text-white font-bold font-mono">₹{parseFloat(amount).toLocaleString('en-IN')}</span>
            </div>
          )}
          {campaignId && (
            <div className="flex justify-between">
              <span className="text-slate-400">Campaign ID</span>
              <span className="text-white font-mono truncate max-w-[200px]">{campaignId}</span>
            </div>
          )}
        </div>

        <div className="pt-2">
          <Link
            href="/yourcampaigns"
            className="block w-full py-3.5 px-6 rounded-xl bg-white hover:bg-white/95 text-black font-semibold transition text-sm shadow-[0_4px_12px_rgba(255,255,255,0.2)] cursor-pointer"
          >
            Go to Your Campaigns
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading...</div>}>
      <SuccessPageImpl />
    </Suspense>
  )
}
