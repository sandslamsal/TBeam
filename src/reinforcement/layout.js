import { getBarProperties } from "../data/rebar.js";
import { clamp, sum } from "../utils/format.js";

function distributeCenters(barCount, availableWidth) {
  if (barCount <= 1 || availableWidth <= 0) {
    return [0];
  }

  const start = -availableWidth / 2;
  const step = availableWidth / (barCount - 1);
  return Array.from({ length: barCount }, (_, index) => start + index * step);
}

function enrichLayerSeries({
  layers,
  family,
  clearSpacing,
  h,
  cover,
  stirrupDiameter,
  bw
}) {
  const enrichedLayers = [];
  let previousDepth = null;
  let previousDiameter = null;
  let previousBottomDistance = null;

  layers.forEach((layer, index) => {
    const bar = getBarProperties(layer.barSize);
    const area = bar.area * layer.barCount;
    let depth;
    let bottomDistance;

    if (family === "bottom") {
      bottomDistance =
        index === 0
          ? cover + stirrupDiameter + bar.diameter / 2
          : previousBottomDistance + previousDiameter / 2 + clearSpacing + bar.diameter / 2;
      depth = h - bottomDistance;
      previousBottomDistance = bottomDistance;
    } else {
      depth =
        index === 0
          ? cover + stirrupDiameter + bar.diameter / 2
          : previousDepth + previousDiameter / 2 + clearSpacing + bar.diameter / 2;
      bottomDistance = h - depth;
    }

    previousDepth = depth;
    previousDiameter = bar.diameter;

    const availableCenterWidth = Math.max(0, bw - 2 * (cover + stirrupDiameter + bar.diameter / 2));
    const xOffsets = distributeCenters(layer.barCount, availableCenterWidth);
    const horizontalClearSpacing =
      layer.barCount > 1 ? availableCenterWidth / (layer.barCount - 1) - bar.diameter : availableCenterWidth;

    enrichedLayers.push({
      index,
      family,
      barSize: layer.barSize,
      barCount: layer.barCount,
      areaPerBar: bar.area,
      area,
      diameter: bar.diameter,
      depth,
      bottomDistance,
      xOffsets,
      availableCenterWidth,
      horizontalClearSpacing
    });
  });

  const totalArea = sum(enrichedLayers.map((layer) => layer.area));
  const centroidDepth =
    totalArea > 0
      ? sum(enrichedLayers.map((layer) => layer.area * layer.depth)) / totalArea
      : family === "bottom"
        ? h
        : 0;

  return {
    layers: enrichedLayers,
    totalArea,
    centroidDepth
  };
}

export function deriveReinforcement(state) {
  const stirrupBar = getBarProperties(state.reinforcement.stirrupBarSize);
  const clearCover = Math.max(0.5, Number(state.geometry.cover) || 0);
  const h = Math.max(1, Number(state.geometry.h) || 1);
  const bw = Math.max(6, Number(state.geometry.bw) || 6);

  const bottom = enrichLayerSeries({
    layers: state.reinforcement.bottomLayers,
    family: "bottom",
    clearSpacing: Math.max(0, Number(state.reinforcement.bottomLayerSpacing) || 0),
    h,
    cover: clearCover,
    stirrupDiameter: stirrupBar.diameter,
    bw
  });

  if (state.geometry.manualEffectiveDepth) {
    const targetDepth = Math.max(1, Number(state.geometry.effectiveDepthOverride) || bottom.centroidDepth);
    const depthShift = targetDepth - bottom.centroidDepth;
    bottom.layers = bottom.layers.map((layer) => {
      const depth = layer.depth + depthShift;
      return {
        ...layer,
        depth,
        bottomDistance: h - depth
      };
    });
    bottom.centroidDepth = targetDepth;
  }

  const top = enrichLayerSeries({
    layers: state.reinforcement.topLayers,
    family: "top",
    clearSpacing: Math.max(0, Number(state.reinforcement.topLayerSpacing) || 0),
    h,
    cover: clearCover,
    stirrupDiameter: stirrupBar.diameter,
    bw
  });

  const effectiveDepthAuto = bottom.centroidDepth;
  const compressionCentroid = top.totalArea > 0 ? top.centroidDepth : clearCover + stirrupBar.diameter;
  const shearArea = Math.max(0, Number(state.reinforcement.stirrupLegs) || 0) * stirrupBar.area;

  return {
    stirrupBar,
    bottomLayers: bottom.layers,
    topLayers: top.layers,
    allLayers: [...top.layers, ...bottom.layers].sort((left, right) => left.depth - right.depth),
    bottomLayerSpacing: Math.max(0, Number(state.reinforcement.bottomLayerSpacing) || 0),
    topLayerSpacing: Math.max(0, Number(state.reinforcement.topLayerSpacing) || 0),
    effectiveDepthAuto,
    compressionCentroid,
    tensionArea: bottom.totalArea,
    compressionArea: top.totalArea,
    shearArea,
    totalBottomBars: sum(bottom.layers.map((layer) => layer.barCount)),
    totalTopBars: sum(top.layers.map((layer) => layer.barCount)),
    cageWidth: Math.max(
      0,
      bw - 2 * (clearCover + stirrupBar.diameter / 2)
    )
  };
}

export function layerInputSummary(layer, depth) {
  return `${layer.barCount} ${layer.barSize} @ y = ${depth.toFixed(2)} in`;
}
