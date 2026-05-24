'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CampaignProvider } from './CampaignContext'

const steps = [
  { name: 'Title', path: '/campaign/title' },
  { name: 'Description', path: '/campaign/description' },
  { name: 'Channels', path: '/campaign/channels' },
  { name: 'Assets', path: '/campaign/assets' },
  { name: 'Docs', path: '/campaign/docs' },
  { name: 'Contacts', path: '/campaign/contacts' },
  { name: 'Preview', path: '/campaign/preview' },
]

export default function CampaignLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const currentStepIndex = steps.findIndex((s) => pathname.startsWith(s.path))
  const progressPct = currentStepIndex >= 0
    ? Math.round(((currentStepIndex + 1) / steps.length) * 100)
    : 0

  // Animate card in on route change
  const [visible, setVisible] = useState(false)
  const prevPath = useRef(pathname)
  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 40)
    prevPath.current = pathname
    return () => clearTimeout(t)
  }, [pathname])

  return (
    <CampaignProvider>
      <div className="min-h-screen w-full bg-[radial-gradient(125%_125%_at_50%_101%,rgba(245,87,2,1)_10.5%,rgba(245,120,2,1)_16%,rgba(245,140,2,1)_17.5%,rgba(245,170,100,1)_25%,rgba(238,174,202,1)_40%,rgba(202,179,214,1)_65%,rgba(148,201,233,1)_100%)] relative overflow-hidden font-helvetica flex flex-col">

        {/* ── Top nav ── */}
        <div className="relative z-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <a
            href='/'
            className="text-xl font-medium text-black px-2 py-1.5 border-2 border-black rounded-xl hover:bg-black/10 transition cursor-pointer"
          >
            Back
          </a>
          <div className="flex items-center gap-4">
            <Link
              href="/yourcampaigns"
              className="text-xl font-medium text-black px-2 py-1.5 border-2 border-black rounded-xl hover:bg-black/10 transition cursor-pointer"
            >
              Your Campaigns
            </Link>
            {/* <Link
              href="/inbox"
              className="text-xl font-medium text-black px-2 py-1.5 border-2 border-black rounded-xl hover:bg-black/10 transition cursor-pointer"
            >
              Inbox
            </Link> */}
          </div>
        </div>

        {/* ── Hero heading ── */}
        <div className="relative z-10 mb-10 flex flex-col items-center justify-center font-instrument mt-10">
          <h1 className='text-7xl text-black tracking-tight'>Let's start your <i className='italic'>Campaign</i></h1>
        </div>

        {/* ── Content ── */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 py-2">
          <div className="w-full max-w-5xl">

            {/* ── Step navigation ── */}
            <div className="mb-5 px-3 py-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/30 rounded-full">
              {/* Pills row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide rounded-full ">
                {steps.map((step, idx) => {
                  const isCompleted = idx < currentStepIndex
                  const isCurrent   = idx === currentStepIndex
                  const isLocked    = idx > currentStepIndex
                  return (
                    <Link
                      key={step.path}
                      href={step.path}
                      onClick={(e) => isLocked && e.preventDefault()}
                      className={`
                        relative ml-1 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 whitespace-nowrap select-none
                        ${isCurrent
                          ? 'bg-white text-black shadow-[0_4px_18px_rgba(255,255,255,0.45)] scale-105'
                          : isCompleted
                          ? 'bg-black/60 text-white border border-white/30 hover:bg-black/70'
                          : 'bg-white/10 text-white/50 cursor-not-allowed'
                        }
                      `}
                    >
                      {isCompleted && (
                        <span className="mr-1 opacity-70"></span>
                      )}
                      {step.name}
                      {isCurrent && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-black/40" />
                      )}
                    </Link>
                  )
                })}
              </div>

              {/* Thin progress bar */}
              <div className="h-[2px] w-full rounded-full bg-black/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-black/40 transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Step counter */}
              <p className="mt-1.5 text-[11px] text-black/40 text-right">
                Step {currentStepIndex + 1} of {steps.length}
              </p>
            </div>

            {/* ── Main card with slide-up fade-in on route change ── */}
            <div
              className="rounded-3xl border mb-20 border-white/20 bg-slate-900/70 backdrop-blur-xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.3)] transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0px)' : 'translateY(18px)',
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </CampaignProvider>
  )
}
