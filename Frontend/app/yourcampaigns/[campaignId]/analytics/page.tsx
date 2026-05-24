'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts'
import useSWR from 'swr'
import { VscCallOutgoing, VscHistory } from 'react-icons/vsc'
import { MdTimer, MdCheckCircle, MdCancel, MdMessage, MdPeople, MdArrowBack } from 'react-icons/md'
import { BsWhatsapp, BsLightningChargeFill } from 'react-icons/bs'
import { motion, AnimatePresence } from 'framer-motion'

const fetcher = (url: string) => fetch(url).then(res => res.json())

// Helper: get initials from a name string
function getInitials(name: string) {
  if (!name) return '?'
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatCallTimestamp(timestamp?: string) {
  if (!timestamp) return 'Unknown time'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toLocaleString([], {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function parseCallTranscript(transcript: string) {
  if (!transcript) return [] as Array<{ sender: 'user' | 'agent' | 'system'; content: string }>

  return transcript
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(assistant|agent|ai|bot|system|user|customer|caller|human)\s*[:\-]\s*(.*)$/i)
      if (match) {
        const label = match[1].toLowerCase()
        const content = match[2].trim()
        const isUser = ['user', 'customer', 'caller', 'human'].includes(label)
        const isSystem = label === 'system'
        return {
          sender: isUser ? 'user' : isSystem ? 'system' : 'agent',
          content: content || line,
        }
      }
      return { sender: 'agent', content: line }
    })
}

export default function CampaignAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.campaignId as string
  const [whatsappModal, setWhatsappModal] = useState<'messages' | 'users' | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<any>(null)
  const [callLogsModal, setCallLogsModal] = useState(false)
  const [selectedCallLog, setSelectedCallLog] = useState<any>(null)
  const [chatSummaryOpen, setChatSummaryOpen] = useState(false)
  const [chatSummaryLoading, setChatSummaryLoading] = useState(false)
  const [chatSummaryError, setChatSummaryError] = useState('')
  const [chatSummary, setChatSummary] = useState<{
    overallSummary: string
    overallSentiment: 'positive' | 'negative' | 'mixed' | 'neutral'
    commonQuestions: Array<{ type: string; count: number; examples: string[] }>
    unansweredQuestions: Array<{ question: string; reason: string }>
  } | null>(null)
  const [organizerAnswers, setOrganizerAnswers] = useState<Record<string, string>>({})
  const [organizerSaving, setOrganizerSaving] = useState<Record<string, boolean>>({})
  const [organizerStatus, setOrganizerStatus] = useState<Record<string, string>>({})
  const [callSummaryOpen, setCallSummaryOpen] = useState(false)
  const [callSummaryLoading, setCallSummaryLoading] = useState(false)
  const [callSummaryError, setCallSummaryError] = useState('')
  const [callSummary, setCallSummary] = useState<{
    overallSummary: string
    overallSentiment: 'positive' | 'negative' | 'mixed' | 'neutral'
    commonQuestions: Array<{ type: string; count: number; examples: string[] }>
    unansweredQuestions: Array<{ question: string; reason: string }>
  } | null>(null)
  const [callOrganizerAnswers, setCallOrganizerAnswers] = useState<Record<string, string>>({})
  const [callOrganizerSaving, setCallOrganizerSaving] = useState<Record<string, boolean>>({})
  const [callOrganizerStatus, setCallOrganizerStatus] = useState<Record<string, string>>({})

  const { data, error, isLoading, mutate } = useSWR(
    campaignId ? `/api/campaigns/${campaignId}/analytics` : null,
    fetcher,
    { refreshInterval: 10000 }
  )

  const { data: campaignData } = useSWR(
    campaignId ? `/api/campaigns/${campaignId}` : null,
    fetcher
  )

  const campaignName = campaignData?.title || campaignData?.campaign?.title || null

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#E1E0CC] flex items-center justify-center">
        <div className="text-center animate-pulse">
          <img src="/favicon.svg" alt="Loading" className="w-12 h-12 mx-auto mb-4 animate-spin opacity-50 mix-blend-multiply" />
          <p className="text-slate-500 font-medium tracking-wide">Aggregating real-time analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#E1E0CC] flex items-center justify-center">
        <div className="text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-red-100 border border-red-200 flex items-center justify-center mx-auto shadow-sm">
            <MdCancel className="text-3xl text-red-500" />
          </div>
          <p className="text-slate-500 font-medium tracking-wide">Failed to load analytics data.</p>
          <button onClick={() => router.back()} className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-semibold text-sm hover:bg-slate-800 transition-colors shadow-lg shadow-black/10">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const { 
    callsTotal = 0,
    callsAnswered = 0,
    callsMissed = 0,
    callLogs = [],
    whatsappMessagesSent = 0, 
    whatsappInteractedUsers = 0, 
    totalContacts = 0,
    whatsappConversations = [],
    answeredContacts = [],
    missedContacts = []
  } = data
  
  const voiceCallsAnswered = callsAnswered
  const voiceCallsMissed = callsMissed
  const voiceCalls = callsTotal
  const voiceCallsAnsweredRate = voiceCalls > 0
    ? Math.round((voiceCallsAnswered / voiceCalls) * 100)
    : 0
  const engagementScore = voiceCalls > 0
    ? Math.round((voiceCallsAnswered / voiceCalls) * 100)
    : 0
  const callLogCount = Array.isArray(callLogs) ? callLogs.length : 0

  // Bar chart — hardcoded call data
  const chartData = [
    { name: 'Answered', value: voiceCallsAnswered, color: '#10b981' },
    { name: 'Missed', value: voiceCallsMissed, color: '#ef4444' },
  ]

  // Donut chart — WhatsApp reply ratio (interacted vs total contacts)
  const waReplied = whatsappInteractedUsers
  const waTotal = totalContacts > 0 ? totalContacts : Math.max(whatsappMessagesSent, whatsappInteractedUsers)
  const waNotReplied = Math.max(0, waTotal - waReplied)
  const waReplyRate = waTotal > 0
    ? Math.round((waReplied / waTotal) * 100)
    : 0
  const waChartData = [
    { name: 'Users Interacted', value: waReplied || 0, color: '#0ea5e9' },
    { name: 'Not Interacted', value: waNotReplied || 0, color: '#cbd5e1' },
  ]

  const loadChatSummary = async () => {
    if (!campaignId || chatSummaryLoading) return
    setChatSummaryOpen(true)
    if (chatSummary) return

    setChatSummaryLoading(true)
    setChatSummaryError('')
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/chat-summary`)
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load chat summary')
      }
      setChatSummary(result)
    } catch (err) {
      setChatSummaryError(err instanceof Error ? err.message : 'Failed to load chat summary')
    } finally {
      setChatSummaryLoading(false)
    }
  }

  const loadCallSummary = async () => {
    if (!campaignId || callSummaryLoading) return
    setCallSummaryOpen(true)
    if (callSummary) return

    setCallSummaryLoading(true)
    setCallSummaryError('')
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/call-summary`)
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load call summary')
      }
      setCallSummary(result)
    } catch (err) {
      setCallSummaryError(err instanceof Error ? err.message : 'Failed to load call summary')
    } finally {
      setCallSummaryLoading(false)
    }
  }

  const saveOrganizerAnswer = async (questionId: string, question: string) => {
    if (!campaignId) return
    const answer = (organizerAnswers[questionId] || '').trim()
    if (!answer) return

    setOrganizerSaving((prev) => ({ ...prev, [questionId]: true }))
    setOrganizerStatus((prev) => ({ ...prev, [questionId]: '' }))

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/chat-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to save answer')
      }

      setOrganizerStatus((prev) => ({ ...prev, [questionId]: 'Added to knowledge base.' }))
      setOrganizerAnswers((prev) => ({ ...prev, [questionId]: '' }))
    } catch (err) {
      setOrganizerStatus((prev) => ({
        ...prev,
        [questionId]: err instanceof Error ? err.message : 'Failed to save answer',
      }))
    } finally {
      setOrganizerSaving((prev) => ({ ...prev, [questionId]: false }))
    }
  }

  const saveCallOrganizerAnswer = async (questionId: string, question: string) => {
    if (!campaignId) return
    const answer = (callOrganizerAnswers[questionId] || '').trim()
    if (!answer) return

    setCallOrganizerSaving((prev) => ({ ...prev, [questionId]: true }))
    setCallOrganizerStatus((prev) => ({ ...prev, [questionId]: '' }))

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/call-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to save answer')
      }

      setCallOrganizerStatus((prev) => ({ ...prev, [questionId]: 'Added to knowledge base.' }))
      setCallOrganizerAnswers((prev) => ({ ...prev, [questionId]: '' }))
    } catch (err) {
      setCallOrganizerStatus((prev) => ({
        ...prev,
        [questionId]: err instanceof Error ? err.message : 'Failed to save answer',
      }))
    } finally {
      setCallOrganizerSaving((prev) => ({ ...prev, [questionId]: false }))
    }
  }

  return (
    <div className="min-h-screen bg-[#E1E0CC] text-slate-900 selection:bg-slate-200 relative overflow-hidden font-sans">
      {/* ── Background Watermark ── */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] mix-blend-multiply z-0">
        <img src="/favicon.svg" alt="watermark" className="w-[80vh] h-[80vh]" />
      </div>

      {/* ── Top Floating Buttons ── */}
      <div className="absolute top-6 left-6 z-50">
        <Link
          href={`/yourcampaigns/${campaignId}`}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-all text-[13px] font-medium group bg-white/40 border border-white/60 px-5 py-2.5 rounded-full backdrop-blur-xl hover:bg-white/60 shadow-sm"
        >
           <MdArrowBack className="text-base group-hover:-translate-x-0.5 transition-transform" />
          Back to Campaign
        </Link>
      </div>

      <div className="absolute top-6 right-6 z-50 flex items-center gap-4">
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/40 border border-white/60 backdrop-blur-xl shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest">Live Sync</span>
        </div>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-[13px] font-semibold transition-all active:scale-95 shadow-lg shadow-black/10"
        >
          Refresh
        </button>
      </div>


      <div className="max-w-7xl mx-auto px-6 pt-28 pb-16 relative z-10">

        {/* ── Page header ── */}
        <header className="mb-14 text-center mt-4">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 border border-white/60 shadow-sm text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 font-sans">
            Campaign Analytics
          </p>
          <h1 className="text-4xl md:text-6xl font-instrument mb-4 text-slate-900 tracking-tight">
            Performance Overview
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 font-instrument tracking-tight italic">
             {campaignName ?? campaignId}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <span className="px-4 py-2 rounded-full bg-white/60 border border-white/60 text-sm font-semibold text-slate-700 shadow-sm">{voiceCalls} calls tracked</span>
            <span className="px-4 py-2 rounded-full bg-white/60 border border-white/60 text-sm font-semibold text-slate-700 shadow-sm">{waReplyRate}% WhatsApp reply rate</span>
            <span className="px-4 py-2 rounded-full bg-white/60 border border-white/60 text-sm font-semibold text-slate-700 shadow-sm">{engagementScore}% engagement score</span>
          </div>
        </header>

        <div className="mb-8 rounded-[2rem] border border-white/60 bg-white/40 backdrop-blur-xl shadow-xl shadow-black/5 px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Live Snapshot</p>
            <p className="text-lg md:text-xl font-semibold text-slate-900 tracking-tight">The freshest campaign pulse, calls and conversations in one view.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[12px] font-semibold uppercase tracking-widest text-slate-500">
            <span className="px-3 py-1.5 rounded-full bg-white/70 border border-white/60">Messages {whatsappMessagesSent}</span>
            <span className="px-3 py-1.5 rounded-full bg-white/70 border border-white/60">Users {whatsappInteractedUsers}</span>
            <span className="px-3 py-1.5 rounded-full bg-white/70 border border-white/60">Contacts {totalContacts}</span>
          </div>
        </div>

        {/* ── Hero KPI strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Total Calls */}
          <div className="bg-white/40 border border-white/60 rounded-[2rem] p-7 transition-colors hover:bg-white/50 backdrop-blur-xl shadow-xl shadow-black/5">
            <div className="w-12 h-12 rounded-2xl bg-white border border-white flex items-center justify-center mb-6 shadow-sm">
              <VscCallOutgoing className="text-slate-700 text-xl" />
            </div>
            <p className="text-[13px] text-slate-500 font-medium mb-1 tracking-wide font-sans">Total Calls</p>
            <p className="text-4xl font-bold font-sans text-slate-900">{voiceCalls}</p>
          </div>
          
          {/* Answered */}
          <div className="bg-white/40 border border-white/60 rounded-[2rem] p-7 transition-colors hover:bg-white/50 backdrop-blur-xl shadow-xl shadow-black/5 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-100 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-6 relative z-10 shadow-sm">
              <MdCheckCircle className="text-emerald-600 text-xl" />
            </div>
            <p className="text-[13px] text-slate-500 font-medium mb-1 tracking-wide relative z-10 font-sans">Answered</p>
            <p className="text-4xl font-bold font-sans text-emerald-600 relative z-10">{voiceCallsAnswered}</p>
          </div>

          {/* Missed */}
          <div className="bg-white/40 border border-white/60 rounded-[2rem] p-7 transition-colors hover:bg-white/50 backdrop-blur-xl shadow-xl shadow-black/5 relative overflow-hidden group">
             <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-100 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-6 relative z-10 shadow-sm">
              <MdCancel className="text-red-500 text-xl" />
            </div>
            <p className="text-[13px] text-slate-500 font-medium mb-1 tracking-wide relative z-10 font-sans">Missed</p>
            <p className="text-4xl font-bold font-sans text-red-500 relative z-10">{voiceCallsMissed}</p>
          </div>

          {/* Answer Rate */}
          <div className="bg-white/40 border border-white/60 rounded-[2rem] p-7 relative transition-colors hover:bg-white/50 backdrop-blur-xl shadow-xl shadow-black/5 overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-violet-100 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-6 relative z-10 shadow-sm">
              <MdTimer className="text-violet-600 text-xl" />
            </div>
            <p className="text-[13px] text-slate-500 font-medium mb-1 tracking-wide relative z-10 font-sans">Answer Rate</p>
            <p className="text-4xl font-bold font-sans text-violet-600 relative z-10">{voiceCallsAnsweredRate}%</p>
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5">
              <div className="h-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" style={{ width: `${voiceCallsAnsweredRate}%` }} />
            </div>
          </div>
        </div>

        {/* ── WhatsApp KPI strip ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div
            onClick={() => setWhatsappModal('messages')}
            className="group bg-white/40 border border-white/60 rounded-[2rem] p-7 cursor-pointer transition-all hover:bg-white/50 backdrop-blur-xl shadow-xl shadow-black/5 relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-100 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 shadow-sm flex items-center justify-center">
                <BsWhatsapp className="text-green-600 text-xl" />
              </div>
              <div className="w-8 h-8 rounded-full border border-black/5 flex items-center justify-center text-slate-400 group-hover:text-green-600 group-hover:bg-green-50 transition-all bg-white/50">
                <span className="text-sm block group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-[13px] text-slate-500 font-medium mb-1 tracking-wide font-sans">Messages Sent</p>
              <p className="text-4xl font-bold font-sans text-slate-900 group-hover:scale-105 origin-left transition-transform duration-500">{whatsappMessagesSent}</p>
            </div>
          </div>

          <div
            onClick={() => setWhatsappModal('users')}
            className="group bg-white/40 border border-white/60 rounded-[2rem] p-7 cursor-pointer transition-all hover:bg-white/50 backdrop-blur-xl shadow-xl shadow-black/5 relative overflow-hidden"
          >
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-100 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-100 shadow-sm flex items-center justify-center">
                <MdPeople className="text-cyan-600 text-xl" />
              </div>
              <div className="w-8 h-8 rounded-full border border-black/5 flex items-center justify-center text-slate-400 group-hover:text-cyan-600 group-hover:bg-cyan-50 transition-all bg-white/50">
                <span className="text-sm block group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-[13px] text-slate-500 font-medium mb-1 tracking-wide font-sans">Unique Leads</p>
              <p className="text-4xl font-bold font-sans text-slate-900 group-hover:scale-105 origin-left transition-transform duration-500">{whatsappInteractedUsers}</p>
            </div>
          </div>

          {/* Call logs */}
          <div
            onClick={() => setCallLogsModal(true)}
            className="group bg-white/40 border border-white/60 rounded-[2rem] p-7 cursor-pointer transition-all hover:bg-white/50 backdrop-blur-xl shadow-xl shadow-black/5 relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-slate-100 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center">
                <VscHistory className="text-slate-700 text-xl" />
              </div>
              <div className="w-8 h-8 rounded-full border border-black/5 flex items-center justify-center text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-50 transition-all bg-white/50">
                <span className="text-sm block group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-[13px] text-slate-500 font-medium mb-1 tracking-wide font-sans">Call Logs</p>
              <p className="text-4xl font-bold font-sans text-slate-900 group-hover:scale-105 origin-left transition-transform duration-500">{callLogCount}</p>
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest mt-2">unique callers</p>
            </div>
          </div>
        </div>

        {/* ── Charts ── */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          {/* Bar chart */}
          <div className="md:col-span-2 bg-white/40 border border-white/60 rounded-[2rem] p-8 shadow-xl shadow-black/5 relative overflow-hidden group hover:bg-white/50 transition-colors backdrop-blur-xl">
            <div className="absolute top-0 right-0 -m-16 w-48 h-48 bg-blue-100 rounded-full blur-[50px] pointer-events-none group-hover:bg-blue-200 transition-colors duration-700" />
            <div className="flex items-center justify-between mb-8 relative z-10">
              <h3 className="font-semibold text-xl text-slate-900 tracking-tight">Call Distribution</h3>
              <div className="flex items-center gap-5 text-xs font-semibold tracking-wider uppercase text-slate-500">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] inline-block" />Answered</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] inline-block" />Missed</span>
              </div>
            </div>
            <div className="h-64 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={48}>
                  <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dy={12} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dx={-10} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '20px', padding: '16px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}
                    labelStyle={{ color: '#64748b', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}
                    itemStyle={{ color: '#0f172a', fontSize: '16px', fontWeight: 700 }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut + percentage — WhatsApp reply rate */}
          <div className="bg-white/40 border border-white/60 rounded-[2rem] p-8 flex flex-col shadow-xl shadow-black/5 relative overflow-hidden group hover:bg-white/50 transition-colors backdrop-blur-xl">
            <div className="absolute center right-0 -m-16 w-48 h-48 bg-cyan-100 rounded-full blur-[50px] pointer-events-none group-hover:bg-cyan-200 transition-colors duration-700" />
            <div className="mb-2 relative z-10 text-center">
              <h3 className="font-semibold text-xl text-slate-900 tracking-tight">Reply Rate</h3>
              <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-widest">WhatsApp Funnel</p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 mt-6">
              <div className="relative w-48 h-48 drop-shadow-[0_10px_20px_rgba(14,165,233,0.15)]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={waChartData} innerRadius={70} outerRadius={90} paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270} cornerRadius={8} stroke="none">
                      {waChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-bold tracking-tight text-slate-900">{waReplyRate}</span>
                  <span className="text-sm font-medium text-cyan-600">%</span>
                </div>
              </div>
              <div className="mt-8 w-full space-y-3 px-2">
                {waChartData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-[13px] font-medium bg-white/40 rounded-xl px-4 py-2.5">
                    <span className="flex items-center gap-2.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <span className="text-slate-900 text-[15px] font-bold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── WhatsApp conversations preview ── */}
        {whatsappConversations.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white/40 border border-white/60 rounded-[2rem] overflow-hidden mb-16 shadow-xl shadow-black/5 backdrop-blur-xl"
          >
            <div className="px-8 py-6 border-b border-white/60 flex items-center justify-between bg-white/20">
              <h3 className="font-semibold text-xl text-slate-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 text-lg shadow-sm border border-green-100">
                  <BsWhatsapp />
                </div>
                Recent Conversations
              </h3>
              <div className="px-4 py-1.5 rounded-full bg-white shadow-sm border border-black/5 text-[11px] font-bold text-slate-600 uppercase tracking-widest">
                {whatsappConversations.length} total
              </div>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {whatsappConversations.slice(0, 6).map((conv: any, idx: number) => (
                <div
                  key={conv.contactId}
                  onClick={() => { setSelectedConversation(conv) }}
                  className="flex items-center gap-4 p-5 bg-white/50 border border-white/60 rounded-2xl hover:bg-white/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 p-[2px] shadow-sm">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-emerald-700 text-sm font-bold shadow-inner group-hover:bg-emerald-50 transition-colors duration-300">
                      {getInitials(conv.contactName || '')}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 relative z-10">
                    <p className="text-[15px] font-bold truncate text-slate-900 group-hover:text-emerald-700 transition-colors">{conv.contactName}</p>
                    <p className="text-[13px] text-slate-500 font-medium truncate mt-0.5">{conv.phone}</p>
                  </div>
                  <div className="text-right flex-shrink-0 text-slate-500 flex items-center gap-2 group-hover:text-emerald-600 transition-colors">
                    <span className="w-8 h-8 rounded-full border border-black/5 flex items-center justify-center bg-white shadow-sm">
                      <span className="text-[13px] font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">{conv.messagesSent + conv.messagesReceived}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {whatsappConversations.length > 6 && (
              <div className="p-5 border-t border-white/60 flex justify-center bg-white/20">
                <button
                  onClick={() => setWhatsappModal('messages')}
                  className="text-[13px] font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/50 hover:bg-white shadow-sm border border-white/60"
                >
                  View All Conversations <span className="text-lg leading-none pt-0.5">›</span>
                </button>
              </div>
            )}
          </motion.div>
        )}

      </div>

      {/* ══ WhatsApp Modal ══ */}
      <AnimatePresence>
        {whatsappModal && !selectedConversation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[#F9F9F6]/95 border border-white/60 shadow-2xl rounded-[2rem] max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden backdrop-blur-3xl"
            >
              {/* Modal header */}
              <div className="bg-white/60 border-b border-black/5 px-8 py-6 flex items-center justify-between z-10 backdrop-blur-xl">
                <div className="flex items-center gap-5">
                  {whatsappModal === 'messages' ? (
                    <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center shadow-sm">
                      <MdMessage className="text-green-600 text-2xl" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center shadow-sm">
                      <MdPeople className="text-cyan-600 text-2xl" />
                    </div>
                  )}
                  <div>
                    <h2 className="font-semibold text-2xl tracking-tight text-slate-900 mb-1">
                      {whatsappModal === 'messages' ? 'Messages Sent' : 'Unique Leads'}
                    </h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">WhatsApp · {whatsappConversations.length} conversations</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {whatsappModal === 'messages' && (
                    <button
                      onClick={loadChatSummary}
                      className="px-5 py-2.5 rounded-full bg-white shadow-sm border border-black/5 text-[12px] font-bold uppercase tracking-widest text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all"
                    >
                      Chat Summary
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setWhatsappModal(null)
                      setChatSummaryOpen(false)
                    }}
                    className="w-10 h-10 rounded-full bg-white border border-black/5 hover:bg-slate-50 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all group"
                  >
                    <span className="text-xl font-medium group-hover:rotate-90 transition-transform duration-300">✕</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-6 hide-scrollbar relative">
                {whatsappModal === 'messages' && chatSummaryOpen && (
                  <div className="mb-6 rounded-3xl border border-black/5 bg-white/60 p-6 shadow-sm backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Chat Summary</p>
                        <p className="text-xl font-semibold text-slate-900 tracking-tight">Audience Insights</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-white shadow-sm border border-black/5 text-[11px] font-bold uppercase tracking-widest text-emerald-600">
                        {chatSummary?.overallSentiment || 'neutral'}
                      </span>
                    </div>

                    {chatSummaryLoading && (
                      <div className="flex items-center gap-3 py-4 text-slate-500">
                        <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        <p className="text-sm font-medium">Analyzing all questions and answers...</p>
                      </div>
                    )}

                    {chatSummaryError && (
                      <p className="text-sm text-red-500 font-medium py-2">{chatSummaryError}</p>
                    )}

                    {chatSummary && !chatSummaryLoading && !chatSummaryError && (
                      <div className="space-y-6">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">Overall Summary</p>
                          <p className="text-[15px] text-slate-700 leading-relaxed font-medium bg-white/40 p-4 rounded-2xl border border-white/60">
                            {chatSummary.overallSummary}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">Common Questions</p>
                          {chatSummary.commonQuestions.length > 0 ? (
                            <div className="space-y-3">
                              {chatSummary.commonQuestions.map((item, idx) => (
                                <div key={`${item.type}-${idx}`} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[15px] font-bold text-slate-900">{item.type}</p>
                                    <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{item.count}</span>
                                  </div>
                                  {item.examples?.length > 0 && (
                                    <p className="text-[13px] text-slate-500 mt-2.5 font-medium leading-relaxed">
                                      {item.examples.slice(0, 3).join(' • ')}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[15px] text-slate-500 font-medium italic">No frequent question patterns yet.</p>
                          )}
                        </div>

                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">Unanswered or Escalate</p>
                          {chatSummary.unansweredQuestions.length > 0 ? (
                            <div className="space-y-3">
                              {chatSummary.unansweredQuestions.map((item, idx) => {
                                const questionId = `${idx}-${item.question}`
                                const saving = organizerSaving[questionId]
                                const status = organizerStatus[questionId]

                                return (
                                  <div key={questionId} className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
                                    <p className="text-[15px] font-bold text-slate-900">{item.question}</p>
                                    <p className="text-[13px] text-amber-700 mt-2 font-medium">{item.reason}</p>
                                    <div className="mt-4 space-y-3">
                                      <textarea
                                        value={organizerAnswers[questionId] || ''}
                                        onChange={(event) =>
                                          setOrganizerAnswers((prev) => ({
                                            ...prev,
                                            [questionId]: event.target.value,
                                          }))
                                        }
                                        rows={3}
                                        className="w-full rounded-xl bg-white/70 border border-amber-200 px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                                        placeholder="Write the organizer-approved answer to add to the AI knowledge base."
                                      />
                                      <div className="flex items-center justify-between">
                                        <span className={`text-[11px] font-semibold ${status?.includes('Failed') ? 'text-red-500' : 'text-emerald-600'}`}>
                                          {status}
                                        </span>
                                        <button
                                          onClick={() => saveOrganizerAnswer(questionId, item.question)}
                                          disabled={saving || !(organizerAnswers[questionId] || '').trim()}
                                          className="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-widest shadow-sm hover:bg-emerald-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                          {saving ? 'Saving...' : 'Add Answer'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-[15px] text-slate-500 font-medium italic">No unanswered questions to escalate.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {whatsappConversations.length > 0 ? (
                  <div className="space-y-3">
                    {whatsappConversations.map((conv: any, idx: number) => (
                      <div
                        key={conv.contactId}
                        onClick={() => setSelectedConversation(conv)}
                        className="flex items-center gap-5 p-4 bg-white/40 border border-white/60 rounded-2xl hover:bg-white hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 p-[2px] shadow-sm">
                           <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-slate-700 text-base font-bold">
                            {getInitials(conv.contactName || '')}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate text-[16px] group-hover:text-blue-600 transition-colors">{conv.contactName}</p>
                          <p className="text-[14px] text-slate-500 font-medium truncate mt-0.5">{conv.phone}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {whatsappModal === 'messages' ? (
                            <>
                              <p className="text-xl font-bold text-slate-900 group-hover:scale-105 transition-transform origin-right">{conv.messagesSent}</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">sent</p>
                            </>
                          ) : (
                            <>
                              <p className="text-xl font-bold text-slate-900 group-hover:scale-105 transition-transform origin-right">{conv.messagesReceived}</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">received</p>
                            </>
                          )}
                        </div>
                        <div className="text-slate-400 group-hover:text-slate-900 transition-colors ml-2 w-8 h-8 rounded-full border border-transparent group-hover:border-black/5 group-hover:bg-slate-50 flex items-center justify-center group-hover:shadow-sm">
                          <span className="text-xl font-medium pt-0.5">›</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-20">
                    <div className="w-20 h-20 rounded-[2rem] bg-white border border-black/5 flex items-center justify-center mb-6 shadow-sm">
                      <BsWhatsapp className="text-3xl text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium text-[16px]">
                      {whatsappModal === 'messages' ? 'No messages sent yet.' : 'No user interactions yet.'}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Call Logs Modal ══ */}
      <AnimatePresence>
        {callLogsModal && !selectedCallLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[#F9F9F6]/95 border border-white/60 shadow-2xl rounded-[2rem] max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden backdrop-blur-3xl"
            >
              <div className="bg-white/60 border-b border-black/5 px-8 py-6 flex items-center justify-between z-10 backdrop-blur-xl">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
                    <VscHistory className="text-slate-700 text-2xl" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-2xl tracking-tight text-slate-900 mb-1">Call Logs</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Vapi calls · {callLogCount} callers</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={loadCallSummary}
                    className="px-5 py-2.5 rounded-full bg-white shadow-sm border border-black/5 text-[12px] font-bold uppercase tracking-widest text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all"
                  >
                    Call Summary
                  </button>
                  <button
                    onClick={() => {
                      setCallLogsModal(false)
                      setSelectedCallLog(null)
                      setCallSummaryOpen(false)
                    }}
                    className="w-10 h-10 rounded-full bg-white border border-black/5 hover:bg-slate-50 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all group"
                  >
                    <span className="text-xl font-medium group-hover:rotate-90 transition-transform duration-300">✕</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-6 hide-scrollbar relative">
                {callSummaryOpen && (
                  <div className="mb-6 rounded-3xl border border-black/5 bg-white/60 p-6 shadow-sm backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Call Summary</p>
                        <p className="text-xl font-semibold text-slate-900 tracking-tight">Conversation Insights</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-white shadow-sm border border-black/5 text-[11px] font-bold uppercase tracking-widest text-emerald-600">
                        {callSummary?.overallSentiment || 'neutral'}
                      </span>
                    </div>

                    {callSummaryLoading && (
                      <div className="flex items-center gap-3 py-4 text-slate-500">
                        <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        <p className="text-sm font-medium">Analyzing call transcripts...</p>
                      </div>
                    )}

                    {callSummaryError && (
                      <p className="text-sm text-red-500 font-medium py-2">{callSummaryError}</p>
                    )}

                    {callSummary && !callSummaryLoading && !callSummaryError && (
                      <div className="space-y-6">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">Overall Summary</p>
                          <p className="text-[15px] text-slate-700 leading-relaxed font-medium bg-white/40 p-4 rounded-2xl border border-white/60">
                            {callSummary.overallSummary}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">Common Questions</p>
                          {callSummary.commonQuestions.length > 0 ? (
                            <div className="space-y-3">
                              {callSummary.commonQuestions.map((item, idx) => (
                                <div key={`${item.type}-${idx}`} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[15px] font-bold text-slate-900">{item.type}</p>
                                    <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{item.count}</span>
                                  </div>
                                  {item.examples?.length > 0 && (
                                    <p className="text-[13px] text-slate-500 mt-2.5 font-medium leading-relaxed">
                                      {item.examples.slice(0, 3).join(' • ')}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[15px] text-slate-500 font-medium italic">No frequent question patterns yet.</p>
                          )}
                        </div>

                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">Unanswered or Escalate</p>
                          {callSummary.unansweredQuestions.length > 0 ? (
                            <div className="space-y-3">
                              {callSummary.unansweredQuestions.map((item, idx) => {
                                const questionId = `${idx}-${item.question}`
                                const saving = callOrganizerSaving[questionId]
                                const status = callOrganizerStatus[questionId]

                                return (
                                  <div key={questionId} className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
                                    <p className="text-[15px] font-bold text-slate-900">{item.question}</p>
                                    <p className="text-[13px] text-amber-700 mt-2 font-medium">{item.reason}</p>
                                    <div className="mt-4 space-y-3">
                                      <textarea
                                        value={callOrganizerAnswers[questionId] || ''}
                                        onChange={(event) =>
                                          setCallOrganizerAnswers((prev) => ({
                                            ...prev,
                                            [questionId]: event.target.value,
                                          }))
                                        }
                                        rows={3}
                                        className="w-full rounded-xl bg-white/70 border border-amber-200 px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                                        placeholder="Write the organizer-approved answer to add to the AI knowledge base."
                                      />
                                      <div className="flex items-center justify-between">
                                        <span className={`text-[11px] font-semibold ${status?.includes('Failed') ? 'text-red-500' : 'text-emerald-600'}`}>
                                          {status}
                                        </span>
                                        <button
                                          onClick={() => saveCallOrganizerAnswer(questionId, item.question)}
                                          disabled={saving || !(callOrganizerAnswers[questionId] || '').trim()}
                                          className="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-widest shadow-sm hover:bg-emerald-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                          {saving ? 'Saving...' : 'Add Answer'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-[15px] text-slate-500 font-medium italic">No unanswered questions to escalate.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {callLogCount > 0 ? (
                  <div className="space-y-3">
                    {callLogs.map((log: any) => (
                      <div
                        key={log.contactId}
                        onClick={() => setSelectedCallLog(log)}
                        className="flex items-center gap-5 p-4 bg-white/40 border border-white/60 rounded-2xl hover:bg-white hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 p-[2px] shadow-sm">
                          <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-slate-700 text-base font-bold">
                            {getInitials(log.contactName || log.phone || '')}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate text-[16px] group-hover:text-slate-700 transition-colors">
                            {log.contactName || 'Unknown caller'}
                          </p>
                          <p className="text-[13px] text-slate-500 font-medium truncate mt-0.5">{log.phone || 'Unknown phone'}</p>
                          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest mt-1">
                            Last call {formatCallTimestamp(log.lastCallAt)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold text-slate-900 group-hover:scale-105 transition-transform origin-right">{log.totalCalls || 0}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">calls</p>
                        </div>
                        <div className="text-slate-400 group-hover:text-slate-900 transition-colors ml-2 w-8 h-8 rounded-full border border-transparent group-hover:border-black/5 group-hover:bg-slate-50 flex items-center justify-center group-hover:shadow-sm">
                          <span className="text-xl font-medium pt-0.5">›</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-20">
                    <div className="w-20 h-20 rounded-[2rem] bg-white border border-black/5 flex items-center justify-center mb-6 shadow-sm">
                      <VscHistory className="text-3xl text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium text-[16px]">No call logs yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Conversation Detail Modal ══ */}
      <AnimatePresence>
        {selectedConversation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[#F9F9F6]/95 border border-white/60 shadow-2xl rounded-[2rem] w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden backdrop-blur-3xl relative"
            >
              {/* Chat header */}
              <div className="bg-white/60 border-b border-black/5 px-6 py-4 flex items-center gap-4 z-10 backdrop-blur-xl">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="w-10 h-10 rounded-full hover:bg-white hover:shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all flex-shrink-0 border border-transparent hover:border-black/5"
                >
                  <span className="text-3xl leading-none -mt-1 font-light">‹</span>
                </button>
                <div className="flex flex-col flex-1 items-center justify-center relative right-5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 p-[2px] mb-1.5 shadow-sm">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-emerald-700 text-[13px] font-bold">
                      {getInitials(selectedConversation.contactName || '')}
                    </div>
                  </div>
                  <h2 className="font-bold text-[15px] truncate text-slate-900 tracking-tight">{selectedConversation.contactName}</h2>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 bg-slate-50/50 hide-scrollbar z-10 flex flex-col relative">
                {selectedConversation.messages && selectedConversation.messages.length > 0 ? (
                  [...selectedConversation.messages]
                    .sort((a: any, b: any) => {
                      const timeA = new Date(a.timestamp || a.createdAt).getTime()
                      const timeB = new Date(b.timestamp || b.createdAt).getTime()
                      return timeA - timeB
                    })
                    .map((msg: any, idx: number) => {
                      const isUser = msg.sender === 'user'
                      const timestamp = new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                      return (
                         <motion.div 
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: idx * 0.05 }}
                           key={idx} 
                           className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                         >
                          <div className={`max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                                isUser
                                  ? 'bg-blue-600 text-white rounded-[1.5rem] rounded-tr-sm border border-blue-700'
                                  : 'bg-white border border-black/5 text-slate-800 rounded-[1.5rem] rounded-tl-sm'
                              }`}
                            >
                              <p className="break-words font-medium">{msg.content}</p>
                            </div>
                            <p className="text-[10px] font-bold mt-1.5 px-2 text-slate-400 uppercase tracking-wider">{timestamp}</p>
                          </div>
                        </motion.div>
                      )
                    })
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-3xl bg-white border border-black/5 shadow-sm flex items-center justify-center mb-4">
                      <MdMessage className="text-2xl text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium text-[15px]">No messages in this conversation</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Call Log Detail Modal ══ */}
      <AnimatePresence>
        {selectedCallLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[#F9F9F6]/95 border border-white/60 shadow-2xl rounded-[2rem] w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden backdrop-blur-3xl relative"
            >
              <div className="bg-white/60 border-b border-black/5 px-6 py-4 flex items-center gap-4 z-10 backdrop-blur-xl">
                <button
                  onClick={() => setSelectedCallLog(null)}
                  className="w-10 h-10 rounded-full hover:bg-white hover:shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all flex-shrink-0 border border-transparent hover:border-black/5"
                >
                  <span className="text-3xl leading-none -mt-1 font-light">‹</span>
                </button>
                <div className="flex flex-col flex-1 items-center justify-center relative right-5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 p-[2px] mb-1.5 shadow-sm">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-slate-700 text-[13px] font-bold">
                      {getInitials(selectedCallLog.contactName || selectedCallLog.phone || '')}
                    </div>
                  </div>
                  <h2 className="font-bold text-[15px] truncate text-slate-900 tracking-tight">
                    {selectedCallLog.contactName || 'Unknown caller'}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest">
                    {selectedCallLog.phone || 'Unknown phone'}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 bg-slate-50/50 hide-scrollbar z-10">
                {Array.isArray(selectedCallLog.calls) && selectedCallLog.calls.length > 0 ? (
                  [...selectedCallLog.calls]
                    .sort((a: any, b: any) => {
                      const timeA = new Date(a.timestamp || a.createdAt || 0).getTime()
                      const timeB = new Date(b.timestamp || b.createdAt || 0).getTime()
                      return timeB - timeA
                    })
                    .map((call: any) => {
                      const duration = Number(call.duration || 0)
                      const statusLabel = duration > 0 ? 'Answered' : 'Missed'
                      const messages = parseCallTranscript(String(call.transcript || ''))

                      return (
                        <div key={call.callId || call.id} className="rounded-3xl border border-black/5 bg-white/60 p-6 shadow-sm backdrop-blur-xl">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Call</p>
                              <p className="text-[15px] font-semibold text-slate-900">{formatCallTimestamp(call.timestamp || call.createdAt)}</p>
                              <p className="text-[12px] text-slate-500 font-medium mt-1">Duration {duration}s · {statusLabel}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest ${duration > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                              {statusLabel}
                            </span>
                          </div>

                          {call.summary && (
                            <div className="mb-4">
                              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Summary</p>
                              <p className="text-[14px] text-slate-700 leading-relaxed font-medium bg-white/40 p-4 rounded-2xl border border-white/60">
                                {call.summary}
                              </p>
                            </div>
                          )}

                          {messages.length > 0 ? (
                            <div className="space-y-4">
                              {messages.map((msg, idx) => (
                                <div key={`${call.callId}-${idx}`} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[75%] flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div
                                      className={`px-5 py-3 text-[14px] leading-relaxed shadow-sm ${
                                        msg.sender === 'user'
                                          ? 'bg-slate-900 text-white rounded-[1.5rem] rounded-tr-sm'
                                          : msg.sender === 'system'
                                          ? 'bg-slate-100 text-slate-700 rounded-[1.5rem]'
                                          : 'bg-white border border-black/5 text-slate-800 rounded-[1.5rem] rounded-tl-sm'
                                      }`}
                                    >
                                      <p className="break-words font-medium">{msg.content}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[14px] text-slate-500 font-medium">Transcript not available for this call.</p>
                          )}
                        </div>
                      )
                    })
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-3xl bg-white border border-black/5 shadow-sm flex items-center justify-center mb-4">
                      <VscHistory className="text-2xl text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium text-[15px]">No call transcripts available</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
