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

  const { isPlaying, togglePlayback, currentIndex, seekTo } = useReplayPlayback(data?.events || []);

  const activeEventRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeEventRef.current) {
      activeEventRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentIndex]);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-black px-4 text-center text-[#666]">
        <div className="mb-2 text-xl font-mono uppercase tracking-widest text-zinc-100">/INCIDENT_NOT_FOUND</div>
        <p className="mb-6 font-mono text-[11px] uppercase tracking-widest">The incident you are looking for does not exist or has been removed.</p>
        <button
          onClick={() => navigate("/operations")}
          className="border border-[#1f1f1f] bg-[#111] px-4 py-2 text-[11px] font-mono uppercase tracking-widest text-zinc-200 transition-colors hover:bg-[#1a1a1a]"
        >
          [RETURN TO OPERATIONS]
        </button>
      </div>
    );
  }

  if (isLoading || !data || data.events.length === 0) {
    return <div className="p-6 sm:p-8 hud-text-muted">/LOADING_REPLAY_DATA...</div>;
  }

  const { incident, events } = data;
  const currentEvent = events[currentIndex];
  const replayedIncident = selectReplayedIncident(incident, events, currentIndex);

  return (
    <div className="flex min-h-screen w-full flex-col bg-black md:h-screen">
      <div className="flex min-h-16 flex-col gap-3 border-b border-[#1f1f1f] bg-[#0a0a0a] px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 shrink-0 text-[#666] transition-colors hover:text-zinc-100 sm:mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-mono uppercase tracking-[0.15em] text-zinc-100 sm:text-lg">
              REPLAY // {incident.id}
            </h1>
            <span className="mt-2 inline-flex border border-[#1f1f1f] bg-[#111] px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-[#3b82f6] lg:hidden">
              /MODE REPLAY
            </span>
          </div>
          <span className="ml-4 hidden border border-[#1f1f1f] bg-[#111] px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-[#3b82f6] lg:inline-flex">
            /MODE REPLAY
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#666] break-all">
            {format(new Date(currentEvent.detectedAt), "yyyy-MM-dd HH:mm:ss")}
          </div>

          <div className="flex w-fit items-center border border-[#1f1f1f] bg-[#111] p-1">
            <button
              onClick={() => seekTo(0)}
              className="p-1.5 text-[#666] transition-colors hover:text-zinc-100"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={togglePlayback}
              className="p-1.5 text-[#666] transition-colors hover:text-zinc-100"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col lg:flex-row">
        <div className="relative min-h-[60vh] flex-1 lg:min-h-0">
          <MapView
            incidents={replayedIncident ? [replayedIncident] : []}
            receivers={receivers}
            selectedIncidentId={incident.id}
            onSelectIncident={() => {}}
          />

          <div className="absolute inset-x-3 bottom-3 z-[1000] sm:inset-x-4 sm:bottom-4 lg:left-1/2 lg:right-auto lg:w-full lg:max-w-2xl lg:-translate-x-1/2 lg:px-4">
            <div className="hud-panel p-3 shadow-2xl sm:p-4">
              <div className="mb-2 flex justify-between gap-3 text-[10px] font-mono uppercase tracking-widest text-[#666]">
                <span>{format(new Date(events[0].detectedAt), "HH:mm:ss")}</span>
                <span>{format(new Date(events[events.length - 1].detectedAt), "HH:mm:ss")}</span>
              </div>
              <input
                type="range"
                min="0"
                max={events.length - 1}
                value={currentIndex}
                onChange={(e) => {
                  seekTo(parseInt(e.target.value));
                }}
                className="h-1 w-full cursor-pointer appearance-none bg-[#1f1f1f] accent-[#f97316]"
              />
              <div className="mt-3 text-center text-[10px] font-mono uppercase tracking-widest text-zinc-300 sm:text-[11px]">
                EVENT {currentIndex + 1} OF {events.length} // DETECTED BY{" "}
                <span className="break-all text-[#22c55e]">
                  {currentEvent.stationName || currentEvent.receiverStationId}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex max-h-[40vh] w-full shrink-0 flex-col overflow-y-auto border-t border-[#1f1f1f] bg-[#0a0a0a] lg:max-h-none lg:w-80 lg:border-t-0 lg:border-l">
          <div className="border-b border-[#1f1f1f] p-4">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-zinc-100">/DETECTION_TIMELINE</h2>
          </div>
          <div className="space-y-3 p-4">
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
                  className={`cursor-pointer border p-3 transition-colors ${
                    isActive
                      ? "border-[#f97316] bg-[#111]"
                      : isPast
                        ? "border-[#1f1f1f] bg-[#111] hover:border-[#333]"
                        : "border-[#1f1f1f] bg-black opacity-50 hover:opacity-100"
                  }`}
                >
                  <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className={`text-[10px] font-mono uppercase tracking-widest break-all ${isActive ? "text-[#f97316]" : "text-[#666]"}`}>
                      {event.eventType}
                    </span>
                    <span className="text-[10px] font-mono text-[#666]">
                      {format(new Date(event.detectedAt), "HH:mm:ss")}
                    </span>
                  </div>
                  <div className="flex items-center break-all text-[11px] font-mono uppercase tracking-widest text-zinc-300">
                    <Radio className="mr-1.5 h-3 w-3 shrink-0 text-[#666]" />
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
