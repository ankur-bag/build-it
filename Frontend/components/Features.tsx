import React, { useRef, useEffect, useState } from 'react'

const LazyVideo = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.1 }
    )

    if (videoRef.current) {
      observer.observe(videoRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <video
      ref={videoRef}
      autoPlay={isVisible}
      muted
      loop
      playsInline
      preload={isVisible ? 'auto' : 'metadata'}
      className="w-full h-auto block"
    >
      {isVisible && <source src={src} type="video/mp4" />}
    </video>
  )
}

const FeatureSection = ({
  label,
  title,
  description,
  videoSrc,
}: {
  label: string
  title: string
  description: string
  videoSrc: string
}) => {
  return (
    <div className="w-full bg-black py-12 px-4 md:px-8 lg:px-16  mb-25 mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-center">
          {/* Left side - Text content */}
          <div className="flex flex-col justify-center max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded border border-white/30 flex items-center justify-center shrink-0">
                <span className="text-white text-sm">✦</span>
              </div>
              <span className="text-white/70 text-xs font-medium uppercase tracking-wider">
                {label}
              </span>
            </div>

            <h2 className="text-3xl md:text-5xl  text-white mb-4 leading-tight font-instrument">
              {title}
            </h2>

            <p className="text-white/60 text-sm md:text-base leading-relaxed font-sans">{description}</p>
          </div>

          {/* Right side - Video */}
          <div className="flex items-center justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black/50">
              <LazyVideo src={videoSrc} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const Features = () => {
  return (
    <div className="w-full bg-black">
      <FeatureSection
        label="Steps"
        title="Launch Campaigns in Minutes"
        description="Create and deploy digital campaigns through a streamlined workflow. Configure campaign parameters, select communication channels, upload contact lists and assets, and validate everything through a live preview before launch."
        videoSrc="https://res.cloudinary.com/dlms9ihiw/video/upload/v1769063841/steps_b27bst.mp4"
      />

      <FeatureSection
        label="AI‑Driven Conversations"
        title="Let users ask, AI responds instantly."
        description="Enable real‑time customer engagement through AI‑powered messaging. RevAgent uses intelligent conversation agents to respond instantly on WhatsApp, answer queries, and guide users toward meaningful actions."
        videoSrc="https://res.cloudinary.com/dlms9ihiw/video/upload/v1769075693/whatsapp_chat_ppwgfi.mp4"
      />

      <FeatureSection
        label="Analytics"
        title="Real‑Time Campaign Analytics"
        description="Monitor campaign performance with live analytics. Track message delivery, response rates, call activity, and engagement metrics through a unified dashboard designed to continuously optimize campaign outcomes."
        videoSrc="https://res.cloudinary.com/dlms9ihiw/video/upload/v1769075693/analytics_page_gxdsh7.mp4"
      />
    </div>
  )
}

export default React.memo(Features)
