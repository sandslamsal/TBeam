import { BAR_OPTIONS } from "../data/rebar.js";
import { DEFAULT_STATE } from "./defaults.js";

function normalizeBarSize(value, fallback) {
  return BAR_OPTIONS.includes(value) ? value : fallback;
}

function normalizeLayer(layer, fallbackSize, fallbackCount) {
  return {
    barSize: normalizeBarSize(layer?.barSize, fallbackSize),
    barCount: Math.max(1, Math.round(Number(layer?.barCount) || fallbackCount))
  };
}

function distributeLegacyLayers(totalBars, layerCount, barSize) {
  const safeBars = Math.max(1, Math.round(Number(totalBars) || 1));
  const safeLayers = Math.max(1, Math.min(safeBars, Math.round(Number(layerCount) || 1)));
  const base = Math.floor(safeBars / safeLayers);
  const remainder = safeBars % safeLayers;

  return Array.from({ length: safeLayers }, (_, index) =>
    normalizeLayer(
      {
        barSize,
        barCount: base + (index < remainder ? 1 : 0)
      },
      barSize,
      1
    )
  );
}

export function normalizeState(inputState) {
  const state = structuredClone(inputState ?? DEFAULT_STATE);

  state.project ||= {};
  state.project.name ??= DEFAULT_STATE.project.name;
  state.project.designer ??= DEFAULT_STATE.project.designer;
  state.project.date ??= DEFAULT_STATE.project.date;
  state.project.companyName ??= DEFAULT_STATE.project.companyName;
  state.project.companyLogoDataUrl ??= "";
  state.project.companyLogoFilename ??= "";
  state.project.notes ??= DEFAULT_STATE.project.notes;

  state.geometry ||= {};
  state.geometry.bf = Number(state.geometry.bf ?? DEFAULT_STATE.geometry.bf);
  state.geometry.hf = Number(state.geometry.hf ?? DEFAULT_STATE.geometry.hf);
  state.geometry.bw = Number(state.geometry.bw ?? DEFAULT_STATE.geometry.bw);
  state.geometry.h = Number(state.geometry.h ?? DEFAULT_STATE.geometry.h);
  state.geometry.cover = Number(state.geometry.cover ?? DEFAULT_STATE.geometry.cover);
  state.geometry.manualEffectiveDepth = Boolean(
    state.geometry.manualEffectiveDepth ?? DEFAULT_STATE.geometry.manualEffectiveDepth
  );
  state.geometry.effectiveDepthOverride = Number(
    state.geometry.effectiveDepthOverride ?? DEFAULT_STATE.geometry.effectiveDepthOverride
  );

  state.materials ||= {};
  state.materials.fc = Number(state.materials.fc ?? DEFAULT_STATE.materials.fc);
  state.materials.fy = Number(state.materials.fy ?? DEFAULT_STATE.materials.fy);
  state.materials.es = Number(state.materials.es ?? DEFAULT_STATE.materials.es);

  state.reinforcement ||= {};

  const legacyBottomLayers = distributeLegacyLayers(
    state.reinforcement.tensionBarCount ??
      DEFAULT_STATE.reinforcement.bottomLayers.reduce((total, layer) => total + layer.barCount, 0),
    state.reinforcement.tensionLayers ?? DEFAULT_STATE.reinforcement.bottomLayers.length,
    state.reinforcement.tensionBarSize ?? DEFAULT_STATE.reinforcement.bottomLayers[0].barSize
  );

  const legacyTopLayers =
    state.reinforcement.compressionEnabled === false ||
    (Number(state.reinforcement.compressionBarCount) || 0) <= 0
      ? []
      : distributeLegacyLayers(
          state.reinforcement.compressionBarCount,
          1,
          state.reinforcement.compressionBarSize ?? DEFAULT_STATE.reinforcement.topLayers[0].barSize
        );

  const nextBottomLayers =
    Array.isArray(state.reinforcement.bottomLayers) && state.reinforcement.bottomLayers.length
      ? state.reinforcement.bottomLayers
      : legacyBottomLayers;

  const nextTopLayers =
    Array.isArray(state.reinforcement.topLayers)
      ? state.reinforcement.topLayers
      : legacyTopLayers;

  state.reinforcement.bottomLayerSpacing = Number(
    state.reinforcement.bottomLayerSpacing ??
      state.geometry.layerSpacing ??
      DEFAULT_STATE.reinforcement.bottomLayerSpacing
  );
  state.reinforcement.topLayerSpacing = Number(
    state.reinforcement.topLayerSpacing ??
      state.geometry.layerSpacing ??
      DEFAULT_STATE.reinforcement.topLayerSpacing
  );
  state.reinforcement.bottomLayers = nextBottomLayers.map((layer) =>
    normalizeLayer(layer, DEFAULT_STATE.reinforcement.bottomLayers[0].barSize, 2)
  );
  state.reinforcement.topLayers = nextTopLayers.map((layer) =>
    normalizeLayer(layer, DEFAULT_STATE.reinforcement.topLayers[0]?.barSize ?? "#6", 2)
  );
  state.reinforcement.stirrupBarSize = normalizeBarSize(
    state.reinforcement.stirrupBarSize,
    DEFAULT_STATE.reinforcement.stirrupBarSize
  );
  state.reinforcement.stirrupLegs = Math.max(
    0,
    Math.round(Number(state.reinforcement.stirrupLegs ?? DEFAULT_STATE.reinforcement.stirrupLegs))
  );
  state.reinforcement.stirrupSpacing = Number(
    state.reinforcement.stirrupSpacing ?? DEFAULT_STATE.reinforcement.stirrupSpacing
  );
  state.reinforcement.shearBeta = Number(
    state.reinforcement.shearBeta ?? DEFAULT_STATE.reinforcement.shearBeta
  );
  state.reinforcement.shearThetaDeg = Number(
    state.reinforcement.shearThetaDeg ?? DEFAULT_STATE.reinforcement.shearThetaDeg
  );

  return state;
}
