"use client";

import { useEffect, useRef, useState } from "react";

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(true);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    const attemptPlay = async () => {
      try {
        const result = video.play();
        if (result && typeof result.then === "function") {
          await result;
        }
        setNeedsTap(false);
      } catch {
        setNeedsTap(true);
      }
    };

    attemptPlay();
  }, []);

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
  }

  function handleTapToPlay() {
    const video = videoRef.current;
    if (!video) return;
    video
      .play()
      .then(() => setNeedsTap(false))
      .catch(() => setNeedsTap(true));
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
        muted={muted}
        playsInline
        preload="auto"
        onEnded={() => setEnded(true)}
        onPlay={() => setNeedsTap(false)}
        className="w-full h-full object-cover"
      >
        <track
          kind="captions"
          src="/agentism-captions.vtt"
          srcLang="en"
          label="English"
        />
      </video>
      {/* Darker overlay for text legibility */}
      <div className="absolute inset-0 bg-background/60" />
      {!ended && needsTap && (
        <button
          onClick={handleTapToPlay}
          className="absolute inset-0 z-20 flex items-center justify-center"
          aria-label="Play video"
        >
          <span className="px-6 py-3 bg-background/60 border border-gold/30 text-gold text-xs uppercase tracking-[0.3em] font-mono hover:bg-background/80 transition-colors">
            Tap to Play
          </span>
        </button>
      )}
      {!ended && !needsTap && (
        <button
          onClick={toggleMute}
          className="absolute bottom-8 right-8 z-20 w-56 h-56 bg-background/50 border border-gold/20 flex items-center justify-center text-foreground-muted hover:text-gold hover:border-gold/40 transition-all"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? (
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
