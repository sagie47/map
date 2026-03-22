import React, { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { MapView } from "../../../components/MapView";
import { Play, Pause, SkipBack, ArrowLeft, Radio } from "lucide-react";
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

  const activeEventRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeEventRef.current) {
      activeEventRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentIndex]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-black text-[#666]">
        <div className="text-xl font-mono uppercase tracking-widest text-zinc-100 mb-2">
          /INCIDENT_NOT_FOUND
        </div>
        <p className="mb-6 font-mono text-[11px] uppercase tracking-widest">
          The incident you are looking for does not exist or has been removed.
        </p>
        <button
          onClick={() => navigate("/operations")}
          className="touch-target inline-flex items-center justify-center px-4 py-2 bg-[#111] border border-[#1f1f1f] text-[11px] font-mono uppercase tracking-widest text-zinc-200 hover:bg-[#1a1a1a] transition-colors"
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

  return (
    <div className="flex flex-col h-full w-full bg-black">
      {/* Top Bar */}
      <div className="h-16 border-b border-[#1f1f1f] flex items-center px-6 justify-between bg-[#0a0a0a] gap-4">
        <div className="flex items-center min-w-0">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="touch-target-icon mr-4 text-[#666] hover:text-zinc-100 hover:bg-[#111] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-mono uppercase tracking-[0.15em] text-zinc-100 truncate">
            REPLAY // {incident.id}
          </h1>
          <span className="ml-4 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest border bg-[#111] text-[#3b82f6] border-[#1f1f1f] whitespace-nowrap">
            /MODE REPLAY
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-[11px] font-mono text-[#666] uppercase tracking-widest whitespace-nowrap">
            {format(new Date(currentEvent.detectedAt), "yyyy-MM-dd HH:mm:ss")}
          </div>

          <div className="flex items-center bg-[#111] border border-[#1f1f1f]">
            <button
              onClick={() => seekTo(0)}
              aria-label="Jump to first replay event"
              className="touch-target-icon text-[#666] hover:text-zinc-100 hover:bg-[#1a1a1a] transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlayback}
              aria-label={isPlaying ? "Pause replay" : "Play replay"}
              className="touch-target-icon text-[#666] hover:text-zinc-100 hover:bg-[#1a1a1a] transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex">
        <div className="flex-1 relative">
          <MapView
            incidents={replayedIncident ? [replayedIncident] : []}
            receivers={receivers}
            selectedIncidentId={incident.id}
            onSelectIncident={() => {}}
          />

          {/* Progress Bar Overlay */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-[1000]">
            <div className="hud-panel p-4 shadow-2xl">
              <div className="flex justify-between text-[10px] text-[#666] mb-2 font-mono uppercase tracking-widest">
                <span>{format(new Date(events[0].detectedAt), "HH:mm:ss")}</span>
                <span>{format(new Date(events[events.length - 1].detectedAt), "HH:mm:ss")}</span>
              </div>
              <input
                type="range"
                min="0"
                max={events.length - 1}
                value={currentIndex}
                onChange={(e) => {
                  seekTo(parseInt(e.target.value, 10));
                }}
                className="touch-target-field w-full bg-transparent appearance-none cursor-pointer accent-[#f97316]"
                aria-label="Replay progress"
              />
              <div className="mt-3 text-[11px] font-mono uppercase tracking-widest text-zinc-300 text-center">
                EVENT {currentIndex + 1} OF {events.length} // DETECTED BY{" "}
                <span className="text-[#22c55e]">
                  {currentEvent.stationName || currentEvent.receiverStationId}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Event List */}
        <div className="w-80 bg-[#0a0a0a] border-l border-[#1f1f1f] flex flex-col z-10 overflow-y-auto">
          <div className="p-4 border-b border-[#1f1f1f]">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-zinc-100">
              /DETECTION_TIMELINE
            </h2>
          </div>
          <div className="p-4 space-y-3">
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
                  className={`touch-target w-full min-h-11 p-3 border text-left transition-colors ${
                    isActive
                      ? "bg-[#111] border-[#f97316]"
                      : isPast
                        ? "bg-[#111] border-[#1f1f1f] hover:border-[#333]"
                        : "bg-black border-[#1f1f1f] opacity-50 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <span
                      className={`text-[10px] font-mono uppercase tracking-widest ${
                        isActive ? "text-[#f97316]" : "text-[#666]"
                      }`}
                    >
                      {event.eventType}
                    </span>
                    <span className="text-[10px] font-mono text-[#666] whitespace-nowrap">
                      {format(new Date(event.detectedAt), "HH:mm:ss")}
                    </span>
                  </div>
                  <div className="flex items-center text-[11px] font-mono uppercase tracking-widest text-zinc-300">
                    <Radio className="w-3 h-3 mr-1.5 text-[#666]" />
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
