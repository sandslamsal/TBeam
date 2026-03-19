import { deriveSectionGeometry } from "../geometry/section.js";
import { deriveReinforcement } from "../reinforcement/layout.js";
import { computeFlexuralCapacity } from "../flexure/engine.js";
import { computeShearCapacity } from "../shear/engine.js";

export function runAnalysis(state) {
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
      text: "Effective depth falls inside the flange. Increase beam depth or revise reinforcement placement."
    });
  }
  if (!flexure.tensionControlled) {
    messages.push({
      type: "warning",
      text: "The computed tensile strain is below 0.005, so the section is not clearly tension-controlled."
    });
  }
  if (shear.controlsLimit) {
    messages.push({
      type: "warning",
      text: "Shear resistance is capped by the AASHTO web crushing limit 0.25 f'c b_w d_v."
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
      "Effective depth is computed from cover, stirrup size, bar size, and layer spacing unless manual override is enabled.",
      "Shear resistance uses AASHTO LRFD Eqs. 5.8.3.3-1 through -4 with user-editable beta and theta assumptions.",
      "Strength reduction factors use phi = 0.90 for flexure and shear in normal-weight reinforced concrete."
    ]
  };
}
