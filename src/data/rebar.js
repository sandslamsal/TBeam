export const REBAR_DATABASE = {
  "#3": { area: 0.11, diameter: 0.375 },
  "#4": { area: 0.2, diameter: 0.5 },
  "#5": { area: 0.31, diameter: 0.625 },
  "#6": { area: 0.44, diameter: 0.75 },
  "#7": { area: 0.6, diameter: 0.875 },
  "#8": { area: 0.79, diameter: 1.0 },
  "#9": { area: 1.0, diameter: 1.128 },
  "#10": { area: 1.27, diameter: 1.27 },
  "#11": { area: 1.56, diameter: 1.41 },
  "#14": { area: 2.25, diameter: 1.693 },
  "#18": { area: 4.0, diameter: 2.257 }
};

export const BAR_OPTIONS = Object.keys(REBAR_DATABASE);

export function getBarProperties(barSize = "#4") {
  return REBAR_DATABASE[barSize] ?? REBAR_DATABASE["#4"];
}

