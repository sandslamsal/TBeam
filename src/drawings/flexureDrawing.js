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

function stressArrow(x1, y, x2, label, toneClass, labelOffset) {
  return `
    <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="steel-stress-line ${toneClass}" marker-end="url(#stressArrowHead)" />
    <text x="${x2 + labelOffset}" y="${y + 4}" class="drawing-label">${label}</text>
  `;
}

export function renderFlexureDrawing(snapshot) {
  const { geometry, reinforcement, flexure } = snapshot;
  const viewWidth = 1080;
  const viewHeight = 540;
  const margin = 34;
  const titleY = 46;
  const panelTop = 130;
  const panelGap = 22;
  const panelWidth = (viewWidth - margin * 2 - panelGap * 3) / 4;
  const panelHeight = 320;
  const sectionPanelX = margin;
  const strainPanelX = sectionPanelX + panelWidth + panelGap;
  const stressPanelX = strainPanelX + panelWidth + panelGap;
  const couplePanelX = stressPanelX + panelWidth + panelGap;
  const sectionInsetTop = panelTop + 28;
  const sectionScale = Math.min((panelWidth - 54) / geometry.bf, (panelHeight - 62) / geometry.h);
  const sectionCenter = sectionPanelX + panelWidth / 2;
  const sectionTop = sectionInsetTop + 18;
  const sectionBottom = sectionTop + geometry.h * sectionScale;
  const neutralAxisY = sectionTop + flexure.c * sectionScale;
  const compressionBottomY = sectionTop + Math.min(flexure.a, geometry.h) * sectionScale;
  const compressionResultantY = sectionTop + flexure.compressionResultantDepth * sectionScale;
  const tensionResultantY = sectionTop + flexure.tensionResultantDepth * sectionScale;
  const flangeWidth = geometry.bf * sectionScale;
  const webWidth = geometry.bw * sectionScale;
  const flangeHeight = geometry.hf * sectionScale;
  const compressionBlock =
    flexure.sectionCase === "flange"
      ? `<rect x="${sectionCenter - flangeWidth / 2}" y="${sectionTop}" width="${flangeWidth}" height="${Math.max(0, compressionBottomY - sectionTop)}" class="compression-block" />`
      : `
          <rect x="${sectionCenter - flangeWidth / 2}" y="${sectionTop}" width="${flangeWidth}" height="${flangeHeight}" class="compression-block" />
          <rect x="${sectionCenter - webWidth / 2}" y="${sectionTop + flangeHeight}" width="${webWidth}" height="${Math.max(0, compressionBottomY - (sectionTop + flangeHeight))}" class="compression-block" />
        `;

  const barMarkup = [...reinforcement.topLayers, ...reinforcement.bottomLayers]
    .flatMap((layer) =>
      layer.xOffsets.map((offset) => {
        const x = sectionCenter + offset * sectionScale;
        const y = sectionTop + layer.depth * sectionScale;
        const radius = Math.max(2.8, (layer.diameter * sectionScale) / 2);
        return `<circle cx="${x}" cy="${y}" r="${radius}" class="bar ${layer.family === "bottom" ? "bar--bottom" : "bar--top"}" />`;
      })
    )
    .join("");

  const strainAxisX = strainPanelX + panelWidth / 2;
  const strainTopX = strainAxisX - 56;
  const strainBottomX = strainAxisX + 70;
  const strainTopY = sectionTop;
  const strainBottomY = sectionBottom;

  const stressAxisX = stressPanelX + panelWidth / 2;
  const compressionSteelArrows = flexure.compressionSteelLayers
    .map((layer, index) => {
      const y = sectionTop + layer.depth * sectionScale;
      const length = Math.max(24, Math.min(64, Math.abs(layer.netForce) * 0.16));
      return stressArrow(stressAxisX, y, stressAxisX - length, `Cs${index + 1}`, "steel-stress-line--compression", -30);
    })
    .join("");
  const tensionSteelArrows = flexure.tensionLayers
    .map((layer, index) => {
      const y = sectionTop + layer.depth * sectionScale;
      const length = Math.max(30, Math.min(76, Math.abs(layer.netForce) * 0.12));
      return stressArrow(stressAxisX, y, stressAxisX + length, `T${index + 1}`, "steel-stress-line--tension", 10);
    })
    .join("");

  const coupleAxisX = couplePanelX + 78;
  const resultBoxX = couplePanelX + 118;
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
      </defs>

      <rect x="18" y="18" width="${viewWidth - 36}" height="${viewHeight - 36}" rx="20" class="drawing-frame" />
      <text x="${margin}" y="${titleY}" class="drawing-title">Flexural Strain Compatibility</text>
      <text x="${margin}" y="${titleY + 22}" class="drawing-subtitle">Section, strain, stress, and resultant-force panels aligned to the solved neutral axis and multi-layer reinforcement response</text>

      ${panelFrame(sectionPanelX, panelTop, panelWidth, panelHeight, "1. Section")}
      ${panelFrame(strainPanelX, panelTop, panelWidth, panelHeight, "2. Strain")}
      ${panelFrame(stressPanelX, panelTop, panelWidth, panelHeight, "3. Stress / Forces")}
      ${panelFrame(couplePanelX, panelTop, panelWidth, panelHeight, "4. Resultant Couple")}

      ${compressionBlock}
      <rect x="${sectionCenter - flangeWidth / 2}" y="${sectionTop}" width="${flangeWidth}" height="${flangeHeight}" class="section-outline section-fill" />
      <rect x="${sectionCenter - webWidth / 2}" y="${sectionTop + flangeHeight}" width="${webWidth}" height="${geometry.webDepth * sectionScale}" class="section-outline section-fill" />
      ${barMarkup}
      <line x1="${sectionPanelX + 16}" y1="${neutralAxisY}" x2="${sectionPanelX + panelWidth - 16}" y2="${neutralAxisY}" class="neutral-axis" />
      ${leader(sectionPanelX + panelWidth - 20, neutralAxisY, sectionPanelX + panelWidth - 2, neutralAxisY - 16, "N.A.")}
      ${leader(sectionCenter + flangeWidth / 2 - 4, compressionBottomY, sectionPanelX + panelWidth - 6, compressionBottomY + 4, `a = ${formatNumber(flexure.a, 2)} in`)}

      <line x1="${strainAxisX}" y1="${strainTopY}" x2="${strainAxisX}" y2="${strainBottomY}" class="stress-axis" />
      <polygon points="${strainTopX},${strainTopY} ${strainAxisX},${neutralAxisY} ${strainBottomX},${strainBottomY}" class="strain-profile" />
      <line x1="${strainPanelX + 18}" y1="${compressionBottomY}" x2="${strainPanelX + panelWidth - 18}" y2="${compressionBottomY}" class="dim-extension" />
      <line x1="${strainPanelX + 18}" y1="${neutralAxisY}" x2="${strainPanelX + panelWidth - 18}" y2="${neutralAxisY}" class="neutral-axis" />
      <text x="${strainTopX - 12}" y="${strainTopY - 10}" class="drawing-label">ec = 0.003</text>
      <text x="${strainBottomX - 2}" y="${strainBottomY + 18}" class="drawing-label">et = ${formatNumber(flexure.maxTensionStrain, 5)}</text>
      <text x="${strainAxisX + 10}" y="${compressionBottomY - 8}" class="drawing-label">a = ${formatNumber(flexure.a, 2)} in</text>
      <text x="${strainAxisX + 10}" y="${neutralAxisY - 8}" class="drawing-label">c = ${formatNumber(flexure.c, 2)} in</text>

      <line x1="${stressAxisX}" y1="${sectionTop}" x2="${stressAxisX}" y2="${sectionBottom}" class="stress-axis" />
      <rect x="${stressAxisX - 72}" y="${sectionTop}" width="72" height="${Math.max(0, compressionBottomY - sectionTop)}" class="compression-block" />
      <text x="${stressAxisX - 84}" y="${sectionTop - 10}" class="drawing-label">0.85 f'c</text>
      <text x="${stressAxisX - 84}" y="${compressionResultantY + 4}" class="drawing-label">Cc</text>
      ${compressionSteelArrows}
      ${tensionSteelArrows}
      <line x1="${stressPanelX + 16}" y1="${neutralAxisY}" x2="${stressPanelX + panelWidth - 16}" y2="${neutralAxisY}" class="neutral-axis" />

      <line x1="${coupleAxisX}" y1="${compressionResultantY}" x2="${coupleAxisX}" y2="${tensionResultantY}" class="lever-arm-line" />
      <line x1="${coupleAxisX - 18}" y1="${compressionResultantY}" x2="${coupleAxisX + 18}" y2="${compressionResultantY}" class="lever-arm-cap" />
      <line x1="${coupleAxisX - 18}" y1="${tensionResultantY}" x2="${coupleAxisX + 18}" y2="${tensionResultantY}" class="lever-arm-cap" />
      <path d="M${coupleAxisX} ${compressionResultantY + 34} V ${compressionResultantY - 20}" class="force-arrow force-arrow--compression" marker-end="url(#forceArrowFlex)" />
      <path d="M${coupleAxisX} ${tensionResultantY - 34} V ${tensionResultantY + 20}" class="force-arrow force-arrow--tension" marker-end="url(#forceArrowFlex)" />
      <text x="${coupleAxisX + 26}" y="${compressionResultantY + 4}" class="drawing-label">C</text>
      <text x="${coupleAxisX + 26}" y="${tensionResultantY + 4}" class="drawing-label">T</text>
      <text x="${coupleAxisX + 26}" y="${(compressionResultantY + tensionResultantY) / 2 + 4}" class="drawing-label">z</text>

      <rect x="${resultBoxX}" y="${panelTop + 54}" width="${panelWidth - 136}" height="154" rx="16" class="info-box" />
      ${resultRows
        .map(
          ([label, value], index) => `
            <text x="${resultBoxX + 14}" y="${panelTop + 80 + index * 26}" class="drawing-label">${label}</text>
            <text x="${resultBoxX + 64}" y="${panelTop + 80 + index * 26}" class="drawing-label">${value}</text>
          `
        )
        .join("")}

      <text x="${margin}" y="${viewHeight - 26}" class="drawing-note">Bars, strains, stress resultants, and force locations are all drawn from the same multi-layer section response used in the flexural calculation module.</text>
    </svg>
  `;
}
