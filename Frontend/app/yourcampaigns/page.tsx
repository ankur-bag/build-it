'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { VscCallOutgoing } from 'react-icons/vsc'
import { BsFillFileTextFill } from 'react-icons/bs'
import { MdKeyboardVoice } from 'react-icons/md'

interface Campaign {
  id: string
  title: string
  description: string | { original?: string; aiEnhanced?: string }
  aiDescription?: string
  channels: Record<string, any>
  createdAt: any
  updatedAt: any
  channelContent?: {
    voice?: { transcript?: string }
    calls?: { transcript?: string }
  }
  audioUrls?: {
    voice?: string
    calls?: string
  }
  contactCount?: number
}

export default function YourCampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        console.log('📋 Fetching your campaigns...')
        const res = await fetch('/api/yourcampaigns')
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Failed to load campaigns')
          setLoading(false)
          return
        }

        console.log('✅ Campaigns loaded:', data.campaigns.length)
        setCampaigns(data.campaigns)
      } catch (err) {
        console.error('Error fetching campaigns:', err)
        setError('Failed to load campaigns')
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [])

  const handleDelete = async (e: React.MouseEvent, campaignId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingId(campaignId)
      console.log('🗑️ Deleting campaign:', campaignId)

      const res = await fetch(`/api/campaigns/${campaignId}/delete`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete campaign')
      }

      console.log('✅ Campaign deleted:', campaignId)
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId))
    } catch (err) {
      console.error('Error deleting campaign:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete campaign')
    } finally {
      setDeletingId(null)
    }
  }

  const getChannelNames = (channels: Record<string, any>) => {
    if (!channels || typeof channels !== 'object') return 'No channels'
    return Object.entries(channels)
      .filter(([, v]: any) => v?.enabled)
      .map(([k]) => {
        if (k === 'text') return 'Text'
        if (k === 'voice') return 'Voice'
        if (k === 'calls') return 'Calls'
        return k
      })
      .join(' • ') || 'No channels'
  }

  const campaignStats = campaigns.reduce(
    (acc, campaign) => {
      acc.total += 1
      if (campaign.channels?.voice?.enabled) acc.voice += 1
      if (campaign.channels?.calls?.enabled) acc.calls += 1
      if (campaign.channels?.text?.enabled) acc.text += 1
      return acc
    },
    { total: 0, voice: 0, calls: 0, text: 0 }
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E1E0CC] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />
        <div className="text-center space-y-4 relative z-10">
          <div className="flex justify-center">
            <img 
              src="/favicon.svg" 
              alt="Loading" 
              className="w-16 h-16 animate-spin opacity-80"
            />
          </div>
          <p className="text-slate-500 text-lg font-medium animate-pulse font-sans">Loading your campaigns...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#E1E0CC] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 py-12 relative z-10">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center space-y-6 max-w-md p-10 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/70 shadow-2xl shadow-black/5">
              <p className="text-red-400 font-medium text-lg font-sans">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-all duration-300 cursor-pointer shadow-lg shadow-black/10"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#E1E0CC] relative overflow-hidden selection:bg-slate-200 selection:text-slate-900 text-slate-900">
      {/* Subtle background glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      <div className="absolute top-1/4 -left-[20%] w-[50%] h-[50%] bg-white/35 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-1/4 -right-[20%] w-[50%] h-[50%] bg-white/35 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />

      {/* Content */}
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-16">
          {/* Header */}
          <div className="mb-20">
            <div className="flex items-center justify-between mb-12">
              <Link
                href="/"
                className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/70 bg-white/60 backdrop-blur-md text-slate-600 hover:text-slate-900 hover:bg-white/80 transition-all duration-300 font-sans shadow-sm"
              >
                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                Home
              </Link>
              <div className="flex items-center gap-4">
                <Link
                  href="/campaign/title"
                  className="px-6 py-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-all duration-300 text-sm font-medium font-sans shadow-lg shadow-black/10 hover:-translate-y-0.5"
                >
                  New Campaign
                </Link>
              </div>
            </div>
            <div className="w-full text-center">
              <h1 className="text-6xl md:text-7xl font-instrument text-slate-900 mb-6 tracking-tight drop-shadow-sm">Your <span className="italic opacity-80">Campaigns</span></h1>
              <p className="text-slate-600 text-lg font-sans max-w-xl mx-auto leading-relaxed font-light">Manage and monitor your outreach campaigns with elegant precision.</p>

            </div>
          </div>

          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center max-w-md mx-auto p-12 rounded-[2rem] bg-white/60 backdrop-blur-xl border border-white/70 shadow-2xl shadow-black/5">
              <div className="text-5xl mb-6 opacity-80 drop-shadow-sm">✨</div>
              <p className="text-slate-900 text-2xl font-semibold mb-3 font-sans tracking-tight">No campaigns yet</p>
              <p className="text-slate-600 mb-8 font-sans leading-relaxed">Create your first campaign to start reaching your audience effectively.</p>
              <Link
                href="/campaign/title"
                className="px-8 py-3.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 font-medium transition-all duration-300 font-sans shadow-lg shadow-black/10 hover:-translate-y-0.5"
              >
                Create Campaign
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {campaigns.map((campaign) => {
                const enabledChannels = Object.entries(campaign.channels || {})
                  .filter(([, v]: any) => v?.enabled)
                  .map(([k]) => k)

                return (
                  <div 
                    key={campaign.id} 
                    className="group relative"
                    style={{ perspective: '1000px' }}
                  >
                    <Link
                      href={`/yourcampaigns/${campaign.id}`}
                      className="block relative rounded-[2rem] p-8 bg-white/60 backdrop-blur-xl cursor-pointer transition-all duration-500 h-full flex flex-col border border-white/70 hover:bg-white/80 hover:border-white group-hover:-translate-y-2 shadow-2xl shadow-black/5 overflow-hidden"
                    >
                      {/* Subtle gradient sweep */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-br from-white/80 via-transparent to-transparent" />

                      {/* Content */}
                      <div className="relative z-10">
                        {/* Title */}
                        <h3 className="text-slate-900 text-3xl mb-4 line-clamp-1 transition-colors font-instrument tracking-tight">
                          {campaign.title || 'Untitled Campaign'}
                        </h3>

                        {/* Description */}
                        <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed font-sans font-light">
                          {(() => {
                            let desc = ''
                            if (typeof campaign.description === 'object' && campaign.description) {
                              desc = campaign.description.aiEnhanced || campaign.description.original || ''
                            } else if (typeof campaign.description === 'string') {
                              desc = campaign.description || ''
                            }
                            return campaign.aiDescription || desc || 'No description provided'
                          })()}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/70 bg-white/70 text-[11px] uppercase tracking-[0.2em] text-slate-600 font-semibold">
                            {getChannelNames(campaign.channels)}
                          </span>
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/70 bg-white/70 text-[11px] uppercase tracking-[0.2em] text-slate-600 font-semibold">
                            {campaign.contactCount ? `${campaign.contactCount} leads` : 'No leads yet'}
                          </span>
                        </div>

                        {/* Quick Stats Overlay */}
                        {(campaign as any).vapiStats && (
                          <div className="mt-6 flex gap-6 font-sans border-t border-black/5 pt-4">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Total Calls</span>
                              <span className="text-base font-medium text-slate-800">{(campaign as any).vapiStats.totalCalls}</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Answered</span>
                              <span className="text-base font-medium text-emerald-600">{(campaign as any).vapiStats.answeredCalls}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Info - Minimal */}
                      <div className="mt-auto pt-8 flex items-center justify-between text-xs text-slate-500 relative z-10">
                        <div className="flex gap-2.5">
                          {enabledChannels.slice(0, 3).map((channel) => (
                            <span key={channel} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/70 border border-white/70 text-slate-600 group-hover:bg-white group-hover:text-slate-900 transition-all duration-300">
                              {channel === 'text' && <BsFillFileTextFill className="w-3.5 h-3.5" />}
                              {channel === 'voice' && <MdKeyboardVoice className="w-4 h-4" />}
                              {channel === 'calls' && <VscCallOutgoing className="w-3.5 h-3.5" />}
                            </span>
                          ))}
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 text-slate-900 font-medium">→</span>
                      </div>
                    </Link>

                    {/* Delete Button - Floating */}
                    <button
                      onClick={(e) => handleDelete(e, campaign.id)}
                      disabled={deletingId === campaign.id}
                      className="absolute -top-3 -right-3 p-3 rounded-full bg-white/80 border border-white/70 hover:border-red-500/30 hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 shadow-xl shadow-black/5 z-20"
                      title="Delete campaign"
                    >
                      {deletingId === campaign.id ? (
                        <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

