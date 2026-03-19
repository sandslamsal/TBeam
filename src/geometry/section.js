import { clamp } from "../utils/format.js";

export function getBeta1(fc) {
  return clamp(0.85 - Math.max(0, fc - 4) * 0.05, 0.65, 0.85);
}

export function deriveSectionGeometry(state, reinforcement) {
  const rawH = Math.max(8, Number(state.geometry.h) || 0);
  const hf = clamp(Number(state.geometry.hf) || 0, 1, rawH - 0.5);
  const bf = Math.max(12, Number(state.geometry.bf) || 0);
  const bw = clamp(Number(state.geometry.bw) || 0, 6, bf);
  const cover = Math.max(1, Number(state.geometry.cover) || 0);
  const manualEffectiveDepth = Boolean(state.geometry.manualEffectiveDepth);
  const effectiveDepth = manualEffectiveDepth
    ? clamp(Number(state.geometry.effectiveDepthOverride) || reinforcement.effectiveDepthAuto, 1, rawH - 0.5)
    : reinforcement.effectiveDepthAuto;

  return {
    bf,
    hf,
    bw,
    h: rawH,
    webDepth: rawH - hf,
    cover,
    d: effectiveDepth,
    dPrime: reinforcement.compressionCentroid,
    grossArea: bf * hf + bw * (rawH - hf),
    beta1: getBeta1(Number(state.materials.fc) || 0),
    manualEffectiveDepth
  };
}

