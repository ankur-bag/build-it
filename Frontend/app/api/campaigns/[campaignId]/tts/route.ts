import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/firebase/admin'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { v2 as cloudinary } from 'cloudinary'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'

const ffmpeg = require('fluent-ffmpeg')
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ campaignId: string }> }

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaignId } = await params
    const { channel, transcript, toneOfVoice } = await request.json()

    if (!channel || !['voice', 'calls'].includes(channel)) {
      return NextResponse.json(
        { error: 'Channel must be voice or calls' },
        { status: 400 }
      )
    }

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript is required and must be a non-empty string' },
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

    console.log(`🎵 Generating Gemini TTS for ${channel} channel: ${campaignId}`)

    // Build tone-aware prompt based on channel
    let styledTranscript = transcript
    if (channel === 'voice') {
      styledTranscript = `Read the following as a short, friendly voice message in a ${toneOfVoice || 'neutral'} tone:\n\n${transcript}`
    } else if (channel === 'calls') {
      styledTranscript = `Read the following as a clear phone announcement in a ${toneOfVoice || 'neutral'} tone:\n\n${transcript}`
    }

    // Map tone to supported Gemini TTS voice names
    const VOICE_MAP: Record<string, string> = {
      friendly: 'achird',
      professional: 'charon',
      upbeat: 'puck',
      formal: 'kore',
      neutral: 'kore',
      casual: 'leda',
    }

    const requestedTone = (toneOfVoice || 'friendly').toLowerCase()
    const voiceName = VOICE_MAP[requestedTone] || 'kore'

    console.log(`🎤 Using voice: ${voiceName} for tone: ${requestedTone}`)

    // Initialize Gemini client
    const apiKey = process.env.GEMINI_TTS_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_TTS_API_KEY is not configured')
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel(
      { model: 'gemini-2.5-flash-preview-tts' },
      { apiVersion: 'v1beta' }
    )

    console.log(`📝 TTS Input: ${styledTranscript.substring(0, 100)}...`)

    // Generate content with audio output
    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: styledTranscript,
            },
          ],
        } as any,
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName,
            },
          },
        },
      } as any,
    } as any)

    // Extract audio from response
    const audioData = response.response.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData?.mimeType?.startsWith('audio/')
    )

    if (!audioData?.inlineData?.data) {
      throw new Error('No audio data in Gemini response')
    }

    // Decode base64 audio data
    const base64Audio = audioData.inlineData.data
    let audioBuffer = Buffer.from(base64Audio, 'base64')

    console.log(`✅ Audio generated (${audioBuffer.length} bytes)`)

    // ✅ CRITICAL: WhatsApp voice messages REQUIRE OGG/OPUS codec, NOT MP3!
    // Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#audio-object
    // Supported: audio/ogg; codecs=opus (and for calls: audio/mpeg or audio/wav)
    console.log(`🎵 Converting to OGG/OPUS for WhatsApp voice messages...`)

    // Create WAV container first (required for ffmpeg conversion)
    const sampleRate = 24000
    const numChannels = 1
    const bitsPerSample = 16
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
    const blockAlign = numChannels * (bitsPerSample / 8)

    const wavHeader = Buffer.alloc(44)
    wavHeader.write('RIFF', 0)
    wavHeader.writeUInt32LE(audioBuffer.length + 36, 4)
    wavHeader.write('WAVE', 8)
    wavHeader.write('fmt ', 12)
    wavHeader.writeUInt32LE(16, 16)
    wavHeader.writeUInt16LE(1, 20)
    wavHeader.writeUInt16LE(numChannels, 22)
    wavHeader.writeUInt32LE(sampleRate, 24)
    wavHeader.writeUInt32LE(byteRate, 28)
    wavHeader.writeUInt16LE(blockAlign, 32)
    wavHeader.writeUInt16LE(bitsPerSample, 34)
    wavHeader.write('data', 36)
    wavHeader.writeUInt32LE(audioBuffer.length, 40)

    const wavBuffer = Buffer.concat([wavHeader, audioBuffer])
    console.log(`✅ WAV prepared (${wavBuffer.length} bytes) - ready for OPUS encoding`)

    // Use FFmpeg to convert WAV to OGG/OPUS
    const tempDir = os.tmpdir()
    const tempBase = `tts_${campaignId}_${Date.now()}`
    const wavPath = path.join(tempDir, `${tempBase}.wav`)
    const oggPath = path.join(tempDir, `${tempBase}.ogg`)

    const convertToOggOpus = async (inputPath: string, outputPath: string) => {
      console.log(`🔨 Starting ffmpeg WAV → OGG/OPUS conversion...`)
      return new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .audioCodec('libopus')
          .audioFrequency(24000)
          .audioChannels(1)
          .audioBitrate('24k')
          .format('ogg')
          .on('start', () => {
            console.log(`   📋 FFmpeg started`)
          })
          .on('codecData', (data: { audio?: string }) => {
            if (data?.audio) {
              console.log(`   ✅ Input codec detected: ${data.audio}`)
            }
          })
          .on('error', (err: Error) => {
            console.error(`   ❌ FFmpeg error: ${err.message}`)
            reject(err)
          })
          .on('end', () => {
            console.log(`   ✅ FFmpeg conversion completed successfully`)
            resolve()
          })
          .save(outputPath)
      })
    }

    let oggBuffer: Buffer
    try {
      await fs.writeFile(wavPath, wavBuffer)
      await convertToOggOpus(wavPath, oggPath)
      oggBuffer = await fs.readFile(oggPath)
      console.log(`   ✅ Output complete: ${oggBuffer.length} bytes`)
    } catch (ffmpegError) {
      console.error(`   ❌ FFmpeg conversion failed`, ffmpegError)
      const errorMessage = ffmpegError instanceof Error ? ffmpegError.message : 'FFmpeg conversion failed'
      return NextResponse.json(
        {
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 500 }
      )
    } finally {
      await Promise.all([
        fs.unlink(wavPath).catch(() => undefined),
        fs.unlink(oggPath).catch(() => undefined),
      ])
    }

    // Upload OGG/OPUS to Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })

    console.log(`📤 Uploading OGG/OPUS to Cloudinary...`)

    const fileName = channel === 'voice' ? `voice_${campaignId}` : `call_${campaignId}`
    const publicId = `outreachx-campaigns/campaigns/${userId}/${fileName}`
    
    const audioUrl: string = await new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          public_id: publicId,
          format: 'ogg',
        },
        (err, result) => {
          if (err || !result) return reject(err)
          let oggUrl = result.secure_url
          
          // Ensure OGG format is in URL
          if (!oggUrl.includes('f_ogg')) {
            oggUrl = oggUrl.replace('/upload/', '/upload/f_ogg/')
          }
          resolve(oggUrl)
        }
      )
      upload.end(oggBuffer)
    })

    console.log(`✅ Audio uploaded to Cloudinary`)
    console.log(`   URL: ${audioUrl}`)
    console.log(`   Format: OGG/OPUS (WhatsApp voice-compatible ✅)`)
    console.log(`   Codec: OPUS @ 24kHz, mono, 24kbps`)
    console.log(`   Encoded size: ${oggBuffer.length} bytes`)
    console.log(`   Full URL breakdown:`)
    console.log(`     └─ Domain: ${audioUrl.split('/').slice(0, 3).join('/')}`)
    console.log(`     └─ Path: ${audioUrl.split('/').slice(3, 6).join('/')}...`)
    console.log(`     └─ Query: ${audioUrl.includes('?') ? audioUrl.split('?')[1] : 'none'}`)

    // Verify the URL is accessible
    try {
      const urlTest = await fetch(audioUrl, { method: 'HEAD' })
      const contentType = urlTest.headers.get('content-type') || 'unknown'
      console.log(`   ✅ URL accessible (HTTP ${urlTest.status})`)
      console.log(`   ✅ Content-Type: ${contentType}`)
    } catch (testErr) {
      console.warn(`   ⚠️ Could not verify URL:`, (testErr as Error).message)
    }

    // Update Firestore with audio URL and public ID
    const updateData: any = {
      audioUrls: {
        ...(snap.data()?.audioUrls || {}),
        [channel]: audioUrl,
      },
      audioPublicIds: {
        ...(snap.data()?.audioPublicIds || {}),
        [channel]: publicId,
      },
      updatedAt: new Date(),
    }

    console.log(`💾 Saving to Firestore...`)
    await ref.set(updateData, { merge: true })
    console.log(`✅ MP3 URL saved to Firestore`)

    return NextResponse.json({
      success: true,
      audioUrl,
      publicId,
      channel,
      format: 'mp3',
      message: 'Audio converted to MP3 and ready for WhatsApp'
    })
  } catch (error) {
    console.error('❌ Gemini TTS error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate audio'
    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    )
  }
}
