import { formatNumber } from "../utils/format.js";

function concreteCompressionComponents(geometry, fc, a) {
  const stress = 0.85 * fc;

  if (a <= geometry.hf) {
    return [
      {
        label: "flange-block",
        area: geometry.bf * a,
        force: stress * geometry.bf * a,
        centroidY: a / 2
      }
    ];
  }

  return [
    {
      label: "web-block",
      area: geometry.bw * a,
      force: stress * geometry.bw * a,
      centroidY: a / 2
    },
    {
      label: "flange-overhang",
      area: (geometry.bf - geometry.bw) * geometry.hf,
      force: stress * (geometry.bf - geometry.bw) * geometry.hf,
      centroidY: geometry.hf / 2
    }
  ];
}

function concreteCompressionResultant(geometry, fc, a) {
  const components = concreteCompressionComponents(geometry, fc, a);
  const force = components.reduce((total, component) => total + component.force, 0);
  const centroidY =
    components.reduce((total, component) => total + component.force * component.centroidY, 0) /
    Math.max(force, 1e-9);

  return {
    components,
    force,
    centroidY
  };
}

function steelStress(strain, es, fy) {
  return Math.max(-fy, Math.min(fy, strain * es));
}

function evaluateSection(c, geometry, materials, reinforcement) {
  const a = geometry.beta1 * c;
  const concrete = concreteCompressionResultant(geometry, materials.fc, a);
  const tensionStrain = 0.003 * (geometry.d - c) / c;
  const tensionStress = steelStress(tensionStrain, materials.es, materials.fy);
  const tensionForce = reinforcement.tensionArea * tensionStress;

  const compressionStrain = 0.003 * (c - geometry.dPrime) / c;
  const compressionStress = steelStress(compressionStrain, materials.es, materials.fy);
  const displacedConcreteStress = a >= geometry.dPrime ? 0.85 * materials.fc : 0;
  const compressionSteelForce =
    reinforcement.compressionArea * (compressionStress - displacedConcreteStress);

  return {
    a,
    c,
    concrete,
    tensionStrain,
    tensionStress,
    tensionForce,
    compressionStrain,
    compressionStress,
    compressionSteelForce,
    forceResidual: concrete.force + compressionSteelForce - tensionForce
  };
}

function solveNeutralAxis(geometry, materials, reinforcement) {
  let low = 0.1;
  let high = Math.max(geometry.h * 1.6, geometry.d * 1.5, 10);
  let lowEval = evaluateSection(low, geometry, materials, reinforcement);
  let highEval = evaluateSection(high, geometry, materials, reinforcement);

  for (let index = 0; index < 12 && lowEval.forceResidual * highEval.forceResidual > 0; index += 1) {
    high *= 1.5;
    highEval = evaluateSection(high, geometry, materials, reinforcement);
  }

  let middleEval = highEval;
  for (let index = 0; index < 80; index += 1) {
    const middle = (low + high) / 2;
    middleEval = evaluateSection(middle, geometry, materials, reinforcement);

    if (Math.abs(middleEval.forceResidual) < 1e-6) {
      break;
    }

    if (lowEval.forceResidual * middleEval.forceResidual <= 0) {
      high = middle;
      highEval = middleEval;
    } else {
      low = middle;
      lowEval = middleEval;
    }
  }

  return middleEval;
}

function buildFlexureSteps(result, geometry, materials, reinforcement, state) {
  const compressionTerm =
    result.sectionCase === "flange"
      ? "0.85 f'_c b_f a"
      : "0.85 f'_c [b_w a + (b_f - b_w) h_f]";
  const steelCompressionLabel = reinforcement.compressionArea
    ? "+ A'_s(f'_s - 0.85 f'_c)"
    : "";
  const momentExpression =
    result.sectionCase === "flange"
      ? "M_n = C_c\\left(d - \\frac{a}{2}\\right) + C'_s(d - d')"
      : "M_n = C_w\\left(d - \\frac{a}{2}\\right) + C_f\\left(d - \\frac{h_f}{2}\\right) + C'_s(d - d')";

  return [
    {
      title: "Reinforcement areas",
      equation: `A_s = ${state.reinforcement.tensionBarCount}\\times${formatNumber(
        reinforcement.tensionBar.area,
        2
      )} = ${formatNumber(reinforcement.tensionArea, 2)}\\ \\mathrm{in^2}`,
      detail: `A'_s = ${formatNumber(reinforcement.compressionArea, 2)}\\ \\mathrm{in^2},\\quad \\beta_1 = ${formatNumber(
        geometry.beta1,
        2
      )}`
    },
    {
      title: "Neutral axis from strain compatibility",
      equation: `${compressionTerm} ${steelCompressionLabel} = A_s f_s`,
      detail: `c = ${formatNumber(result.c, 2)}\\ \\mathrm{in},\\quad a = \\beta_1 c = ${formatNumber(
        result.a,
        2
      )}\\ \\mathrm{in}`
    },
    {
      title: "Internal forces",
      equation: `T = A_s f_s = ${formatNumber(result.tensionForce, 1)}\\ \\mathrm{k},\\quad C = ${formatNumber(
        result.concreteForce + result.compressionSteelForce,
        1
      )}\\ \\mathrm{k}`,
      detail: `f_s = ${formatNumber(result.tensionStress, 1)}\\ \\mathrm{ksi},\\quad f'_s = ${formatNumber(
        result.compressionStress,
        1
      )}\\ \\mathrm{ksi}`
    },
    {
      title: "Nominal flexural resistance",
      equation: momentExpression,
      detail: `M_n = ${formatNumber(result.mnKipFt, 1)}\\ \\mathrm{k\\!-\!ft},\\quad \\phi M_n = 0.90\\times${formatNumber(
        result.mnKipFt,
        1
      )} = ${formatNumber(result.phiMnKipFt, 1)}\\ \\mathrm{k\\!-\!ft}`
    }
  ];
}

export function computeFlexuralCapacity({ state, geometry, reinforcement }) {
  const materials = {
    fc: Math.max(2.5, Number(state.materials.fc) || 0),
    fy: Math.max(40, Number(state.materials.fy) || 0),
    es: Math.max(20000, Number(state.materials.es) || 0)
  };

  const solved = solveNeutralAxis(geometry, materials, reinforcement);
  const concreteMoment =
    solved.concrete.components.reduce(
      (total, component) => total + component.force * (geometry.d - component.centroidY),
      0
    );
  const steelMoment = solved.compressionSteelForce * (geometry.d - geometry.dPrime);
  const mnKipIn = concreteMoment + steelMoment;
  const tensionForce = Math.max(solved.tensionForce, 1e-9);
  const sectionCase = solved.a <= geometry.hf ? "flange" : "web";
  const leverArm = mnKipIn / tensionForce;
  const phi = 0.9;

  const result = {
    ...solved,
    concreteForce: solved.concrete.force,
    concreteCentroidY: solved.concrete.centroidY,
    mnKipIn,
    mnKipFt: mnKipIn / 12,
    phiMnKipFt: (mnKipIn / 12) * phi,
    phi,
    leverArm,
    sectionCase,
    tensionYielded: Math.abs(solved.tensionStress) >= materials.fy - 1e-6,
    compressionYielded: Math.abs(solved.compressionStress) >= materials.fy - 1e-6,
    tensionControlled: solved.tensionStrain >= 0.005
  };

  result.steps = buildFlexureSteps(result, geometry, materials, reinforcement, state);
  return result;
}

