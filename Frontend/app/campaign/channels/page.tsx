'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCampaign, type ChannelConfig } from '../CampaignContext'

export default function ChannelsPage() {
  const router = useRouter()
  const { campaign, updateCampaign } = useCampaign()
  
  const [selectedChannels, setSelectedChannels] = useState<Set<'text' | 'voice' | 'calls'>>(
    new Set((Object.keys(campaign.channels).filter(k => campaign.channels[k as keyof ChannelConfig]?.enabled) as ('text' | 'voice' | 'calls')[]))
  )
  const [tone, setTone] = useState(campaign.toneOfVoice || 'professional')
  const [textWordLimit, setTextWordLimit] = useState(campaign.channels.text?.wordLimit || 100)
  const [voiceDuration, setVoiceDuration] = useState(campaign.channels.voice?.maxDurationSeconds || 60)
  const [callsDuration, setCallsDuration] = useState(campaign.channels.calls?.maxCallDurationSeconds || 180)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const channelOptions = ['text', 'voice', 'calls'] as const
  const toneOptions = ['friendly', 'professional', 'energetic', 'formal', 'casual'] as const
  const wordLimitOptions = [50, 100, 150, 200, 300] as const
  const voiceDurationOptions = [30, 60, 120, 180] as const

  const toggleChannel = (channel: 'text' | 'voice' | 'calls') => {
    setSelectedChannels((prev) => {
      const updated = new Set(prev)
      if (updated.has(channel)) {
        updated.delete(channel)
      } else {
        updated.add(channel)
      }
      return updated
    })
    setError('')
  }

  const handleContinue = async () => {
    if (selectedChannels.size === 0) {
      setError('Please select at least one channel')
      return
    }

    try {
      setError('')
      setIsLoading(true)

      // Build channel config object
      const channels: ChannelConfig = {}
      
      if (selectedChannels.has('text')) {
        channels.text = { enabled: true, wordLimit: textWordLimit }
      }
      if (selectedChannels.has('voice')) {
        channels.voice = { enabled: true, maxDurationSeconds: voiceDuration }
      }
      if (selectedChannels.has('calls')) {
        channels.calls = { enabled: true, maxCallDurationSeconds: callsDuration }
      }

      // Update local context
      updateCampaign({ 
        channels,
        toneOfVoice: tone as any,
      })

      // Patch draft document if campaignId exists
      if (campaign.campaignId) {
        console.log('📝 Updating draft campaign with channels...')
        const res = await fetch('/api/campaigns/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: campaign.campaignId,
            channels,
            toneOfVoice: tone,
            wordLimit: textWordLimit,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to update campaign')
        }

        console.log('✅ Draft updated with channels')
      }

      router.push('/campaign/assets')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign')
      console.error('Error updating campaign:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const showTone = selectedChannels.has('voice') || selectedChannels.has('calls')
  const showTextSettings = selectedChannels.has('text')
  const showVoiceSettings = selectedChannels.has('voice')
  const showCallsSettings = selectedChannels.has('calls')

  return (
    <div className="space-y-6 campaign-page-enter">
      <div>
        <h1 className="text-3xl text-white mb-2 font-sans">Choose channels</h1>
        <p className="text-slate-400 font-sans">Select which channels you want to use for this campaign</p>
      </div>

      {/* Channel Selection */}
      <div>
        <div className="grid grid-cols-3 gap-3">
          {channelOptions.map((channel) => (
              <button
                key={channel}
                onClick={() => toggleChannel(channel)}
                className={`px-4 py-3 rounded-2xl cursor-pointer transition font-sans font-medium ${
                  selectedChannels.has(channel)
                    ? 'bg-white text-black hover:bg-white/95 shadow-[0_4px_12px_rgba(255,255,255,0.2)]'
                    : 'bg-black/40 border border-white/20 text-white/70 hover:bg-black/50'
                }`}
              >
                {channel.charAt(0).toUpperCase() + channel.slice(1)}
              </button>
          ))}
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      {/* Tone of Voice */}
      {showTone && (
        <div>
          <h3 className="text-sm text-white mb-3 font-sans">Tone of voice</h3>
          <div className="flex flex-wrap gap-2">
            {toneOptions.map((option) => (
              <button
                key={option}
                onClick={() => setTone(option)}
                className={`px-3 py-1.5 rounded-full text-sm cursor-pointer transition font-sans ${
                  tone === option
                    ? 'bg-white text-black hover:bg-white/95'
                    : 'bg-black/40 border border-white/20 text-white/70 hover:bg-black/50'
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Text Word Limit */}
      {showTextSettings && (
        <div>
          <h3 className="text-sm  text-white mb-3">Word limit (Text)</h3>
          <div className="flex flex-wrap gap-2">
            {wordLimitOptions.map((limit) => (
              <button
                key={limit}
                onClick={() => setTextWordLimit(limit)}
                className={`px-4 py-2 rounded-lg text-sm cursor-pointer transition ${
                  textWordLimit === limit
                    ? 'bg-white text-black hover:bg-white/95 shadow-[0_4px_12px_rgba(255,255,255,0.2)]'
                    : 'bg-black/40 border border-white/20 text-white/70 hover:bg-black/50'
                }`}
              >
                {limit} words
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Voice Duration */}
      {showVoiceSettings && (
        <div>
          <h3 className="text-sm  text-white mb-3">Voice message duration</h3>
          <div className="flex flex-wrap gap-2">
            {voiceDurationOptions.map((duration) => (
              <button
                key={duration}
                onClick={() => setVoiceDuration(duration)}
                className={`px-4 py-2 rounded-lg text-sm cursor-pointer transition ${
                  voiceDuration === duration
                    ? 'bg-white text-black hover:bg-white/95 shadow-[0_4px_12px_rgba(255,255,255,0.2)]'
                    : 'bg-black/40 border border-white/20 text-white/70 hover:bg-black/50'
                }`}
              >
                {duration} seconds
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Calls Duration */}
      {showCallsSettings && (
        <div>
          <h3 className="text-sm  text-white mb-3">Max call duration</h3>
          <div className="flex flex-wrap gap-2">
            {voiceDurationOptions.map((duration) => (
              <button
                key={`call-${duration}`}
                onClick={() => setCallsDuration(duration)}
                className={`px-4 py-2 rounded-lg text-sm cursor-pointer transition ${
                  callsDuration === duration
                    ? 'bg-white text-black hover:bg-white/95 shadow-[0_4px_12px_rgba(255,255,255,0.2)]'
                    : 'bg-black/40 border border-white/20 text-white/70 hover:bg-black/50'
                }`}
              >
                {duration} seconds
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between gap-3 pt-4">
        <button
          onClick={() => router.push('/campaign/description')}
          className="px-6 py-2.5 rounded-lg bg-black/40 border border-white/20 hover:bg-black/50 text-white font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={isLoading}
          className="px-6 py-2.5 rounded-lg bg-white hover:bg-white/95 text-black font-semibold transition shadow-[0_4px_12px_rgba(255,255,255,0.2)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '⟳ Updating...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
