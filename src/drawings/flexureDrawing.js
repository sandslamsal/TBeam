import { formatNumber } from "../utils/format.js";

function leader(x1, y1, x2, y2, label) {
  return `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="callout-line" />
    <text x="${x2 + 6}" y="${y2 + 4}" class="drawing-label">${label}</text>
  `;
}

function stressArrow(x1, y, x2, label, toneClass, labelDx) {
  return `
    <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="steel-stress-line ${toneClass}" marker-end="url(#stressArrowHead)" />
    <text x="${x2 + labelDx}" y="${y + 4}" class="drawing-label">${label}</text>
  `;
}

export function renderFlexureDrawing(snapshot) {
  const { geometry, reinforcement, flexure } = snapshot;
  const viewWidth = 980;
  const viewHeight = 470;
  const panelTop = 120;
  const sectionScale = Math.min(148 / geometry.bf, 188 / geometry.h);
  const sectionX = 54;
  const strainX = 286;
  const stressX = 518;
  const forceX = 742;
  const panelWidth = 184;
  const sectionTop = panelTop + 18;
  const sectionBottom = sectionTop + geometry.h * sectionScale;
  const neutralAxisY = sectionTop + flexure.c * sectionScale;
  const compressionBottomY = sectionTop + Math.min(flexure.a, geometry.h) * sectionScale;
  const compressionResultantY = sectionTop + flexure.compressionResultantDepth * sectionScale;
  const tensionResultantY = sectionTop + flexure.tensionResultantDepth * sectionScale;
  const sectionCenter = sectionX + panelWidth / 2;
  const flangeWidth = geometry.bf * sectionScale;
  const webWidth = geometry.bw * sectionScale;
  const flangeHeight = geometry.hf * sectionScale;
  const compressionBlockMarkup =
    flexure.sectionCase === "flange"
      ? `<rect x="${sectionCenter - flangeWidth / 2}" y="${sectionTop}" width="${flangeWidth}" height="${Math.max(0, compressionBottomY - sectionTop)}" class="compression-block" />`
      : `
          <rect x="${sectionCenter - flangeWidth / 2}" y="${sectionTop}" width="${flangeWidth}" height="${flangeHeight}" class="compression-block" />
          <rect x="${sectionCenter - webWidth / 2}" y="${sectionTop + flangeHeight}" width="${webWidth}" height="${Math.max(0, compressionBottomY - (sectionTop + flangeHeight))}" class="compression-block" />
        `;

  const layerDots = [...reinforcement.topLayers, ...reinforcement.bottomLayers]
    .flatMap((layer) =>
      layer.xOffsets.map((offset) => {
        const x = sectionCenter + offset * sectionScale;
        const y = sectionTop + layer.depth * sectionScale;
        const radius = Math.max(3.2, (layer.diameter * sectionScale) / 2);
        return `<circle cx="${x}" cy="${y}" r="${radius}" class="bar ${layer.family === "bottom" ? "bar--bottom" : "bar--top"}" />`;
      })
    )
    .join("");

  const strainAxisX = strainX + 92;
  const strainTopX = strainAxisX - 54;
  const strainBottomX = strainAxisX + 74;
  const stressAxisX = stressX + 92;
  const compressionSteelArrows = flexure.compressionSteelLayers
    .map((layer, index) => {
      const y = sectionTop + layer.depth * sectionScale;
      const arrowLength = Math.max(24, Math.min(72, Math.abs(layer.netForce) * 0.16));
      return stressArrow(
        stressAxisX,
        y,
        stressAxisX - arrowLength,
        `Cs${index + 1}`,
        "steel-stress-line--compression",
        -32
      );
    })
    .join("");
  const tensionSteelArrows = flexure.tensionLayers
    .map((layer, index) => {
      const y = sectionTop + layer.depth * sectionScale;
      const arrowLength = Math.max(30, Math.min(82, Math.abs(layer.netForce) * 0.12));
      return stressArrow(
        stressAxisX,
        y,
        stressAxisX + arrowLength,
        `T${index + 1}`,
        "steel-stress-line--tension",
        10
      );
    })
    .join("");

  return `
    <svg viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="Flexural strain compatibility and internal force diagram">
      <defs>
        <marker id="forceArrowFlex" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 z" fill="currentColor"></path>
        </marker>
        <marker id="stressArrowHead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="currentColor"></path>
        </marker>
      </defs>

      <rect x="18" y="18" width="${viewWidth - 36}" height="${viewHeight - 36}" rx="20" class="drawing-frame" />
      <text x="42" y="46" class="drawing-title">Flexural Strain Compatibility</text>
      <text x="42" y="68" class="drawing-subtitle">Section, strain profile, equivalent stress block, and compression-tension resultants aligned on the solved neutral axis</text>

      <line x1="250" y1="96" x2="250" y2="${viewHeight - 34}" class="panel-divider" />
      <line x1="482" y1="96" x2="482" y2="${viewHeight - 34}" class="panel-divider" />
      <line x1="714" y1="96" x2="714" y2="${viewHeight - 34}" class="panel-divider" />

      <text x="${sectionX}" y="102" class="drawing-panel-title">1. Section</text>
      ${compressionBlockMarkup}
      <rect x="${sectionCenter - flangeWidth / 2}" y="${sectionTop}" width="${flangeWidth}" height="${flangeHeight}" class="section-outline section-fill" />
      <rect x="${sectionCenter - webWidth / 2}" y="${sectionTop + flangeHeight}" width="${webWidth}" height="${geometry.webDepth * sectionScale}" class="section-outline section-fill" />
      ${layerDots}
      <line x1="${sectionX + 6}" y1="${neutralAxisY}" x2="${sectionX + panelWidth - 10}" y2="${neutralAxisY}" class="neutral-axis" />
      ${leader(sectionX + panelWidth - 12, neutralAxisY, sectionX + panelWidth + 12, neutralAxisY - 16, "N.A.")}
      ${leader(sectionCenter + flangeWidth / 2 - 8, compressionBottomY, sectionX + panelWidth + 12, compressionBottomY + 6, `a = ${formatNumber(flexure.a, 2)} in`)}

      <text x="${strainX}" y="102" class="drawing-panel-title">2. Strain</text>
      <line x1="${strainAxisX}" y1="${sectionTop}" x2="${strainAxisX}" y2="${sectionBottom}" class="stress-axis" />
      <polygon points="${strainTopX},${sectionTop} ${strainAxisX},${neutralAxisY} ${strainBottomX},${sectionBottom}" class="strain-profile" />
      <line x1="${strainX + 12}" y1="${neutralAxisY}" x2="${strainX + panelWidth - 12}" y2="${neutralAxisY}" class="neutral-axis" />
      <text x="${strainTopX - 10}" y="${sectionTop - 10}" class="drawing-label">ec = 0.003</text>
      <text x="${strainBottomX - 4}" y="${sectionBottom + 16}" class="drawing-label">et = ${formatNumber(flexure.maxTensionStrain, 5)}</text>
      <text x="${strainAxisX + 8}" y="${neutralAxisY - 8}" class="drawing-label">c = ${formatNumber(flexure.c, 2)} in</text>

      <text x="${stressX}" y="102" class="drawing-panel-title">3. Stress / Forces</text>
      <line x1="${stressAxisX}" y1="${sectionTop}" x2="${stressAxisX}" y2="${sectionBottom}" class="stress-axis" />
      <rect x="${stressAxisX - 70}" y="${sectionTop}" width="70" height="${Math.max(0, compressionBottomY - sectionTop)}" class="compression-block" />
      <text x="${stressAxisX - 82}" y="${sectionTop - 10}" class="drawing-label">0.85 f'c</text>
      <text x="${stressAxisX - 82}" y="${compressionResultantY + 4}" class="drawing-label">Cc</text>
      ${compressionSteelArrows}
      ${tensionSteelArrows}
      <line x1="${stressX + 12}" y1="${neutralAxisY}" x2="${stressX + panelWidth - 12}" y2="${neutralAxisY}" class="neutral-axis" />

      <text x="${forceX}" y="102" class="drawing-panel-title">4. Resultant Couple</text>
      <line x1="${forceX + 58}" y1="${compressionResultantY}" x2="${forceX + 58}" y2="${tensionResultantY}" class="lever-arm-line" />
      <line x1="${forceX + 38}" y1="${compressionResultantY}" x2="${forceX + 78}" y2="${compressionResultantY}" class="lever-arm-cap" />
      <line x1="${forceX + 38}" y1="${tensionResultantY}" x2="${forceX + 78}" y2="${tensionResultantY}" class="lever-arm-cap" />
      <path d="M${forceX + 58} ${compressionResultantY + 38} V ${compressionResultantY - 18}" class="force-arrow force-arrow--compression" marker-end="url(#forceArrowFlex)" />
      <path d="M${forceX + 58} ${tensionResultantY - 38} V ${tensionResultantY + 18}" class="force-arrow force-arrow--tension" marker-end="url(#forceArrowFlex)" />
      <text x="${forceX + 92}" y="${compressionResultantY + 4}" class="drawing-label">C = ${formatNumber(flexure.totalCompression, 1)} k</text>
      <text x="${forceX + 92}" y="${tensionResultantY + 4}" class="drawing-label">T = ${formatNumber(flexure.totalTension, 1)} k</text>
      <text x="${forceX + 92}" y="${(compressionResultantY + tensionResultantY) / 2}" class="drawing-label">z = ${formatNumber(flexure.leverArm, 2)} in</text>
      <text x="${forceX + 92}" y="${(compressionResultantY + tensionResultantY) / 2 + 22}" class="drawing-label">Mn = ${formatNumber(flexure.mnKipFt, 1)} k-ft</text>
      <text x="${forceX + 92}" y="${(compressionResultantY + tensionResultantY) / 2 + 44}" class="drawing-label">phiMn = ${formatNumber(flexure.phiMnKipFt, 1)} k-ft</text>

      <text x="42" y="${viewHeight - 26}" class="drawing-note">Layer centroids, strains, and force locations shown here are read directly from the solved multi-layer flexural model.</text>
    </svg>
  `;
}
