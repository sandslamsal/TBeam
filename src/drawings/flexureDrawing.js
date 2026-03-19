import { formatNumber } from "../utils/format.js";

function panelFrame(x, y, width, height, title) {
  return `
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="18" class="diagram-panel" />
      <text x="${x + 16}" y="${y - 10}" class="drawing-panel-title">${title}</text>
    </g>
  `;
}

function leader(x1, y1, x2, y2, label) {
  return `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="callout-line" />
    <text x="${x2 + 6}" y="${y2 + 4}" class="drawing-label">${label}</text>
  `;
}

function horizontalDim(x1, x2, y, label) {
  return `
    <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="dim-arrow" marker-start="url(#dimArrowFlex)" marker-end="url(#dimArrowFlex)" />
    <line x1="${x1}" y1="${y + 2}" x2="${x1}" y2="${y + 18}" class="dim-extension" />
    <line x1="${x2}" y1="${y + 2}" x2="${x2}" y2="${y + 18}" class="dim-extension" />
    <text x="${(x1 + x2) / 2}" y="${y - 8}" class="dim-text dim-text--center">${label}</text>
  `;
}

function verticalDim(x, y1, y2, label) {
  return `
    <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" class="dim-arrow" marker-start="url(#dimArrowFlex)" marker-end="url(#dimArrowFlex)" />
    <text x="${x + 12}" y="${(y1 + y2) / 2 + 4}" class="dim-text">${label}</text>
  `;
}

function forceArrow(x1, y, x2, label, toneClass, textDx = 10) {
  return `
    <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="steel-stress-line ${toneClass}" marker-end="url(#stressArrowHead)" />
    <text x="${x2 + textDx}" y="${y + 4}" class="drawing-label">${label}</text>
  `;
}

function stressBlockMarkup(sectionCase, x, topY, aY, flangeHeight) {
  if (sectionCase === "flange") {
    return `<rect x="${x - 28}" y="${topY}" width="28" height="${Math.max(0, aY - topY)}" class="compression-block" />`;
  }

  return `
    <rect x="${x - 44}" y="${topY}" width="44" height="${flangeHeight}" class="compression-block" />
    <rect x="${x - 18}" y="${topY + flangeHeight}" width="18" height="${Math.max(0, aY - (topY + flangeHeight))}" class="compression-block" />
  `;
}

export function renderFlexureDrawing(snapshot) {
  const { geometry, reinforcement, flexure } = snapshot;
  const viewWidth = 1120;
  const viewHeight = 560;
  const margin = 34;
  const titleY = 46;
  const panelTop = 132;
  const panelGap = 22;
  const panelWidth = (viewWidth - margin * 2 - panelGap * 3) / 4;
  const panelHeight = 332;
  const panelXs = Array.from({ length: 4 }, (_, index) => margin + index * (panelWidth + panelGap));

  const sectionScale = Math.min((panelWidth - 60) / geometry.bf, (panelHeight - 90) / geometry.h);
  const sectionCenter = panelXs[0] + panelWidth / 2;
  const sectionTop = panelTop + 42;
  const sectionBottom = sectionTop + geometry.h * sectionScale;
  const neutralAxisY = sectionTop + flexure.c * sectionScale;
  const compressionBottomY = sectionTop + Math.min(flexure.a, geometry.h) * sectionScale;
  const compressionResultantY = sectionTop + flexure.compressionResultantDepth * sectionScale;
  const tensionResultantY = sectionTop + flexure.tensionResultantDepth * sectionScale;
  const flangeWidth = geometry.bf * sectionScale;
  const webWidth = geometry.bw * sectionScale;
  const flangeHeight = geometry.hf * sectionScale;

  const sectionBars = [...reinforcement.topLayers, ...reinforcement.bottomLayers]
    .flatMap((layer) =>
      layer.xOffsets.map((offset) => {
        const x = sectionCenter + offset * sectionScale;
        const y = sectionTop + layer.depth * sectionScale;
        const radius = Math.max(2.6, (layer.diameter * sectionScale) / 2);
        return `<circle cx="${x}" cy="${y}" r="${radius}" class="bar ${layer.family === "bottom" ? "bar--bottom" : "bar--top"}" />`;
      })
    )
    .join("");

  const strainAxisX = panelXs[1] + panelWidth / 2;
  const strainTopX = strainAxisX - 54;
  const strainBottomX = strainAxisX + 70;
  const stressAxisX = panelXs[2] + 96;
  const forceAxisX = panelXs[2] + panelWidth - 94;
  const flangeHeightSketch = Math.max(18, flangeHeight);
  const tensionForceArrows = flexure.tensionLayers
    .map((layer, index) => {
      const y = sectionTop + layer.depth * sectionScale;
      const length = Math.max(28, Math.min(70, Math.abs(layer.netForce) * 0.12));
      return forceArrow(forceAxisX - length, y, forceAxisX, `T${index + 1}`, "steel-stress-line--tension");
    })
    .join("");
  const compressionSteelArrows = flexure.compressionSteelLayers
    .map((layer, index) => {
      const y = sectionTop + layer.depth * sectionScale;
      const length = Math.max(22, Math.min(54, Math.abs(layer.netForce) * 0.14));
      return forceArrow(forceAxisX - length, y, forceAxisX, `Cs${index + 1}`, "steel-stress-line--compression");
    })
    .join("");

  const coupleAxisX = panelXs[3] + 86;
  const resultBoxX = panelXs[3] + 128;
  const resultRows = [
    ["C", `${formatNumber(flexure.totalCompression, 1)} k`],
    ["T", `${formatNumber(flexure.totalTension, 1)} k`],
    ["z", `${formatNumber(flexure.leverArm, 2)} in`],
    ["Mn", `${formatNumber(flexure.mnKipFt, 1)} k-ft`],
    ["phiMn", `${formatNumber(flexure.phiMnKipFt, 1)} k-ft`]
  ];

  return `
    <svg viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="Flexural strain compatibility diagram">
      <defs>
        <marker id="forceArrowFlex" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 z" fill="currentColor"></path>
        </marker>
        <marker id="stressArrowHead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="currentColor"></path>
        </marker>
        <marker id="dimArrowFlex" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
          <path d="M0,5 L10,0 L8,5 L10,10 z" fill="#355168"></path>
        </marker>
      </defs>

      <rect x="18" y="18" width="${viewWidth - 36}" height="${viewHeight - 36}" rx="20" class="drawing-frame" />
      <text x="${margin}" y="${titleY}" class="drawing-title">Flexural Strain Compatibility</text>
      <text x="${margin}" y="${titleY + 22}" class="drawing-subtitle">Textbook-style section, strain, stress, and force sketches referenced to the solved ${flexure.sectionCase === "flange" ? "flange compression block" : "flange-plus-web compression block"} condition</text>

      ${panelFrame(panelXs[0], panelTop, panelWidth, panelHeight, "1. Section")}
      ${panelFrame(panelXs[1], panelTop, panelWidth, panelHeight, "2. Strain")}
      ${panelFrame(panelXs[2], panelTop, panelWidth, panelHeight, "3. Stress / Forces")}
      ${panelFrame(panelXs[3], panelTop, panelWidth, panelHeight, "4. Resultant Couple")}

      <rect x="${sectionCenter - flangeWidth / 2}" y="${sectionTop}" width="${flangeWidth}" height="${flangeHeight}" class="section-outline section-fill" />
      <rect x="${sectionCenter - webWidth / 2}" y="${sectionTop + flangeHeight}" width="${webWidth}" height="${geometry.webDepth * sectionScale}" class="section-outline section-fill" />
      ${sectionBars}
      <line x1="${panelXs[0] + 16}" y1="${neutralAxisY}" x2="${panelXs[0] + panelWidth - 16}" y2="${neutralAxisY}" class="neutral-axis" />
      ${horizontalDim(sectionCenter - flangeWidth / 2, sectionCenter + flangeWidth / 2, sectionTop - 16, `b = ${formatNumber(geometry.bf, 1)} in`)}
      ${verticalDim(panelXs[0] + 18, sectionTop, sectionTop + flangeHeight, `hf = ${formatNumber(geometry.hf, 1)} in`)}
      ${verticalDim(panelXs[0] + 42, sectionTop, sectionTop + geometry.d * sectionScale, `d = ${formatNumber(geometry.d, 1)} in`)}
      ${leader(panelXs[0] + panelWidth - 26, neutralAxisY, panelXs[0] + panelWidth - 6, neutralAxisY - 16, "N.A.")}
      ${leader(sectionCenter - webWidth / 2 + 8, sectionBottom - 12, sectionCenter + webWidth / 2 + 12, sectionBottom + 20, "As")}

      <line x1="${strainAxisX}" y1="${sectionTop}" x2="${strainAxisX}" y2="${sectionBottom}" class="stress-axis" />
      <polygon points="${strainTopX},${sectionTop} ${strainAxisX},${neutralAxisY} ${strainBottomX},${sectionBottom}" class="strain-profile" />
      <line x1="${panelXs[1] + 18}" y1="${neutralAxisY}" x2="${panelXs[1] + panelWidth - 18}" y2="${neutralAxisY}" class="neutral-axis" />
      <text x="${strainTopX - 2}" y="${sectionTop - 10}" class="drawing-label">ec = 0.003</text>
      <text x="${strainBottomX - 4}" y="${sectionBottom + 18}" class="drawing-label">et = ${formatNumber(flexure.maxTensionStrain, 5)}</text>
      <text x="${strainAxisX + 10}" y="${compressionBottomY - 8}" class="drawing-label">a = ${formatNumber(flexure.a, 2)} in</text>
      <text x="${strainAxisX + 10}" y="${neutralAxisY - 8}" class="drawing-label">c = ${formatNumber(flexure.c, 2)} in</text>

      <line x1="${stressAxisX}" y1="${sectionTop}" x2="${stressAxisX}" y2="${sectionBottom}" class="stress-axis" />
      ${stressBlockMarkup(flexure.sectionCase, stressAxisX, sectionTop, compressionBottomY, flangeHeightSketch)}
      <line x1="${panelXs[2] + 16}" y1="${neutralAxisY}" x2="${panelXs[2] + panelWidth - 16}" y2="${neutralAxisY}" class="neutral-axis" />
      <text x="${stressAxisX - 60}" y="${sectionTop - 10}" class="drawing-label">0.85 f'c</text>
      <text x="${forceAxisX + 10}" y="${compressionResultantY + 4}" class="drawing-label">Cc</text>
      ${forceArrow(forceAxisX - 74, compressionResultantY, forceAxisX, "C", "steel-stress-line--compression")}
      ${compressionSteelArrows}
      ${tensionForceArrows}
      <text x="${panelXs[2] + 24}" y="${panelTop + panelHeight - 16}" class="drawing-note">${flexure.sectionCase === "flange" ? "Neutral axis in flange" : "Neutral axis in web"}</text>

      <line x1="${coupleAxisX}" y1="${compressionResultantY}" x2="${coupleAxisX}" y2="${tensionResultantY}" class="lever-arm-line" />
      <line x1="${coupleAxisX - 18}" y1="${compressionResultantY}" x2="${coupleAxisX + 18}" y2="${compressionResultantY}" class="lever-arm-cap" />
      <line x1="${coupleAxisX - 18}" y1="${tensionResultantY}" x2="${coupleAxisX + 18}" y2="${tensionResultantY}" class="lever-arm-cap" />
      <path d="M${coupleAxisX} ${compressionResultantY + 34} V ${compressionResultantY - 20}" class="force-arrow force-arrow--compression" marker-end="url(#forceArrowFlex)" />
      <path d="M${coupleAxisX} ${tensionResultantY - 34} V ${tensionResultantY + 20}" class="force-arrow force-arrow--tension" marker-end="url(#forceArrowFlex)" />
      <text x="${coupleAxisX + 24}" y="${compressionResultantY + 4}" class="drawing-label">C</text>
      <text x="${coupleAxisX + 24}" y="${tensionResultantY + 4}" class="drawing-label">T</text>
      <text x="${coupleAxisX + 24}" y="${(compressionResultantY + tensionResultantY) / 2 + 4}" class="drawing-label">z</text>

      <rect x="${resultBoxX}" y="${panelTop + 58}" width="${panelWidth - 144}" height="156" rx="16" class="info-box" />
      ${resultRows
        .map(
          ([label, value], index) => `
            <text x="${resultBoxX + 14}" y="${panelTop + 84 + index * 26}" class="drawing-label">${label}</text>
            <text x="${resultBoxX + 58}" y="${panelTop + 84 + index * 26}" class="drawing-label">${value}</text>
          `
        )
        .join("")}

      <text x="${margin}" y="${viewHeight - 26}" class="drawing-note">The sketch follows the same section case used by the flexural solver, so the stress block switches automatically between flange-only and flange-plus-web compression.</text>
    </svg>
  `;
}
