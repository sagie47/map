import { useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { MapView } from "../../../components/MapView";
import { Play, Pause, SkipBack, SkipForward, ArrowLeft, Radio } from "lucide-react";
import { format } from "date-fns";
import { useReplayData, useReplayPlayback } from "../hooks";
import { selectReplayedIncident } from "../selectors";
import { useReceivers } from "../../receivers/hooks";

export function ReplayView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useReplayData(id!);
  const { data: receivers = [] } = useReceivers();

  const { isPlaying, togglePlayback, currentIndex, seekTo } = useReplayPlayback(
    data?.events || [],
  );

  const activeEventRef = useRef<HTMLDivElement>(null);
  const timelineTrackRef = useRef<HTMLDivElement>(null);
  const isScrubbingRef = useRef(false);

  useEffect(() => {
    if (activeEventRef.current) {
      activeEventRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentIndex]);

  const clampSeekIndex = useCallback(
    (index: number, eventCount: number) => {
      if (eventCount <= 0) {
        return 0;
      }

      return Math.min(Math.max(index, 0), eventCount - 1);
    },
    [],
  );

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
      <div className="flex flex-col items-center justify-center h-full w-full bg-black text-[#666]">
        <div className="text-xl font-mono uppercase tracking-widest text-zinc-100 mb-2">/INCIDENT_NOT_FOUND</div>
        <p className="mb-6 font-mono text-[11px] uppercase tracking-widest">The incident you are looking for does not exist or has been removed.</p>
        <button
          onClick={() => navigate("/operations")}
          className="px-4 py-2 bg-[#111] border border-[#1f1f1f] text-[11px] font-mono uppercase tracking-widest text-zinc-200 hover:bg-[#1a1a1a] transition-colors"
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
    <div className="flex flex-col h-full w-full bg-black">
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

      {/* Top Bar */}
      <div className="h-16 border-b border-[#1f1f1f] flex items-center px-4 md:px-6 justify-between bg-[#0a0a0a] gap-3">
        <div className="flex items-center min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 md:mr-4 text-[#666] hover:text-zinc-100 transition-colors min-h-11 min-w-11 inline-flex items-center justify-center"
            aria-label="Return to previous view"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm md:text-lg font-mono uppercase tracking-[0.15em] text-zinc-100 truncate">
              REPLAY // {incident.id}
            </h1>
          </div>
          <span className="ml-3 md:ml-4 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest border bg-[#111] text-[#3b82f6] border-[#1f1f1f] hidden sm:inline-flex">
            /MODE REPLAY
          </span>
        </div>

        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <div className="text-[11px] font-mono text-[#666] uppercase tracking-widest hidden lg:block">
            {format(new Date(currentEvent.detectedAt), "yyyy-MM-dd HH:mm:ss")}
          </div>

          <div className="flex items-center bg-[#111] border border-[#1f1f1f] p-1 gap-1">
            <button
              onClick={() => seekTo(0)}
              className="min-h-11 min-w-11 inline-flex items-center justify-center text-[#666] hover:text-zinc-100 transition-colors"
              aria-label="Jump to first event"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={stepBackward}
              className="min-h-11 min-w-11 inline-flex items-center justify-center text-[#666] hover:text-zinc-100 transition-colors sm:hidden"
              aria-label="Step to previous event"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlayback}
              className="min-h-11 min-w-11 inline-flex items-center justify-center text-[#666] hover:text-zinc-100 transition-colors"
              aria-label={isPlaying ? "Pause replay" : "Play replay"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={stepForward}
              className="min-h-11 min-w-11 inline-flex items-center justify-center text-[#666] hover:text-zinc-100 transition-colors sm:hidden"
              aria-label="Step to next event"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex min-h-0">
        <div className="flex-1 relative min-h-0">
          <MapView
            incidents={replayedIncident ? [replayedIncident] : []}
            receivers={receivers}
            selectedIncidentId={incident.id}
            onSelectIncident={() => {}}
          />

          {/* Progress Bar Overlay */}
          <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-3 md:px-4 z-[1000]">
            <div className="hud-panel p-4 md:p-5 shadow-2xl">
              <div className="flex items-center justify-between gap-3 text-[10px] text-[#666] mb-3 font-mono uppercase tracking-widest">
                <span>{format(new Date(events[0].detectedAt), "HH:mm:ss")}</span>
                <span className="text-center text-zinc-300 text-[11px]">
                  EVENT {currentIndex + 1} / {events.length}
                </span>
                <span>{format(new Date(events[events.length - 1].detectedAt), "HH:mm:ss")}</span>
              </div>

              <div className="space-y-3">
                <div
                  ref={timelineTrackRef}
                  className="relative flex items-center h-12 md:h-14 rounded-full px-1 bg-[#050505]/80 border border-[#1f1f1f] touch-none"
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
                    className="replay-timeline-slider relative z-10 w-full h-11 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 text-[11px] font-mono uppercase tracking-widest text-zinc-300">
                  <button
                    type="button"
                    onClick={stepBackward}
                    className="min-h-11 px-4 inline-flex items-center justify-center border border-[#1f1f1f] bg-[#111] text-[#666] hover:text-zinc-100 transition-colors"
                  >
                    PREV
                  </button>
                  <div className="text-center">
                    DETECTED BY <span className="text-[#22c55e]">{currentEvent.stationName || currentEvent.receiverStationId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={stepForward}
                    className="min-h-11 px-4 inline-flex items-center justify-center border border-[#1f1f1f] bg-[#111] text-[#666] hover:text-zinc-100 transition-colors"
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

        {/* Right Sidebar - Event List */}
        <div className="hidden xl:flex w-80 bg-[#0a0a0a] border-l border-[#1f1f1f] flex-col z-10 overflow-y-auto">
          <div className="p-4 border-b border-[#1f1f1f]">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-zinc-100">/DETECTION_TIMELINE</h2>
          </div>
          <div className="p-4 space-y-3">
            {events.map((event, idx) => {
              const isActive = idx === currentIndex;
              const isPast = idx < currentIndex;

              return (
                <div
                  key={event.id}
                  ref={isActive ? activeEventRef : null}
                  onClick={() => {
                    seekTo(idx);
                  }}
                  className={`p-3 border cursor-pointer transition-colors ${
                    isActive
                      ? "bg-[#111] border-[#f97316]"
                      : isPast
                        ? "bg-[#111] border-[#1f1f1f] hover:border-[#333]"
                        : "bg-black border-[#1f1f1f] opacity-50 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-mono uppercase tracking-widest ${isActive ? "text-[#f97316]" : "text-[#666]"}`}>
                      {event.eventType}
                    </span>
                    <span className="text-[10px] font-mono text-[#666]">
                      {format(new Date(event.detectedAt), "HH:mm:ss")}
                    </span>
                  </div>
                  <div className="flex items-center text-[11px] font-mono uppercase tracking-widest text-zinc-300">
                    <Radio className="w-3 h-3 mr-1.5 text-[#666]" />
                    {event.stationName || event.receiverStationId}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
