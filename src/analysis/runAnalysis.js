import { deriveSectionGeometry } from "../geometry/section.js";
import { deriveReinforcement } from "../reinforcement/layout.js";
import { computeFlexuralCapacity } from "../flexure/engine.js";
import { computeShearCapacity } from "../shear/engine.js";
import { normalizeState } from "../state/normalize.js";

export function runAnalysis(inputState) {
  const state = normalizeState(inputState);
  const reinforcement = deriveReinforcement(state);
  const geometry = deriveSectionGeometry(state, reinforcement);
  const flexure = computeFlexuralCapacity({ state, geometry, reinforcement });
  const shear = computeShearCapacity({ state, geometry, reinforcement, flexure });

  const messages = [];

  if (geometry.hf >= geometry.h * 0.5) {
    messages.push({
      type: "warning",
      text: "Flange thickness is relatively deep compared with total section depth. Verify the modeled T-beam geometry."
    });
  }

  if (geometry.d <= geometry.hf) {
    messages.push({
      type: "error",
      text: "Effective depth falls inside the flange. Increase member depth or revise the bottom reinforcement layout."
    });
  }

  reinforcement.bottomLayers.forEach((layer) => {
    if (layer.depth <= geometry.hf) {
      messages.push({
        type: "warning",
        text: `Bottom layer ${layer.index + 1} is unusually high in the section. Review cover and bottom layer spacing.`
      });
    }
    if (layer.horizontalClearSpacing < 1) {
      messages.push({
        type: "warning",
        text: `Bottom layer ${layer.index + 1} has less than 1.0 in horizontal clear spacing inside the web cage.`
      });
    }
    if (layer.depth >= geometry.h - geometry.cover || layer.depth <= geometry.cover) {
      messages.push({
        type: "warning",
        text: `Bottom layer ${layer.index + 1} is approaching the concrete cover boundary. Review the layer geometry or manual d override.`
      });
    }
  });

  reinforcement.topLayers.forEach((layer) => {
    if (layer.horizontalClearSpacing < 1) {
      messages.push({
        type: "warning",
        text: `Top layer ${layer.index + 1} has less than 1.0 in horizontal clear spacing inside the web cage.`
      });
    }
    if (layer.depth >= geometry.h - geometry.cover || layer.depth <= geometry.cover) {
      messages.push({
        type: "warning",
        text: `Top layer ${layer.index + 1} is approaching the concrete cover boundary. Review top cover and layer spacing.`
      });
    }
  });

  if (!flexure.tensionControlled) {
    messages.push({
      type: "warning",
      text: "The computed tensile strain is below 0.005, so the section is not clearly tension-controlled."
    });
  }

  if (shear.controlsLimit) {
    messages.push({
      type: "warning",
      text: "Shear resistance is capped by the AASHTO web crushing limit 0.25 f'c bw dv."
    });
  }

  if (!messages.length) {
    messages.push({
      type: "info",
      text: "Inputs are coordinated and the T-beam capacity workflow is ready for reporting."
    });
  }

  return {
    state,
    reinforcement,
    geometry,
    flexure,
    shear,
    messages,
    assumptions: [
      "Flexure uses strain compatibility with 0.003 extreme concrete strain and a Whitney stress block per AASHTO LRFD.",
      "Each top and bottom reinforcement layer is evaluated at its actual centroid depth for force equilibrium and moment resistance.",
      "Shear resistance uses AASHTO LRFD beta-theta equations with user-editable beta and theta parameters.",
      "Strength reduction factors use phi = 0.90 for flexure and shear in this normal-weight reinforced concrete workflow."
    ]
  };
}
