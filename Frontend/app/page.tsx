'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import FUIHeroWithBorders from '@/components/ui/herowith-logos';
import { OnboardingFlow } from '@/components/Onboarding/OnboardingFlow'
import { useOnboarding } from '@/components/Onboarding/OnboardingContext'
import HeroVideo from '@/components/HeroVideo';
import Features from '@/components/Features';
import LetsStart from '@/components/LetsStart';
import Steps from '@/components/Steps';
import Cards from '@/components/Cards';
import Footer from '@/components/Footer';

const page = () => {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const { showModal, isOnboardingCompleted } = useOnboarding();
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleCampaignClick = () => {
    if (isSignedIn) {
      // User is signed in, navigate to campaign builder
      router.push('/campaign/title')
    }
    // If not signed in, the SignInButton will handle it
  };

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className='w-full min-h-screen hide-scrollbar bg-black relative'>
      <Navbar />

      <div className='relative'>
        <FUIHeroWithBorders
          isSignedIn={isSignedIn}
          onCampaignClick={handleCampaignClick}
        />
        {isSignedIn && showModal && !isOnboardingCompleted && <OnboardingFlow />}

        <HeroVideo />

        <Features />
        <LetsStart />
        <Steps />
        <Cards />
        <Footer />
      </div>

      {showScrollTop && (
        <button
          onClick={handleScrollToTop}
          className='fixed bottom-8 right-8 z-50 hidden md:block p-3 border-2 border-white/50 text-white/50 rounded-full shadow-lg bg-black/70 hover:text-white hover:bg-black/90 hover:border-white transition-all duration-300 ease-out'
          aria-label='Back to top'
        >
          <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 10l7-7m0 0l7 7m-7-7v18' />
          </svg>
        </button>
      )}
    </div>
  )


}

export default page