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

function layerEquationLabel(layer) {
  return `${layer.family === "bottom" ? "\\mathrm{bot}" : "\\mathrm{top}"},${layer.index + 1}`;
}

function formatLayerResponses(layers, valueFormatter) {
  return layers.map((layer) => valueFormatter(layer)).filter(Boolean);
}

function buildFlexureSteps(result, geometry, reinforcement, materials) {
  const compressionEquation =
    result.sectionCase === "flange"
      ? "C_c = 0.85 f'_c b_f a"
      : "C_c = 0.85 f'_c\\left[b_w a + (b_f - b_w)h_f\\right]";

  const compressionSubstitution =
    result.sectionCase === "flange"
      ? `C_c = 0.85(${formatNumber(materials.fc, 2)})(${formatNumber(geometry.bf, 2)})(${formatNumber(result.a, 3)}) = ${formatNumber(result.concreteMagnitude, 2)}\\ \\mathrm{k}`
      : `C_c = 0.85(${formatNumber(materials.fc, 2)})\\left[(${formatNumber(geometry.bw, 2)})(${formatNumber(result.a, 3)}) + (${formatNumber(geometry.bf - geometry.bw, 2)})(${formatNumber(geometry.hf, 2)})\\right] = ${formatNumber(result.concreteMagnitude, 2)}\\ \\mathrm{k}`;

  const layerStrainStressEquations = formatLayerResponses(result.steelLayers, (layer) => {
    const label = layerEquationLabel(layer);
    return `\\varepsilon_{s,${label}} = ${formatNumber(layer.strain, 5)},\\qquad f_{s,${label}} = ${formatNumber(layer.stress, 1)}\\ \\mathrm{ksi}`;
  });

  const layerForceEquations = formatLayerResponses(result.steelLayers, (layer) => {
    const label = layerEquationLabel(layer);
    const displacedStress = layer.depth <= result.a ? ` - 0.85(${formatNumber(materials.fc, 2)})` : "";
    return `F_{s,${label}} = (${formatNumber(layer.area, 2)})\\left(${formatNumber(layer.stress, 1)}${displacedStress}\\right) = ${formatNumber(layer.netForce, 2)}\\ \\mathrm{k}`;
  });

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
        "The solved neutral axis defines whether the equivalent Whitney block remains in the flange or penetrates into the web.",
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
      substitutions: layerStrainStressEquations,
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
        "F_{s,i} = A_{s,i}\\left(f_{s,i} - 0.85f'_c\\right)\\quad\\text{for steel inside the compression block}",
        "\\sum F = \\sum T_i - C_c - \\sum C_{s,j} = 0"
      ],
      substitutions: [
        compressionSubstitution,
        ...layerForceEquations,
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
        "Once the force couple is in equilibrium, the nominal moment is reported from the compression and tension resultants and their lever arm.",
      equations: [
        "y_C = \\frac{C_cy_{Cc} + \\sum C_{s,j}y_j}{C_c + \\sum C_{s,j}}",
        "y_T = \\frac{\\sum T_iy_i}{\\sum T_i}",
        "z = y_T - y_C",
        "M_n = Tz"
      ],
      substitutions: [
        `y_C = ${formatNumber(result.compressionResultantDepth, 2)}\\ \\mathrm{in},\\quad y_T = ${formatNumber(
          result.tensionResultantDepth,
          2
        )}\\ \\mathrm{in},\\quad z = ${formatNumber(result.leverArm, 2)}\\ \\mathrm{in}`,
        `M_n = \\frac{(${formatNumber(result.totalTension, 2)})(${formatNumber(result.leverArm, 2)})}{12} = ${formatNumber(result.mnKipFt, 2)}\\ \\mathrm{k\\!-\!ft}`,
        `\\phi M_n = 0.90\\times ${formatNumber(
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

  result.steps = buildFlexureSteps(result, geometry, reinforcement, materials);
  return result;
}
