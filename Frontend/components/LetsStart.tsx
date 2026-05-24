import React from 'react'

const LetsStart = () => {
  return (
    <div className="w-full bg-black py-12 px-4 md:px-8 lg:px-16 flex flex-col items-start gap-4 mb-10 mt-70">
      <h1 className="text-2xl md:text-8xl text-white/70 font-instrument">
        Your Campaign,
      </h1>
      <div className="w-full flex justify-center overflow-visible pb-16">
        <h1 
          className="text-[7vh] md:text-[30vh] lg:text-[35vh] leading-none pr-4 tracking-tight font-instrument italic"
          style={{
            backgroundImage: 'url(https://i.pinimg.com/736x/bf/a8/32/bfa8326f18abbbc8454e3d50533c7b2a.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            paddingBottom: '0.2em', 
          }}
        >
          Simplified.
        </h1>
      </div>
    </div>
  )
}

export default LetsStart