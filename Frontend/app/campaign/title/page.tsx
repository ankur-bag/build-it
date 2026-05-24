'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCampaign } from '../CampaignContext'
import { ArrowUp } from 'lucide-react'

export default function TitlePage() {
  const router = useRouter()
  const { campaign, updateCampaign } = useCampaign()
  const [title, setTitle] = useState(campaign.title)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const autoResizeTextarea = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }

  const handleSend = async () => {
    if (!title.trim()) {
      setError('Campaign title is required')
      return
    }

    try {
      setError('')
      setIsLoading(true)

      const trimmedTitle = title.trim()
      updateCampaign({ title: trimmedTitle })

      // Create or patch draft campaign
      console.log('📝 Creating draft campaign with title...')
      const res = await fetch('/api/campaigns/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.campaignId,
          title: trimmedTitle,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create campaign')
      }

      const { campaignId } = await res.json()
      console.log('✅ Draft created:', campaignId)

      // Store campaignId in context
      updateCampaign({ campaignId })

      // Navigate to description
      router.push(`/campaign/description?id=${campaignId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign')
      console.error('Error creating campaign:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-6 campaign-page-enter">
      <div>
        <h1 className="text-3xl text-white mb-2 font-sans">Name your campaign</h1>
        <p className="text-slate-400 font-sans">Give your campaign a clear, memorable name</p>
      </div>

      <div className="relative">
        <div className="rounded-3xl border border-[#444444] bg-[#1F2023] backdrop-blur-xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.24)]">
          <textarea
            ref={textareaRef}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setError('')
              autoResizeTextarea()
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Summer Sale 2026"
            rows={1}
            disabled={isLoading}
            className="flex w-full rounded-md border-none bg-transparent px-3 py-2.5 text-base text-gray-100 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 resize-none max-h-64 font-sans"
          />
          
          <div className="flex items-end justify-end gap-3 mt-4 pt-4 border-t border-white/5">
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white hover:bg-white/90 text-[#1F2023] transition shadow-[0_0_15px_rgba(255,255,255,0.2)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send (Enter)"
            >
              {isLoading ? (
                <span className="animate-spin">⟳</span>
              ) : (
                <ArrowUp className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  )
}
