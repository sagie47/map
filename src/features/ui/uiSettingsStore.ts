import { create } from 'zustand';

export interface LayerVisibility {
  incidents: boolean;
  vessels: boolean;
  receivers: boolean;
  aircraft: boolean;
  satellites: boolean;
  alerts: boolean;
  searchArea: boolean;
  heatmap: boolean;
}

interface UISettingsState {
  sidebarCollapsed: boolean;
  mapStyle: 'standard' | 'satellite';
  mapDimension: '2d' | '3d';
  layerVisibility: LayerVisibility;
  setSidebarCollapsed: (v: boolean) => void;
  setMapStyle: (v: 'standard' | 'satellite') => void;
  setMapDimension: (v: '2d' | '3d') => void;
  toggleLayer: (layer: keyof LayerVisibility) => void;
}

export const useUISettingsStore = create<UISettingsState>()(
  (set) => ({
    sidebarCollapsed: false,
    mapStyle: 'standard',
    mapDimension: '3d',
    layerVisibility: {
      incidents: true,
      vessels: true,
      receivers: true,
      aircraft: true,
      satellites: true,
      alerts: true,
      searchArea: false,
      heatmap: false,
    },
    setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
    setMapStyle: (v) => set({ mapStyle: v }),
    setMapDimension: (v) => set({ mapDimension: v }),
    toggleLayer: (layer) =>
      set((s) => ({
        layerVisibility: { ...s.layerVisibility, [layer]: !s.layerVisibility[layer] },
      })),
  })
);
