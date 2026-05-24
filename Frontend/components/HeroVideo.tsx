'use client'

import React, { useRef, useEffect } from 'react'

const HeroVideo = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && videoRef.current) {
          videoRef.current.play()
          // Stop observing after first play
          observer.unobserve(containerRef.current!)
        }
      },
      { threshold: 0.1 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className='w-full flex justify-center mt-12 md:mt-15 z-20 relative'
    >
      <div className='relative w-full h-auto'>
        {/* Mobile video container */}
        <div className='md:hidden w-full flex justify-center px-4 '>
          <video
            ref={videoRef}
            className='w-full max-w-81.75 h-auto rounded-lg'
            controls
            poster='https://i.postimg.cc/KvpNv6Js/Mobile.png'
            preload='metadata'
            playsInline muted loop
          >
            <source
              src='https://res.cloudinary.com/outreachx/video/upload/v1779196128/OutreachX-Trailer_r1eokp.mp4'
              type='video/mp4'
            />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Desktop video container */}
        <div className='hidden md:flex justify-center px-4'>
          <video
            ref={videoRef}
            className='w-full max-w-249.5 h-auto rounded-xl'
            controls
            poster='https://i.postimg.cc/bwGRGmBg/Desktop.png'
            preload='metadata'
            playsInline muted loop
          >
            <source
              src='https://res.cloudinary.com/outreachx/video/upload/v1779196128/OutreachX-Trailer_r1eokp.mp4'
              type='video/mp4'
            />
            Your browser does not support the video tag.
          </video>

        </div>

        <div className='w-full flex justify-center mt-10 mb-50'>
          <p className='text-white/50 text-md md:text-2xl py-2 px-2 font-instrument italic  '>Campaign made simple</p>
        </div>
      </div>

    </div>
  )
}

export default HeroVideo
