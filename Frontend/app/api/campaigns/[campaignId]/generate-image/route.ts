import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/firebase/admin'
import { cloudinary } from '@/lib/cloudinary'

type Ctx = { params: Promise<{ campaignId: string }> }

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaignId } = await params
    const { prompt, aspectRatio, imageUrl, shouldSave } = await request.json()

    // If imageUrl is provided, it's an approval request (image already generated)
    if (imageUrl) {
      return await saveGeneratedImage(userId, campaignId, imageUrl)
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    const ref = db
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)

    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const stabilityKey = process.env.STABILITY_AI_KEY
    if (!stabilityKey) {
      console.error('Missing STABILITY_AI_KEY')
      return NextResponse.json(
        { error: 'Image generation service not configured' },
        { status: 500 }
      )
    }

    console.log(`🎨 Generating image for campaign: ${campaignId}`)
    console.log(`📝 Prompt: ${prompt}`)
    console.log(`📐 Aspect Ratio: ${aspectRatio}`)

    // Call Stability AI API to generate image
    console.log('🎨 Calling Stability AI API...')
    
    const formData = new FormData()
    formData.append('prompt', prompt)
    formData.append('output_format', 'jpeg')
    formData.append('negative_prompt', 'blurry, low quality, distorted, ugly')
    
    if (aspectRatio) {
      // Map aspect ratios to width x height (larger sizes for better quality)
      const aspectRatios: Record<string, [number, number]> = {
        '1:1': [1024, 1024],
        '16:9': [1440, 810],
        '9:16': [810, 1440],
        '4:3': [1024, 768],
        '3:4': [768, 1024],
      }
      const [width, height] = aspectRatios[aspectRatio] || [1024, 1024]
      formData.append('width', width.toString())
      formData.append('height', height.toString())
    } else {
      // Default to 1024x1024 for better quality
      formData.append('width', '1024')
      formData.append('height', '1024')
    }

    const stabilityResponse = await fetch(
      'https://api.stability.ai/v2beta/stable-image/generate/core',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stabilityKey}`,
          'Accept': 'image/*',
        },
        body: formData,
      }
    )

    if (!stabilityResponse.ok) {
      const errorText = await stabilityResponse.text()
      console.error('Stability AI error:', errorText)
      throw new Error(`Stability AI error: ${stabilityResponse.status}`)
    }

    console.log('✅ Stability AI request completed')

    // Get image as blob
    const imageBlob = await stabilityResponse.blob()
    
    if (imageBlob.size === 0) {
      throw new Error('No image data received from Stability AI')
    }

    console.log(`📊 Image blob size: ${imageBlob.size} bytes`)

    // Convert blob to buffer and base64
    const arrayBuffer = await imageBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64ImageData = buffer.toString('base64')
    const imageUrl_result = `data:image/jpeg;base64,${base64ImageData}`
    
    console.log(`✅ Image generated: ${imageUrl_result.substring(0, 50)}...`)

    // If shouldSave is true, save to Cloudinary
    let uploadResult = null
    if (shouldSave) {
      uploadResult = await saveImageToCloudinary(userId, campaignId, buffer)
    }

    // Return image URL for preview (use Replicate URL directly for preview)
    return NextResponse.json({
      success: true,
      imageUrl: imageUrl_result,
      uploadResult: uploadResult
        ? {
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            type: 'image',
            saved: true,
          }
        : null,
    })
  } catch (error) {
    console.error('❌ Image generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    )
  }
}

async function saveImageToCloudinary(
  userId: string,
  campaignId: string,
  imageBuffer: Buffer
): Promise<any> {
  console.log('💾 Uploading to Cloudinary...')

  try {
    console.log(`💾 Image buffer size: ${imageBuffer.length} bytes`)

    // Upload to Cloudinary
    const uploadResult: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `campaigns/${userId}/assets/generated`,
          resource_type: 'image',
          format: 'jpg',
          public_id: `generated_${Date.now()}`,
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      uploadStream.end(imageBuffer)
    })

    console.log(`✅ Image uploaded to Cloudinary: ${uploadResult.public_id}`)

    // Save to Firestore
    const ref = db
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)

    const snap = await ref.get()
    const campaignData = snap.data() as any
    const currentAssets = campaignData.assets || []

    const newAsset = {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      type: 'image',
      generated: true,
      generatedAt: new Date(),
    }

    await ref.set(
      {
        assets: [...currentAssets, newAsset],
        updatedAt: new Date(),
      },
      { merge: true }
    )

    console.log('💾 Asset saved to Firestore')
    return uploadResult
  } catch (error) {
    console.error('❌ Upload error:', error)
    throw error
  }
}

async function saveGeneratedImage(
  userId: string,
  campaignId: string,
  imageUrl: string
): Promise<NextResponse> {
  try {
    // Handle base64 data URL
    const base64Match = imageUrl.match(/^data:image\/\w+;base64,(.+)$/)
    if (!base64Match) {
      throw new Error('Invalid image data format')
    }

    const base64Data = base64Match[1]
    const imageBuffer = Buffer.from(base64Data, 'base64')
    const uploadResult = await saveImageToCloudinary(userId, campaignId, imageBuffer)
    
    return NextResponse.json({
      success: true,
      uploadResult: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        type: 'image',
        saved: true,
      },
    })
  } catch (error) {
    console.error('❌ Save error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save image' },
      { status: 500 }
    )
  }
}
