export const STORAGE_KEY = "tbeam-project-state";

export const DEFAULT_STATE = {
  project: {
    name: "TBeam Trial Design",
    designer: "Bridge Structures Group",
    date: new Date().toISOString().slice(0, 10),
    notes: "Cast-in-place bridge T-beam capacity study."
  },
  geometry: {
    bf: 96,
    hf: 8,
    bw: 14,
    h: 44,
    cover: 2.5,
    layerSpacing: 2,
    manualEffectiveDepth: false,
    effectiveDepthOverride: 40
  },
  materials: {
    fc: 5,
    fy: 60,
    es: 29000
  },
  reinforcement: {
    tensionBarSize: "#9",
    tensionBarCount: 8,
    tensionLayers: 2,
    compressionEnabled: true,
    compressionBarSize: "#6",
    compressionBarCount: 2,
    stirrupBarSize: "#4",
    stirrupLegs: 2,
    stirrupSpacing: 8,
    shearBeta: 2.31,
    shearThetaDeg: 34
  }
};

