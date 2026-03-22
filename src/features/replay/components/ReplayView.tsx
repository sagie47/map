import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Pause, Play, Radio, SkipBack, SkipForward } from "lucide-react";
import { format } from "date-fns";

import { MapView } from "../../../components/MapView";
import { useReceivers } from "../../receivers/hooks";
import { useReplayData, useReplayPlayback } from "../hooks";
import { selectReplayedIncident } from "../selectors";

export function ReplayView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useReplayData(id!);
  const { data: receivers = [] } = useReceivers();

  const { isPlaying, togglePlayback, currentIndex, seekTo } = useReplayPlayback(
    data?.events || [],
  );

  const activeEventRef = useRef<HTMLButtonElement>(null);
  const timelineTrackRef = useRef<HTMLDivElement>(null);
  const isScrubbingRef = useRef(false);

  useEffect(() => {
    if (activeEventRef.current) {
      activeEventRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentIndex]);

  const clampSeekIndex = useCallback((index: number, eventCount: number) => {
    if (eventCount <= 0) {
      return 0;
    }

    return Math.min(Math.max(index, 0), eventCount - 1);
  }, []);

  const seekFromClientX = useCallback(
    (clientX: number, eventCount: number) => {
      const track = timelineTrackRef.current;
      if (!track || eventCount === 0) {
        return;
      }

      const rect = track.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const progress = rect.width === 0 ? 0 : relativeX / rect.width;
      const nextIndex = clampSeekIndex(
        Math.round(progress * (eventCount - 1)),
        eventCount,
      );

      seekTo(nextIndex);
    },
    [clampSeekIndex, seekTo],
  );

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-black text-[#666]">
        <div className="mb-2 text-xl font-mono uppercase tracking-widest text-zinc-100">
          /INCIDENT_NOT_FOUND
        </div>
        <p className="mb-6 font-mono text-[11px] uppercase tracking-widest">
          The incident you are looking for does not exist or has been removed.
        </p>
        <button
          onClick={() => navigate("/operations")}
          className="touch-target inline-flex items-center justify-center border border-[#1f1f1f] bg-[#111] px-4 py-2 text-[11px] font-mono uppercase tracking-widest text-zinc-200 transition-colors hover:bg-[#1a1a1a]"
        >
          [RETURN TO OPERATIONS]
        </button>
      </div>
    );
  }

  if (isLoading || !data || data.events.length === 0) {
    return <div className="p-8 hud-text-muted">/LOADING_REPLAY_DATA...</div>;
  }

  const { incident, events } = data;
  const currentEvent = events[currentIndex];
  const replayedIncident = selectReplayedIncident(incident, events, currentIndex);
  const stepBackward = () => seekTo(clampSeekIndex(currentIndex - 1, events.length));
  const stepForward = () => seekTo(clampSeekIndex(currentIndex + 1, events.length));

  return (
    <div className="flex h-full w-full flex-col bg-black">
      <style>{`
        .replay-timeline-slider {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }

        .replay-timeline-slider::-webkit-slider-runnable-track {
          height: 0.375rem;
          border-radius: 9999px;
          background: linear-gradient(90deg, #f97316 0%, #f97316 var(--timeline-progress), #1f1f1f var(--timeline-progress), #1f1f1f 100%);
        }

        .replay-timeline-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 1.25rem;
          height: 1.25rem;
          border-radius: 9999px;
          background: #f97316;
          border: 2px solid #0a0a0a;
          box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.2);
          margin-top: -0.4375rem;
        }

        .replay-timeline-slider::-moz-range-track {
          height: 0.375rem;
          border-radius: 9999px;
          background: #1f1f1f;
        }

        .replay-timeline-slider::-moz-range-progress {
          height: 0.375rem;
          border-radius: 9999px;
          background: #f97316;
        }

        .replay-timeline-slider::-moz-range-thumb {
          width: 1.25rem;
          height: 1.25rem;
          border-radius: 9999px;
          background: #f97316;
          border: 2px solid #0a0a0a;
          box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.2);
        }
      `}</style>

      <div className="flex h-16 items-center justify-between gap-3 border-b border-[#1f1f1f] bg-[#0a0a0a] px-4 md:px-6">
        <div className="flex min-w-0 items-center">
          <button
            onClick={() => navigate(-1)}
            className="touch-target-icon mr-3 text-[#666] transition-colors hover:bg-[#111] hover:text-zinc-100 md:mr-4"
            aria-label="Return to previous view"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-mono uppercase tracking-[0.15em] text-zinc-100 md:text-lg">
              REPLAY // {incident.id}
            </h1>
          </div>
          <span className="ml-3 hidden border border-[#1f1f1f] bg-[#111] px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-[#3b82f6] sm:inline-flex md:ml-4">
            /MODE REPLAY
          </span>
        </div>

        <div className="shrink-0 flex items-center gap-3 md:gap-4">
          <div className="hidden text-[11px] font-mono uppercase tracking-widest text-[#666] lg:block">
            {format(new Date(currentEvent.detectedAt), "yyyy-MM-dd HH:mm:ss")}
          </div>

          <div className="flex items-center gap-1 border border-[#1f1f1f] bg-[#111] p-1">
            <button
              onClick={() => seekTo(0)}
              className="touch-target-icon text-[#666] transition-colors hover:bg-[#1a1a1a] hover:text-zinc-100"
              aria-label="Jump to first event"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={stepBackward}
              className="touch-target-icon text-[#666] transition-colors hover:bg-[#1a1a1a] hover:text-zinc-100 sm:hidden"
              aria-label="Step to previous event"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={togglePlayback}
              className="touch-target-icon text-[#666] transition-colors hover:bg-[#1a1a1a] hover:text-zinc-100"
              aria-label={isPlaying ? "Pause replay" : "Play replay"}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={stepForward}
              className="touch-target-icon text-[#666] transition-colors hover:bg-[#1a1a1a] hover:text-zinc-100 sm:hidden"
              aria-label="Step to next event"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-h-0 flex-1">
          <MapView
            incidents={replayedIncident ? [replayedIncident] : []}
            receivers={receivers}
            selectedIncidentId={incident.id}
            onSelectIncident={() => {}}
          />

          <div className="absolute bottom-4 left-1/2 z-[1000] w-full max-w-3xl -translate-x-1/2 px-3 md:bottom-8 md:px-4">
            <div className="hud-panel p-4 shadow-2xl md:p-5">
              <div className="mb-3 flex items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-widest text-[#666]">
                <span>{format(new Date(events[0].detectedAt), "HH:mm:ss")}</span>
                <span className="text-center text-[11px] text-zinc-300">
                  EVENT {currentIndex + 1} / {events.length}
                </span>
                <span>{format(new Date(events[events.length - 1].detectedAt), "HH:mm:ss")}</span>
              </div>

              <div className="space-y-3">
                <div
                  ref={timelineTrackRef}
                  className="relative flex h-12 touch-none items-center rounded-full border border-[#1f1f1f] bg-[#050505]/80 px-1 md:h-14"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    isScrubbingRef.current = true;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    seekFromClientX(event.clientX, events.length);
                  }}
                  onPointerMove={(event) => {
                    if (!isScrubbingRef.current) {
                      return;
                    }

                    seekFromClientX(event.clientX, events.length);
                  }}
                  onPointerUp={(event) => {
                    isScrubbingRef.current = false;
                    seekFromClientX(event.clientX, events.length);
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                  }}
                  onPointerCancel={(event) => {
                    isScrubbingRef.current = false;
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                  }}
                >
                  <div className="pointer-events-none absolute inset-x-4 h-1 rounded-full bg-[#1f1f1f]" />
                  <input
                    type="range"
                    min="0"
                    max={events.length - 1}
                    value={currentIndex}
                    onChange={(event) => {
                      seekTo(parseInt(event.target.value, 10));
                    }}
                    aria-label="Replay timeline scrubber"
                    style={{
                      ["--timeline-progress" as string]: `${(currentIndex / Math.max(events.length - 1, 1)) * 100}%`,
                    }}
                    className="replay-timeline-slider touch-target-field relative z-10 h-11 w-full cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 text-[11px] font-mono uppercase tracking-widest text-zinc-300">
                  <button
                    type="button"
                    onClick={stepBackward}
                    className="touch-target inline-flex items-center justify-center border border-[#1f1f1f] bg-[#111] px-4 text-[#666] transition-colors hover:text-zinc-100"
                  >
                    PREV
                  </button>
                  <div className="text-center">
                    DETECTED BY{" "}
                    <span className="text-[#22c55e]">
                      {currentEvent.stationName || currentEvent.receiverStationId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stepForward}
                    className="touch-target inline-flex items-center justify-center border border-[#1f1f1f] bg-[#111] px-4 text-[#666] transition-colors hover:text-zinc-100"
                  >
                    NEXT
                  </button>
                </div>

                <div className="text-center text-[10px] font-mono uppercase tracking-widest text-[#666] md:hidden">
                  Drag anywhere on the timeline to scrub precisely.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="z-10 hidden w-80 flex-col overflow-y-auto border-l border-[#1f1f1f] bg-[#0a0a0a] xl:flex">
          <div className="border-b border-[#1f1f1f] p-4">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-zinc-100">
              /DETECTION_TIMELINE
            </h2>
          </div>
          <div className="space-y-3 p-4">
            {events.map((event, idx) => {
              const isActive = idx === currentIndex;
              const isPast = idx < currentIndex;

              return (
                <button
                  key={event.id}
                  type="button"
                  ref={isActive ? activeEventRef : null}
                  onClick={() => {
                    seekTo(idx);
                  }}
                  className={`touch-target w-full border p-3 text-left transition-colors ${
                    isActive
                      ? "border-[#f97316] bg-[#111]"
                      : isPast
                        ? "border-[#1f1f1f] bg-[#111] hover:border-[#333]"
                        : "border-[#1f1f1f] bg-black opacity-50 hover:opacity-100"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span
                      className={`text-[10px] font-mono uppercase tracking-widest ${
                        isActive ? "text-[#f97316]" : "text-[#666]"
                      }`}
                    >
                      {event.eventType}
                    </span>
                    <span className="whitespace-nowrap text-[10px] font-mono text-[#666]">
                      {format(new Date(event.detectedAt), "HH:mm:ss")}
                    </span>
                  </div>
                  <div className="flex items-center text-[11px] font-mono uppercase tracking-widest text-zinc-300">
                    <Radio className="mr-1.5 h-3 w-3 text-[#666]" />
                    {event.stationName || event.receiverStationId}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
