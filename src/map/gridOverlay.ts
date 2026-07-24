import { Coordinate, snapToGridCenter } from "../lib/sixd";

type OverlayState = {
  gridLines: any[];
  selectedBoxes: any[];
};

export function createGridOverlay(google: any, map: any) {
  const state: OverlayState = {
    gridLines: [],
    selectedBoxes: [],
  };

  const clearGridLines = () => {
    state.gridLines.forEach((line) => line.setMap(null));
    state.gridLines = [];
  };

  const clearSelectedBoxes = () => {
    state.selectedBoxes.forEach((box) => box.setMap(null));
    state.selectedBoxes = [];
  };

  const getGridSpacingForZoom = () => {
    const zoom = map.getZoom() ?? 0;
    if (zoom >= 17) return 0.0001;
    if (zoom >= 13) return 0.01;
    return null;
  };

  const updateDynamicGrid = () => {
    clearGridLines();
    const spacing = getGridSpacingForZoom();
    const bounds = map.getBounds();
    if (!spacing || !bounds) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const gridStyle = {
      strokeColor: "#006CE3",
      strokeOpacity: spacing === 0.0001 ? 0.16 : 0.12,
      strokeWeight: spacing === 0.0001 ? 0.7 : 1,
      clickable: false,
      map,
      zIndex: 20,
    };

    for (let lat = Math.floor(sw.lat() / spacing) * spacing; lat < ne.lat(); lat += spacing) {
      state.gridLines.push(new google.maps.Polyline({
        ...gridStyle,
        path: [{ lat, lng: sw.lng() }, { lat, lng: ne.lng() }],
      }));
    }

    for (let lng = Math.floor(sw.lng() / spacing) * spacing; lng < ne.lng(); lng += spacing) {
      state.gridLines.push(new google.maps.Polyline({
        ...gridStyle,
        path: [{ lat: sw.lat(), lng }, { lat: ne.lat(), lng }],
      }));
    }
  };

  const drawSelectedBoxes = (coordinate: Coordinate) => {
    clearSelectedBoxes();
    const snapped = snapToGridCenter(coordinate);
    const styles = [
      { scale: 100, strokeColor: "#FF7A1A", strokeOpacity: 0.58, fillOpacity: 0, zIndex: 31 },
      { scale: 1000, strokeColor: "#00B8FF", strokeOpacity: 0.6, fillOpacity: 0, zIndex: 32 },
      { scale: 10000, strokeColor: "#006CE3", strokeOpacity: 0.95, fillOpacity: 0.16, zIndex: 33 },
    ];

    styles.forEach((style) => {
      const cellSize = 1 / style.scale;
      const south = Math.floor(snapped.lat * style.scale) / style.scale;
      const west = Math.floor(snapped.lng * style.scale) / style.scale;
      state.selectedBoxes.push(new google.maps.Rectangle({
        ...style,
        strokeWeight: style.scale === 10000 ? 2 : 1.25,
        fillColor: style.strokeColor,
        map,
        clickable: false,
        bounds: {
          south,
          west,
          north: south + cellSize,
          east: west + cellSize,
        },
      }));
    });
  };

  const destroy = () => {
    clearGridLines();
    clearSelectedBoxes();
  };

  return {
    updateDynamicGrid,
    drawSelectedBoxes,
    clearSelectedBoxes,
    destroy,
  };
}
