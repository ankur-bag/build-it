import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/firebase/admin'

type Ctx = { params: Promise<{ campaignId: string }> }

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaignId } = await params
    const { searchParams } = new URL(request.url)
    const docName = searchParams.get('name')

    if (!docName) {
      return NextResponse.json({ error: 'Document name is required' }, { status: 400 })
    }

    console.log(`📥 Downloading document "${docName}" for campaign:`, campaignId)

    let snap = await db
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)
      .get()

    if (!snap.exists) {
      console.log('📥 Campaign not found in user path, trying root-level path...')
      snap = await db
        .collection('campaigns')
        .doc(campaignId)
        .get()
    }

    if (!snap.exists) {
      return NextResponse.json({ error: 'Campaign not found in any location' }, { status: 404 })
    }

    const data = snap.data() || {}
    const documents: any[] = data.documents || []
    
    // Find the document by name
    const doc = documents.find(d => d.name === docName)

    if (!doc || !doc.url) {
      return NextResponse.json(
        { error: 'Document not found in campaign' },
        { status: 404 }
      )
    }

    // Download file from Cloudinary
    console.log('📥 Downloading file from Cloudinary:', doc.url)
    const res = await fetch(doc.url)

    if (!res.ok) {
      console.error('Failed to download from Cloudinary:', res.statusText)
      return NextResponse.json(
        { error: 'Failed to download document file' },
        { status: 400 }
      )
    }

    const buffer = await res.arrayBuffer()
    let fileName = doc.name || 'document'
    
    // Ensure extension
    if (!fileName.includes('.') && doc.url.includes('.')) {
      const urlExt = doc.url.split('.').pop()?.split('?')[0]
      if (urlExt) fileName = `${fileName}.${urlExt}`
    }

    // Determine content type
    let contentType = 'application/octet-stream'
    const lowerName = fileName.toLowerCase()
    if (lowerName.endsWith('.pdf')) {
      contentType = 'application/pdf'
    } else if (lowerName.endsWith('.docx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    } else if (lowerName.endsWith('.doc')) {
      contentType = 'application/msword'
    } else if (lowerName.endsWith('.png')) {
      contentType = 'image/png'
    } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
      contentType = 'image/jpeg'
    }

    console.log(`✅ Sending ${fileName} with type ${contentType}`)

    // Use RFC 5987 for non-ASCII filenames
    const encodedFileName = encodeURIComponent(fileName).replace(/['()'*]/g, c => '%' + c.charCodeAt(0).toString(16))

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    })
  } catch (error) {
    console.error('❌ Download document error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download document' },
      { status: 500 }
    )
  }
}
