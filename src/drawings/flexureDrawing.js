import { formatNumber } from "../utils/format.js";

function panelFrame(x, y, width, height, title) {
  return `
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="18" class="diagram-panel" />
      <text x="${x + 16}" y="${y + 24}" class="drawing-panel-title">${title}</text>
      <line x1="${x + 14}" y1="${y + 34}" x2="${x + width - 14}" y2="${y + 34}" class="panel-divider" />
    </g>
  `;
}

function horizontalDimension(x1, x2, dimensionY, extensionY, label) {
  return `
    <line x1="${x1}" y1="${extensionY}" x2="${x1}" y2="${dimensionY}" class="dim-extension" />
    <line x1="${x2}" y1="${extensionY}" x2="${x2}" y2="${dimensionY}" class="dim-extension" />
    <line x1="${x1}" y1="${dimensionY}" x2="${x2}" y2="${dimensionY}" class="dim-arrow" marker-start="url(#dimArrowFlex)" marker-end="url(#dimArrowFlex)" />
    <text x="${(x1 + x2) / 2}" y="${dimensionY - 8}" class="dim-text dim-text--center">${label}</text>
  `;
}

function verticalDimension(dimensionX, y1, y2, extensionX, label) {
  const isLeft = dimensionX < extensionX;
  return `
    <line x1="${extensionX}" y1="${y1}" x2="${dimensionX}" y2="${y1}" class="dim-extension" />
    <line x1="${extensionX}" y1="${y2}" x2="${dimensionX}" y2="${y2}" class="dim-extension" />
    <line x1="${dimensionX}" y1="${y1}" x2="${dimensionX}" y2="${y2}" class="dim-arrow" marker-start="url(#dimArrowFlex)" marker-end="url(#dimArrowFlex)" />
    <text x="${dimensionX + (isLeft ? -12 : 12)}" y="${(y1 + y2) / 2}" class="dim-text dim-text--middle ${isLeft ? "dim-text--end" : ""}">${label}</text>
  `;
}

function leader(anchorX, anchorY, elbowX, textX, textY, label) {
  return `
    <polyline points="${anchorX},${anchorY} ${elbowX},${anchorY} ${textX},${textY - 4}" class="callout-line" />
    <text x="${textX}" y="${textY}" class="drawing-label">${label}</text>
  `;
}

function forceArrow(x1, y, x2, label, toneClass, labelDx = 10) {
  return `
    <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="steel-stress-line ${toneClass}" marker-end="url(#stressArrowHead)" />
    <text x="${x2 + labelDx}" y="${y + 4}" class="drawing-label">${label}</text>
  `;
}

function stressBlockMarkup(sectionCase, axisX, topY, aY, flangeHeight) {
  if (sectionCase === "flange") {
    return `<rect x="${axisX - 30}" y="${topY}" width="30" height="${Math.max(0, aY - topY)}" class="compression-block" />`;
  }

  return `
    <rect x="${axisX - 48}" y="${topY}" width="48" height="${flangeHeight}" class="compression-block" />
    <rect x="${axisX - 20}" y="${topY + flangeHeight}" width="20" height="${Math.max(0, aY - (topY + flangeHeight))}" class="compression-block" />
  `;
}

export function renderFlexureDrawing(snapshot) {
  const { geometry, reinforcement, flexure } = snapshot;
  const viewWidth = 1160;
  const viewHeight = 644;
  const margin = 34;
  const titleY = 46;
  const panelTop = 118;
  const panelGap = 18;
  const panelWidth = (viewWidth - margin * 2 - panelGap * 3) / 4;
  const panelHeight = 430;
  const panelXs = Array.from({ length: 4 }, (_, index) => margin + index * (panelWidth + panelGap));
  const contentTop = panelTop + 56;

  const sectionScale = Math.min((panelWidth - 50) / geometry.bf, (panelHeight - 150) / geometry.h);
  const sectionCenter = panelXs[0] + panelWidth / 2;
  const sectionTop = contentTop + 10;
  const sectionBottom = sectionTop + geometry.h * sectionScale;
  const flangeWidth = geometry.bf * sectionScale;
  const flangeHeight = geometry.hf * sectionScale;
  const webWidth = geometry.bw * sectionScale;
  const neutralAxisY = sectionTop + Math.min(flexure.c, geometry.h) * sectionScale;
  const compressionBottomY = sectionTop + Math.min(flexure.a, geometry.h) * sectionScale;
  const compressionResultantY = sectionTop + Math.min(flexure.compressionResultantDepth, geometry.h) * sectionScale;
  const tensionResultantY = sectionTop + Math.min(flexure.tensionResultantDepth, geometry.h) * sectionScale;

  const sectionBars = [...reinforcement.topLayers, ...reinforcement.bottomLayers]
    .flatMap((layer) =>
      layer.xOffsets.map((offset) => {
        const x = sectionCenter + offset * sectionScale;
        const y = sectionTop + layer.depth * sectionScale;
        const radius = Math.max(2.8, (layer.diameter * sectionScale) / 2);
        return `<circle cx="${x}" cy="${y}" r="${radius}" class="bar ${layer.family === "bottom" ? "bar--bottom" : "bar--top"}" />`;
      })
    )
    .join("");
  const sectionBoxX = panelXs[0] + 18;
  const sectionBoxY = panelTop + panelHeight - 74;
  const sectionBoxWidth = panelWidth - 36;
  const sectionBoxRows = [
    `b = ${formatNumber(geometry.bf, 1)} in`,
    `hf = ${formatNumber(geometry.hf, 1)} in`,
    `d = ${formatNumber(geometry.d, 1)} in`
  ];

  const strainPanelX = panelXs[1];
  const strainAxisX = strainPanelX + panelWidth * 0.52;
  const strainTopX = strainAxisX - 64;
  const strainBottomX = strainAxisX + 88;
  const strainBottomConnectorEnd = strainBottomX - 10;
  const strainLabelX = strainPanelX + panelWidth - 46;
  const strainBoxX = strainPanelX + 20;
  const strainBoxY = panelTop + panelHeight - 88;
  const strainBoxWidth = panelWidth - 40;

  const stressPanelX = panelXs[2];
  const stressAxisX = stressPanelX + 92;
  const forceAxisX = stressPanelX + panelWidth - 82;
  const tensionForceMarkup = flexure.tensionLayers
    .map((layer, index) => {
      const y = sectionTop + layer.depth * sectionScale;
      const length = Math.max(28, Math.min(72, 30 + Math.abs(layer.netForce) * 0.11));
      return forceArrow(forceAxisX - length, y, forceAxisX, `T${index + 1}`, "steel-stress-line--tension");
    })
    .join("");
  const compressionSteelMarkup = flexure.compressionSteelLayers
    .map((layer, index) => {
      const y = sectionTop + layer.depth * sectionScale;
      const length = Math.max(22, Math.min(52, 22 + Math.abs(layer.netForce) * 0.1));
      return forceArrow(forceAxisX - length, y, forceAxisX, `Cs${index + 1}`, "steel-stress-line--compression");
    })
    .join("");

  const couplePanelX = panelXs[3];
  const coupleAxisX = couplePanelX + 92;
  const resultBoxX = couplePanelX + 22;
  const resultBoxY = panelTop + panelHeight - 134;
  const resultBoxWidth = panelWidth - 44;
  const resultRows = [
    ["C", `${formatNumber(flexure.totalCompression, 1)} k`],
    ["T", `${formatNumber(flexure.totalTension, 1)} k`],
    ["z", `${formatNumber(flexure.leverArm, 2)} in`],
    ["Mn", `${formatNumber(flexure.mnKipFt, 1)} k-ft`],
    ["phiMn", `${formatNumber(flexure.phiMnKipFt, 1)} k-ft`]
  ];

  return `
    <svg class="engineering-svg engineering-svg--flexure" viewBox="0 0 ${viewWidth} ${viewHeight}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Flexural strain compatibility diagram">
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
      <text x="${margin}" y="${titleY + 22}" class="drawing-subtitle">Section, strain, stresses, and internal force resultants referenced to the solved compression-block case</text>

      ${panelFrame(panelXs[0], panelTop, panelWidth, panelHeight, "1. Section")}
      ${panelFrame(panelXs[1], panelTop, panelWidth, panelHeight, "2. Strain")}
      ${panelFrame(panelXs[2], panelTop, panelWidth, panelHeight, "3. Stress / Forces")}
      ${panelFrame(panelXs[3], panelTop, panelWidth, panelHeight, "4. Resultant Couple")}

      <rect x="${sectionCenter - flangeWidth / 2}" y="${sectionTop}" width="${flangeWidth}" height="${flangeHeight}" class="section-outline section-fill" />
      <rect x="${sectionCenter - webWidth / 2}" y="${sectionTop + flangeHeight}" width="${webWidth}" height="${geometry.webDepth * sectionScale}" class="section-outline section-fill" />
      ${sectionBars}
      <line x1="${panelXs[0] + 18}" y1="${neutralAxisY}" x2="${panelXs[0] + panelWidth - 18}" y2="${neutralAxisY}" class="neutral-axis" />
      ${horizontalDimension(sectionCenter - flangeWidth / 2, sectionCenter + flangeWidth / 2, sectionTop - 14, sectionTop + 2, "b")}
      ${verticalDimension(panelXs[0] + 20, sectionTop, sectionTop + flangeHeight, panelXs[0] + 44, "hf")}
      ${verticalDimension(panelXs[0] + panelWidth - 20, sectionTop, sectionTop + geometry.d * sectionScale, panelXs[0] + panelWidth - 46, "d")}
      ${leader(panelXs[0] + panelWidth - 34, neutralAxisY, panelXs[0] + panelWidth - 10, panelXs[0] + panelWidth - 4, neutralAxisY - 12, "N.A.")}
      ${leader(sectionCenter, sectionBottom - 8, sectionCenter + 30, sectionCenter + 48, sectionBottom + 18, "As")}
      <rect x="${sectionBoxX}" y="${sectionBoxY}" width="${sectionBoxWidth}" height="64" rx="14" class="info-box" />
      ${sectionBoxRows
        .map(
          (row, index) => `
            <text x="${sectionBoxX + 16}" y="${sectionBoxY + 21 + index * 18}" class="drawing-label">${row}</text>
          `
        )
        .join("")}

      <line x1="${strainAxisX}" y1="${sectionTop}" x2="${strainAxisX}" y2="${sectionBottom}" class="stress-axis" />
      <line x1="${strainTopX}" y1="${sectionTop}" x2="${strainBottomX}" y2="${sectionBottom}" class="strain-guide" />
      <line x1="${strainAxisX}" y1="${sectionBottom}" x2="${strainBottomConnectorEnd}" y2="${sectionBottom}" class="dim-extension" />
      <line x1="${strainPanelX + 18}" y1="${neutralAxisY}" x2="${strainPanelX + panelWidth - 18}" y2="${neutralAxisY}" class="neutral-axis" />
      <line x1="${strainAxisX + 12}" y1="${neutralAxisY}" x2="${strainLabelX - 12}" y2="${neutralAxisY}" class="dim-extension" />
      <line x1="${strainAxisX + 12}" y1="${compressionBottomY}" x2="${strainLabelX - 12}" y2="${compressionBottomY}" class="dim-extension" />
      <text x="${strainLabelX}" y="${neutralAxisY - 4}" class="drawing-label">c</text>
      <text x="${strainLabelX}" y="${compressionBottomY - 4}" class="drawing-label">a</text>
      <text x="${strainTopX - 10}" y="${sectionTop - 12}" class="drawing-label">ec</text>
      <text x="${strainBottomConnectorEnd + 8}" y="${sectionBottom - 8}" class="drawing-label">et</text>
      <rect x="${strainBoxX}" y="${strainBoxY}" width="${strainBoxWidth}" height="58" rx="14" class="info-box" />
      <line x1="${strainBoxX + strainBoxWidth / 2}" y1="${strainBoxY + 10}" x2="${strainBoxX + strainBoxWidth / 2}" y2="${strainBoxY + 48}" class="result-divider" />
      <line x1="${strainBoxX + 12}" y1="${strainBoxY + 29}" x2="${strainBoxX + strainBoxWidth - 12}" y2="${strainBoxY + 29}" class="result-divider" />
      <text x="${strainBoxX + 16}" y="${strainBoxY + 22}" class="drawing-label drawing-label--muted">ec</text>
      <text x="${strainBoxX + strainBoxWidth / 2 - 12}" y="${strainBoxY + 22}" class="drawing-label result-value">0.00300</text>
      <text x="${strainBoxX + strainBoxWidth / 2 + 16}" y="${strainBoxY + 22}" class="drawing-label drawing-label--muted">c</text>
      <text x="${strainBoxX + strainBoxWidth - 14}" y="${strainBoxY + 22}" class="drawing-label result-value">${formatNumber(flexure.c, 2)} in</text>
      <text x="${strainBoxX + 16}" y="${strainBoxY + 46}" class="drawing-label drawing-label--muted">et</text>
      <text x="${strainBoxX + strainBoxWidth / 2 - 12}" y="${strainBoxY + 46}" class="drawing-label result-value">${formatNumber(flexure.maxTensionStrain, 5)}</text>
      <text x="${strainBoxX + strainBoxWidth / 2 + 16}" y="${strainBoxY + 46}" class="drawing-label drawing-label--muted">a</text>
      <text x="${strainBoxX + strainBoxWidth - 14}" y="${strainBoxY + 46}" class="drawing-label result-value">${formatNumber(flexure.a, 2)} in</text>

      <line x1="${stressAxisX}" y1="${sectionTop}" x2="${stressAxisX}" y2="${sectionBottom}" class="stress-axis" />
      <line x1="${forceAxisX}" y1="${sectionTop}" x2="${forceAxisX}" y2="${sectionBottom}" class="stress-axis" />
      ${stressBlockMarkup(flexure.sectionCase, stressAxisX, sectionTop, compressionBottomY, Math.max(18, flangeHeight))}
      <line x1="${stressPanelX + 18}" y1="${neutralAxisY}" x2="${stressPanelX + panelWidth - 18}" y2="${neutralAxisY}" class="neutral-axis" />
      <text x="${stressAxisX - 66}" y="${sectionTop - 10}" class="drawing-label">0.85 f'c</text>
      ${forceArrow(forceAxisX - 74, compressionResultantY, forceAxisX, "Cc", "steel-stress-line--compression")}
      ${compressionSteelMarkup}
      ${tensionForceMarkup}
      <text x="${stressPanelX + 22}" y="${panelTop + panelHeight - 18}" class="drawing-note">${flexure.sectionCase === "flange" ? "Neutral axis in flange" : "Neutral axis in web"}</text>

      <path d="M${coupleAxisX} ${compressionResultantY + 30} V ${compressionResultantY - 20}" class="force-arrow force-arrow--compression" marker-end="url(#forceArrowFlex)" />
      <path d="M${coupleAxisX} ${tensionResultantY - 30} V ${tensionResultantY + 20}" class="force-arrow force-arrow--tension" marker-end="url(#forceArrowFlex)" />
      <line x1="${coupleAxisX + 34}" y1="${compressionResultantY}" x2="${coupleAxisX + 34}" y2="${tensionResultantY}" class="lever-arm-line" />
      <line x1="${coupleAxisX + 18}" y1="${compressionResultantY}" x2="${coupleAxisX + 50}" y2="${compressionResultantY}" class="lever-arm-cap" />
      <line x1="${coupleAxisX + 18}" y1="${tensionResultantY}" x2="${coupleAxisX + 50}" y2="${tensionResultantY}" class="lever-arm-cap" />
      <text x="${coupleAxisX + 52}" y="${compressionResultantY + 4}" class="drawing-label">C</text>
      <text x="${coupleAxisX + 52}" y="${tensionResultantY + 4}" class="drawing-label">T</text>
      <text x="${coupleAxisX + 52}" y="${(compressionResultantY + tensionResultantY) / 2 + 4}" class="drawing-label">z</text>

      <rect x="${resultBoxX}" y="${resultBoxY}" width="${resultBoxWidth}" height="112" rx="16" class="info-box" />
      <line x1="${resultBoxX + 78}" y1="${resultBoxY + 14}" x2="${resultBoxX + 78}" y2="${resultBoxY + 98}" class="result-divider" />
      ${resultRows
        .map(
          ([label, value], index) => `
            <text x="${resultBoxX + 16}" y="${resultBoxY + 28 + index * 18}" class="drawing-label drawing-label--muted">${label}</text>
            <text x="${resultBoxX + resultBoxWidth - 14}" y="${resultBoxY + 28 + index * 18}" class="drawing-label result-value">${value}</text>
          `
        )
        .join("")}

      <text x="${margin}" y="${viewHeight - 28}" class="drawing-note">The strain, stress, and resultant sketches follow the active solved section case and use the same layer depths reported in the calculation steps.</text>
    </svg>
  `;
}
