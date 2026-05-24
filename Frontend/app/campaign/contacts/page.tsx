/**
 * Campaign Contacts Upload Page
 * 
 * Files are uploaded immediately to the draft campaign via /api/campaigns/[campaignId]/contacts.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCampaign } from '../CampaignContext'
import { RiContactsBook3Line } from "react-icons/ri";

interface Contact {
  name: string
  phone: string
}

export default function ContactsPage() {
  const router = useRouter()
  const { campaign, updateCampaign } = useCampaign()
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')
  const [contactsFile, setContactsFile] = useState<File | null>(campaign.contactsFile || null)
  const [isUploading, setIsUploading] = useState(false)
  const [extractedContacts, setExtractedContacts] = useState<Contact[]>([])
  const [contactCount, setContactCount] = useState(0)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }

  const uploadContacts = async (fileToUpload: File) => {
    if (!campaign.campaignId) {
      setError('Campaign ID not found. Please go back and try again.')
      return false
    }

    try {
      setError('')
      setIsUploading(true)

      const formData = new FormData()
      formData.append('contactsFile', fileToUpload)

      console.log('📞 Uploading contacts file to draft campaign...')
      const res = await fetch(`/api/campaigns/${campaign.campaignId}/contacts`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to upload contacts')
      }

      const data = await res.json()
      console.log('✅ Contacts extracted and uploaded successfully', data)
      
      // Update the local state with the uploaded filename
      if (data.fileName) {
        setContactsFile(new File([fileToUpload], data.fileName, { type: fileToUpload.type }))
      }

      // Store extracted contacts to display them
      if (data.contacts && Array.isArray(data.contacts)) {
        setExtractedContacts(data.contacts)
        setContactCount(data.count || data.contacts.length)
      }

      // Save the extracted contacts to the draft
      console.log('💾 Saving contacts to draft...')
      const draftRes = await fetch('/api/campaigns/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.campaignId,
          contactsSummary: {
            count: data.count || data.contacts?.length || 0,
            items: data.contacts || [],
          },
          contactCount: data.count || data.contacts?.length || 0,
        }),
      })

      if (!draftRes.ok) {
        console.warn('⚠️ Failed to save contacts to draft, but extraction succeeded')
      } else {
        console.log('✅ Contacts saved to draft')
      }
      
      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload contacts'
      setError(errorMsg)
      console.error('Error uploading contacts:', err)
      return false
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type === 'text/csv' || file.name.endsWith('.csv') || file.name.endsWith('.xlsx')
    )

    if (files.length === 0) {
      setError('Please drop a CSV or Excel file')
      return
    }

    const file = files[0]
    setContactsFile(file)
    updateCampaign({ contactsFile: file })

    // Upload immediately
    const uploaded = await uploadContacts(file)
    if (!uploaded) {
      setContactsFile(null)
      updateCampaign({ contactsFile: null })
    }
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setContactsFile(file)
    updateCampaign({ contactsFile: file })

    // Upload immediately
    const uploaded = await uploadContacts(file)
    if (!uploaded) {
      setContactsFile(null)
      updateCampaign({ contactsFile: null })
    }
  }

  const handleContinue = () => {
    if (!contactsFile) {
      setError('Please upload a contacts file')
      return
    }

    router.push('/campaign/preview')
  }

  const removeContactsFile = () => {
    setContactsFile(null)
    setExtractedContacts([])
    setContactCount(0)
    updateCampaign({ contactsFile: null })
  }

  return (
    <div className="space-y-6 campaign-page-enter">
      <div>
        <h1 className="text-3xl  text-white mb-2">Upload Contacts</h1>
        <p className="text-slate-400">Import a CSV file with Name and Phone columns</p>
      </div>

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
          <div className="text-5xl flex justify-center"><RiContactsBook3Line />
</div>
          <div>
            <p className="text-white">Drag Excel file or CSV file here or</p>
            <label className="text-white/80 cursor-pointer hover:text-white">
              click to browse
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-xs text-white/50">CSV or Excel format: Name, Phone</p>
        </div>
      </div>

      {/* Show filename when selected */}
      {contactsFile && (
        <div className="px-4 py-2.5 rounded-lg bg-blue-900/40 border border-blue-500/40 text-blue-200 text-sm">
          ✓ Selected: <span className="font-medium">{contactsFile.name}</span>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Show extracted contacts list */}
      {extractedContacts.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">
              Extracted Contacts ({contactCount})
            </h2>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {extractedContacts.slice(0, 50).map((contact, idx) => (
                <div
                  key={idx}
                  className="px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 text-sm"
                >
                  <p className="text-white font-medium">{contact.name}</p>
                  <p className="text-slate-300 text-xs mt-0.5">{contact.phone}</p>
                </div>
              ))}
              {extractedContacts.length > 50 && (
                <p className="text-slate-400 text-xs pt-2">
                  ...and {extractedContacts.length - 50} more contacts
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {contactsFile && (
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={removeContactsFile}
            disabled={isUploading}
            className="text-sm text-red-400 hover:text-red-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✕ Remove file
          </button>
        </div>
      )}

      <div className="flex justify-between gap-3 pt-4">
        <button
          onClick={() => router.push('/campaign/docs')}
          className="px-6 py-2.5 rounded-lg bg-black/40 border border-white/20 hover:bg-black/50 text-white font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isUploading}
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={isUploading}
          className="px-6 py-2.5 rounded-lg bg-white hover:bg-white/95 text-black font-semibold transition shadow-[0_4px_12px_rgba(255,255,255,0.2)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? '⟳ Uploading...' : 'Continue to preview'}
        </button>
      </div>
    </div>
  )
}
