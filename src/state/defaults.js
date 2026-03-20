export const STORAGE_KEY = "tbeam-project-state";

export const DEFAULT_STATE = {
  project: {
    name: "TBeam Trial Design",
    designer: "SL",
    date: new Date().toISOString().slice(0, 10),
    checkedBy: "N/A",
    checkedDate: new Date().toISOString().slice(0, 10),
    companyName: "Bridge Structures Group",
    companyLogoDataUrl: "",
    companyLogoFilename: "",
    notes: "Cast-in-place bridge T-beam capacity study."
  },
  geometry: {
    bf: 96,
    hf: 8,
    bw: 14,
    h: 44,
    cover: 2.5,
    manualEffectiveDepth: false,
    effectiveDepthOverride: 40
  },
  materials: {
    fc: 5,
    fy: 60,
    es: 29000
  },
  reinforcement: {
    bottomLayerSpacing: 2,
    topLayerSpacing: 2,
    bottomLayers: [
      { barSize: "#9", barCount: 4 },
      { barSize: "#9", barCount: 4 }
    ],
    topLayers: [
      { barSize: "#6", barCount: 2 }
    ],
    stirrupBarSize: "#4",
    stirrupLegs: 2,
    stirrupSpacing: 8,
    shearBeta: 2.31,
    shearThetaDeg: 34
  }
};
