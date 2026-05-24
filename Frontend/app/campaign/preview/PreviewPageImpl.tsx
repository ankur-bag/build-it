
'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCampaign, type ChannelConfig } from '../CampaignContext'
import textToSpeech from "@google-cloud/text-to-speech";
import { VscCallOutgoing } from 'react-icons/vsc'
import { BsFillFileTextFill } from 'react-icons/bs'
import { MdKeyboardVoice } from 'react-icons/md'

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
  channelContent?: {
    voice?: { transcript?: string }
    calls?: { transcript?: string }
  }
  audioUrls?: {
    voice?: string
    calls?: string
  }
}

interface PreviewPageProps {
  campaignId?: string
  fromCreationFlow?: boolean
}

export default function PreviewPageImpl({ campaignId: propCampaignId, fromCreationFlow = true }: PreviewPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryParamId = searchParams.get('campaignId')
  const { campaign } = useCampaign()

  const campaignId = propCampaignId || queryParamId || campaign.campaignId

  const [isRegenerating, setIsRegenerating] = useState(false)
  const [loadedCampaign, setLoadedCampaign] = useState<LoadedCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)

  const [draft, setDraft] = useState({
    title: '',
    description: '' as string | { original?: string; aiEnhanced?: string },
    previewText: '',
    transcript: '',
    assets: [] as Asset[],
    contactsFile: null as any,
    contactCount: 0,
    channels: {} as ChannelConfig,
  })

  const [preview, setPreview] = useState<{ type: string; content: string; transcript?: string }>({
    type: 'text',
    content: '',
    transcript: '',
  })

  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [callTranscript, setCallTranscript] = useState('')
  const [generatingTranscripts, setGeneratingTranscripts] = useState(false)
  const [voiceAudioUrl, setVoiceAudioUrl] = useState('')
  const [callAudioUrl, setCallAudioUrl] = useState('')
  const [generatingAudio, setGeneratingAudio] = useState(false)
  const [audioChannelLoading, setAudioChannelLoading] = useState<'voice' | 'calls' | null>(null)

  // Load campaign from database
  useEffect(() => {
    const loadCampaignFromDB = async () => {
      try {
        if (!campaignId) {
          setError('No campaign ID found')
          setLoading(false)
          return
        }

        const response = await fetch(`/api/campaigns/${campaignId}`)
        const data = await response.json()

        if (response.ok) {
          setLoadedCampaign(data.campaign)
          setDraft({
            title: data.campaign.title,
            description: data.campaign.description,
            previewText: data.campaign.previewText || '',
            transcript: data.campaign.transcript || '',
            assets: data.campaign.assets || [],
            contactsFile: data.campaign.contactsFile || null,
            contactCount: data.campaign.contactCount || 0,
            channels: data.campaign.channels || {},
          })
          
          // Initialize voice and call transcripts from channelContent
          setVoiceTranscript(data.campaign.channelContent?.voice?.transcript || '')
          setCallTranscript(data.campaign.channelContent?.calls?.transcript || '')
          
          // Initialize audio URLs
          setVoiceAudioUrl(data.campaign.audioUrls?.voice || '')
          setCallAudioUrl(data.campaign.audioUrls?.calls || '')
          
          const firstChannelName = Object.keys(data.campaign.channels)[0] || 'text'
          setPreview({
            type: firstChannelName,
            content: `${data.campaign.title}\n\n${data.campaign.description}`,
            transcript: `Hello! I'm reaching out about ${data.campaign.title}. ${data.campaign.description}`,
          })
        } else {
          setError(data.error || 'Failed to load campaign')
        }
      } catch (err) {
        console.error('Error loading campaign:', err)
        setError('Failed to load campaign from database')
      } finally {
        setLoading(false)
      }
    }

    loadCampaignFromDB()
  }, [campaignId])

  // Auto-generate missing transcripts
  useEffect(() => {
    const autoGenerateTranscripts = async () => {
      if (!loadedCampaign || !campaignId || generatingTranscripts) return

      const needsVoice = loadedCampaign.channels.voice?.enabled && !loadedCampaign.channelContent?.voice?.transcript
      const needsCall = loadedCampaign.channels.calls?.enabled && !loadedCampaign.channelContent?.calls?.transcript

      if (!needsVoice && !needsCall) return

      // Extract description string from object or legacy string
      let descriptionStr = ''
      if (typeof loadedCampaign.description === 'object' && loadedCampaign.description) {
        descriptionStr = loadedCampaign.description.aiEnhanced || loadedCampaign.description.original || ''
      } else if (typeof loadedCampaign.description === 'string') {
        descriptionStr = loadedCampaign.description || ''
      }

      if (!descriptionStr) return

      setGeneratingTranscripts(true)
      try {
        const generatedTranscripts: { voice?: string; call?: string } = {}
        const generatedAudioUrls: { voice?: string; calls?: string } = {}

        if (needsVoice) {
          console.log('Auto-generating voice transcript...')
          const res = await fetch(`/api/campaigns/${campaignId}/transcript`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channel: 'voice',
              title: loadedCampaign.title,
              description: descriptionStr,
              toneOfVoice: loadedCampaign.toneOfVoice || 'professional',
            }),
          })
          if (res.ok) {
            const data = await res.json()
            generatedTranscripts.voice = data.transcript
            setVoiceTranscript(data.transcript)

            // Auto-generate audio for voice transcript
            console.log('🎵 Auto-generating voice audio...')
            const audioRes = await fetch(`/api/campaigns/${campaignId}/tts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                channel: 'voice',
                transcript: data.transcript,
                toneOfVoice: loadedCampaign.toneOfVoice || 'professional',
              }),
            })
            if (audioRes.ok) {
              const audioData = await audioRes.json()
              generatedAudioUrls.voice = audioData.audioUrl
              setVoiceAudioUrl(audioData.audioUrl)
            }
          }
        }

        if (needsCall) {
          console.log('Auto-generating call transcript...')
          const res = await fetch(`/api/campaigns/${campaignId}/transcript`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channel: 'call',
              title: loadedCampaign.title,
              description: descriptionStr,
              toneOfVoice: loadedCampaign.toneOfVoice || 'professional',
            }),
          })
          if (res.ok) {
            const data = await res.json()
            generatedTranscripts.call = data.transcript
            setCallTranscript(data.transcript)

            // Auto-generate audio for call transcript
            console.log('🎵 Auto-generating call audio...')
            const audioRes = await fetch(`/api/campaigns/${campaignId}/tts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                channel: 'calls',
                transcript: data.transcript,
                toneOfVoice: loadedCampaign.toneOfVoice || 'professional',
              }),
            })
            if (audioRes.ok) {
              const audioData = await audioRes.json()
              generatedAudioUrls.calls = audioData.audioUrl
              setCallAudioUrl(audioData.audioUrl)
            }
          }
        }

        // Save all generated transcripts and audio URLs at once
        if (Object.keys(generatedTranscripts).length > 0) {
          await fetch(`/api/campaigns/${campaignId}/transcripts`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              voiceTranscript: generatedTranscripts.voice,
              callTranscript: generatedTranscripts.call,
              audioUrls: Object.keys(generatedAudioUrls).length > 0 ? generatedAudioUrls : undefined,
            }),
          }).catch((err) => {
            console.warn('Failed to save generated transcripts and audio:', err)
          })
        }
      } catch (err) {
        console.warn('Auto-generation of transcripts failed:', err)
      } finally {
        setGeneratingTranscripts(false)
      }
    }

    autoGenerateTranscripts()
  }, [loadedCampaign?.id, campaignId])

  const generatePreview = async () => {
    setIsRegenerating(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    // Extract proper description for preview
    let descStr = ''
    if (typeof draft.description === 'object' && draft.description) {
      descStr = draft.description.aiEnhanced || draft.description.original || ''
    } else if (typeof draft.description === 'string') {
      descStr = draft.description || ''
    }
    
    const firstChannel = Object.keys(draft.channels).find(k => k === 'text') || 'text'
    setPreview({
      type: firstChannel,
      content: `${draft.title}\n\n${descStr}`,
      transcript: `Hello! I'm reaching out about ${draft.title}. ${descStr}`,
    })
    setIsRegenerating(false)
  }

  const generateTTS = async (channel: 'voice' | 'calls', transcript: string) => {
    if (!transcript || !campaignId) return

    try {
      setAudioChannelLoading(channel)
      setGeneratingAudio(true)
      setError('')

      console.log(`🎵 Generating Gemini TTS for ${channel}...`)
      const res = await fetch(`/api/campaigns/${campaignId}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          transcript,
          toneOfVoice: loadedCampaign?.toneOfVoice || 'professional',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to generate ${channel} audio`)
      }

      const data = await res.json()
      console.log(`✅ ${channel} audio generated:`, data.audioUrl)

      // Update state
      if (channel === 'voice') {
        setVoiceAudioUrl(data.audioUrl)
      } else {
        setCallAudioUrl(data.audioUrl)
      }

      // Persist audio URL to Firestore
      await fetch(`/api/campaigns/${campaignId}/transcripts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrls: {
            ...(channel === 'voice' ? { voice: data.audioUrl } : { calls: data.audioUrl }),
          },
        }),
      }).catch((err) => {
        console.warn(`Failed to persist ${channel} audio URL to Firestore:`, err)
      })
    } catch (err) {
      console.error(`Error generating ${channel} TTS:`, err)
      setError(err instanceof Error ? err.message : `Failed to generate ${channel} audio`)
    } finally {
      setGeneratingAudio(false)
      setAudioChannelLoading(null)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')

      // Build payload with only defined values
      const payload: any = {
        campaignId,
        title: draft.title,
      }

      if (draft.description) {
        payload.description = draft.description
      }

      if (draft.previewText) {
        payload.previewText = draft.previewText
      }

      if (draft.channels && Object.keys(draft.channels).length > 0) {
        payload.channels = draft.channels
      }

      if (draft.transcript) {
        // Save transcript to channelContent
        payload.channelContent = {
          ...loadedCampaign?.channelContent,
          voice: { transcript: draft.transcript },
          call: { transcript: draft.transcript },
        }
      }

      // Save assets and contacts changes
      if (draft.assets.length > 0) {
        payload.assets = draft.assets
      }

      if (draft.contactsFile) {
        payload.contactsFile = draft.contactsFile
        payload.contactCount = draft.contactCount
      }

      // Save to draft
      const response = await fetch(`/api/campaigns/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save changes')
      }

      // Save transcripts if edited
      if (voiceTranscript || callTranscript) {
        await fetch(`/api/campaigns/${campaignId}/transcripts`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voiceTranscript: voiceTranscript || undefined,
            callTranscript: callTranscript || undefined,
          }),
        }).catch((err) => {
          console.warn('Failed to save transcripts, but campaign was saved:', err)
        })

        // Generate TTS for voice transcript if it was edited and exists
        if (voiceTranscript && draft.channels.voice?.enabled) {
          await generateTTS('voice', voiceTranscript)
        }

        // Generate TTS for call transcript if it was edited and exists
        if (callTranscript && draft.channels.calls?.enabled) {
          await generateTTS('calls', callTranscript)
        }
      }

      if (loadedCampaign) {
        setLoadedCampaign({
          ...loadedCampaign,
          title: draft.title,
          description: draft.description,
          previewText: draft.previewText,
          transcript: draft.transcript,
          assets: draft.assets,
          contactsFile: draft.contactsFile,
          contactCount: draft.contactCount,
          channels: draft.channels,
        })
      }

      setIsEditing(false)
    } catch (err) {
      console.error('Error saving campaign:', err)
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleLaunch = async () => {
    if (!campaignId || isLaunching) {
      setError('Campaign ID not found. Please go back and try again.')
      return
    }

    try {
      setIsLaunching(true)
      setError('')
      
      // Save any pending edits first
      if (isEditing) {
        await handleSave()
      }

      // Launch the campaign
      console.log('🚀 Launching campaign...')
      const launchRes = await fetch(`/api/campaigns/${campaignId}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!launchRes.ok) {
        const data = await launchRes.json()
        throw new Error(data.error || 'Failed to launch campaign')
      }

      console.log('✅ Campaign launched successfully')
      router.push('/yourcampaigns')
    } catch (err) {
      console.error('Error launching campaign:', err)
      setError(err instanceof Error ? err.message : 'Failed to launch campaign')
      setIsLaunching(false)
    }
  }

  const removeAsset = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      assets: prev.assets.filter((_, i) => i !== index),
    }))
  }

  const generateTranscript = async (channel: 'voice' | 'call') => {
    try {
      setIsRegenerating(true)
      setError('')

      const res = await fetch(`/api/campaigns/${campaignId}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          title: draft.title,
          description: draft.description,
          toneOfVoice: loadedCampaign?.toneOfVoice || 'professional',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to generate ${channel} transcript`)
      }

      const data = await res.json()
      console.log(`✅ ${channel} transcript generated`)

      // Update local state
      if (channel === 'voice') {
        setVoiceTranscript(data.transcript)
        // Immediately generate audio for this transcript
        await generateTTS('voice', data.transcript)
      } else {
        setCallTranscript(data.transcript)
        // Immediately generate audio for this transcript
        await generateTTS('calls', data.transcript)
      }
    } catch (err) {
      console.error('Error generating transcript:', err)
      setError(err instanceof Error ? err.message : `Failed to generate ${channel} transcript`)
    } finally {
      setIsRegenerating(false)
    }
  }

  const addAssets = async (files: File[]) => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    const oversized = files.filter((f) => f.size > MAX_FILE_SIZE)
    if (oversized.length > 0) {
      setError(`${oversized.length} file(s) exceed 10MB limit`)
      return
    }

    try {
      setError('')
      console.log('📤 Uploading assets:', files.length, 'file(s)')

      // Upload assets via REST API (not Server Actions)
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('assets', file)
      })

      const uploadRes = await fetch(`/api/campaigns/${campaignId}/files`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload assets')
      }

      const uploadData = await uploadRes.json()
      console.log('✅ Assets uploaded:', uploadData.assets.length, 'file(s)')

      // Add uploaded assets to draft
      setDraft((prev) => ({
        ...prev,
        assets: [...(prev.assets || []), ...uploadData.assets],
      }))
    } catch (err) {
      console.error('Error uploading assets:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload assets')
    }
  }

  const handleContactsFileUpload = async (files: File[]) => {
    if (files.length === 0) return

    const file = files[0]
    console.log('📤 Uploading contacts file:', file.name)
    setError('')

    try {
      // Upload contacts file via REST API (not Server Actions)
      const formData = new FormData()
      formData.append('contactsFile', file)

      const uploadRes = await fetch(`/api/campaigns/${campaignId}/files`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload contacts file')
      }

      const uploadData = await uploadRes.json()
      console.log('✅ Contacts file uploaded:', uploadData.contactsFile)

      // Update draft with uploaded file info
      setDraft((prev) => ({
        ...prev,
        contactsFile: uploadData.contactsFile,
        contactCount: Math.max(prev.contactCount, 1), // Ensure at least 1 contact when file is added
      }))

      // Trigger extraction to get contact summary
      console.log('📞 Extracting contacts...')
      const extractRes = await fetch(`/api/campaigns/${campaignId}/contacts`, {
        method: 'POST',
      })

      if (extractRes.ok) {
        const extractData = await extractRes.json()
        console.log('✅ Contacts extracted:', extractData.count, 'contacts')
        setDraft((prev) => ({
          ...prev,
          contactCount: extractData.count,
        }))
      } else {
        console.warn('Failed to extract contacts summary, but file was uploaded')
      }
    } catch (err) {
      console.error('Error uploading contacts file:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload contacts file')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 flex flex-col h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img 
              src="/favicon.svg" 
              alt="Loading" 
              className="w-12 h-12 animate-spin"
            />
          </div>
          <p className="text-white">Loading your campaign's preview ..... </p>
        </div>
      </div>
    )
  }

  if (error && !loadedCampaign) {
    return (
      <div className="space-y-6 flex flex-col h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-lg bg-white hover:bg-white/95 text-black font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!loadedCampaign) {
    return (
      <div className="space-y-6 flex flex-col h-[60vh] items-center justify-center">
        <p className="text-white">No campaign data found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 flex flex-col h-[60vh] campaign-page-enter">
      <div>
        <h1 className="text-3xl text-white mb-2 font-sans">Campaign preview</h1>
        <p className="text-slate-400 font-sans">Review and manage your campaign</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-4 space-y-6 pb-3">
        {/* Campaign info */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
          <div>
            <p className="text-xs text-white/50">Title</p>
            {isEditing ? (
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white focus:border-white/50 outline-none transition"
              />
            ) : (
              <p className="text-white font-semibold text-lg">{loadedCampaign.title}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-white/50 mb-1">Description</p>
            {isEditing ? (
              <textarea
                value={typeof draft.description === 'string' 
                  ? draft.description 
                  : (typeof draft.description === 'object' 
                    ? (draft.description?.aiEnhanced || draft.description?.original || '')
                    : '')}
                onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white focus:border-white/50 outline-none transition resize-none h-20"
              />
            ) : (
              <div className="space-y-2">
                {/* Helper function to extract description parts */}
                {(() => {
                  let enhanced = ''
                  let original = ''
                  
                  if (typeof loadedCampaign.description === 'object' && loadedCampaign.description) {
                    enhanced = loadedCampaign.description.aiEnhanced || ''
                    original = loadedCampaign.description.original || ''
                  } else if (typeof loadedCampaign.description === 'string') {
                    original = loadedCampaign.description || ''
                  }
                  
                  const mainDesc = enhanced || original
                  
                  return (
                    <>
                      {mainDesc && (
                        <p className="text-white/80 text-sm whitespace-pre-wrap">{mainDesc}</p>
                      )}
                      {enhanced && original && enhanced !== original && (
                        <details className="text-xs text-white/40">
                          <summary className="cursor-pointer hover:text-white/60 transition">Show original description</summary>
                          <p className="mt-2 whitespace-pre-wrap text-white/50 border-l border-white/10 pl-2">
                            {original}
                          </p>
                        </details>
                      )}
                    </>
                  )
                })()}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-white/50 mb-2">Channels & Limits</p>
            {isEditing ? (
              <div className="space-y-2">
                {draft.channels.text?.enabled && (
                  <div className="flex justify-between items-center px-3 py-2 bg-black/30 rounded-lg border border-white/10">
                    <span className="text-white/80">📝 Text</span>
                    <input
                      type="number"
                      value={draft.channels.text.wordLimit || 160}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          channels: {
                            ...prev.channels,
                            text: {
                              enabled: prev.channels.text?.enabled ?? true,
                              wordLimit: parseInt(e.target.value) || 160,
                            },
                          },
                        }))
                      }
                      className="w-20 px-2 py-1 text-xs rounded bg-black/40 border border-white/20 text-white focus:border-white/50 outline-none"
                      placeholder="Word limit"
                    />
                  </div>
                )}
                {draft.channels.voice?.enabled && (
                  <div className="space-y-2 px-3 py-2 bg-black/30 rounded-lg border border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-white/80 flex items-center gap-2"><MdKeyboardVoice className="w-4 h-4" /> Voice</span>
                      <input
                        type="number"
                        value={draft.channels.voice.maxDurationSeconds || 30}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            channels: {
                              ...prev.channels,
                              voice: {
                                enabled: prev.channels.voice?.enabled ?? true,
                                maxDurationSeconds: parseInt(e.target.value) || 30,
                              },
                            },
                          }))
                        }
                        className="w-20 px-2 py-1 text-xs rounded bg-black/40 border border-white/20 text-white focus:border-white/50 outline-none"
                        placeholder="Duration"
                      />
                    </div>
                  </div>
                )}
                {draft.channels.calls?.enabled && (
                  <div className="space-y-2 px-3 py-2 bg-black/30 rounded-lg border border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-white/80 flex items-center gap-2"><VscCallOutgoing className="w-4 h-4" /> Calls</span>
                      <input
                        type="number"
                        value={draft.channels.calls.maxCallDurationSeconds || 60}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            channels: {
                              ...prev.channels,
                              calls: {
                                enabled: prev.channels.calls?.enabled ?? true,
                                maxCallDurationSeconds: parseInt(e.target.value) || 60,
                              },
                            },
                          }))
                        }
                        className="w-20 px-2 py-1 text-xs rounded bg-black/40 border border-white/20 text-white focus:border-white/50 outline-none"
                        placeholder="Duration"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {draft.channels.text?.enabled && (
                  <div className="flex justify-between items-center px-3 py-2 bg-black/30 rounded-lg border border-white/10">
                    <span className="text-white/80">📝 Text</span>
                    <span className="text-xs text-white/60">{draft.channels.text.wordLimit} words max</span>
                  </div>
                )}
                {draft.channels.voice?.enabled && (
                  <div className="flex justify-between items-center px-3 py-2 bg-black/30 rounded-lg border border-white/10">
                    <span className="text-white/80 flex items-center gap-2"><MdKeyboardVoice className="w-4 h-4" /> Voice</span>
                    <span className="text-xs text-white/60">{draft.channels.voice.maxDurationSeconds}s max</span>
                  </div>
                )}
                {draft.channels.calls?.enabled && (
                  <div className="flex justify-between items-center px-3 py-2 bg-black/30 rounded-lg border border-white/10">
                    <span className="text-white/80 flex items-center gap-2"><VscCallOutgoing className="w-4 h-4" /> Calls</span>
                    <span className="text-xs text-white/60">{draft.channels.calls.maxCallDurationSeconds}s max</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preview Text / Transcript */}
        {draft.previewText && (
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2">
            <p className="text-xs text-white/50">Preview Text</p>
            {isEditing ? (
              <textarea
                value={draft.previewText}
                onChange={(e) => setDraft((prev) => ({ ...prev, previewText: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white focus:border-white/50 outline-none transition resize-none h-20"
              />
            ) : (
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{draft.previewText}</p>
            )}
          </div>
        )}

        {/* Transcript / Voice Recording */}
        {draft.transcript && (
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2">
            <p className="text-xs text-white/50">Transcript / Voice Recording</p>
            {isEditing ? (
              <textarea
                value={draft.transcript}
                onChange={(e) => setDraft((prev) => ({ ...prev, transcript: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white focus:border-white/50 outline-none transition resize-none h-20"
              />
            ) : (
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{draft.transcript}</p>
            )}
          </div>
        )}

        {/* Voice Message Transcript */}
        {draft.channels.voice?.enabled && (
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
            <p className="text-xs text-white/50 flex items-center gap-2"><MdKeyboardVoice className="w-4 h-4" /> Voice Message Script</p>
            {isEditing ? (
              <textarea
                value={voiceTranscript}
                onChange={(e) => setVoiceTranscript(e.target.value)}
                placeholder="Voice message script will appear here..."
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white focus:border-white/50 outline-none transition resize-none h-24"
              />
            ) : voiceTranscript ? (
              <div className="space-y-3">
                <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{voiceTranscript}</p>
                {audioChannelLoading === 'voice' ? (
                  <div className="flex items-center gap-2 text-xs text-blue-400">
                    <span className="animate-spin">⟳</span> Generating audio file...
                  </div>
                ) : voiceAudioUrl ? (
                  <div className="space-y-2">
                    <audio
                      controls
                      src={voiceAudioUrl}
                      className="w-full h-8 rounded-lg"
                    />
                    {!isEditing && (
                      <button
                        onClick={() => generateTTS('voice', voiceTranscript)}
                        disabled={audioChannelLoading !== null}
                        className="px-3 py-1.5 rounded-lg bg-blue-600/30 border border-blue-500/30 hover:bg-blue-600/50 text-blue-200 text-xs font-medium transition disabled:opacity-50 cursor-pointer"
                      >
                        🎵 Regenerate Audio
                      </button>
                    )}
                  </div>
                ) : (
                  !isEditing && (
                    <button
                      onClick={() => generateTTS('voice', voiceTranscript)}
                      disabled={audioChannelLoading !== null}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/30 border border-blue-500/30 hover:bg-blue-600/50 text-blue-200 text-xs font-medium transition disabled:opacity-50 cursor-pointer"
                    >
                      🎵 Generate Audio
                    </button>
                  )
                )}
              </div>
            ) : (
              <p className="text-white/40 text-sm italic">Generating voice message script...</p>
            )}
          </div>
        )}

        {/* Call Script */}
        {draft.channels.calls?.enabled && (
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
            <p className="text-xs text-white/50 flex items-center gap-2"><VscCallOutgoing className="w-4 h-4" /> Call Script</p>
            {isEditing ? (
              <textarea
                value={callTranscript}
                onChange={(e) => setCallTranscript(e.target.value)}
                placeholder="Call script will appear here..."
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white focus:border-white/50 outline-none transition resize-none h-24"
              />
            ) : callTranscript ? (
              <div className="space-y-3">
                <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{callTranscript}</p>
                {audioChannelLoading === 'calls' ? (
                  <div className="flex items-center gap-2 text-xs text-blue-400">
                    <span className="animate-spin">⟳</span> Generating audio file...
                  </div>
                ) : callAudioUrl ? (
                  <div className="space-y-2">
                    <audio
                      controls
                      src={callAudioUrl}
                      className="w-full h-8 rounded-lg"
                    />
                    {!isEditing && (
                      <button
                        onClick={() => generateTTS('calls', callTranscript)}
                        disabled={audioChannelLoading !== null}
                        className="px-3 py-1.5 rounded-lg bg-blue-600/30 border border-blue-500/30 hover:bg-blue-600/50 text-blue-200 text-xs font-medium transition disabled:opacity-50 cursor-pointer"
                      >
                        🎵 Regenerate Audio
                      </button>
                    )}
                  </div>
                ) : (
                  !isEditing && (
                    <button
                      onClick={() => generateTTS('calls', callTranscript)}
                      disabled={audioChannelLoading !== null}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/30 border border-blue-500/30 hover:bg-blue-600/50 text-blue-200 text-xs font-medium transition disabled:opacity-50 cursor-pointer"
                    >
                      🎵 Generate Audio
                    </button>
                  )
                )}
              </div>
            ) : (
              <p className="text-white/40 text-sm italic">Generating call script...</p>
            )}
          </div>
        )}

        {/* Assets */}
        {draft.assets.length > 0 && (
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Attached assets ({draft.assets.length})</h3>
            <div className="grid grid-cols-3 gap-2">
              {draft.assets.map((asset, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden aspect-square bg-black/60">
                  {asset.type === 'image' ? (
                    <img src={asset.url} alt={`Asset ${idx}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🎬</div>
                  )}
                  {isEditing && (
                    <button
                      onClick={() => removeAsset(idx)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {isEditing && (
              <label className="block mt-3 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white/80 text-sm hover:bg-white/20 transition cursor-pointer text-center">
                Add More Assets
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => e.target.files && addAssets(Array.from(e.target.files))}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}

        {isEditing && draft.assets.length === 0 && (
          <label className="block px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white/80 text-sm hover:bg-white/20 transition cursor-pointer text-center">
            Add Assets
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => e.target.files && addAssets(Array.from(e.target.files))}
              className="hidden"
            />
          </label>
        )}

        {/* Contacts File */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-white/50 mb-2">Contacts File</p>
          {draft.contactsFile ? (
            <div className="flex items-center justify-between px-3 py-2 bg-black/30 rounded-lg border border-white/10">
              <div>
                <span className="text-white/80 text-sm">📄 {draft.contactsFile.name || 'Contacts uploaded'}</span>
                <p className="text-xs text-white/50 mt-1">Total contacts: {draft.contactCount}</p>
              </div>
              {isEditing && (
                <button
                  onClick={() => setDraft((prev) => ({ ...prev, contactsFile: null, contactCount: 0 }))}
                  className="text-xs px-2 py-1 rounded bg-red-500/30 hover:bg-red-500/50 text-red-300 transition cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
          ) : isEditing ? (
            <label className="block px-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white/80 text-sm hover:bg-white/20 transition cursor-pointer text-center">
              📁 Add Contacts File
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files && handleContactsFileUpload(Array.from(e.target.files))}
                className="hidden"
              />
            </label>
          ) : (
            <p className="text-white/40 text-sm">No contacts file</p>
          )}
        </div>

        {/* Contacts Warning */}
        {isEditing && draft.contactCount === 0 && (
          <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm">
            ⚠️ You must have at least 1 contact to save changes. Please add a contacts file.
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-4 mt-6 border-t border-white/10">
        <Link
          href={queryParamId ? '/yourcampaigns' : '/campaign/contacts'}
          className="px-6 py-2.5 rounded-lg bg-black/40 border border-white/20 hover:bg-black/50 text-white font-medium transition cursor-pointer"
        >
          Back
        </Link>
        <div className="flex gap-3">
          {!isEditing && (
            <>
              <button
                onClick={async () => {
                  setIsRegenerating(true)
                  try {
                    const res = await fetch(`/api/campaigns/${campaignId}/description`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        wordLimit: loadedCampaign.channels.text?.wordLimit || 200,
                        tone: loadedCampaign.toneOfVoice || 'professional and friendly',
                        emotion: 'trust and excitement',
                      }),
                    })
                    if (res.ok) {
                      const data = await res.json()
                      console.log('✅ AI description generated:', data.aiDescription)
                      // Reload campaign to show updated description
                      const campaignRes = await fetch(`/api/campaigns/${campaignId}`)
                      const campaignData = await campaignRes.json()
                      setLoadedCampaign(campaignData.campaign)
                      setDraft((prev) => ({
                        ...prev,
                        description: campaignData.campaign.aiDescription || campaignData.campaign.description,
                      }))
                      setError('')
                    } else {
                      setError('Failed to enhance description')
                    }
                  } catch (err) {
                    console.error('Error:', err)
                    setError('Failed to enhance description')
                  } finally {
                    setIsRegenerating(false)
                  }
                }}
                disabled={isRegenerating}
                className="px-6 py-2.5 rounded-lg bg-purple-600/30 border border-purple-500/30 hover:bg-purple-600/50 text-purple-200 font-medium transition disabled:opacity-50 cursor-pointer"
              >
                {isRegenerating ? ' Enhancing...' : 'Enhance with AI'}
              </button>
              <button
                onClick={generatePreview}
                disabled={isRegenerating}
                className="px-6 py-2.5 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 text-white font-medium transition disabled:opacity-50 cursor-pointer"
              >
                {isRegenerating ? '⟳ Regenerating...' : '⟳ Regenerate'}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 text-white font-medium transition cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={handleLaunch}
                disabled={isLaunching}
                className="px-6 py-2.5 rounded-lg bg-white hover:bg-white/95 text-black  transition shadow-[0_4px_12px_rgba(255,255,255,0.2)] cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLaunching ? 'Launching...' : 'Launch Campaign'}
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button
                onClick={() => {
                  setDraft({
                    title: loadedCampaign.title,
                    description: loadedCampaign.description,
                    previewText: loadedCampaign.previewText || '',
                    transcript: loadedCampaign.transcript || '',
                    assets: loadedCampaign.assets || [],
                    contactsFile: loadedCampaign.contactsFile || null,
                    contactCount: loadedCampaign.contactCount || 0,
                    channels: loadedCampaign.channels || {},
                  })
                  setIsEditing(false)
                }}
                className="px-6 py-2.5 rounded-lg bg-black/40 border border-white/20 hover:bg-black/50 text-white font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || draft.contactCount === 0}
                className="px-6 py-2.5 rounded-lg bg-white hover:bg-white/95 text-black font-semibold transition shadow-[0_4px_12px_rgba(255,255,255,0.2)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '💾 Saving...' : '✅ Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
