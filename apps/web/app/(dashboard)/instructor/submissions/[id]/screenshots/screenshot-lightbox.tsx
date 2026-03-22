'use client';

import { useState } from 'react';
import { format } from 'date-fns';

interface ScreenshotData {
  id: string;
  capturedAt: string;
  minuteMark: number;
  fileSize: number;
  url: string;
  thumbnailUrl: string;
}

interface ScreenshotLightboxProps {
  screenshots: ScreenshotData[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ScreenshotLightbox({ screenshots }: ScreenshotLightboxProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  function openLightbox(index: number) {
    setActiveIndex(index);
  }

  function closeLightbox() {
    setActiveIndex(null);
  }

  function goNext() {
    if (activeIndex === null) return;
    setActiveIndex((activeIndex + 1) % screenshots.length);
  }

  function goPrev() {
    if (activeIndex === null) return;
    setActiveIndex((activeIndex - 1 + screenshots.length) % screenshots.length);
  }

  const active = activeIndex !== null ? screenshots[activeIndex] : null;

  return (
    <>
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {screenshots.map((shot, index) => (
          <button
            key={shot.id}
            onClick={() => openLightbox(index)}
            className="group relative overflow-hidden rounded-lg border border-gray-200 bg-gray-100 aspect-video focus:outline-none focus:ring-2 focus:ring-nau-navy focus:ring-offset-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shot.thumbnailUrl}
              alt={`Screenshot at minute ${shot.minuteMark}`}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
              <p className="text-xs font-medium text-white">
                {shot.minuteMark}min
              </p>
              <p className="text-xs text-white/70">
                {format(new Date(shot.capturedAt), 'h:mm a')}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Overlay */}
      {active && activeIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closeLightbox}
        >
          <div
            className="relative w-full max-w-4xl rounded-xl bg-white overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">
                  Screenshot {activeIndex + 1} of {screenshots.length}
                </span>
                <span className="mx-2 text-gray-300">·</span>
                Minute {active.minuteMark}
                <span className="mx-2 text-gray-300">·</span>
                {format(new Date(active.capturedAt), 'MMM d, h:mm:ss a')}
                <span className="mx-2 text-gray-300">·</span>
                {formatFileSize(active.fileSize)}
              </div>
              <button
                onClick={closeLightbox}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Image */}
            <div className="relative bg-gray-950 flex items-center justify-center" style={{ minHeight: '400px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.url}
                alt={`Screenshot at minute ${active.minuteMark}`}
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />

              {/* Prev / Next arrows */}
              {screenshots.length > 1 && (
                <>
                  <button
                    onClick={goPrev}
                    className="absolute left-3 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                    aria-label="Previous screenshot"
                  >
                    ‹
                  </button>
                  <button
                    onClick={goNext}
                    className="absolute right-3 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                    aria-label="Next screenshot"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
