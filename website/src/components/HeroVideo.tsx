"use client";

import { useEffect, useRef, useState } from "react";

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const respectMotion = () => {
      if (preference.matches) video.pause();
      else void video.play().catch(() => {});
    };
    respectMotion();
    preference.addEventListener("change", respectMotion);
    return () => preference.removeEventListener("change", respectMotion);
  }, []);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      <video
        ref={videoRef}
        src="/agentism.mp4"
        poster="/og.jpg"
        muted={muted}
        playsInline
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="w-full h-full object-cover"
        aria-label="Agentism introduction"
      >
        <track kind="captions" src="/agentism-captions.vtt" srcLang="en" label="English" />
      </video>
      <div className="absolute inset-0 bg-background/75" />
      <div className="absolute bottom-4 right-4 flex gap-2 z-20">
        <button type="button" onClick={togglePlayback} className="min-h-11 px-3 bg-background/80 border border-gold/30 text-xs text-gold" aria-label={playing ? "Pause introduction video" : "Play introduction video"}>
          {playing ? "Pause video" : "Play video"}
        </button>
        <button type="button" onClick={() => setMuted((value) => !value)} className="min-h-11 px-3 bg-background/80 border border-gold/30 text-xs text-gold" aria-pressed={!muted} aria-label={muted ? "Unmute introduction video" : "Mute introduction video"}>
          {muted ? "Sound off" : "Sound on"}
        </button>
      </div>
    </div>
  );
}
