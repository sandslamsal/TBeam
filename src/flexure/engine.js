import { formatNumber, sum } from "../utils/format.js";

function concreteCompressionComponents(geometry, fc, a) {
  const stress = 0.85 * fc;

  if (a <= geometry.hf) {
    return [
      {
        label: "flange-block",
        magnitude: stress * geometry.bf * a,
        centroidY: a / 2
      }
    ];
  }

  return [
    {
      label: "web-block",
      magnitude: stress * geometry.bw * a,
      centroidY: a / 2
    },
    {
      label: "flange-overhang",
      magnitude: stress * (geometry.bf - geometry.bw) * geometry.hf,
      centroidY: geometry.hf / 2
    }
  ];
}

function concreteCompressionResultant(geometry, fc, a) {
  const components = concreteCompressionComponents(geometry, fc, a);
  const magnitude = sum(components.map((component) => component.magnitude));
  const centroidY =
    sum(components.map((component) => component.magnitude * component.centroidY)) /
    Math.max(magnitude, 1e-9);

  return {
    components,
    magnitude,
    centroidY
  };
}

function steelStress(strain, es, fy) {
  return Math.max(-fy, Math.min(fy, strain * es));
}

function evaluateSection(c, geometry, materials, reinforcement) {
  const a = geometry.beta1 * c;
  const concrete = concreteCompressionResultant(geometry, materials.fc, a);
  const steelLayers = reinforcement.allLayers.map((layer) => {
    const strain = 0.003 * (layer.depth - c) / c;
    const stress = steelStress(strain, materials.es, materials.fy);
    const concreteEquivalentStress = layer.depth <= a ? -0.85 * materials.fc : 0;
    const netForce = layer.area * (stress - concreteEquivalentStress);

    return {
      ...layer,
      strain,
      stress,
      netForce,
      concreteEquivalentStress
    };
  });

  return {
    c,
    a,
    concrete,
    steelLayers,
    forceResidual: -concrete.magnitude + sum(steelLayers.map((layer) => layer.netForce))
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
  for (let index = 0; index < 100; index += 1) {
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

function formatLayerSchedule(layers) {
  return layers
    .map(
      (layer) =>
        `${layer.family === "bottom" ? "Bottom" : "Top"} L${layer.index + 1}: ${layer.barCount} ${layer.barSize} @ y = ${formatNumber(layer.depth, 2)} in`
    )
    .join(", ");
}

function buildFlexureSteps(result, geometry, reinforcement) {
  const compressionEquation =
    result.sectionCase === "flange"
      ? "C_c = 0.85 f'_c b_f a"
      : "C_c = 0.85 f'_c\\left[b_w a + (b_f - b_w)h_f\\right]";

  const topLayerStressText = result.steelLayers
    .filter((layer) => layer.family === "top")
    .map(
      (layer) =>
        `f_{s,\\mathrm{top},${layer.index + 1}} = ${formatNumber(layer.stress, 1)}\\ \\mathrm{ksi}`
    )
    .join(",\\ ");

  const bottomLayerStressText = result.steelLayers
    .filter((layer) => layer.family === "bottom")
    .map(
      (layer) =>
        `f_{s,\\mathrm{bot},${layer.index + 1}} = ${formatNumber(layer.stress, 1)}\\ \\mathrm{ksi}`
    )
    .join(",\\ ");

  return [
    {
      title: "Geometry and layer-derived reinforcement terms",
      narrative:
        "Steel centroids are derived from cover, stirrup diameter, bar diameter, and clear vertical spacing. The bottom-layer centroid defines the automatic effective depth.",
      equations: [
        "A_s = \\sum_i n_i A_{b,i}",
        "A'_s = \\sum_j n'_j A'_{b,j}",
        "d = \\frac{\\sum_i A_i y_i}{\\sum_i A_i},\\qquad d' = \\frac{\\sum_j A'_j y'_j}{\\sum_j A'_j}"
      ],
      substitutions: [
        `A_s = ${formatNumber(reinforcement.tensionArea, 2)}\\ \\mathrm{in^2},\\quad A'_s = ${formatNumber(
          reinforcement.compressionArea,
          2
        )}\\ \\mathrm{in^2}`,
        `d = ${formatNumber(geometry.d, 2)}\\ \\mathrm{in},\\quad d' = ${formatNumber(
          geometry.dPrime,
          2
        )}\\ \\mathrm{in},\\quad \\beta_1 = ${formatNumber(geometry.beta1, 2)}`
      ],
      values: [
        ["Bottom layer schedule", formatLayerSchedule(reinforcement.bottomLayers)],
        [
          "Top layer schedule",
          reinforcement.topLayers.length ? formatLayerSchedule(reinforcement.topLayers) : "No top reinforcement layers provided"
        ]
      ]
    },
    {
      title: "Compression-block regime",
      narrative:
        "The T-beam compression behavior is determined from the solved stress block depth. The app checks whether the equivalent stress block remains inside the flange or extends into the web.",
      equations: [
        "a = \\beta_1 c",
        "a \\le h_f\\ \\Rightarrow\\ \\text{flange compression only},\\qquad a > h_f\\ \\Rightarrow\\ \\text{flange + web compression}"
      ],
      substitutions: [
        `c = ${formatNumber(result.c, 3)}\\ \\mathrm{in},\\quad a = ${formatNumber(result.a, 3)}\\ \\mathrm{in},\\quad h_f = ${formatNumber(
          geometry.hf,
          2
        )}\\ \\mathrm{in}`
      ],
      values: [["Controlling case", result.sectionCase === "flange" ? "Compression block remains within the flange" : "Compression block extends below the flange into the web"]]
    },
    {
      title: "Strain compatibility and steel stresses",
      narrative:
        "Each reinforcement layer is evaluated independently using its actual centroid elevation. This allows multiple top and bottom layers to contribute correctly to the force equilibrium.",
      equations: [
        "\\varepsilon_{s,i} = 0.003\\left(\\frac{y_i - c}{c}\\right)",
        "f_{s,i} = \\operatorname{clamp}(E_s\\varepsilon_{s,i},\\ -f_y,\\ f_y)"
      ],
      substitutions: [
        bottomLayerStressText || "f_{s,\\mathrm{bot}} = 0",
        topLayerStressText || "No top steel stresses to evaluate"
      ],
      values: [
        ["Maximum tension strain", `${formatNumber(result.maxTensionStrain, 5)}`],
        ["Tension-controlled check", result.tensionControlled ? "Yes, epsilon_t >= 0.005" : "No, epsilon_t < 0.005"]
      ]
    },
    {
      title: "Force equilibrium",
      narrative:
        "Concrete compression and the net steel layer forces are summed until the section reaches equilibrium. Steel layers inside the stress block are reduced by the displaced 0.85f'c concrete stress.",
      equations: [
        compressionEquation,
        "\\sum T_i = C_c + \\sum C'_j"
      ],
      substitutions: [
        `C_c = ${formatNumber(result.concreteMagnitude, 2)}\\ \\mathrm{k}`,
        `\\sum T_i = ${formatNumber(result.totalTension, 2)}\\ \\mathrm{k},\\quad \\sum C'_j = ${formatNumber(
          result.compressionSteelMagnitude,
          2
        )}\\ \\mathrm{k},\\quad \\text{Residual} = ${formatNumber(result.forceResidual, 4)}\\ \\mathrm{k}`
      ],
      values: [
        ["Concrete compression resultant", `${formatNumber(result.concreteMagnitude, 2)} k @ y = ${formatNumber(result.concreteCentroidY, 2)} in`],
        ["Compression steel resultant", `${formatNumber(result.compressionSteelMagnitude, 2)} k`],
        ["Tension steel resultant", `${formatNumber(result.totalTension, 2)} k @ y = ${formatNumber(result.tensionResultantDepth, 2)} in`]
      ]
    },
    {
      title: "Nominal moment resistance",
      narrative:
        "The nominal moment is assembled from the signed internal forces acting at their actual depths. The resulting lever arm is measured between the compression and tension resultants.",
      equations: [
        "M_n = \\left|\\sum F_i y_i\\right|",
        "z = y_T - y_C"
      ],
      substitutions: [
        `y_C = ${formatNumber(result.compressionResultantDepth, 2)}\\ \\mathrm{in},\\quad y_T = ${formatNumber(
          result.tensionResultantDepth,
          2
        )}\\ \\mathrm{in},\\quad z = ${formatNumber(result.leverArm, 2)}\\ \\mathrm{in}`,
        `M_n = ${formatNumber(result.mnKipFt, 2)}\\ \\mathrm{k\\!-\!ft},\\quad \\phi M_n = 0.90\\times ${formatNumber(
          result.mnKipFt,
          2
        )} = ${formatNumber(result.phiMnKipFt, 2)}\\ \\mathrm{k\\!-\!ft}`
      ],
      values: [
        ["Nominal moment Mn", `${formatNumber(result.mnKipFt, 2)} k-ft`],
        ["Design moment phiMn", `${formatNumber(result.phiMnKipFt, 2)} k-ft`]
      ]
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
  const sectionCase = solved.a <= geometry.hf ? "flange" : "web";
  const tensionLayers = solved.steelLayers.filter((layer) => layer.netForce > 0);
  const compressionSteelLayers = solved.steelLayers.filter((layer) => layer.netForce < 0);
  const totalTension = sum(tensionLayers.map((layer) => layer.netForce));
  const compressionSteelMagnitude = sum(compressionSteelLayers.map((layer) => -layer.netForce));
  const totalCompression = solved.concrete.magnitude + compressionSteelMagnitude;
  const tensionResultantDepth =
    totalTension > 0
      ? sum(tensionLayers.map((layer) => layer.netForce * layer.depth)) / totalTension
      : geometry.d;
  const compressionResultantDepth =
    totalCompression > 0
      ? (solved.concrete.magnitude * solved.concrete.centroidY +
          sum(compressionSteelLayers.map((layer) => -layer.netForce * layer.depth))) /
        totalCompression
      : solved.concrete.centroidY;
  const signedMoment =
    -solved.concrete.magnitude * solved.concrete.centroidY +
    sum(solved.steelLayers.map((layer) => layer.netForce * layer.depth));
  const mnKipIn = Math.abs(signedMoment);
  const leverArm = Math.max(0, tensionResultantDepth - compressionResultantDepth);
  const maxTensionStrain = Math.max(
    0,
    ...solved.steelLayers.map((layer) => layer.strain)
  );
  const phi = 0.9;

  const result = {
    ...solved,
    concreteMagnitude: solved.concrete.magnitude,
    concreteCentroidY: solved.concrete.centroidY,
    totalTension,
    compressionSteelMagnitude,
    totalCompression,
    tensionResultantDepth,
    compressionResultantDepth,
    leverArm,
    mnKipIn,
    mnKipFt: mnKipIn / 12,
    phi,
    phiMnKipFt: (mnKipIn / 12) * phi,
    sectionCase,
    tensionLayers,
    compressionSteelLayers,
    maxTensionStrain,
    tensionControlled: maxTensionStrain >= 0.005,
    compressionBlockBelowFlange: sectionCase === "web"
  };

  result.steps = buildFlexureSteps(result, geometry, reinforcement);
  return result;
}
