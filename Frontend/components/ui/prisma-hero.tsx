import { motion, useInView } from "framer-motion";
import { ArrowRight, Sparkles, Globe, BarChart3, Bot, Zap, CheckCircle2, Layers } from "lucide-react";
import { useRef } from "react";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";

/* ---------------- WordsPullUp ---------------- */
interface WordsPullUpProps {
  text: string;
  className?: string;
  showAsterisk?: boolean;
  style?: React.CSSProperties;
}

export const WordsPullUp = ({ text, className = "", showAsterisk = false, style }: WordsPullUpProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(" ");

  return (
    <div ref={ref} className={`inline-flex flex-wrap ${className}`} style={style}>
      {words.map((word, i) => {
        const isLast = i === words.length - 1;
        return (
          <motion.span
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block relative"
            style={{ marginRight: isLast ? 0 : "0.25em" }}
          >
            {word}
            {showAsterisk && isLast && (
              <span className="absolute top-[0.35em] -right-[0.5em] text-[0.45em] ml-2 font-instrument">*</span>
            )}
          </motion.span>
        );
      })}
    </div>
  );
};

/* ---------------- WordsPullUpMultiStyle ---------------- */
interface Segment {
  text: string;
  className?: string;
}

interface WordsPullUpMultiStyleProps {
  segments: Segment[];
  className?: string;
  style?: React.CSSProperties;
}

export const WordsPullUpMultiStyle = ({ segments, className = "", style }: WordsPullUpMultiStyleProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  const words: { word: string; className?: string }[] = [];
  segments.forEach((seg) => {
    seg.text.split(" ").forEach((w) => {
      if (w) words.push({ word: w, className: seg.className });
    });
  });

  return (
    <div ref={ref} className={`inline-flex flex-wrap justify-center ${className}`} style={style}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className={`inline-block ${w.className ?? ""}`}
          style={{ marginRight: "0.25em" }}
        >
          {w.word}
        </motion.span>
      ))}
    </div>
  );
};

/* ---------------- Hero ---------------- */
interface PrismaHeroProps {
  isSignedIn?: boolean;
  onCampaignClick?: () => void;
}

const PrismaHero = ({ isSignedIn, onCampaignClick }: PrismaHeroProps) => {
  return (
    <section className="h-screen w-full">
      <div className="relative h-full w-full overflow-hidden rounded-2xl md:rounded-[2rem]">
        
        {/* Background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
        />

        {/* Noise overlay */}
        <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.7] mix-blend-overlay" />

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        {/* Navbar */}
        <nav className="absolute left-0 right-0 top-0 z-20 px-4 md:px-10">
          <div className="flex items-center justify-between py-4 md:py-6">
            <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition">
              <Image 
                src="/favicon.svg" 
                alt="RevAgent Logo" 
                width={20}
                height={20}
                className="w-6 h-6 sm:w-8 sm:h-8 md:w-8 md:h-8"
              />
              <span className="text-xl sm:text-2xl font-sans text-[#E1E0CC] hover:text-[#E1E0CC]/80 transition">
                RevAgent
              </span>
            </Link>
            <div className="flex items-center gap-3 sm:gap-5">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="border border-[#E1E0CC] text-[#E1E0CC] px-4 py-2 rounded-full font-sans font-medium cursor-pointer hover:bg-[#E1E0CC] hover:text-black transition-all text-sm sm:text-base">
                    Login
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="bg-[#E1E0CC] text-black px-4 py-2 rounded-full font-sans font-bold cursor-pointer hover:bg-[#E1E0CC]/90 transition-all text-sm sm:text-base">
                    Sign Up
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </div>
        </nav>

        {/* Top-left description */}
        <div className="absolute left-4 top-24 z-20 max-w-sm px-4 md:left-10 md:top-32 md:px-0 lg:max-w-md">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="font-sans text-sm leading-relaxed text-[#E1E0CC]/80 md:text-base lg:text-lg"
          >
            RevAgent is an Agentic AI-driven campaign automation platform that autonomously launches, manages, and analyzes digital outreach campaigns — all with a single click.
          </motion.p>
        </div>

        {/* Right-middle CTA */}
        <div className="absolute right-4 top-1/2 z-20 -translate-y-1/2 md:right-20 lg:right-32">
          {isSignedIn ? (
            <motion.button
              onClick={onCampaignClick}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="group inline-flex items-center gap-2 self-start rounded-full bg-[#E1E0CC] py-1 pl-5 pr-1 text-sm font-medium text-black transition-all hover:gap-3 sm:text-base cursor-pointer"
            >
              Start Your Campaign
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
                <ArrowRight className="h-4 w-4" style={{ color: "#E1E0CC" }} />
              </span>
            </motion.button>
          ) : (
            <SignInButton mode="modal">
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="group inline-flex items-center gap-2 self-start rounded-full bg-[#E1E0CC] py-1 pl-5 pr-1 text-sm font-medium text-black transition-all hover:gap-3 sm:text-base cursor-pointer"
              >
                Start Your Campaign
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
                  <ArrowRight className="h-4 w-4" style={{ color: "#E1E0CC" }} />
                </span>
              </motion.button>
            </SignInButton>
          )}
        </div>

        {/* Bottom-right features */}
        <div className="absolute bottom-10 right-4 z-20 px-4 text-left md:bottom-20 md:right-10 md:px-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="flex flex-col gap-6"
          >
            {[
              { title: "Agentic AI Orchestrator", desc: "Autonomous campaign management and decision making.", icon: CheckCircle2 },
              { title: "Multichannel Outreach", desc: "Scale across WhatsApp, Voice, and Email effortlessly.", icon: Layers },
              { title: "Real-time Analytics", desc: "Get instant insights and performance tracking.", icon: Zap }
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center text-[#E1E0CC] opacity-70">
                  <feature.icon className="h-full w-full" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-[#E1E0CC] md:text-base">{feature.title}</h3>
                  <p className="text-xs text-[#E1E0CC]/60 md:text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom-left branding */}
        <div className="absolute bottom-4 left-4 z-20 px-4 md:bottom-10 md:left-10 md:px-0">
          <h1
            className="font-medium leading-[0.85] tracking-[-0.07em] text-[26vw] sm:text-[24vw] md:text-[22vw] lg:text-[20vw] xl:text-[18vw] font-instrument"
            style={{ color: "#E1E0CC" }}
          >
            <WordsPullUp text="RevAgent" showAsterisk />
          </h1>
        </div>
      </div>
    </section>
  );
};

export {PrismaHero}