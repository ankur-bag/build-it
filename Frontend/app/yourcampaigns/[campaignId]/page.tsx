'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { VscCallOutgoing } from 'react-icons/vsc'
import { BsFillFileTextFill, BsArrowLeft, BsThreeDots } from 'react-icons/bs'
import { MdKeyboardVoice, MdEdit, MdCheck, MdClose } from 'react-icons/md'
import { IoMdAnalytics } from 'react-icons/io'
import { TbFileUploadFilled, TbFile } from 'react-icons/tb'
import { motion, AnimatePresence } from 'framer-motion'
import type { ChannelConfig } from '@/campaign/CampaignContext'
import { useAuth } from '@clerk/nextjs'
import PaymentGuard from '@/components/payment/PaymentGuard'
import LaunchGuard from '@/components/payment/LaunchGuard'
import { calculateCampaignCost } from '@/lib/payment/calculator'

interface DocumentAsset {
  url?: string;
  cloudinary_url?: string;
  publicId?: string;
  cloudinary_public_id?: string;
  name: string;
  file_type?: string;
  extractedText: string;
  uploadedAt: string;
}

interface Asset {
  url: string
  publicId: string
  type: 'image' | 'video'
}

interface LoadedCampaign {
  id: string
  title: string
  description: string | { original?: string; aiEnhanced?: string }
  channels: ChannelConfig
  toneOfVoice?: string
  assets?: Asset[]
  contactCount: number
  status: string
  csvStoragePath?: string
  aiDescription?: string
  previewText?: string
  transcript?: string
  contactsFile?: { url: string; publicId: string; name?: string }
  documents?: DocumentAsset[]
  channelContent?: {
    voice?: { transcript?: string }
    calls?: { transcript?: string }
  }
  audioUrls?: {
    voice?: string
    calls?: string
  }
  audioPublicIds?: {
    voice?: string
    calls?: string
  }
}

export default function CampaignDetailPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params.campaignId as string
  const { userId } = useAuth()

  const [loadedCampaign, setLoadedCampaign] = useState<LoadedCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [makingCalls, setMakingCalls] = useState(false)
  const [relaunching, setRelaunching] = useState(false)
  const [callSuccess, setCallSuccess] = useState('')
  
  // Editing state
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' })
  const [replacingPublicId, setReplacingPublicId] = useState<string | null>(null)

  useEffect(() => {
    const loadCampaign = async () => {
      try {
        if (!campaignId) {
          setError('No campaign ID found')
          setLoading(false)
          return
        }

        const response = await fetch(`/api/campaigns/${campaignId}`)
        const contentType = response.headers.get('content-type')
        
        if (!contentType?.includes('application/json')) {
          setError(`API Error (${response.status}): Server returned non-JSON.`)
          setLoading(false)
          return
        }

        const data = await response.json()

        if (response.ok) {
          setLoadedCampaign(data.campaign)
        } else {
          setError(data.error || `Failed to load campaign (${response.status})`)
        }
      } catch (err) {
        setError(`Failed to load campaign: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    }

    loadCampaign()
  }, [campaignId])

  useEffect(() => {
    if (loadedCampaign) {
      const desc = typeof loadedCampaign.description === 'object' 
        ? loadedCampaign.description?.original 
        : loadedCampaign.description
      setEditedDescription(desc || '')
    }
  }, [loadedCampaign])

  const handleUpdateKnowledge = async () => {
    if (!campaignId || !editedDescription.trim()) return

    try {
      setSaving(true)
      setSaveStatus({ type: '', message: '' })

      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description: typeof loadedCampaign?.description === 'object'
            ? { ...loadedCampaign.description, original: editedDescription }
            : editedDescription
        }),
      })

      if (!response.ok) throw new Error('Failed to update knowledge base')

      if (loadedCampaign) {
        const newCampaign = { ...loadedCampaign }
        if (typeof newCampaign.description === 'object') {
          newCampaign.description = { ...newCampaign.description, original: editedDescription }
        } else {
          newCampaign.description = editedDescription
        }
        setLoadedCampaign(newCampaign)
      }

      setSaveStatus({ type: 'success', message: 'Knowledge base updated!' })
      setIsEditingDescription(false)
      setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000)
    } catch (err) {
      setSaveStatus({ type: 'error', message: 'Failed to update knowledge base' })
    } finally {
      setSaving(false)
    }
  }

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !campaignId) return

    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file')
      return
    }

    try {
      setSaving(true)
      setSaveStatus({ type: '', message: 'Uploading & Processing...' })

      const formData = new FormData()
      formData.append('docFile', file)
      
      const isReplacement = !!replacingPublicId
      if (isReplacement) {
        formData.append('public_id', replacingPublicId!)
      }

      const response = await fetch(`/api/campaigns/${campaignId}/docs`, {
        method: isReplacement ? 'PUT' : 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Failed to handle document')
      const data = await response.json()

      if (loadedCampaign) {
        let updatedDocs = []
        const currentDocs = loadedCampaign.documents || []
        
        if (isReplacement) {
          updatedDocs = currentDocs.map(d => 
            (d.cloudinary_public_id === replacingPublicId || d.publicId === replacingPublicId) ? data.document : d
          )
        } else {
          updatedDocs = [...currentDocs, data.document]
        }
        setLoadedCampaign({ ...loadedCampaign, documents: updatedDocs })
      }

      setSaveStatus({ type: 'success', message: isReplacement ? 'Document swapped!' : 'Document added!' })
      setReplacingPublicId(null)
      setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000)
    } catch (err) {
      setSaveStatus({ type: 'error', message: 'Failed to upload document' })
    } finally {
      setSaving(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleReplaceDocument = (publicId: string) => {
    setReplacingPublicId(publicId)
    document.getElementById('edit-doc-upload')?.click()
  }

  const handleDeleteDocument = async (docIdx: number) => {
    if (!campaignId || !loadedCampaign) return
    const docToDelete = loadedCampaign.documents?.[docIdx]
    if (!docToDelete) return

    if (!confirm('Remove this document from the knowledge base?')) return

    try {
      setSaving(true)
      const publicId = docToDelete.cloudinary_public_id || docToDelete.publicId

      const response = await fetch(`/api/campaigns/${campaignId}/docs`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id: publicId }),
      })

      if (!response.ok) throw new Error('Failed to delete document')

      const updatedDocs = (loadedCampaign.documents || []).filter((_, idx) => idx !== docIdx)
      setLoadedCampaign({ ...loadedCampaign, documents: updatedDocs })
      setSaveStatus({ type: 'success', message: 'Document removed' })
      setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000)
    } catch (err) {
      setSaveStatus({ type: 'error', message: 'Failed to remove document' })
    } finally {
      setSaving(false)
    }
  }

  const handleMakeCalls = async () => {
    if (!campaignId) return setError('Campaign ID not found')

    try {
      setError('')
      setCallSuccess('')
      setMakingCalls(true)

      const response = await fetch(`/api/campaigns/${campaignId}/make-calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to make calls')

      setCallSuccess(`📞 Calls initiated successfully for ${data.totalContacts} contact(s)! `)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to make calls')
    } finally {
      setMakingCalls(false)
    }
  }

  const handleRelaunch = async () => {
    if (!campaignId) return setError('Campaign ID not found')

    try {
      setError('')
      setCallSuccess('')
      setRelaunching(true)

      const response = await fetch(`/api/campaigns/${campaignId}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to relaunch campaign')

      setCallSuccess('Campaign relaunched successfully! Messages are being sent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to relaunch campaign')
    } finally {
      setRelaunching(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E1E0CC] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 relative z-10"
        >
          <img src="/favicon.svg" alt="Loading" className="w-16 h-16 animate-pulse mx-auto" style={{ filter: 'drop-shadow(0 0 20px rgba(225,224,204,0.2))' }} />
          <p className="text-slate-500 text-sm font-medium tracking-widest uppercase">Loading Campaign</p>
        </motion.div>
      </div>
    )
  }

  if (error && !loadedCampaign) {
    return (
      <div className="min-h-screen bg-[#E1E0CC] relative overflow-hidden flex items-center justify-center">
        <div className="max-w-md w-full px-8 py-10 rounded-3xl bg-white/60 border border-white/70 backdrop-blur-2xl text-center space-y-6 shadow-2xl shadow-black/5">
          <p className="text-red-400 font-medium">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors shadow-lg shadow-black/10"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!loadedCampaign) return null

  const activeChannels = Object.entries(loadedCampaign.channels || {}).filter(([, value]: any) => value?.enabled)
  const documentCount = loadedCampaign.documents?.length || 0
  const hasTranscript = !!loadedCampaign.channelContent?.calls?.transcript

  return (
    <div className="min-h-screen bg-[#E1E0CC] relative overflow-hidden selection:bg-slate-200 selection:text-slate-900 text-slate-900 pb-24">
      {/* Sleek Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/70 via-[#E1E0CC] to-[#E1E0CC] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/50 blur-[120px] rounded-full pointer-events-none" />
      <div className="noise-overlay absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Navigation & Header */}
        <header className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-16">
          <div className="space-y-6">
            <Link
              href="/yourcampaigns"
              className="group inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/70 bg-white/60 hover:bg-white/80 backdrop-blur-md text-slate-600 hover:text-slate-900 transition-all text-sm font-medium shadow-sm"
            >
              <BsArrowLeft className="group-hover:-translate-x-1 transition-transform" />
              Back to Campaigns
            </Link>
            
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-6xl font-instrument text-slate-900 tracking-tight mb-3"
              >
                {loadedCampaign.title}
              </motion.h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-5">
                <span className="px-3 py-1.5 rounded-full border border-white/70 bg-white/60 backdrop-blur-md shadow-sm">{loadedCampaign.contactCount} contacts</span>
                <span className="px-3 py-1.5 rounded-full border border-white/70 bg-white/60 backdrop-blur-md shadow-sm">{documentCount} documents</span>
                <span className="px-3 py-1.5 rounded-full border border-white/70 bg-white/60 backdrop-blur-md shadow-sm">{activeChannels.length} active channels</span>
                {hasTranscript && (
                  <span className="px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 backdrop-blur-md shadow-sm">Call script ready</span>
                )}
              </div>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3 text-sm text-slate-500 uppercase tracking-widest font-semibold mt-6"
              >
                <span>Campaign Configuration</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-emerald-600">Active</span>
              </motion.div>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <LaunchGuard
              campaign={loadedCampaign}
              userId={userId || "mock_user"}
              requiredAmount={calculateCampaignCost(loadedCampaign.channels, loadedCampaign.contactCount).relaunchCost || 0}
              onSuccess={handleRelaunch}
              relaunch={true}
            >
              <button
                disabled={relaunching}
                className="px-6 py-2.5 rounded-full bg-white/60 border border-white/70 text-slate-700 hover:bg-white/80 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {relaunching ? <span className="animate-spin">⏳</span> : 'Relaunch'}
              </button>
            </LaunchGuard>
            <Link
              href={`/yourcampaigns/${loadedCampaign.id}/analytics`}
              className="px-6 py-2.5 rounded-full bg-white/60 border border-white/70 text-slate-700 hover:bg-white/80 transition-all text-sm font-medium flex items-center gap-2 shadow-sm"
            >
              <IoMdAnalytics className="text-lg opacity-70" />
              Analytics
            </Link>
            {loadedCampaign?.channels?.calls?.enabled && (
              <PaymentGuard
                campaign={loadedCampaign}
                userId={userId || "mock_user"}
                onSuccess={handleMakeCalls}
              >
                <button
                  disabled={makingCalls}
                  className="px-6 py-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-all text-sm font-semibold flex items-center gap-2 disabled:opacity-50 shadow-[0_0_20px_rgba(15,23,42,0.15)]"
                >
                  {makingCalls ? <span className="animate-spin">⏳</span> : <><VscCallOutgoing className="text-lg" /> Make Call</>}
                </button>
              </PaymentGuard>
            )}
          </motion.div>
        </header>

        {/* Notifications */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm backdrop-blur-md flex items-center justify-between shadow-sm">
              {error}
              <button onClick={() => setError('')}><MdClose /></button>
            </motion.div>
          )}
          {callSuccess && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-sm backdrop-blur-md flex items-center justify-between shadow-sm">
              {callSuccess}
              <button onClick={() => setCallSuccess('')}><MdClose /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Main Content Area (Left/Top) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Knowledge Base Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-[2rem] p-8 bg-white/60 border border-white/70 backdrop-blur-3xl relative group overflow-hidden shadow-xl shadow-black/5"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm text-slate-500 uppercase tracking-widest font-semibold">Knowledge Base</h3>
                  {!isEditingDescription ? (
                    <button 
                      onClick={() => setIsEditingDescription(true)}
                      className="p-2 rounded-full bg-white/70 hover:bg-white text-slate-600 hover:text-slate-900 transition-colors border border-white/70 shadow-sm"
                    >
                      <MdEdit className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleUpdateKnowledge}
                        disabled={saving}
                        className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border border-emerald-200 transition-colors flex items-center gap-2 text-xs font-semibold"
                      >
                        {saving ? <span className="animate-spin">⏳</span> : <MdCheck />} Save
                      </button>
                      <button 
                        onClick={() => {
                          setIsEditingDescription(false)
                          setEditedDescription(typeof loadedCampaign.description === 'object' ? loadedCampaign.description?.original || '' : loadedCampaign.description || '')
                        }}
                        className="p-1.5 rounded-full bg-white/70 hover:bg-white text-slate-700 transition-colors shadow-sm"
                      >
                        <MdClose />
                      </button>
                    </div>
                  )}
                </div>

                {isEditingDescription ? (
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full h-48 bg-white/70 border border-white/70 rounded-2xl p-5 text-slate-900 text-base focus:border-slate-300 focus:bg-white outline-none resize-none font-sans shadow-sm"
                    placeholder="Provide context about your campaign..."
                  />
                ) : (
                  <div className="prose prose-invert max-w-none">
                    <p className="text-slate-700 text-base leading-relaxed font-sans whitespace-pre-wrap">
                      {(typeof loadedCampaign.description === 'object' 
                        ? loadedCampaign.description?.original 
                        : loadedCampaign.description) || 'No description provided'}
                    </p>
                  </div>
                )}
                {saveStatus.message && (
                  <p className={`text-xs mt-3 ${saveStatus.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {saveStatus.message}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Documents Collection */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-[2rem] p-8 bg-white/60 border border-white/70 backdrop-blur-3xl shadow-xl shadow-black/5"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm text-slate-500 uppercase tracking-widest font-semibold">Reference Documents</h3>
                <div className="relative">
                  <input
                    type="file"
                    id="edit-doc-upload"
                    accept=".pdf"
                    onChange={handleUploadDocument}
                    disabled={saving}
                    className="hidden"
                  />
                  <label 
                    htmlFor="edit-doc-upload"
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border border-white/70 bg-white/70 hover:bg-white text-slate-700 text-xs font-semibold cursor-pointer transition-all shadow-sm ${saving ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <TbFileUploadFilled className="text-lg" />
                    Upload PDF
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loadedCampaign.documents && loadedCampaign.documents.length > 0 ? (
                  loadedCampaign.documents.map((doc, idx) => {
                    if (!doc) return null
                    const docUrl = doc.cloudinary_url || doc.url
                    const docPublicId = doc.cloudinary_public_id || doc.publicId
                    return (
                      <div key={idx} className="group p-4 rounded-2xl bg-white/70 border border-white/70 hover:border-white transition-colors flex flex-col gap-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-200 flex items-center justify-center shrink-0">
                            <TbFile className="text-xl text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0 pt-1">
                            <p className="text-slate-900 text-sm font-medium truncate">{doc.name}</p>
                            <p className="text-slate-500 text-xs mt-0.5">PDF Document</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-white/70">
                          <a href={docUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-medium transition-colors border border-slate-200">View</a>
                          <button onClick={() => handleReplaceDocument(docPublicId || '')} className="flex-1 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-medium transition-colors border border-slate-200">Swap</button>
                          <button onClick={() => handleDeleteDocument(idx)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors border border-red-200"><MdClose /></button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="col-span-full py-12 text-center border border-dashed border-white/70 rounded-2xl bg-white/40">
                    <p className="text-slate-500 text-sm">No reference documents uploaded</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Media Assets Grid */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-[2rem] p-8 bg-white/60 border border-white/70 backdrop-blur-3xl shadow-xl shadow-black/5"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm text-slate-500 uppercase tracking-widest font-semibold">Media Assets</h3>
                <span className="text-xs font-medium text-slate-500">{loadedCampaign.assets?.length || 0} items</span>
              </div>
              
              {loadedCampaign.assets && loadedCampaign.assets.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {loadedCampaign.assets.map((asset, idx) => (
                    <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-white/70 shadow-sm group relative">
                      {asset.type === 'image' ? (
                        <img src={asset.url} alt="Asset" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                          <span className="text-2xl">🎬</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="col-span-full py-8 text-center border border-dashed border-white/70 bg-white/40 rounded-2xl">
                  <p className="text-slate-500 text-sm">No media assets</p>
                </div>
              )}
            </motion.div>

            {/* AI Enhanced Description (If exists) */}
            {(typeof loadedCampaign.description === 'object' ? loadedCampaign.description?.aiEnhanced : loadedCampaign.aiDescription) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-[2rem] p-8 bg-gradient-to-br from-white/70 to-transparent border border-white/70 backdrop-blur-3xl shadow-xl shadow-black/5"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-2 rounded-full bg-slate-900 shadow-[0_0_10px_rgba(15,23,42,0.25)]" />
                  <h3 className="text-sm text-slate-700 uppercase tracking-widest font-semibold">AI Synthesized Context</h3>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed font-sans">
                  {typeof loadedCampaign.description === 'object' ? loadedCampaign.description?.aiEnhanced : loadedCampaign.aiDescription}
                </p>
              </motion.div>
            )}

            {/* Call Transcript */}
            {loadedCampaign.channels.calls?.enabled && loadedCampaign.channelContent?.calls?.transcript && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-[2rem] p-8 bg-white/60 border border-white/70 backdrop-blur-3xl shadow-xl shadow-black/5"
              >
                <h3 className="text-sm text-slate-500 uppercase tracking-widest font-semibold mb-6 flex items-center gap-2">
                  <VscCallOutgoing /> Call Script
                </h3>
                <div className="bg-white/70 border border-white/70 rounded-2xl p-6 shadow-sm">
                  <p className="text-slate-700 text-sm leading-relaxed font-mono">
                    {loadedCampaign.channelContent.calls.transcript}
                  </p>
                </div>
              </motion.div>
            )}

          </div>

          {/* Sidebar Area (Right) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Contacts Info */}
            {loadedCampaign.contactsFile && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-[2rem] p-8 bg-white/80 text-slate-900 shadow-xl shadow-black/5 border border-white/70"
              >
                <h3 className="text-xs uppercase tracking-widest font-bold opacity-60 mb-6 text-slate-500">Target Audience</h3>
                <div className="flex flex-col items-center text-center">
                  <span className="text-6xl font-instrument mb-2">{loadedCampaign.contactCount}</span>
                  <span className="text-sm font-medium opacity-80 mb-6">Leads Extracted</span>
                  
                  <div className="w-full bg-slate-100 rounded-xl p-4 mb-4">
                    <p className="text-sm font-semibold truncate">{loadedCampaign.contactsFile?.name || 'Contacts.csv'}</p>
                  </div>
                  
                  <a
                    href={`/api/campaigns/${campaignId}/contacts/download`}
                    download
                    className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-lg shadow-black/10"
                  >
                    Download 
                  </a>
                </div>
              </motion.div>
            )}

            {/* Configured Channels */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-[2rem] p-8 bg-white/60 border border-white/70 backdrop-blur-3xl shadow-xl shadow-black/5"
            >
              <h3 className="text-sm text-slate-500 uppercase tracking-widest font-semibold mb-6">Active Channels</h3>
              <div className="space-y-3">
                {loadedCampaign.channels.text?.enabled && (
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 border border-white/70 shadow-sm">
                    <div className="flex items-center gap-3">
                      <BsFillFileTextFill className="text-lg text-slate-500" />
                      <span className="text-slate-900 font-medium">Text</span>
                    </div>
                    <span className="text-xs text-slate-600 bg-white border border-slate-200 shadow-sm px-2 py-1 rounded-md">{loadedCampaign.channels.text.wordLimit} words</span>
                  </div>
                )}
                {loadedCampaign.channels.voice?.enabled && (
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 border border-white/70 shadow-sm">
                    <div className="flex items-center gap-3">
                      <MdKeyboardVoice className="text-lg text-slate-500" />
                      <span className="text-slate-900 font-medium">Voice</span>
                    </div>
                    <span className="text-xs text-slate-600 bg-white border border-slate-200 shadow-sm px-2 py-1 rounded-md">{loadedCampaign.channels.voice.maxDurationSeconds}s max</span>
                  </div>
                )}
                {loadedCampaign.channels.calls?.enabled && (
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 border border-white/70 shadow-sm">
                    <div className="flex items-center gap-3">
                      <VscCallOutgoing className="text-lg text-slate-500" />
                      <span className="text-slate-900 font-medium">Calls</span>
                    </div>
                    <span className="text-xs text-slate-600 bg-white border border-slate-200 shadow-sm px-2 py-1 rounded-md">{loadedCampaign.channels.calls.maxCallDurationSeconds}s max</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
