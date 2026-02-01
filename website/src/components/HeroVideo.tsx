"use client";

import { useRef, useState } from "react";

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ended, setEnded] = useState(false);

  return (
    <div
      className="absolute inset-0 overflow-hidden transition-opacity duration-1000"
      style={{ opacity: ended ? 0 : 1 }}
    >
      <video
        ref={videoRef}
        src="/agentism.mp4"
        autoPlay
        muted
        playsInline
        onEnded={() => setEnded(true)}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-background/40" />
    </div>
  );
}
