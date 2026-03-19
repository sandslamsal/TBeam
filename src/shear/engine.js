import { clamp, formatNumber } from "../utils/format.js";

function buildShearSteps(result, geometry, reinforcement, state) {
  return [
    {
      title: "Input and derived shear terms",
      narrative:
        "The effective web width, effective shear depth, transverse steel area, and LRFD shear parameters are assembled before the concrete and steel contributions are evaluated.",
      equations: [
        "d_v = \\max\\left(d - \\frac{a}{2},\\ 0.9d,\\ 0.72h\\right)",
        "A_v = n_{\\mathrm{legs}} A_b"
      ],
      substitutions: [
        `d_v = ${formatNumber(result.dv, 2)}\\ \\mathrm{in},\\quad d = ${formatNumber(
          geometry.d,
          2
        )}\\ \\mathrm{in},\\quad a = ${formatNumber(result.aReference, 2)}\\ \\mathrm{in}`,
        `A_v = ${Number(state.reinforcement.stirrupLegs) || 0}\\times ${formatNumber(
          reinforcement.stirrupBar.area,
          2
        )} = ${formatNumber(result.av, 2)}\\ \\mathrm{in^2}`
      ],
      values: [
        ["bw", `${formatNumber(geometry.bw, 2)} in`],
        ["f'c", `${formatNumber(state.materials.fc, 2)} ksi`],
        ["fy", `${formatNumber(state.materials.fy, 1)} ksi`],
        ["s", `${formatNumber(state.reinforcement.stirrupSpacing, 2)} in`],
        ["beta", `${formatNumber(result.beta, 2)}`],
        ["theta", `${formatNumber(result.thetaDeg, 1)} deg`]
      ]
    },
    {
      title: "Concrete shear contribution",
      narrative:
        "Concrete shear resistance is evaluated using the LRFD beta-theta expression with the effective web width and derived shear depth.",
      equations: ["V_c = 0.0316\\beta\\sqrt{f'_c}b_w d_v"],
      substitutions: [
        `V_c = 0.0316(${formatNumber(result.beta, 2)})\\sqrt{${formatNumber(
          state.materials.fc,
          2
        )}}(${formatNumber(geometry.bw, 2)})(${formatNumber(result.dv, 2)}) = ${formatNumber(
          result.vc,
          2
        )}\\ \\mathrm{k}`
      ],
      values: [["Concrete contribution Vc", `${formatNumber(result.vc, 2)} k`]]
    },
    {
      title: "Stirrup shear contribution",
      narrative:
        "For vertical stirrups the general LRFD expression reduces to a cot(theta)-based form with alpha = 90 degrees.",
      equations: [
        "V_s = \\frac{A_vf_yd_v(\\cot\\theta + \\cot\\alpha)\\sin\\alpha}{s}",
        "\\alpha = 90^\\circ\\ \\Rightarrow\\ V_s = \\frac{A_vf_yd_v\\cot\\theta}{s}"
      ],
      substitutions: [
        `V_s = \\frac{(${formatNumber(result.av, 2)})(${formatNumber(
          state.materials.fy,
          1
        )})(${formatNumber(result.dv, 2)})\\cot(${formatNumber(result.thetaDeg, 1)}^\\circ)}{${formatNumber(
          state.reinforcement.stirrupSpacing,
          2
        )}} = ${formatNumber(result.vs, 2)}\\ \\mathrm{k}`
      ],
      values: [["Steel contribution Vs", `${formatNumber(result.vs, 2)} k`]]
    },
    {
      title: "Nominal and design shear resistance",
      narrative:
        "The concrete and stirrup contributions are added, checked against the LRFD web crushing cap, and then reduced by phi to report the design capacity.",
      equations: [
        "V_{n,\\mathrm{raw}} = V_c + V_s",
        "V_n = \\min\\left(V_c + V_s,\\ 0.25f'_c b_w d_v\\right)",
        "\\phi V_n = 0.90V_n"
      ],
      substitutions: [
        `V_{n,\\mathrm{raw}} = ${formatNumber(result.vc, 2)} + ${formatNumber(result.vs, 2)} = ${formatNumber(result.vnRaw, 2)}\\ \\mathrm{k}`,
        `V_{\\mathrm{limit}} = 0.25(${formatNumber(state.materials.fc, 2)})(${formatNumber(geometry.bw, 2)})(${formatNumber(result.dv, 2)}) = ${formatNumber(result.vnLimit, 2)}\\ \\mathrm{k}`,
        `V_n = \\min\\left(${formatNumber(result.vnRaw, 2)},\\ ${formatNumber(
          result.vnLimit,
          2
        )}\\right) = ${formatNumber(result.vn, 2)}\\ \\mathrm{k}`,
        `\\phi V_n = 0.90\\times ${formatNumber(result.vn, 2)} = ${formatNumber(
          result.phiVn,
          2
        )}\\ \\mathrm{k}`
      ],
      values: [
        ["Nominal shear Vn", `${formatNumber(result.vn, 2)} k`],
        ["Design shear phiVn", `${formatNumber(result.phiVn, 2)} k`],
        ["Limit state", result.controlsLimit ? "Controlled by 0.25 f'c bw dv" : "Controlled by Vc + Vs"]
      ]
    }
  ];
}

export function computeShearCapacity({ state, geometry, reinforcement, flexure }) {
  const fc = Math.max(2.5, Number(state.materials.fc) || 0);
  const fy = Math.max(40, Number(state.materials.fy) || 0);
  const beta = clamp(Number(state.reinforcement.shearBeta) || 2.31, 1, 3.2);
  const thetaDeg = clamp(Number(state.reinforcement.shearThetaDeg) || 34, 20, 45);
  const thetaRad = (thetaDeg * Math.PI) / 180;
  const stirrupSpacing = Math.max(1, Number(state.reinforcement.stirrupSpacing) || 0);
  const dv = Math.max(geometry.d - flexure.a / 2, 0.9 * geometry.d, 0.72 * geometry.h);
  const cotTheta = 1 / Math.tan(thetaRad);
  const av = reinforcement.shearArea;
  const vc = 0.0316 * beta * Math.sqrt(fc) * geometry.bw * dv;
  const vs = (av * fy * dv * cotTheta) / stirrupSpacing;
  const vnRaw = vc + vs;
  const vnLimit = 0.25 * fc * geometry.bw * dv;
  const vn = Math.min(vnRaw, vnLimit);
  const phi = 0.9;

  const result = {
    beta,
    thetaDeg,
    dv,
    av,
    vc,
    vs,
    vn,
    vnRaw,
    vnLimit,
    phi,
    phiVn: phi * vn,
    controlsLimit: vnRaw > vnLimit + 1e-6,
    aReference: flexure.a,
    assumptionNote:
      "Beta and theta remain editable because this member-capacity workflow does not include a separate demand-state strain analysis."
  };

  result.steps = buildShearSteps(result, geometry, reinforcement, state);
  return result;
}
