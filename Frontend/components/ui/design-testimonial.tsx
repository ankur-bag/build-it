"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion"

const steps = [
  {
    title: "Create your Campaign",
    description: "Add a campaign title and description to define your outreach goal."
  },
  {
    title: "Choose Communication Channels",
    description: "Select how you want to reach users—text messages, voice messages, or calls."
  },
  {
    title: "Upload Assets",
    description: "Add media, creatives, or supporting files to personalize your campaign."
  },
  {
    title: "Attach Documents",
    description: "Upload PDFs or documents you want to share with your audience."
  },
  {
    title: "Add Contacts",
    description: "Upload or select contacts to include in your campaign."
  },
  {
    title: "Preview and Launch",
    description: "Review the complete campaign experience before going live."
  }
]

export function Testimonial() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const goNext = () => setActiveIndex((prev) => (prev + 1) % steps.length)
  const goPrev = () => setActiveIndex((prev) => (prev - 1 + steps.length) % steps.length)

  useEffect(() => {
    if (!isVisible) return
    const timer = setInterval(goNext, 6000)
    return () => clearInterval(timer)
  }, [isVisible])

  const current = steps[activeIndex]

  return (
    <div className="flex items-start justify-start min-h-screen bg-black overflow-hidden w-[85vw] mt-10">
      <div ref={containerRef} className="relative w-full max-w-full">
        {/* Oversized index number */}
        <motion.div
          className="absolute -left-4 md:-left-12 top-1/2 -translate-y-1/2 text-[15vw] md:text-[28rem]  text-white/5 select-none pointer-events-none leading-none tracking-tighter ml-5 md:ml-10"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={activeIndex}
              initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="block"
            >
              {String(activeIndex + 1).padStart(2, "0")}
            </motion.span>
          </AnimatePresence>
        </motion.div>

        {/* Main content */}
        <div className="relative flex flex-col lg:flex-row gap-8 lg:gap-0">
          {/* Left column - vertical text (hidden on mobile) */}
          <div className="hidden lg:flex flex-col items-center justify-center pr-16 border-r border-white/10 min-h-[550px]">
            <motion.span
              className="text-xs font-mono text-white/60 tracking-widest uppercase"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Campaign Steps
            </motion.span>

            {/* Vertical progress line */}
            <div className="relative h-40 w-px bg-white/10 mt-8">
              <motion.div
                className="absolute top-0 left-0 w-full bg-white origin-top"
                animate={{
                  height: `${((activeIndex + 1) / steps.length) * 100}%`,
                }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>

          {/* Center - main content */}
          <div className="flex-1 lg:pl-16 py-12 lg:py-16">
            {/* Step counter badge */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4 }}
                className="mb-6 lg:mb-8"
              >
                <span className="inline-flex items-center gap-2 text-xs lg:text-sm font-sans font-bold text-white/70 border border-white/20 rounded-full px-3 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  Step {activeIndex + 1} of {steps.length}
                </span>
              </motion.div>
            </AnimatePresence>

            {/* Title */}
            <div className="relative mb-8 lg:mb-12 min-h-[80px] lg:min-h-[140px]">
              <AnimatePresence mode="wait">
                <motion.h2
                  key={activeIndex}
                  className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-instrument text-white leading-tight tracking-tight"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {current.title.split(" ").map((word, i) => (
                    <motion.span
                      key={i}
                      className="inline-block mr-[0.3em]"
                      variants={{
                        hidden: { opacity: 0, y: 20, rotateX: 90 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          rotateX: 0,
                          transition: {
                            duration: 0.5,
                            delay: i * 0.05,
                            ease: [0.22, 1, 0.36, 1],
                          },
                        },
                        exit: {
                          opacity: 0,
                          y: -10,
                          transition: { duration: 0.2, delay: i * 0.02 },
                        },
                      }}
                    >
                      {word}
                    </motion.span>
                  ))}
                </motion.h2>
              </AnimatePresence>
            </div>

            {/* Description */}
            <div className="relative mb-10 lg:mb-16 min-h-[60px] lg:min-h-[90px]">
              <AnimatePresence mode="wait">
                <motion.p
                  key={activeIndex}
                  className="text-lg md:text-xl lg:text-2xl text-white/70 leading-relaxed font-sans"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  {current.description}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between md:justify-start gap-6">
              <motion.button
                onClick={goPrev}
                className="group relative w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/30 flex items-center justify-center overflow-hidden hover:border-white transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="absolute inset-0 bg-white/10"
                  initial={{ x: "-100%" }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                />
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="relative z-10 text-white"
                >
                  <path
                    d="M10 12L6 8L10 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.button>

              <motion.button
                onClick={goNext}
                className="group relative w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/30 flex items-center justify-center overflow-hidden hover:border-white transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="absolute inset-0 bg-white/10"
                  initial={{ x: "100%" }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                />
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="relative z-10 text-white"
                >
                  <path
                    d="M6 4L10 8L6 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.button>

              {/* Progress dots */}
              <div className="flex items-center gap-2 ml-auto md:ml-4">
                {steps.map((_, i) => (
                  <motion.button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === activeIndex ? "w-8 bg-white" : "w-1.5 bg-white/30 hover:bg-white/50"
                    }`}
                    whileTap={{ scale: 0.95 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom ticker - OutreachX only */}
        <div className="absolute -bottom-6 md:-bottom-10 left-0 overflow-hidden opacity-[0.15] pointer-events-none hidden md:block">
          <motion.div
            className="flex whitespace-nowrap text-4xl md:text-5xl lg:text-6xl  tracking-tighter"
            animate={{ x: [0, -2000] }}
            transition={{ duration: 30, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          >
            {[...Array(6)].map((_, i) => (
              <span key={i} className="mx-8 md:mx-10">
                RevAgent
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
