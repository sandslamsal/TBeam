import { formatNumber } from "../utils/format.js";

function leader(x1, y1, x2, y2, label) {
  return `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="callout-line" />
    <text x="${x2 + 6}" y="${y2 + 4}" class="drawing-label">${label}</text>
  `;
}

export function renderFlexureDrawing(snapshot) {
  const { geometry, reinforcement, flexure } = snapshot;
  const viewWidth = 860;
  const viewHeight = 420;
  const sectionScale = 150 / geometry.h;
  const sectionTop = 112;
  const panelWidth = 170;
  const sectionX = 70;
  const strainX = 278;
  const stressX = 484;
  const forceX = 680;
  const bottomY = sectionTop + geometry.h * sectionScale;
  const neutralAxisY = sectionTop + flexure.c * sectionScale;
  const compressionY = sectionTop + flexure.compressionResultantDepth * sectionScale;
  const tensionY = sectionTop + flexure.tensionResultantDepth * sectionScale;
  const compressionBottomY = sectionTop + Math.min(flexure.a, geometry.h) * sectionScale;
  const sectionCenter = sectionX + panelWidth / 2;
  const flangeWidth = geometry.bf * sectionScale;
  const webWidth = geometry.bw * sectionScale;
  const flangeHeight = geometry.hf * sectionScale;

  const layerDots = [...reinforcement.topLayers, ...reinforcement.bottomLayers]
    .flatMap((layer) =>
      layer.xOffsets.map((offset) => {
        const x = sectionCenter + offset * sectionScale;
        const y = sectionTop + layer.depth * sectionScale;
        const radius = Math.max(3.4, (layer.diameter * sectionScale) / 2);
        return `<circle cx="${x}" cy="${y}" r="${radius}" class="bar ${layer.family === "bottom" ? "bar--bottom" : "bar--top"}" />`;
      })
    )
    .join("");

  return `
    <svg viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="Flexural strain compatibility and force diagram">
      <defs>
        <marker id="forceArrowFlex" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 z" fill="currentColor"></path>
        </marker>
      </defs>

      <rect x="18" y="18" width="${viewWidth - 36}" height="${viewHeight - 36}" rx="24" class="drawing-frame" />
      <text x="42" y="46" class="drawing-title">Flexural Strain Compatibility Diagram</text>
      <text x="42" y="70" class="drawing-subtitle">Section, strain profile, equivalent stress block, and internal resultants aligned on the same neutral-axis depth</text>

      <text x="${sectionX}" y="98" class="drawing-panel-title">Section</text>
      <rect x="${sectionCenter - flangeWidth / 2}" y="${sectionTop}" width="${flangeWidth}" height="${flangeHeight}" class="section-outline section-fill" />
      <rect x="${sectionCenter - webWidth / 2}" y="${sectionTop + flangeHeight}" width="${webWidth}" height="${geometry.webDepth * sectionScale}" class="section-outline section-fill" />
      <rect x="${sectionCenter - flangeWidth / 2}" y="${sectionTop}" width="${flangeWidth}" height="${Math.max(0, compressionBottomY - sectionTop)}" class="compression-block" />
      ${layerDots}
      <line x1="${sectionX - 10}" y1="${neutralAxisY}" x2="${sectionX + panelWidth + 10}" y2="${neutralAxisY}" class="neutral-axis" />
      ${leader(sectionX + panelWidth + 4, neutralAxisY, sectionX + panelWidth + 38, neutralAxisY - 16, "N.A.")}
      ${leader(sectionX + panelWidth - 8, compressionBottomY, sectionX + panelWidth + 40, compressionBottomY + 6, `a = ${formatNumber(flexure.a, 2)} in`)}
      ${leader(sectionX + panelWidth - 8, sectionTop + geometry.d * sectionScale, sectionX + panelWidth + 40, sectionTop + geometry.d * sectionScale + 16, `d = ${formatNumber(geometry.d, 2)} in`)}

      <text x="${strainX}" y="98" class="drawing-panel-title">Strain</text>
      <line x1="${strainX + 60}" y1="${sectionTop}" x2="${strainX + 60}" y2="${bottomY}" class="stress-axis" />
      <polygon points="${strainX + 14},${sectionTop} ${strainX + 60},${neutralAxisY} ${strainX + 126},${bottomY}" class="strain-profile" />
      <line x1="${strainX + 8}" y1="${neutralAxisY}" x2="${strainX + 132}" y2="${neutralAxisY}" class="neutral-axis" />
      <text x="${strainX + 8}" y="${sectionTop - 10}" class="drawing-label">0.003</text>
      <text x="${strainX + 134}" y="${bottomY + 6}" class="drawing-label">εt = ${formatNumber(flexure.maxTensionStrain, 5)}</text>
      <text x="${strainX + 70}" y="${neutralAxisY - 8}" class="drawing-label">c = ${formatNumber(flexure.c, 2)} in</text>

      <text x="${stressX}" y="98" class="drawing-panel-title">Stress / Resultants</text>
      <rect x="${stressX + 10}" y="${sectionTop}" width="82" height="${Math.max(0, compressionBottomY - sectionTop)}" class="compression-block" />
      <line x1="${stressX + 102}" y1="${neutralAxisY}" x2="${stressX + 132}" y2="${neutralAxisY}" class="neutral-axis" />
      <text x="${stressX + 8}" y="${sectionTop - 10}" class="drawing-label">0.85 f'c</text>
      <text x="${stressX + 98}" y="${compressionY + 4}" class="drawing-label">Cc @ y = ${formatNumber(flexure.concreteCentroidY, 2)} in</text>
      ${flexure.compressionSteelLayers.length
        ? flexure.compressionSteelLayers
            .map(
              (layer, index) => `
                <line x1="${stressX + 12}" y1="${sectionTop + layer.depth * sectionScale}" x2="${stressX + 12 + Math.max(18, Math.min(70, Math.abs(layer.stress)))}" y2="${sectionTop + layer.depth * sectionScale}" class="steel-stress-line steel-stress-line--compression" />
                <text x="${stressX + 90}" y="${sectionTop + layer.depth * sectionScale + 4}" class="drawing-label">Cs${index + 1}</text>
              `
            )
            .join("")
        : ""}
      ${flexure.tensionLayers
        .map(
          (layer, index) => `
            <line x1="${stressX + 92}" y1="${sectionTop + layer.depth * sectionScale}" x2="${stressX + 92 + Math.max(28, Math.min(74, Math.abs(layer.stress)))}" y2="${sectionTop + layer.depth * sectionScale}" class="steel-stress-line steel-stress-line--tension" />
            <text x="${stressX + 170}" y="${sectionTop + layer.depth * sectionScale + 4}" class="drawing-label">T${index + 1}</text>
          `
        )
        .join("")}

      <text x="${forceX}" y="98" class="drawing-panel-title">Internal Force Couple</text>
      <line x1="${forceX + 56}" y1="${compressionY}" x2="${forceX + 56}" y2="${tensionY}" class="lever-arm-line" />
      <line x1="${forceX + 36}" y1="${compressionY}" x2="${forceX + 76}" y2="${compressionY}" class="lever-arm-cap" />
      <line x1="${forceX + 36}" y1="${tensionY}" x2="${forceX + 76}" y2="${tensionY}" class="lever-arm-cap" />
      <path d="M${forceX + 56} ${compressionY + 36} V ${compressionY - 18}" class="force-arrow force-arrow--compression" marker-end="url(#forceArrowFlex)" />
      <path d="M${forceX + 56} ${tensionY - 36} V ${tensionY + 18}" class="force-arrow force-arrow--tension" marker-end="url(#forceArrowFlex)" />
      <text x="${forceX + 92}" y="${compressionY + 4}" class="drawing-label">C = ${formatNumber(flexure.totalCompression, 1)} k</text>
      <text x="${forceX + 92}" y="${tensionY + 4}" class="drawing-label">T = ${formatNumber(flexure.totalTension, 1)} k</text>
      <text x="${forceX + 92}" y="${(compressionY + tensionY) / 2}" class="drawing-label">z = ${formatNumber(flexure.leverArm, 2)} in</text>
      <text x="${forceX + 92}" y="${(compressionY + tensionY) / 2 + 22}" class="drawing-label">Mn = ${formatNumber(flexure.mnKipFt, 1)} k-ft</text>

      <text x="42" y="${viewHeight - 30}" class="drawing-note">Multiple top and bottom reinforcement layers are included in the strain compatibility solution. Steel stresses shown here use the actual layer centroids used in the flexural solver.</text>
    </svg>
  `;
}
