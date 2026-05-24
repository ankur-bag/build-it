import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/firebase/admin'
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary'
import { extractPdfText } from '@/lib/pdf-extraction'
import { upsertDocumentChunks } from '@/lib/vector-store'
import { deleteCampaignDocumentVectors, upsertCampaignDocumentVectors } from '@/lib/pinecone-vector-store'

type Ctx = { params: Promise<{ campaignId: string }> }

/**
 * POST /api/campaigns/[campaignId]/docs
 * Uploads a new document to Cloudinary and extracts its text.
 */
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaignId } = await params
    const formData = await request.formData()
    const uploadedFile = formData.get('docFile') as File | null

    if (!uploadedFile) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    const isPdf = uploadedFile.type.includes('pdf') || uploadedFile.name.toLowerCase().endsWith('.pdf')
    const isDoc = uploadedFile.type.includes('word') || uploadedFile.name.toLowerCase().endsWith('.docx') || uploadedFile.name.toLowerCase().endsWith('.doc')

    if (!isPdf && !isDoc) {
      return NextResponse.json({ error: 'Only PDF and DOC/DOCX files are supported' }, { status: 400 })
    }

    console.log(`📥 Uploading ${isPdf ? 'PDF' : 'DOC'} for campaign:`, campaignId)

    // Upload to Cloudinary (resource_type: "raw" for PDFs/Docs)
    const cloudinaryResult = await uploadToCloudinary(
      uploadedFile, 
      `campaign-documents/${campaignId}`, 
      'raw'
    )

    // Extract text from PDF/DOC
    let extractedText = ''
    try {
      const arrayBuffer = await uploadedFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      // Note: extractPdfText might need to handle DOC later, but for now we focus on the flow
      extractedText = await extractPdfText(buffer)
    } catch (extractError) {
      console.warn('⚠️ Text extraction warning:', extractError)
      extractedText = '[Text extraction failed]'
    }

    // Prepare document data with standardized naming
    const documentData = {
      cloudinary_url: cloudinaryResult.secure_url,
      cloudinary_public_id: cloudinaryResult.public_id,
      name: uploadedFile.name,
      file_type: uploadedFile.type || (isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      extractedText,
      uploadedAt: new Date().toISOString(),
    }

    // Update Firestore
    const { FieldValue } = require('firebase-admin/firestore')
    const ref = db.collection('users').doc(userId).collection('campaigns').doc(campaignId)
    const rootRef = db.collection('campaigns').doc(campaignId)

    const updatePayload = {
      documents: FieldValue.arrayUnion(documentData),
      updatedAt: new Date().toISOString(),
    }

    await ref.update(updatePayload)
    if ((await rootRef.get()).exists) {
      await rootRef.update(updatePayload)
    }

    // Update Vector Store for RAG
    if (extractedText && extractedText !== '[Text extraction failed]') {
      await upsertDocumentChunks(campaignId, userId, uploadedFile.name, extractedText)
      try {
        await upsertCampaignDocumentVectors({
          userId,
          campaignId,
          documentKey: cloudinaryResult.public_id,
          fileName: uploadedFile.name,
          text: extractedText,
        })
      } catch (pineconeError) {
        console.error('Pinecone upsert error:', pineconeError)
      }
    }

    return NextResponse.json({ success: true, document: documentData })
  } catch (error) {
    console.error('❌ Error in POST /docs:', error)
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  }
}

/**
 * PUT /api/campaigns/[campaignId]/docs
 * Swaps an existing document with a new one using the same public_id.
 */
export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { campaignId } = await params
    const formData = await request.formData()
    const uploadedFile = formData.get('docFile') as File | null
    const existingPublicId = formData.get('public_id') as string | null

    if (!uploadedFile || !existingPublicId) {
      return NextResponse.json({ error: 'Missing file or public_id' }, { status: 400 })
    }

    console.log(`🔄 Swapping document ${existingPublicId} for campaign:`, campaignId)

    // Upload to Cloudinary with same public_id to overwrite
    // We use the full public_id (which includes folder) and overwrite: true
    const cloudinaryResult = await uploadToCloudinary(
      uploadedFile,
      '', // Folder is already part of public_id if we provide it fully
      'raw',
      {
        public_id: existingPublicId,
        overwrite: true,
        invalidate: true,
        unique_filename: false
      }
    )

    // Extract text from new file
    let extractedText = ''
    try {
      const arrayBuffer = await uploadedFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      extractedText = await extractPdfText(buffer)
    } catch (e) {
      extractedText = '[Text extraction failed]'
    }

    // Update database entry
    const ref = db.collection('users').doc(userId).collection('campaigns').doc(campaignId)
    const snap = await ref.get()
    const data = snap.data()
    const documents = data?.documents || []

    const updatedDocuments = documents.map((doc: any) => {
      if (doc.cloudinary_public_id === existingPublicId || doc.publicId === existingPublicId) {
        return {
          ...doc,
          name: uploadedFile.name,
          cloudinary_url: cloudinaryResult.secure_url,
          cloudinary_public_id: cloudinaryResult.public_id,
          extractedText,
          updatedAt: new Date().toISOString()
        }
      }
      return doc
    })

    const updatePayload = {
      documents: updatedDocuments,
      updatedAt: new Date().toISOString()
    }

    await ref.update(updatePayload)
    const rootRef = db.collection('campaigns').doc(campaignId)
    if ((await rootRef.get()).exists) {
      await rootRef.update(updatePayload)
    }

    // Update Vector Store
    if (extractedText && extractedText !== '[Text extraction failed]') {
      await upsertDocumentChunks(campaignId, userId, uploadedFile.name, extractedText)
      try {
        await upsertCampaignDocumentVectors({
          userId,
          campaignId,
          documentKey: existingPublicId,
          fileName: uploadedFile.name,
          text: extractedText,
        })
      } catch (pineconeError) {
        console.error('Pinecone upsert error:', pineconeError)
      }
    }

    return NextResponse.json({ success: true, message: 'Document swapped successfully' })
  } catch (error) {
    console.error('❌ Error in PUT /docs:', error)
    return NextResponse.json({ error: 'Failed to swap document' }, { status: 500 })
  }
}

/**
 * GET /api/campaigns/[campaignId]/docs
 * Fetches all documents for a campaign.
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { campaignId } = await params
    const ref = db.collection('users').doc(userId).collection('campaigns').doc(campaignId)
    const snap = await ref.get()

    if (!snap.exists) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    return NextResponse.json({ documents: snap.data()?.documents || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

/**
 * DELETE /api/campaigns/[campaignId]/docs
 * Removes a document from Cloudinary and Firestore.
 */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { campaignId } = await params
    const { public_id } = await request.json()

    if (!public_id) return NextResponse.json({ error: 'Missing public_id' }, { status: 400 })

    // Delete from Cloudinary
    await deleteFromCloudinary(public_id, 'raw')

    // Remove from Firestore
    const ref = db.collection('users').doc(userId).collection('campaigns').doc(campaignId)
    const snap = await ref.get()
    const currentDocs = snap.data()?.documents || []
    
    const filteredDocs = currentDocs.filter((doc: any) => 
      (doc.cloudinary_public_id !== public_id) && (doc.publicId !== public_id)
    )

    const updatePayload = {
      documents: filteredDocs,
      updatedAt: new Date().toISOString()
    }

    await ref.update(updatePayload)
    const rootRef = db.collection('campaigns').doc(campaignId)
    if ((await rootRef.get()).exists) {
      await rootRef.update(updatePayload)
    }

    try {
      await deleteCampaignDocumentVectors({
        userId,
        campaignId,
        documentKey: public_id,
      })
    } catch (pineconeError) {
      console.error('Pinecone delete error:', pineconeError)
    }

    return NextResponse.json({ success: true, message: 'Document deleted successfully' })
  } catch (error) {
    console.error('❌ Error in DELETE /docs:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
