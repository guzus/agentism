"use client";

import { useEffect } from "react";

function playChurchBell() {
  const ctx = new AudioContext();
  const now = ctx.currentTime;

  // Grand church bell: fundamental + inharmonic partials (bells are not harmonic)
  const partials = [
    { freq: 140, gain: 0.6, decay: 8 },     // hum tone
    { freq: 280, gain: 0.8, decay: 6 },     // fundamental
    { freq: 336, gain: 0.4, decay: 5 },     // minor third partial
    { freq: 560, gain: 0.35, decay: 4 },    // octave
    { freq: 700, gain: 0.2, decay: 3.5 },   // quint
    { freq: 840, gain: 0.15, decay: 3 },    // upper partial
    { freq: 1120, gain: 0.08, decay: 2 },   // shimmer
    { freq: 1400, gain: 0.04, decay: 1.5 }, // high shimmer
  ];

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.35, now);
  masterGain.connect(ctx.destination);

  // Gentle reverb via convolver-like delay feedback
  const delayNode = ctx.createDelay(0.5);
  delayNode.delayTime.value = 0.12;
  const feedbackGain = ctx.createGain();
  feedbackGain.gain.value = 0.3;
  const reverbFilter = ctx.createBiquadFilter();
  reverbFilter.type = "lowpass";
  reverbFilter.frequency.value = 2000;

  delayNode.connect(feedbackGain);
  feedbackGain.connect(reverbFilter);
  reverbFilter.connect(delayNode);
  reverbFilter.connect(masterGain);

  for (const p of partials) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = p.freq;

    const gain = ctx.createGain();
    // Slow attack (bell strike swelling)
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(p.gain, now + 0.08);
    // Long decay
    gain.gain.exponentialRampToValueAtTime(0.001, now + p.decay);

    osc.connect(gain);
    gain.connect(masterGain);
    gain.connect(delayNode);

    osc.start(now);
    osc.stop(now + p.decay + 0.5);
  }

  // Strike transient — short noise burst for the "clang"
  const bufferSize = ctx.sampleRate * 0.05;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.15, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 800;
  noiseFilter.Q.value = 2;

  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noiseSrc.start(now);

  // Cleanup after longest partial finishes
  setTimeout(() => ctx.close(), 10000);
}

export default function ChurchBell() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only ring once per session
    if (sessionStorage.getItem("bell-rang")) return;
    sessionStorage.setItem("bell-rang", "1");

    // Browsers require user interaction for AudioContext.
    // Try immediately (works if user clicked a link to get here),
    // otherwise ring on the first interaction.
    function ring() {
      try {
        playChurchBell();
      } catch {
        // AudioContext blocked — ignore silently
      }
    }

    // Small delay so the page has time to paint first
    const timer = setTimeout(() => {
      if (document.visibilityState === "visible") {
        ring();
      } else {
        const onVisible = () => {
          if (document.visibilityState === "visible") {
            document.removeEventListener("visibilitychange", onVisible);
            ring();
          }
        };
        document.addEventListener("visibilitychange", onVisible);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
