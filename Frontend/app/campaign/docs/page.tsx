'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCampaign } from '../CampaignContext'
import { TbFileUploadFilled } from "react-icons/tb";

interface Document {
  url: string
  publicId: string
  name: string
  extractedText: string
  uploadedAt: string
}

export default function DocsPage() {
  const router = useRouter()
  const { campaign, updateCampaign } = useCampaign()
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>(campaign.documents || [])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }

  const uploadDocument = async (fileToUpload: File) => {
    if (!campaign.campaignId) {
      setError('Campaign ID not found. Please go back and try again.')
      return false
    }

    try {
      setError('')
      setSuccess('')
      setIsUploading(true)

      const formData = new FormData()
      formData.append('docFile', fileToUpload)

      console.log('📄 Uploading document to campaign...')
      const res = await fetch(`/api/campaigns/${campaign.campaignId}/docs`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        console.log('✅ Document uploaded successfully:', data)
        const newDoc = data.document
        setDocuments((prev) => [...prev, newDoc])
        updateCampaign({ documents: [...(campaign.documents || []), newDoc] })
        setSuccess('Analysed')
        return true
      } else {
        setError(data.error || 'Failed to upload document')
        return false
      }
    } catch (err) {
      console.error('❌ Error uploading document:', err)
      setError(`Failed to upload document: ${err instanceof Error ? err.message : String(err)}`)
      return false
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        await uploadDocument(file)
      } else {
        setError('Please upload a PDF file')
      }
    }
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        await uploadDocument(file)
      } else {
        setError('Please upload a PDF file')
      }
    }
  }

  return (
    <div className="space-y-6 campaign-page-enter">
      <div>
        <h2 className="text-3xl flex text-white mb-2"> Campaign Documents</h2>
        <p className="text-white/70">
          Upload PDF documents that will help the AI understand context and answer questions better in the inbox
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
          {success}
        </div>
      )}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition cursor-pointer ${
          dragActive
            ? 'border-white/50 bg-white/5'
            : 'border-white/20 hover:border-white/30 bg-white/5 hover:bg-white/10'
        }`}
      >
        <input
          type="file"
          id="pdf-upload"
          accept=".pdf"
          onChange={handleChange}
          disabled={isUploading}
          className="hidden"
        />
        <label htmlFor="pdf-upload" className="cursor-pointer block">
          <div className="text-4xl mb-3 flex justify-center"><TbFileUploadFilled />
</div>
          <p className="text-white  mb-1 flex justify-center">Drag and drop your PDF here</p>
          <p className="text-white/60 text-sm flex justify-center">or click to browse</p>
          {isUploading && <p className="text-blue-400 text-sm mt-3">Uploading...</p>}
        </label>
      </div>

      {documents.length > 0 && (
        <div>
          <p className="text-xs text-white/50 mb-3">Uploaded Documents ({documents.length})</p>
          <div className="space-y-3">
            {documents.map((doc, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl"><TbFileUploadFilled />
</span>
                  <div>
                    <p className="text-white font-medium">{doc.name}</p>
                    <p className="text-xs text-white/60">{doc.extractedText.length} characters extracted</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={doc.url}
                    download
                    className="px-4 py-2 rounded-lg bg-blue-500/30 hover:bg-blue-500/50 text-blue-300 text-sm font-medium transition"
                  >
                    ⬇️ Download
                  </a>
                  <button
                    onClick={() => {
                      setDocuments((prev) => prev.filter((_, i) => i !== idx))
                    }}
                    className="px-4 py-2 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-red-300 text-sm font-medium transition"
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-blue-300 text-sm">
          <strong>💡 Tip:</strong> Upload PDFs less than 10 MB. The extracted text will be used by the AI to provide better answers.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 pt-6 border-t border-white/10">
        <button
          onClick={() => router.push('/campaign/assets')}
          className="px-6 py-2.5 rounded-lg bg-black/40 border border-white/20 hover:bg-black/50 text-white font-medium transition cursor-pointer"
        >
          ← Back
        </button>
        <button
          onClick={() => router.push('/campaign/contacts')}
          className="px-6 py-2.5 rounded-lg bg-white hover:bg-white/95 text-black font-semibold transition cursor-pointer"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
