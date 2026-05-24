/**
 * Campaign Assets Upload Page with AI Image Generation
 * 
 * Handles uploading images/videos AND generating images with Pixazo API.
 * Users can:
 * - Upload files manually
 * - Generate images with AI prompts
 * - Regenerate if they don't like the result
 * - Approve and save generated images
 */

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCampaign } from '../CampaignContext'
import { RiAiGenerate2 } from "react-icons/ri";
import { RiAiGenerate } from "react-icons/ri";
import { MdOutlineDriveFolderUpload } from "react-icons/md";
import { IoCloudUpload } from "react-icons/io5";

interface GeneratedImagePreview {
  dataUrl: string
  isApproving: boolean
}

export default function AssetsPage() {
  const router = useRouter()
  const { campaign, updateCampaign } = useCampaign()
  const [assets, setAssets] = useState<File[]>(campaign.assets || [])
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Image generation states
  const [showGenerateUI, setShowGenerateUI] = useState(false)
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImagePreview, setGeneratedImagePreview] = useState<GeneratedImagePreview | null>(null)
  const [generatedAssets, setGeneratedAssets] = useState<Array<{ url: string; publicId: string; type: 'image' }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const aspectRatios = ['1:1', '4:3', '16:9', '9:16', '3:2']

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }

  const uploadAssets = async (filesToUpload: File[]) => {
    if (!campaign.campaignId) {
      setError('Campaign ID not found. Please go back and try again.')
      return false
    }

    try {
      setError('')
      setIsUploading(true)

      const formData = new FormData()
      filesToUpload.forEach((file) => {
        formData.append('assets', file)
      })

      console.log('📤 Uploading assets to draft campaign...')
      const res = await fetch(`/api/campaigns/${campaign.campaignId}/files`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to upload assets')
      }

      console.log('✅ Assets uploaded successfully')
      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload assets'
      setError(errorMsg)
      console.error('Error uploading assets:', err)
      return false
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      ['image/png', 'image/jpeg', 'video/mp4', 'video/quicktime', 'application/pdf'].includes(file.type)
    )
    
    // Check file sizes
    const oversized = files.filter(f => f.size > MAX_FILE_SIZE)
    if (oversized.length > 0) {
      setError(`${oversized.length} file(s) exceed 10MB limit`)
      return
    }
    
    setError('')
    setAssets((prev) => [...prev, ...files])
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      
      // Check file sizes
      const oversized = files.filter(f => f.size > MAX_FILE_SIZE)
      if (oversized.length > 0) {
        setError(`${oversized.length} file(s) exceed 10MB limit`)
        return
      }
      
      setError('')
      setAssets((prev) => [...prev, ...files])
    }
  }

  const removeAsset = (idx: number) => {
    setAssets((prev) => prev.filter((_, i) => i !== idx))
  }

  const generateImage = async (approve: boolean = false) => {
    if (!generatePrompt.trim()) {
      setError('Please enter a description for the image')
      return
    }

    if (!campaign.campaignId) {
      setError('Campaign ID not found. Please go back and try again.')
      return
    }

    try {
      setError('')
      setIsGenerating(true)

      console.log('🎨 Generating image with Pixazo...')
      const res = await fetch(`/api/campaigns/${campaign.campaignId}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: generatePrompt,
          aspectRatio,
          shouldSave: approve,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate image')
      }

      const result = await res.json()
      console.log('✅ Image generated successfully')

      // Show preview
      setGeneratedImagePreview({
        dataUrl: result.imageUrl,
        isApproving: false,
      })

      // If approved, add to generated assets list
      if (approve && result.uploadResult) {
        setGeneratedAssets((prev) => [
          ...prev,
          {
            url: result.uploadResult.url,
            publicId: result.uploadResult.publicId,
            type: 'image',
          },
        ])

        // Clear prompt and preview
        setGeneratePrompt('')
        setGeneratedImagePreview(null)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate image'
      setError(errorMsg)
      console.error('Error generating image:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const saveGeneratedImage = async (imageDataUrl: string) => {
    if (!imageDataUrl) return

    try {
      setError('')

      console.log('💾 Saving generated image...')
      const res = await fetch(`/api/campaigns/${campaign.campaignId}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imageDataUrl,
          shouldSave: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save image')
      }

      const result = await res.json()
      console.log('✅ Image approved and saved')

      if (result.uploadResult) {
        setGeneratedAssets((prev) => [
          ...prev,
          {
            url: result.uploadResult.url,
            publicId: result.uploadResult.publicId,
            type: 'image',
          },
        ])

        // Clear prompt and preview
        setGeneratePrompt('')
        setGeneratedImagePreview(null)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save image'
      setError(errorMsg)
      console.error('Error saving image:', err)
    }
  }

  const approveGeneratedImage = async () => {
    if (!generatedImagePreview?.dataUrl) return

    try {
      setGeneratedImagePreview((prev) => prev ? { ...prev, isApproving: true } : null)
      setIsGenerating(true)

      await saveGeneratedImage(generatedImagePreview.dataUrl)
    } finally {
      setIsGenerating(false)
      setGeneratedImagePreview((prev) => prev ? { ...prev, isApproving: false } : null)
    }
  }

  const removeGeneratedAsset = (idx: number) => {
    setGeneratedAssets((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleContinue = async () => {
    // Combine uploaded and generated assets
    const allAssets = [...assets]
    
    // Add generated assets if any
    if (generatedAssets.length > 0 && campaign.campaignId) {
      try {
        // Upload generated assets to campaign
        const formData = new FormData()
        generatedAssets.forEach((asset) => {
          // Generated assets are already in Firestore via approve, just count them
        })

        // If there are File assets, upload them
        if (allAssets.length > 0) {
          const formData = new FormData()
          allAssets.forEach((file) => {
            formData.append('assets', file)
          })

          console.log('📤 Uploading file assets...')
          const res = await fetch(`/api/campaigns/${campaign.campaignId}/files`, {
            method: 'POST',
            body: formData,
          })

          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || 'Failed to upload assets')
          }
          console.log('✅ File assets uploaded')
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to upload assets'
        setError(errorMsg)
        return
      }
    } else if (allAssets.length > 0) {
      // Only file uploads, no generated assets
      const uploaded = await uploadAssets(allAssets)
      if (!uploaded) return
    }

    // Update context and continue
    updateCampaign({ assets: allAssets })
    router.push('/campaign/docs')
  }

  return (
    <div className="space-y-6 campaign-page-enter">
      <div>
        <h1 className="text-3xl text-white mb-2 font-sans">Add campaign assets</h1>
        <p className="text-slate-400 font-sans">Upload files or generate images with AI</p>
      </div>

      {/* Tab Toggle: Upload vs Generate */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowGenerateUI(false)}
          className={`px-4 py-2 rounded-lg font-sans font-medium transition flex items-center gap-2 ${
            !showGenerateUI
              ? 'bg-white text-black'
              : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
          }`}
        >
          <MdOutlineDriveFolderUpload />
          Upload Files
        </button>
        <button
          onClick={() => setShowGenerateUI(true)}
          className={`px-4 py-2 rounded-lg font-sans font-medium transition flex items-center gap-2 ${
            showGenerateUI
              ? 'bg-white text-black'
              : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
          }`}
        >
          <RiAiGenerate2 />
          Generate with AI
        </button>
      </div>

      {/* UPLOAD MODE */}
      {!showGenerateUI && (
        <>
          {/* Drag and drop area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition ${
              dragActive
                ? 'border-white/60 bg-white/10'
                : 'border-white/20 bg-black/30 hover:border-white/30'
            }`}
          >
            <div className="space-y-3">
              <div className="text-4xl text-white flex justify-center"> <IoCloudUpload/></div>
              <div>
                <p className="text-white ">Drag files here or</p>
                <label className="text-white/80 cursor-pointer hover:text-white">
                  click to browse
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,video/mp4,video/quicktime,.pdf"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-white/50">PNG, JPG, MP4, MOV, PDF up to 10MB each</p>
            </div>
          </div>

          {/* Uploaded Assets List */}
          {assets.length > 0 && (
            <div>
              <h3 className="text-sm text-white mb-3">
                Uploaded ({assets.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {assets.map((file, idx) => (
                  <div key={`asset-${idx}`} className="flex items-center justify-between bg-blue-900/30 border border-blue-500/40 rounded-lg p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{file.type.startsWith('image') ? '🖼️' : file.type.startsWith('video') ? '🎬' : '📄'}</span>
                      <span className="text-sm text-white/80 truncate">{file.name}</span>
                    </div>
                    <button
                      onClick={() => removeAsset(idx)}
                      className="text-white/50 hover:text-red-400 transition ml-2 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* GENERATE MODE */}
      {showGenerateUI && (
        <>
          <div className="space-y-4">
            {/* Generate Prompt Input */}
            <div className="space-y-2">
              <label className="block text-sm text-white font-sans font-medium">
                Describe the image you want to generate
              </label>
              <textarea
                value={generatePrompt}
                onChange={(e) => {
                  setGeneratePrompt(e.target.value)
                  setError('')
                }}
                placeholder="e.g., Professional marketing banner for summer sale with bright colors, modern product showcase, and call-to-action button"
                rows={4}
                className="w-full bg-black/40 border border-white/20 rounded-lg p-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 resize-none"
              />
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-2">
              <label className="block text-sm text-white font-medium">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-5 gap-2">
                {aspectRatios.map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-3 py-2 rounded-lg font-medium transition text-sm ${
                      aspectRatio === ratio
                        ? 'bg-white text-black'
                        : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={() => generateImage(false)}
              disabled={isGenerating || !generatePrompt.trim()}
              className="w-full px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RiAiGenerate />
              {isGenerating ? 'Generating...' : 'Generate Image'}
            </button>

            {/* Generated Image Preview */}
            {generatedImagePreview && (
              <div className="space-y-3">
                <div className="border border-white/20 rounded-lg overflow-hidden bg-black/50">
                  <img
                    src={generatedImagePreview.dataUrl}
                    alt="Generated preview"
                    className="w-full h-auto"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => generateImage(false)}
                    disabled={isGenerating || generatedImagePreview.isApproving}
                    className="flex-1 px-4 py-2 rounded-lg border border-white/20 hover:border-white/40 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     Regenerate
                  </button>
                  <button
                    onClick={approveGeneratedImage}
                    disabled={isGenerating || generatedImagePreview.isApproving}
                    className="flex-1 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatedImagePreview.isApproving ? '💾 Saving...' : ' Approve'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Generated Assets List */}
          {generatedAssets.length > 0 && (
            <div>
              <h3 className="text-sm text-white mb-3">
                Generated Images ({generatedAssets.length})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {generatedAssets.map((asset, idx) => (
                  <div key={`generated-${idx}`} className="relative group border border-green-500/40 rounded-lg overflow-hidden bg-black/30">
                    <img
                      src={asset.url}
                      alt={`Generated ${idx + 1}`}
                      className="w-full h-32 object-cover"
                    />
                    <button
                      onClick={() => removeGeneratedAsset(idx)}
                      className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-700 text-white w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-1 left-1 text-xs bg-green-600/80 text-white px-2 py-1 rounded">
                      Generated
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Summary */}
      {(assets.length > 0 || generatedAssets.length > 0) && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <p className="text-sm text-white/80">
            📊 Total Assets: <span className="font-semibold text-white">{assets.length + generatedAssets.length}</span>
            {' '}({assets.length} uploaded, {generatedAssets.length} generated)
          </p>
        </div>
      )}

      <div className="flex justify-between gap-3 pt-4">
        <button
          onClick={() => router.push('/campaign/channels')}
          className="px-6 py-2.5 rounded-lg bg-black/40 border border-white/20 hover:bg-black/50 text-white font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isUploading || isGenerating}
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={isUploading || isGenerating}
          className="px-6 py-2.5 rounded-lg bg-white hover:bg-white/95 text-black font-semibold transition shadow-[0_4px_12px_rgba(255,255,255,0.2)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading || isGenerating ? '⟳ Processing...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
