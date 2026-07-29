"use client";

import { useEffect, useRef, useState } from "react";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260715_090628_7052d8a6-a094-4341-a4a2-ad58493a67a9.mp4";

export default function BoomerangVideoBg() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [framesReady, setFramesReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let frames: HTMLCanvasElement[] = [];
    let lastTime = -1;
    let isCapturing = true;
    let animCallbackId: number | null = null;
    let videoFrameCallbackId: number | null = null;
    let playbackIntervalId: NodeJS.Timeout | null = null;

    // Helper offscreen canvas for frame resizing
    const offscreenCanvas = document.createElement("canvas");
    const offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });

    const captureFrame = () => {
      if (!isCapturing || !video || video.paused || video.ended) return;

      const currentTime = video.currentTime;
      // Deduplicate frames by currentTime
      if (currentTime !== lastTime && video.videoWidth > 0 && video.videoHeight > 0) {
        lastTime = currentTime;

        // Cap capture width at 960px
        const maxWidth = 960;
        const scale = Math.min(1, maxWidth / video.videoWidth);
        const width = Math.round(video.videoWidth * scale);
        const height = Math.round(video.videoHeight * scale);

        offscreenCanvas.width = width;
        offscreenCanvas.height = height;

        if (offscreenCtx) {
          offscreenCtx.drawImage(video, 0, 0, width, height);

          // Store frame canvas copy
          const frameCanvas = document.createElement("canvas");
          frameCanvas.width = width;
          frameCanvas.height = height;
          const frameCtx = frameCanvas.getContext("2d");
          if (frameCtx) {
            frameCtx.drawImage(offscreenCanvas, 0, 0);
            frames.push(frameCanvas);
          }
        }
      }

      if ("requestVideoFrameCallback" in video) {
        videoFrameCallbackId = (video as any).requestVideoFrameCallback(captureFrame);
      } else {
        animCallbackId = requestAnimationFrame(captureFrame);
      }
    };

    const startPlayback = () => {
      if (frames.length === 0) return;

      setFramesReady(true);
      const ctx = canvas.getContext("2d");

      let currentFrameIndex = 0;
      let direction = 1; // 1 for forward, -1 for reverse

      // 30fps = 1000 / 30 ms
      const intervalMs = 1000 / 30;

      playbackIntervalId = setInterval(() => {
        if (!ctx || frames.length === 0) return;

        const currentCanvas = frames[currentFrameIndex];
        if (currentCanvas) {
          canvas.width = currentCanvas.width;
          canvas.height = currentCanvas.height;
          ctx.drawImage(currentCanvas, 0, 0);
        }

        currentFrameIndex += direction;

        // Ping-pong reversal at ends
        if (currentFrameIndex >= frames.length) {
          currentFrameIndex = frames.length - 2;
          direction = -1;
        } else if (currentFrameIndex < 0) {
          currentFrameIndex = 1;
          direction = 1;
        }
      }, intervalMs);
    };

    const handleVideoLoadedData = () => {
      video.play().catch((err) => console.log("Autoplay prevented:", err));
      if ("requestVideoFrameCallback" in video) {
        videoFrameCallbackId = (video as any).requestVideoFrameCallback(captureFrame);
      } else {
        animCallbackId = requestAnimationFrame(captureFrame);
      }
    };

    const handleVideoEnded = () => {
      isCapturing = false;
      if (animCallbackId !== null) cancelAnimationFrame(animCallbackId);
      if (videoFrameCallbackId !== null && "cancelVideoFrameCallback" in video) {
        (video as any).cancelVideoFrameCallback(videoFrameCallbackId);
      }
      startPlayback();
    };

    video.addEventListener("loadeddata", handleVideoLoadedData);
    video.addEventListener("ended", handleVideoEnded);

    // Trigger video load
    if (video.readyState >= 2) {
      handleVideoLoadedData();
    }

    return () => {
      isCapturing = false;
      video.removeEventListener("loadeddata", handleVideoLoadedData);
      video.removeEventListener("ended", handleVideoEnded);

      if (animCallbackId !== null) cancelAnimationFrame(animCallbackId);
      if (videoFrameCallbackId !== null && "cancelVideoFrameCallback" in video) {
        (video as any).cancelVideoFrameCallback(videoFrameCallbackId);
      }
      if (playbackIntervalId !== null) clearInterval(playbackIntervalId);

      frames = [];
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 scale-[1.15] origin-top overflow-hidden pointer-events-none select-none">
      {/* Live video shown until boomerang frames are ready */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        className={`w-full h-full object-cover object-top ${
          framesReady ? "hidden" : "block"
        }`}
      />

      {/* Canvas displaying 30fps ping-pong boomerang video frames */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-cover object-top ${
          framesReady ? "block" : "hidden"
        }`}
      />
    </div>
  );
}
