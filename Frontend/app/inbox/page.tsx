'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

interface Campaign {
  id: string
  name: string
  title: string
  contacts: Contact[]
  audioUrls?: { voice?: string }
  assets?: any[]
}

interface Contact {
  id: string
  name: string
  phone: string
  lastMessage: string
  timestamp: string
  unread: boolean
  profilePic?: string
}

export default function InboxPage() {
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSignedIn) {
      router.push('/')
      return
    }

    const fetchCampaigns = async () => {
      try {
        console.log('📱 Fetching campaigns via YOUR API...')
        setLoading(true)
        
        const res = await fetch('/api/inbox') // ✅ YOUR ORIGINAL API
        const data = await res.json()
        
        if (!res.ok) {
          console.error('❌ Error:', data.error)
          setLoading(false)
          return
        }

        console.log('✅ Campaigns loaded:', data.campaigns.length)
        
        const campaignsData: Campaign[] = data.campaigns.map((campaign: any) => ({
          id: campaign.id,
          name: campaign.title,
          title: campaign.title,
          contacts: campaign.contacts || [],
          audioUrls: campaign.audioUrls,
          assets: campaign.assets,
        }))

        setCampaigns(campaignsData)
        setLoading(false)
      } catch (error) {
        console.error('❌ Error fetching campaigns:', error)
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [isSignedIn, router])

  if (loading) {
    return (
      <div className='h-screen flex items-center justify-center bg-white'>
        <div className='text-center space-y-3'>
          <div className='flex justify-center'>
            <img 
              src="/favicon 2.svg" 
              alt="Loading" 
              className="w-12 h-12 animate-spin"
            />
          </div>
          <p className='text-gray-600'>Loading campaigns...</p>
        </div>
      </div>
    )
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className='h-screen bg-white text-gray-900 flex flex-col'>
        <div className='border-b border-gray-300 p-4'>
          <a href="/campaign/title" className='text-xl font-medium text-black px-2 py-1.5 border-2 border-black rounded-xl hover:bg-black/10 transition cursor-pointer'>
            Back
          </a>
        </div>
        <div className='flex-1 flex items-center justify-center'>
          <div className='text-center'>
            <p className='text-lg font-semibold text-gray-600 mb-2'>No campaigns found</p>
            <p className='text-sm text-gray-500'>Create a campaign to get started</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='h-screen bg-white text-gray-900 flex flex-col overflow-hidden'>
      <div className='border-b border-gray-300 p-4 shrink-0'>
        <button
          onClick={() => router.push('/campaign/title')}
          className='text-xl font-medium text-black px-2 py-1.5 border-2 border-black rounded-xl hover:bg-black/10 transition cursor-pointer'
        >
          Back
        </button>
      </div>

      <div className='flex-1 overflow-y-auto p-8'>
        <h2 className='text-3xl font-bold text-gray-900 mb-8'>WhatsApp Business</h2>
        <div className='space-y-4 max-w-full'>
          {campaigns.map((campaign) => (
            <button
              key={campaign.id}
              onClick={() => router.push(`/inbox/${campaign.id}`)}
              className={`w-full text-left p-6 border-b border-gray-200 hover:bg-gray-50 transition-all rounded-xl cursor-pointer   ${
                'bg-green-50 border-l-4 border-l-green-500'
              }`}
            >
              <p className='font-bold text-xl text-gray-900 mb-2 truncate'>{campaign.name}</p>
              <p className='text-sm text-gray-600'>
                {campaign.contacts.length} contact{campaign.contacts.length !== 1 ? 's' : ''}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
