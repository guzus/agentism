"use client";

import { useRef, useState } from "react";

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(true);

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden transition-opacity duration-1000"
      style={{ opacity: ended ? 0 : 1 }}
    >
      <video
        ref={videoRef}
        src="/agentism.mp4"
        poster="/og.jpg"
        autoPlay
        muted
        playsInline
        onEnded={() => setEnded(true)}
        className="w-full h-full object-cover"
      >
        <track
          kind="captions"
          src="/agentism-captions.vtt"
          srcLang="en"
          label="English"
        />
      </video>
      <div className="absolute inset-0 bg-background/40" />
      {!ended && (
        <button
          onClick={toggleMute}
          className="absolute bottom-8 right-8 z-20 w-20 h-20 rounded-full bg-black/40 border-2 border-white/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 hover:border-white/70 transition-all duration-300"
          style={{ filter: "drop-shadow(0 0 20px rgba(124, 58, 237, 0.5)) drop-shadow(0 0 40px rgba(124, 58, 237, 0.2))" }}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
