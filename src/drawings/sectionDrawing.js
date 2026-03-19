import { formatNumber } from "../utils/format.js";

function horizontalDimension(x1, x2, y, label, extTop, textY) {
  return `
    <g class="dimension-group">
      <line x1="${x1}" y1="${extTop}" x2="${x1}" y2="${y}" class="dim-extension" />
      <line x1="${x2}" y1="${extTop}" x2="${x2}" y2="${y}" class="dim-extension" />
      <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="dim-arrow" marker-start="url(#dimArrowSection)" marker-end="url(#dimArrowSection)" />
      <text x="${(x1 + x2) / 2}" y="${textY}" class="dim-text dim-text--center">${label}</text>
    </g>
  `;
}

function verticalDimension(x, y1, y2, label, textDx = 14) {
  return `
    <g class="dimension-group">
      <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" class="dim-arrow" marker-start="url(#dimArrowSection)" marker-end="url(#dimArrowSection)" />
      <text x="${x + textDx}" y="${(y1 + y2) / 2 + 4}" class="dim-text">${label}</text>
    </g>
  `;
}

function leaderCallout(x1, y1, x2, y2, label) {
  return `
    <g class="callout-group">
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="callout-line" />
      <text x="${x2 + 8}" y="${y2 + 4}" class="drawing-label">${label}</text>
    </g>
  `;
}

export function renderSectionDrawing(snapshot) {
  const { geometry, reinforcement, flexure } = snapshot;
  const viewWidth = 920;
  const viewHeight = 560;
  const topY = 136;
  const sectionCenter = 348;
  const scale = Math.min(430 / geometry.bf, 312 / geometry.h);
  const flangeWidth = geometry.bf * scale;
  const flangeHeight = geometry.hf * scale;
  const webWidth = geometry.bw * scale;
  const webHeight = (geometry.h - geometry.hf) * scale;
  const flangeX = sectionCenter - flangeWidth / 2;
  const webX = sectionCenter - webWidth / 2;
  const sectionBottomY = topY + geometry.h * scale;
  const sectionLeft = flangeX;
  const sectionRight = flangeX + flangeWidth;
  const neutralAxisY = topY + flexure.c * scale;
  const compressionBottomY = topY + Math.min(flexure.a, geometry.h) * scale;
  const tensionDepthY = topY + geometry.d * scale;
  const stirrupCenterInset = (geometry.cover + reinforcement.stirrupBar.diameter / 2) * scale;
  const stirrupX = sectionCenter - geometry.bw * scale / 2 + stirrupCenterInset;
  const stirrupY = topY + geometry.cover * scale + reinforcement.stirrupBar.diameter * scale / 2;
  const stirrupWidth = Math.max(0, geometry.bw * scale - 2 * stirrupCenterInset);
  const stirrupHeight = Math.max(
    0,
    geometry.h * scale - 2 * (geometry.cover * scale + reinforcement.stirrupBar.diameter * scale / 2)
  );
  const compressionMarkup =
    flexure.sectionCase === "flange"
      ? `<rect x="${sectionLeft}" y="${topY}" width="${flangeWidth}" height="${Math.max(0, compressionBottomY - topY)}" class="compression-block" />`
      : `
          <rect x="${sectionLeft}" y="${topY}" width="${flangeWidth}" height="${flangeHeight}" class="compression-block" />
          <rect x="${webX}" y="${topY + flangeHeight}" width="${webWidth}" height="${Math.max(0, compressionBottomY - (topY + flangeHeight))}" class="compression-block" />
        `;

  const barMarkup = [...reinforcement.topLayers, ...reinforcement.bottomLayers]
    .flatMap((layer) =>
      layer.xOffsets.map((offset) => {
        const x = sectionCenter + offset * scale;
        const y = topY + layer.depth * scale;
        const radius = Math.max(4.4, (layer.diameter * scale) / 2);
        return `<circle cx="${x}" cy="${y}" r="${radius}" class="bar ${layer.family === "bottom" ? "bar--bottom" : "bar--top"}" />`;
      })
    )
    .join("");

  return `
    <svg viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="Parametric T-beam cross section">
      <defs>
        <marker id="dimArrowSection" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
          <path d="M0,5 L10,0 L8,5 L10,10 z" fill="#355168"></path>
        </marker>
      </defs>

      <rect x="18" y="18" width="${viewWidth - 36}" height="${viewHeight - 36}" rx="20" class="drawing-frame" />
      <text x="42" y="46" class="drawing-title">Parametric T-Beam Section</text>
      <text x="42" y="68" class="drawing-subtitle">Section geometry, reinforcement cage, compression block, and governing depths used in the flexural solver</text>

      ${compressionMarkup}
      <rect x="${sectionLeft}" y="${topY}" width="${flangeWidth}" height="${flangeHeight}" class="section-outline section-fill" />
      <rect x="${webX}" y="${topY + flangeHeight}" width="${webWidth}" height="${webHeight}" class="section-outline section-fill" />

      <path
        d="M ${stirrupX + 14} ${stirrupY}
           H ${stirrupX + stirrupWidth - 14}
           q 12 0 12 12
           V ${stirrupY + stirrupHeight - 12}
           q 0 12 -12 12
           H ${stirrupX + 14}
           q -12 0 -12 -12
           V ${stirrupY + 24}"
        class="stirrup-outline"
      />
      <path
        d="M ${stirrupX + 10} ${stirrupY + 10} l 12 -10 M ${stirrupX + stirrupWidth - 10} ${stirrupY + 10} l -12 -10"
        class="stirrup-hook"
      />
      ${barMarkup}

      <line x1="${sectionLeft - 12}" y1="${neutralAxisY}" x2="${sectionRight + 22}" y2="${neutralAxisY}" class="neutral-axis" />
      <line x1="${sectionCenter}" y1="${topY}" x2="${sectionCenter}" y2="${tensionDepthY}" class="effective-depth-line" />

      ${leaderCallout(sectionLeft + 26, neutralAxisY, sectionLeft - 76, neutralAxisY - 16, "N.A.")}
      ${leaderCallout(sectionLeft + flangeWidth * 0.24, topY + Math.max(12, (compressionBottomY - topY) / 2), sectionLeft - 94, topY + 22, "0.85f'c block")}
      ${leaderCallout(stirrupX + stirrupWidth, stirrupY + 18, sectionRight + 48, sectionBottomY - 36, "Closed stirrup cage")}
      ${leaderCallout(webX - 6, stirrupY + 12, sectionLeft - 70, stirrupY - 18, `cover = ${formatNumber(geometry.cover, 2)} in`)}
      ${leaderCallout(sectionRight + 6, compressionBottomY, sectionRight + 64, topY + 26, `a = ${formatNumber(flexure.a, 2)} in`)}
      ${leaderCallout(sectionRight + 6, neutralAxisY, sectionRight + 64, topY + 54, `c = ${formatNumber(flexure.c, 2)} in`)}
      ${leaderCallout(sectionRight + 6, topY + flangeHeight, sectionRight + 64, topY + 84, `hf = ${formatNumber(geometry.hf, 2)} in`)}

      ${horizontalDimension(sectionLeft, sectionRight, topY - 34, `bf = ${formatNumber(geometry.bf, 2)} in`, topY - 8, topY - 42)}
      ${horizontalDimension(webX, webX + webWidth, sectionBottomY + 34, `bw = ${formatNumber(geometry.bw, 2)} in`, sectionBottomY + 6, sectionBottomY + 54)}
      ${verticalDimension(sectionLeft - 60, topY, sectionBottomY, `h = ${formatNumber(geometry.h, 2)} in`)}
      ${verticalDimension(sectionRight + 160, topY, tensionDepthY, `d = ${formatNumber(geometry.d, 2)} in`)}

      <text x="42" y="${viewHeight - 46}" class="drawing-note">Bar centers are taken directly from the layer-based reinforcement layout. The same coordinates are used in the drawings and in the strain-compatibility solution.</text>
      <text x="42" y="${viewHeight - 24}" class="drawing-note">Dimension callouts are kept outside the concrete profile where possible to maintain a clean engineering figure.</text>
    </svg>
  `;
}
