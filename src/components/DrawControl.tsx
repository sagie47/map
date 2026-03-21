import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { useControl } from 'react-map-gl/mapbox';
import type { ControlPosition } from 'react-map-gl/mapbox';

type DrawControlProps = {
  position?: ControlPosition;
  onCreate?: (evt: { features: GeoJSON.Feature[] }) => void;
  onUpdate?: (evt: { features: GeoJSON.Feature[]; action: string }) => void;
  onDelete?: (evt: { features: GeoJSON.Feature[] }) => void;
};

export function DrawControl({ position, onCreate, onUpdate, onDelete, ...props }: DrawControlProps) {
  const getMapEventTarget = (mapRef: any) => {
    if (mapRef && typeof mapRef.on === 'function' && typeof mapRef.off === 'function') {
      return mapRef;
    }
    if (mapRef && typeof mapRef.getMap === 'function') {
      return mapRef.getMap();
    }
    return null;
  };

  useControl<MapboxDraw>(
    () => {
      return new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
        defaultMode: 'simple_select',
        styles: [
          {
            id: 'gl-draw-polygon-fill',
            type: 'fill' as const,
            filter: ['all', ['==', '$type', 'Polygon']],
            paint: {
              'fill-color': '#f97316',
              'fill-opacity': 0.2,
            },
          },
          {
            id: 'gl-draw-polygon-stroke',
            type: 'line' as const,
            filter: ['all', ['==', '$type', 'Polygon']],
            paint: {
              'line-color': '#f97316',
              'line-width': 2,
            },
          },
          {
            id: 'gl-draw-polygon-vertex',
            type: 'circle' as const,
            filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
            paint: {
              'circle-radius': 5,
              'circle-color': '#ffffff',
              'circle-stroke-color': '#f97316',
              'circle-stroke-width': 2,
            },
          },
        ],
        ...props,
      });
    },
    ({ map }) => {
      const eventTarget = getMapEventTarget(map);
      if (!eventTarget) return;
      if (onCreate) {
        eventTarget.on('draw.create', onCreate as any);
      }
      if (onUpdate) {
        eventTarget.on('draw.update', onUpdate as any);
      }
      if (onDelete) {
        eventTarget.on('draw.delete', onDelete as any);
      }
    },
    ({ map }) => {
      const eventTarget = getMapEventTarget(map);
      if (!eventTarget) return;
      if (onCreate) {
        eventTarget.off('draw.create', onCreate as any);
      }
      if (onUpdate) {
        eventTarget.off('draw.update', onUpdate as any);
      }
      if (onDelete) {
        eventTarget.off('draw.delete', onDelete as any);
      }
    },
    { position }
  );

  return null;
}
