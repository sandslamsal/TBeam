import { clamp, formatNumber } from "../utils/format.js";

export function computeShearCapacity({ state, geometry, reinforcement, flexure }) {
  const fc = Math.max(2.5, Number(state.materials.fc) || 0);
  const fy = Math.max(40, Number(state.materials.fy) || 0);
  const beta = clamp(Number(state.reinforcement.shearBeta) || 2.31, 1, 3.2);
  const thetaDeg = clamp(Number(state.reinforcement.shearThetaDeg) || 34, 20, 45);
  const thetaRad = (thetaDeg * Math.PI) / 180;
  const stirrupSpacing = Math.max(1, Number(state.reinforcement.stirrupSpacing) || 0);
  const dv = Math.max(geometry.d - flexure.a / 2, 0.9 * geometry.d, 0.72 * geometry.h);
  const cotTheta = 1 / Math.tan(thetaRad);
  const alphaDeg = 90;
  const alphaRad = (alphaDeg * Math.PI) / 180;

  const vc = 0.0316 * beta * Math.sqrt(fc) * geometry.bw * dv;
  const vs =
    (reinforcement.shearArea * fy * dv * (cotTheta + 1 / Math.tan(alphaRad)) * Math.sin(alphaRad)) /
    stirrupSpacing;
  const vnRaw = vc + vs;
  const vnLimit = 0.25 * fc * geometry.bw * dv;
  const vn = Math.min(vnRaw, vnLimit);
  const phi = 0.9;

  return {
    beta,
    thetaDeg,
    dv,
    vc,
    vs,
    vn,
    vnRaw,
    vnLimit,
    phi,
    phiVn: phi * vn,
    controlsLimit: vnRaw > vnLimit + 1e-6,
    steps: [
      {
        title: "Effective shear depth and stirrup area",
        equation: `d_v = \\max\\left(d - \\frac{a}{2},\\ 0.9d,\\ 0.72h\\right) = ${formatNumber(
          dv,
          2
        )}\\ \\mathrm{in}`,
        detail: `A_v = ${Number(state.reinforcement.stirrupLegs) || 0}\\times${formatNumber(
          reinforcement.stirrupBar.area,
          2
        )} = ${formatNumber(reinforcement.shearArea, 2)}\\ \\mathrm{in^2}`
      },
      {
        title: "Concrete contribution",
        equation: `V_c = 0.0316\\beta\\sqrt{f'_c}b_w d_v`,
        detail: `V_c = 0.0316(${formatNumber(beta, 2)})\\sqrt{${formatNumber(
          fc,
          2
        )}}(${formatNumber(geometry.bw, 2)})(${formatNumber(dv, 2)}) = ${formatNumber(vc, 1)}\\ \\mathrm{k}`
      },
      {
        title: "Stirrup contribution",
        equation: `V_s = \\frac{A_v f_y d_v (\\cot\\theta + \\cot\\alpha)\\sin\\alpha}{s}`,
        detail: `V_s = \\frac{(${formatNumber(reinforcement.shearArea, 2)})(${formatNumber(
          fy,
          1
        )})(${formatNumber(dv, 2)})(\\cot ${formatNumber(thetaDeg, 1)}^\\circ)}{${formatNumber(
          stirrupSpacing,
          2
        )}} = ${formatNumber(vs, 1)}\\ \\mathrm{k}`
      },
      {
        title: "Nominal and design shear resistance",
        equation: `V_n = \\min\\left(V_c + V_s,\\ 0.25f'_c b_w d_v\\right)`,
        detail: `V_n = ${formatNumber(vn, 1)}\\ \\mathrm{k},\\quad \\phi V_n = 0.90\\times${formatNumber(
          vn,
          1
        )} = ${formatNumber(phi * vn, 1)}\\ \\mathrm{k}`
      }
    ],
    assumptionNote:
      "Beta and theta remain editable because this app evaluates member capacity without a separate factored demand-state strain analysis."
  };
}

