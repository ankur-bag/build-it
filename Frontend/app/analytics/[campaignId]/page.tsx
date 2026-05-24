'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import useSWR from 'swr'
import { VscCallOutgoing } from 'react-icons/vsc'
import { BsFillFileTextFill } from 'react-icons/bs'
import { MdKeyboardVoice } from 'react-icons/md'

interface AnalyticsData {
  campaign: {
    id: string
    title: string
    description: any
    status: string
    createdAt: any
    launchedAt: any
  }
  analytics: {
    totalContacts: number
    contactsReceivedMessage: number
    contactsOpenedChat: number
    contactsReplied: number
    contactsNotInteracted: number
    voiceCalls: number
    voiceCallsAnswered: number
    voiceCallsMissed: number
    voiceCallsAnsweredRate: number
    textInteractions: number
    aiResponsesCount: number
    avgResponseTimeMs: number
    channels: {
      voice: boolean
      calls: boolean
      text: boolean
    }
    engagementScore: number
    totalConversations: number
    totalMessages: number
  }
  conversationSummary: any[]
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function AnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.campaignId as string

  const { data, error, isLoading, mutate } = useSWR(
    campaignId ? `/api/campaigns/${campaignId}/analytics` : null,
    fetcher,
    { 
      refreshInterval: 20000, // 20s live refresh
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  )

  const loading = isLoading
  const errorMsg = error ? 'Failed to fetch analytics' : ''

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <img 
                src="/favicon.svg" 
                alt="Loading" 
                className="w-12 h-12 animate-spin"
              />
            </div>
            <p className="text-white">Loading campaign analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <p className="text-red-400 text-lg">{errorMsg || 'Campaign not found'}</p>
            <button
              onClick={() => router.back()}
              className="px-6 py-2.5 rounded-lg bg-white hover:bg-white/95 text-black font-semibold cursor-pointer"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { campaign, analytics } = data
  const formatDate = (dateVal: any) => {
    if (!dateVal) return 'N/A'
    const date = new Date(dateVal)
    return date.toLocaleDateString()
  }

  const formatTime = (ms: number) => {
    if (ms === 0) return 'N/A'
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden">
      {/* Watermark Favicon */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
        <img 
          src="/favicon.svg" 
          alt="watermark"
          className="opacity-5"
          style={{ height: '65vh', width: 'auto' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-white/10 px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => router.back()}
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all duration-300"
              >
                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                Back
              </button>
              <button
                onClick={() => mutate()}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-lg border cursor-pointer border-white/20 text-white hover:border-white/40 hover:bg-white/5 transition-all duration-300 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                title="Refresh analytics data"
              >
                <span className={isLoading ? 'animate-spin' : ''}>↻</span>
                Live Data
              </button>
            </div>
            <div>
              <h1 className="text-5xl font-bold text-white mb-2">{campaign.title}</h1>
              <p className="text-white/50 text-lg">Real-time campaign performance analytics</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Total Contacts */}
          <div className="group relative rounded-2xl p-6 bg-white/2 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300 hover:bg-white/5">
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%)',}}></div>
            <div className="relative z-10">
              <p className="text-white/60 text-sm mb-2">Total Contacts</p>
              <p className="text-3xl font-bold text-blue-400">{analytics.totalContacts}</p>
              <p className="text-white/40 text-xs mt-2">in this campaign</p>
            </div>
          </div>

          {/* Contacts Received Message */}
          <div className="group relative rounded-2xl p-6 bg-white/2 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300 hover:bg-white/5">
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%)',}}></div>
            <div className="relative z-10">
              <p className="text-white/60 text-sm mb-2">📨 Message Delivered</p>
              <p className="text-3xl font-bold text-purple-400">{analytics.contactsReceivedMessage}</p>
              <p className="text-white/40 text-xs mt-2">
                {analytics.totalContacts > 0
                  ? Math.round((analytics.contactsReceivedMessage / analytics.totalContacts) * 100)
                  : 0}% delivery rate
              </p>
            </div>
          </div>

          {/* Contacts Replied */}
          <div className="group relative rounded-2xl p-6 bg-white/2 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300 hover:bg-white/5">
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%)',}}></div>
            <div className="relative z-10">
              <p className="text-white/60 text-sm mb-2 flex items-center gap-2"><BsFillFileTextFill className="w-4 h-4" /> Replied/Engaged</p>
              <p className="text-3xl font-bold text-green-400">{analytics.contactsReplied}</p>
              <p className="text-white/40 text-xs mt-2">
                {analytics.totalContacts > 0
                  ? Math.round((analytics.contactsReplied / analytics.totalContacts) * 100)
                  : 0}% response rate
              </p>
            </div>
          </div>

          {/* Calls Answered */}
          <div className="group relative rounded-2xl p-6 bg-white/2 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300 hover:bg-white/5">
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%)',}}></div>
            <div className="relative z-10">
              <p className="text-white/60 text-sm mb-2 flex items-center gap-2"><VscCallOutgoing className="w-4 h-4" /> Calls Answered (24h)</p>
              <p className="text-3xl font-bold text-orange-400">{analytics.voiceCallsAnswered}</p>
              <p className="text-white/40 text-xs mt-2">
                {analytics.voiceCalls > 0
                  ? analytics.voiceCallsAnsweredRate
                  : 0}% pickup rate
              </p>
            </div>
          </div>
        </div>

        {/* Engagement Score */}
        <div className="group relative rounded-2xl p-8 bg-white/2 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300 mb-12 overflow-hidden">
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%)',}}></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm mb-2">Overall Engagement Score</p>
              <p className="text-5xl font-bold text-yellow-400">{analytics.engagementScore}%</p>
              <p className="text-white/40 text-sm mt-2">
                {analytics.channels.calls 
                  ? 'Based on replies and call pickups' 
                  : 'Based on message replies'}
              </p>
            </div>
            <div className="hidden lg:flex items-center justify-center w-40 h-40">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#ffffff20" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#FBBF24"
                    strokeWidth="8"
                    strokeDasharray={`${(analytics.engagementScore / 100) * 282.6} 282.6`}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{analytics.engagementScore}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout - Breakdown and Messages/Calls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* Contact Breakdown */}
          <div className="group relative rounded-2xl p-8 bg-white/2 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300">
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%)',}}></div>
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-blue-300 mb-6">👥 Contact Breakdown</h3>
              <div className="h-80 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={[
                        { name: 'Opened', value: analytics.contactsOpenedChat, color: '#3b82f6' },
                        { name: 'Replied', value: analytics.contactsReplied, color: '#22c55e' },
                        { name: 'No action', value: analytics.contactsNotInteracted, color: '#525252' },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {[
                        { name: 'Opened', value: analytics.contactsOpenedChat, color: '#3b82f6' },
                        { name: 'Replied', value: analytics.contactsReplied, color: '#22c55e' },
                        { name: 'No action', value: analytics.contactsNotInteracted, color: '#525252' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#ffffff'
                      }}
                      labelStyle={{ color: '#ffffff' }}
                      formatter={(value) => [<span style={{ color: '#ffffff' }}>{value} contacts</span>, <span style={{ color: '#ffffff' }}>Count</span>]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-blue-500/10 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-blue-300 group-hover:text-blue-200 transition-colors">Opened</span>
                  </div>
                  <span className="text-sm font-medium text-blue-300">{analytics.contactsOpenedChat}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-green-500/10 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-green-300 group-hover:text-green-200 transition-colors">Replied</span>
                  </div>
                  <span className="text-sm font-medium text-green-300">{analytics.contactsReplied}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-500/10 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                    <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">No action</span>
                  </div>
                  <span className="text-sm font-medium text-gray-400">{analytics.contactsNotInteracted}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Messages and Calls Stacked */}
          <div className="space-y-6">
            {/* Messages Card */}
            <div className="group relative rounded-2xl p-6 bg-white/2 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300">
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%)',}}></div>
              <div className="relative z-10">
                <h3 className="text-lg font-semibold text-green-300 mb-4 flex items-center gap-2"><BsFillFileTextFill className="w-5 h-5" /> Messages</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm text-white/70">Total messages</span>
                    <span className="font-semibold text-green-300 text-lg">{analytics.totalMessages}</span>
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm text-white/70">Incoming messages</span>
                    <span className="font-semibold text-green-300 text-lg">{analytics.textInteractions}</span>
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm text-white/70">AI responses</span>
                    <span className="font-semibold text-cyan-400 text-lg">{analytics.aiResponsesCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Calls Card */}
            <div className="group relative rounded-2xl p-6 bg-white/2 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300">
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%)',}}></div>
              <div className="relative z-10">
                <h3 className="text-lg font-semibold text-orange-300 mb-4 flex items-center gap-2"><VscCallOutgoing className="w-5 h-5" /> Calls (24h)</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm text-white/70">Total calls</span>
                    <span className="font-semibold text-orange-300 text-lg">{analytics.voiceCalls}</span>
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm text-white/70">Answered</span>
                    <span className="font-semibold text-green-400 text-lg">{analytics.voiceCallsAnswered}</span>
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm text-white/70">Missed</span>
                    <span className="font-semibold text-red-400 text-lg">{analytics.voiceCallsMissed}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="group relative rounded-2xl p-6 bg-white/2 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300">
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%)',}}></div>
            <div className="relative z-10">
              <p className="text-white/60 text-sm mb-2">Total Conversations</p>
              <p className="text-3xl font-bold text-white">{analytics.totalConversations}</p>
              <p className="text-white/40 text-xs mt-2">active discussions</p>
            </div>
          </div>
          <div className="group relative rounded-2xl p-6 bg-white/2 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300">
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%)',}}></div>
            <div className="relative z-10">
              <p className="text-white/60 text-sm mb-2">🤖 Avg Response Time</p>
              <p className="text-3xl font-bold text-cyan-400">{formatTime(analytics.avgResponseTimeMs)}</p>
              <p className="text-white/40 text-xs mt-2">average response time</p>
            </div>
          </div>
        </div>

        {/* Channel Configuration */}
        {(analytics.channels.voice || analytics.channels.calls || analytics.channels.text) && (
          <div className="group relative rounded-2xl p-8 bg-white/2 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300">
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%)',}}></div>
            <div className="relative z-10">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                 Active Channels
              </h2>
              <div className="flex flex-wrap gap-3">
                {analytics.channels.voice && (
                  <div className="px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 transition-colors">
                    <p className="text-blue-300 text-sm font-medium flex items-center gap-2"><MdKeyboardVoice className="w-4 h-4" /> Voice Messages</p>
                  </div>
                )}
                {analytics.channels.calls && (
                  <div className="px-4 py-2 rounded-full bg-orange-500/20 border border-orange-500/30 hover:border-orange-500/50 transition-colors">
                    <p className="text-orange-300 text-sm font-medium flex items-center gap-2"><VscCallOutgoing className="w-4 h-4" /> Voice Calls</p>
                  </div>
                )}
                {analytics.channels.text && (
                  <div className="px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 hover:border-green-500/50 transition-colors">
                    <p className="text-green-300 text-sm font-medium flex items-center gap-2"><BsFillFileTextFill className="w-4 h-4" /> Text Messages</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
