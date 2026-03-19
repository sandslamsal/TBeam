import { formatNumber } from "../utils/format.js";

function horizontalDimension(x1, x2, y, label, extTop, extBottom) {
  return `
    <g class="dimension-group">
      <line x1="${x1}" y1="${extTop}" x2="${x1}" y2="${y}" class="dim-extension" />
      <line x1="${x2}" y1="${extTop}" x2="${x2}" y2="${y}" class="dim-extension" />
      <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="dim-arrow" marker-start="url(#dimArrow)" marker-end="url(#dimArrow)" />
      <text x="${(x1 + x2) / 2}" y="${extBottom}" class="dim-text dim-text--center">${label}</text>
    </g>
  `;
}

function verticalDimension(x, y1, y2, label) {
  return `
    <g class="dimension-group">
      <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" class="dim-arrow" marker-start="url(#dimArrow)" marker-end="url(#dimArrow)" />
      <text x="${x + 12}" y="${(y1 + y2) / 2 - 4}" class="dim-text">${label}</text>
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
  const viewWidth = 820;
  const viewHeight = 520;
  const topY = 112;
  const sectionCenter = 330;
  const scale = Math.min(420 / geometry.bf, 292 / geometry.h);
  const flangeWidth = geometry.bf * scale;
  const flangeHeight = geometry.hf * scale;
  const webWidth = geometry.bw * scale;
  const webHeight = (geometry.h - geometry.hf) * scale;
  const flangeX = sectionCenter - flangeWidth / 2;
  const webX = sectionCenter - webWidth / 2;
  const sectionBottomY = topY + geometry.h * scale;
  const sectionRight = flangeX + flangeWidth;
  const sectionLeft = flangeX;
  const neutralAxisY = topY + flexure.c * scale;
  const compressionBottomY = topY + Math.min(flexure.a, geometry.h) * scale;
  const dY = topY + geometry.d * scale;
  const stirrupInset = (geometry.cover + reinforcement.stirrupBar.diameter / 2) * scale;
  const stirrupX = sectionCenter - (geometry.bw * scale) / 2 + stirrupInset;
  const stirrupWidth = Math.max(0, geometry.bw * scale - stirrupInset * 2);
  const stirrupY = topY + geometry.cover * scale;
  const stirrupHeight = Math.max(0, geometry.h * scale - 2 * geometry.cover * scale);

  const barMarkup = [...reinforcement.topLayers, ...reinforcement.bottomLayers]
    .flatMap((layer) =>
      layer.xOffsets.map((offset) => {
        const x = sectionCenter + offset * scale;
        const y = topY + layer.depth * scale;
        const radius = Math.max(4.6, (layer.diameter * scale) / 2);
        return `<circle cx="${x}" cy="${y}" r="${radius}" class="bar ${layer.family === "bottom" ? "bar--bottom" : "bar--top"}" />`;
      })
    )
    .join("");

  const compressionMarkup =
    flexure.sectionCase === "flange"
      ? `<rect x="${sectionLeft}" y="${topY}" width="${flangeWidth}" height="${Math.max(0, compressionBottomY - topY)}" class="compression-block" />`
      : `
          <rect x="${sectionLeft}" y="${topY}" width="${flangeWidth}" height="${flangeHeight}" class="compression-block" />
          <rect x="${webX}" y="${topY + flangeHeight}" width="${webWidth}" height="${Math.max(0, compressionBottomY - (topY + flangeHeight))}" class="compression-block" />
        `;

  const calloutStartX = sectionRight + 36;

  return `
    <svg viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="Parametric T-beam cross section">
      <defs>
        <marker id="dimArrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
          <path d="M0,5 L10,0 L8,5 L10,10 z" fill="#355168"></path>
        </marker>
      </defs>

      <rect x="18" y="18" width="${viewWidth - 36}" height="${viewHeight - 36}" rx="24" class="drawing-frame" />
      <text x="42" y="46" class="drawing-title">Parametric T-Beam Section</text>
      <text x="42" y="70" class="drawing-subtitle">Live geometry, actual bar layers, stirrup cage, neutral axis, and equivalent compression block</text>

      ${compressionMarkup}
      <rect x="${sectionLeft}" y="${topY}" width="${flangeWidth}" height="${flangeHeight}" class="section-outline section-fill" />
      <rect x="${webX}" y="${topY + flangeHeight}" width="${webWidth}" height="${webHeight}" class="section-outline section-fill" />
      <path d="M ${stirrupX + 14} ${stirrupY} H ${stirrupX + stirrupWidth - 14} q 12 0 12 12 V ${stirrupY + stirrupHeight - 12} q 0 12 -12 12 H ${stirrupX + 14} q -12 0 -12 -12 V ${stirrupY + 22}" class="stirrup-outline" />
      <path d="M ${stirrupX + 10} ${stirrupY + 10} l 12 -10 M ${stirrupX + stirrupWidth - 10} ${stirrupY + 10} l -12 -10" class="stirrup-hook" />
      ${barMarkup}

      <line x1="${sectionLeft - 18}" y1="${neutralAxisY}" x2="${sectionRight + 18}" y2="${neutralAxisY}" class="neutral-axis" />
      ${leaderCallout(sectionRight + 10, neutralAxisY, sectionRight + 44, neutralAxisY - 18, "N.A.")}
      ${leaderCallout(sectionRight - 10, topY + Math.max(20, (compressionBottomY - topY) / 2), calloutStartX, topY + 18, "Equivalent compression block")}
      ${leaderCallout(stirrupX + stirrupWidth / 2, stirrupY + 24, calloutStartX + 24, sectionBottomY - 18, "Closed stirrup / tie cage")}

      ${horizontalDimension(sectionLeft, sectionRight, topY - 32, `bf = ${formatNumber(geometry.bf, 2)} in`, topY - 10, topY - 42)}
      ${horizontalDimension(webX, webX + webWidth, sectionBottomY + 34, `bw = ${formatNumber(geometry.bw, 2)} in`, sectionBottomY + 4, sectionBottomY + 52)}
      ${verticalDimension(sectionLeft - 48, topY, sectionBottomY, `h = ${formatNumber(geometry.h, 2)} in`)}
      ${verticalDimension(sectionRight + 54, topY, topY + flangeHeight, `hf = ${formatNumber(geometry.hf, 2)} in`)}
      ${verticalDimension(sectionRight + 108, topY, compressionBottomY, `a = ${formatNumber(flexure.a, 2)} in`)}
      ${verticalDimension(sectionRight + 162, topY, neutralAxisY, `c = ${formatNumber(flexure.c, 2)} in`)}
      ${verticalDimension(sectionRight + 216, topY, dY, `d = ${formatNumber(geometry.d, 2)} in`)}

      <text x="42" y="${viewHeight - 54}" class="drawing-note">Bottom reinforcement centroid defines the automatic effective depth. Top and bottom layer coordinates are shared by the drawing and strain-compatibility engine.</text>
      <text x="42" y="${viewHeight - 28}" class="drawing-note">All bar centers respect cover and remain inside the web cage. Crowded layouts are flagged in the validation panel.</text>
    </svg>
  `;
}
