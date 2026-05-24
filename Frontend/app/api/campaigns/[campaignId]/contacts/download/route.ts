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

    console.log('📥 Downloading contacts for campaign:', campaignId)

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
    const contactsFile = data.contactsFile

    if (!contactsFile?.url) {
      return NextResponse.json(
        { error: 'No contacts file available for download' },
        { status: 400 }
      )
    }

    // Download file from Cloudinary
    console.log('📥 Downloading file from Cloudinary:', contactsFile.url)
    const res = await fetch(contactsFile.url)

    if (!res.ok) {
      console.error('Failed to download from Cloudinary:', res.statusText)
      return NextResponse.json(
        { error: 'Failed to download contacts file' },
        { status: 400 }
      )
    }

    const buffer = await res.arrayBuffer()
    let fileName = contactsFile.name || ''
    
    // Fallback: If no name, or name is generic, try to get from URL
    if (!fileName || fileName === 'contacts') {
      const urlPart = contactsFile.url.split('/').pop()?.split('?')[0] || ''
      if (urlPart.includes('.')) {
        fileName = urlPart
      } else {
        // Absolute fallback if everything fails
        fileName = 'contacts.xlsx'
      }
    }

    // Ensure filename has an extension if it's missing (e.g. from Cloudinary raw upload)
    if (!fileName.includes('.') && contactsFile.url.includes('.')) {
      const urlExt = contactsFile.url.split('.').pop()?.split('?')[0]
      // Only append if the extension looks like a standard one
      if (urlExt && ['csv', 'xlsx', 'xls'].includes(urlExt.toLowerCase())) {
        fileName = `${fileName}.${urlExt}`
      } else {
        // Default to xlsx if we can't be sure
        fileName = `${fileName}.xlsx`
      }
    }

    // Determine content type based on file extension
    let contentType = 'application/octet-stream'
    const lowerName = fileName.toLowerCase()
    if (lowerName.endsWith('.csv')) {
      contentType = 'text/csv'
    } else if (lowerName.endsWith('.xlsx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    } else if (lowerName.endsWith('.xls')) {
      contentType = 'application/vnd.ms-excel'
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
    console.error('❌ Download contacts error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download contacts' },
      { status: 500 }
    )
  }
}
