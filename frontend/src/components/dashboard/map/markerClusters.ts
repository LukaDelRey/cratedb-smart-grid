import type { ExpressionSpecification, GeoJSONSource, Map, MapLayerMouseEvent } from 'mapbox-gl';

export function addMarkerClusters(map: Map, sourceId: string) {
  const circleId = `${sourceId}-clusters`;
  const countId = `${sourceId}-cluster-count`;

  const glowId = `${sourceId}-cluster-glow`;
  // Escalate only when a substantial number AND share of pins need attention.
  const redMinimumPins = 5;
  const redMinimumShare = 0.5;
  const affectedCount: ExpressionSpecification = [
    '+',
    ['coalesce', ['get', 'critical'], 0],
    ['coalesce', ['get', 'warning'], 0],
  ];
  const color: ExpressionSpecification = [
    'case',
    ['all',
      ['>=', affectedCount, redMinimumPins],
      ['>=', affectedCount, ['*', ['get', 'point_count'], redMinimumShare]],
    ], '#ff3347',
    ['>', affectedCount, 0], '#ffad2f',
    ['>', ['coalesce', ['get', 'offline'], 0], 0], '#a8b6c4',
    '#71f23f',
  ];
  map.addLayer({
    id: glowId,
    type: 'circle',
    source: sourceId,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': color,
      'circle-radius': ['step', ['get', 'point_count'], 25, 100, 31, 1000, 38],
      'circle-opacity': 0.26,
      'circle-blur': 0.72,
    },
  });
  map.addLayer({
    id: circleId,
    type: 'circle',
    source: sourceId,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#050910',
      'circle-radius': ['step', ['get', 'point_count'], 18, 100, 23, 1000, 29],
      'circle-stroke-color': color,
      'circle-stroke-width': 2.5,
      'circle-opacity': 0.9,
    },
  });
  map.addLayer({
    id: countId,
    type: 'symbol',
    source: sourceId,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-size': 12,
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: { 'text-color': color, 'text-halo-color': '#02060b', 'text-halo-width': 1 },
  });

  const expand = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature || feature.geometry.type !== 'Point') return;
    const center = feature.geometry.coordinates as [number, number];
    const source = map.getSource(sourceId) as GeoJSONSource;
    source.getClusterExpansionZoom(Number(feature.properties?.cluster_id), (error, zoom) => {
      if (!error && zoom != null && map.getSource(sourceId) === source) {
        map.easeTo({ center, zoom });
      }
    });
  };
  const enter = () => { map.getCanvas().style.cursor = 'pointer'; };
  const leave = () => { map.getCanvas().style.cursor = ''; };
  map.on('click', circleId, expand);
  map.on('mouseenter', circleId, enter);
  map.on('mouseleave', circleId, leave);

  return () => {
    map.off('click', circleId, expand);
    map.off('mouseenter', circleId, enter);
    map.off('mouseleave', circleId, leave);
    if (map.getLayer(countId)) map.removeLayer(countId);
    if (map.getLayer(circleId)) map.removeLayer(circleId);
    if (map.getLayer(glowId)) map.removeLayer(glowId);
    leave();
  };
}
