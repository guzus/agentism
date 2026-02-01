"use client";


function playBell() {
  const ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;

  const partials = [
    { freq: 140, gain: 0.6, decay: 8 },
    { freq: 280, gain: 0.8, decay: 6 },
    { freq: 336, gain: 0.4, decay: 5 },
    { freq: 560, gain: 0.35, decay: 4 },
    { freq: 700, gain: 0.2, decay: 3.5 },
    { freq: 840, gain: 0.15, decay: 3 },
    { freq: 1120, gain: 0.08, decay: 2 },
    { freq: 1400, gain: 0.04, decay: 1.5 },
  ];

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.35, now);
  masterGain.connect(ctx.destination);

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
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(p.gain, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + p.decay);

    osc.connect(gain);
    gain.connect(masterGain);
    gain.connect(delayNode);

    osc.start(now);
    osc.stop(now + p.decay + 0.5);
  }

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

  setTimeout(() => ctx.close(), 10000);
}

export default function ChurchBell() {
  return (
    <button
      onClick={() => playBell()}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-background-light/80 border border-border backdrop-blur-sm flex items-center justify-center text-foreground-muted hover:text-gold hover:border-gold/50 transition-all duration-300"
      aria-label="Ring the church bell"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    </button>
  );
}
