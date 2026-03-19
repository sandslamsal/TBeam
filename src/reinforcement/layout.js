import { getBarProperties } from "../data/rebar.js";
import { clamp, sum } from "../utils/format.js";

export function distributeBars(totalBars, requestedLayers) {
  const safeBars = Math.max(1, Math.round(totalBars || 0));
  const safeLayers = clamp(Math.round(requestedLayers || 1), 1, safeBars);
  const base = Math.floor(safeBars / safeLayers);
  const remainder = safeBars % safeLayers;

  return Array.from({ length: safeLayers }, (_, index) => base + (index < remainder ? 1 : 0)).filter(
    (count) => count > 0
  );
}

export function deriveReinforcement(state) {
  const tensionBar = getBarProperties(state.reinforcement.tensionBarSize);
  const compressionBar = getBarProperties(state.reinforcement.compressionBarSize);
  const stirrupBar = getBarProperties(state.reinforcement.stirrupBarSize);

  const tensionLayerCounts = distributeBars(
    state.reinforcement.tensionBarCount,
    state.reinforcement.tensionLayers
  );
  const layerPitch = tensionBar.diameter + Math.max(0, Number(state.geometry.layerSpacing) || 0);
  const firstLayerFromBottom = Math.max(0.5, Number(state.geometry.cover) || 0) +
    stirrupBar.diameter +
    tensionBar.diameter / 2;

  const tensionLayerBottomDistances = tensionLayerCounts.map(
    (_, index) => firstLayerFromBottom + index * layerPitch
  );

  const weightedBottomDistance =
    sum(
      tensionLayerCounts.map((count, index) => count * tensionLayerBottomDistances[index])
    ) / Math.max(1, sum(tensionLayerCounts));

  const effectiveDepthAuto = Math.max(
    1,
    (Number(state.geometry.h) || 1) - weightedBottomDistance
  );

  const compressionCentroid =
    Math.max(0.5, Number(state.geometry.cover) || 0) +
    stirrupBar.diameter +
    compressionBar.diameter / 2;

  const tensionArea = Math.max(1, Number(state.reinforcement.tensionBarCount) || 0) * tensionBar.area;
  const compressionArea = state.reinforcement.compressionEnabled
    ? Math.max(0, Number(state.reinforcement.compressionBarCount) || 0) * compressionBar.area
    : 0;
  const shearArea = Math.max(0, Number(state.reinforcement.stirrupLegs) || 0) * stirrupBar.area;

  return {
    tensionBar,
    compressionBar,
    stirrupBar,
    tensionLayerCounts,
    tensionLayerBottomDistances,
    effectiveDepthAuto,
    compressionCentroid,
    tensionArea,
    compressionArea,
    shearArea,
    layerPitch
  };
}

