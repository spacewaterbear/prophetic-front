"use client";

import { useState, useRef, useEffect } from "react";

interface AudioCardProps {
  title?: string;
  subtitle?: string;
  src?: string;
  score?: number;
  trend?: "up" | "down" | "neutral";
  label?: string;
}


const FALLBACK_BARS = [
  18, 28, 22, 40, 35, 55, 45, 60, 50, 70, 65, 80, 72, 58, 42, 68, 75, 85, 90,
  78, 62, 88, 70, 52, 60, 45, 55, 38, 48, 32, 42, 28, 35, 22, 30,
];


function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds === 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function AudioCard({
  title = "Masters of Photography",
  subtitle = "Dynamique positive",
  src,
  score = 76,
  trend = "up",
  label = "Audio Insight",
}: AudioCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const waveformBars = FALLBACK_BARS;
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!src) return;
    fetch(`/api/audio-url?fileName=${encodeURIComponent(src)}`)
      .then((res) => res.json())
      .then((data: { signedUrl?: string; error?: string; detail?: string; bucket?: string; path?: string }) => {
        if (!data.signedUrl) {
          console.error("[AudioCard] signed URL error:", data);
          throw new Error(data.error ?? "No signed URL returned");
        }
        setResolvedSrc(data.signedUrl);
      })
      .catch((e) => { console.error("[AudioCard] setup failed:", e); });
  }, [src]);

  const progress = duration > 0 ? currentTime / duration : 0;
  const activeBars = Math.round(progress * waveformBars.length);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio || !resolvedSrc) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch((e) => console.error("[AudioCard] play() failed:", e));
    }
  }

  function handleBarClick(index: number) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = (index / waveformBars.length) * duration;
  }

  return (
    <div className="border border-gray-200/20 bg-[#e6e6e6] dark:bg-gray-800 rounded-[24px] p-3">
      {/* Player area */}
      <div
        className="relative w-full aspect-square sm:aspect-[2/1] rounded-[24px] mb-2 overflow-hidden flex flex-col justify-between p-3 sm:p-4"
        style={{ background: "#d6dcf5" }}
      >
        {/* Top row: play button + label + time */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="w-11 h-11 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 shadow-md hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            {playing ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 2 }}>
                <path d="M6 4l14 8-14 8V4z" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="font-semibold text-gray-800 text-sm truncate">{label}</span>
              <span className="text-gray-500 text-xs font-mono whitespace-nowrap flex-shrink-0">
                {formatTime(currentTime)}&nbsp;/&nbsp;{duration > 0 ? formatTime(duration) : "--:--"}
              </span>
            </div>
            <div
              className="mt-1.5 h-[3px] rounded-full bg-gray-400/40 overflow-hidden cursor-pointer"
              onClick={(e) => {
                const audio = audioRef.current;
                if (!audio || !duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
              }}
            >
              <div
                className="h-full rounded-full bg-gray-600 transition-all duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Waveform */}
        <div className="flex items-end gap-[2px] sm:gap-[3px] h-[45%] w-full overflow-hidden">
          {waveformBars.map((h, i) => (
            <button
              key={i}
              onClick={() => handleBarClick(i)}
              aria-label={`Seek to position ${i}`}
              className="flex-1 rounded-sm transition-colors focus:outline-none"
              style={{
                height: `${h}%`,
                background: i < activeBars ? "#374151" : "#9ca3af80",
                minWidth: "2px",
              }}
            />
          ))}
        </div>

        {/* Score badge */}
        {score != null && (
          <div className="absolute bottom-3 right-3">
            <div className="bg-white rounded-full px-3 py-1.5 shadow-md flex items-center gap-1">
              <span className="text-sm font-semibold text-gray-900">{score}</span>
              {trend === "up" && <span className="text-base text-green-500">▲</span>}
              {trend === "down" && <span className="text-base text-red-500">▼</span>}
            </div>
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex flex-col px-1 text-center">
        <h3 className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight">{title}</h3>
        <p className="text-[14px] font-light italic text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
      </div>

      <audio ref={audioRef} src={resolvedSrc} preload="metadata" />
    </div>
  );
}
