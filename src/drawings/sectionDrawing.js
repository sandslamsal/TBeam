import { formatNumber } from "../utils/format.js";

function horizontalDimension(x1, x2, dimensionY, extensionY, label, textOffset = -10) {
  return `
    <g class="dimension-group">
      <line x1="${x1}" y1="${extensionY}" x2="${x1}" y2="${dimensionY}" class="dim-extension" />
      <line x1="${x2}" y1="${extensionY}" x2="${x2}" y2="${dimensionY}" class="dim-extension" />
      <line x1="${x1}" y1="${dimensionY}" x2="${x2}" y2="${dimensionY}" class="dim-arrow" marker-start="url(#dimArrowSection)" marker-end="url(#dimArrowSection)" />
      <text x="${(x1 + x2) / 2}" y="${dimensionY + textOffset}" class="dim-text dim-text--center">${label}</text>
    </g>
  `;
}

function verticalDimension(dimensionX, y1, y2, extensionX, label) {
  const isLeft = dimensionX < extensionX;
  const textX = dimensionX + (isLeft ? -12 : 12);
  return `
    <g class="dimension-group">
      <line x1="${extensionX}" y1="${y1}" x2="${dimensionX}" y2="${y1}" class="dim-extension" />
      <line x1="${extensionX}" y1="${y2}" x2="${dimensionX}" y2="${y2}" class="dim-extension" />
      <line x1="${dimensionX}" y1="${y1}" x2="${dimensionX}" y2="${y2}" class="dim-arrow" marker-start="url(#dimArrowSection)" marker-end="url(#dimArrowSection)" />
      <text x="${textX}" y="${(y1 + y2) / 2}" class="dim-text dim-text--middle ${isLeft ? "dim-text--end" : ""}">${label}</text>
    </g>
  `;
}

function leaderCallout(anchorX, anchorY, elbowX, textX, textY, label, align = "start") {
  return `
    <g class="callout-group">
      <polyline points="${anchorX},${anchorY} ${elbowX},${anchorY} ${textX},${textY - 4}" class="callout-line" />
      <text x="${textX}" y="${textY}" class="drawing-label ${align === "end" ? "drawing-label--end" : ""}">${label}</text>
    </g>
  `;
}

export function renderSectionDrawing(snapshot) {
  const { geometry, reinforcement, flexure } = snapshot;
  const viewWidth = 1120;
  const viewHeight = 620;
  const margin = 42;
  const frameInset = 18;
  const titleY = 48;
  const topY = 164;
  const sectionCenter = 398;
  const scale = Math.min(430 / geometry.bf, 334 / geometry.h);
  const flangeWidth = geometry.bf * scale;
  const flangeHeight = geometry.hf * scale;
  const webWidth = geometry.bw * scale;
  const webHeight = geometry.webDepth * scale;
  const flangeX = sectionCenter - flangeWidth / 2;
  const webX = sectionCenter - webWidth / 2;
  const sectionBottomY = topY + geometry.h * scale;
  const sectionLeft = flangeX;
  const sectionRight = flangeX + flangeWidth;
  const dY = topY + geometry.d * scale;
  const neutralAxisY = topY + Math.min(flexure.c, geometry.h) * scale;
  const compressionBottomY = topY + Math.min(flexure.a, geometry.h) * scale;
  const stirrupInset = (geometry.cover + reinforcement.stirrupBar.diameter / 2) * scale;
  const stirrupX = webX + stirrupInset;
  const stirrupY = topY + stirrupInset;
  const stirrupWidth = Math.max(0, webWidth - 2 * stirrupInset);
  const stirrupHeight = Math.max(0, geometry.h * scale - 2 * stirrupInset);
  const rightNoteX = 854;
  const leftNoteX = 182;
  const compressionLabelY = topY + Math.max(22, Math.min(compressionBottomY - topY - 10, 38));

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
        const radius = Math.max(4.1, (layer.diameter * scale) / 2);
        return `<circle cx="${x}" cy="${y}" r="${radius}" class="bar ${layer.family === "bottom" ? "bar--bottom" : "bar--top"}" />`;
      })
    )
    .join("");

  return `
    <svg class="engineering-svg engineering-svg--section" viewBox="0 0 ${viewWidth} ${viewHeight}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Main T-beam section">
      <defs>
        <marker id="dimArrowSection" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
          <path d="M0,5 L10,0 L8,5 L10,10 z" fill="#355168"></path>
        </marker>
      </defs>

      <rect x="${frameInset}" y="${frameInset}" width="${viewWidth - frameInset * 2}" height="${viewHeight - frameInset * 2}" rx="20" class="drawing-frame" />
      <text x="${margin}" y="${titleY}" class="drawing-title">Main T-Beam Section</text>
      <text x="${margin}" y="${titleY + 22}" class="drawing-subtitle">Parametric flange, web, reinforcement cage, and governing flexural dimensions</text>

      ${compressionMarkup}
      <rect x="${sectionLeft}" y="${topY}" width="${flangeWidth}" height="${flangeHeight}" class="section-outline section-fill" />
      <rect x="${webX}" y="${topY + flangeHeight}" width="${webWidth}" height="${webHeight}" class="section-outline section-fill" />
      <rect x="${stirrupX}" y="${stirrupY}" width="${stirrupWidth}" height="${stirrupHeight}" rx="4" class="stirrup-outline" />
      ${barMarkup}

      <line x1="${sectionLeft - 10}" y1="${neutralAxisY}" x2="${sectionRight + 18}" y2="${neutralAxisY}" class="neutral-axis" />
      <line x1="${sectionCenter}" y1="${topY}" x2="${sectionCenter}" y2="${dY}" class="effective-depth-line" />

      ${horizontalDimension(sectionLeft, sectionRight, topY - 34, topY - 8, `bf = ${formatNumber(geometry.bf, 2)} in`)}
      ${horizontalDimension(webX, webX + webWidth, sectionBottomY + 42, sectionBottomY + 8, `bw = ${formatNumber(geometry.bw, 2)} in`, 20)}

      ${verticalDimension(sectionLeft - 88, topY, sectionBottomY, sectionLeft, `h = ${formatNumber(geometry.h, 2)} in`)}
      ${verticalDimension(sectionLeft - 42, topY, topY + flangeHeight, sectionLeft, `hf = ${formatNumber(geometry.hf, 2)} in`)}
      ${verticalDimension(sectionRight + 52, topY, dY, sectionRight, `d = ${formatNumber(geometry.d, 2)} in`)}
      ${verticalDimension(sectionRight + 98, topY, neutralAxisY, sectionRight, `c = ${formatNumber(flexure.c, 2)} in`)}
      ${verticalDimension(sectionRight + 144, topY, compressionBottomY, sectionRight, `a = ${formatNumber(flexure.a, 2)} in`)}

      ${leaderCallout(sectionRight - flangeWidth * 0.18, compressionLabelY, sectionRight + 34, rightNoteX, topY + 30, "0.85f'c block")}
      ${leaderCallout(sectionRight + 2, neutralAxisY, sectionRight + 34, rightNoteX, neutralAxisY - 12, "N.A.")}
      ${leaderCallout(stirrupX + stirrupWidth, stirrupY + 22, sectionRight + 34, rightNoteX, sectionBottomY - 40, "Closed stirrup cage")}
      ${leaderCallout(webX + 6, stirrupY + stirrupHeight * 0.52, sectionLeft - 30, leftNoteX, sectionBottomY - 18, `clear cover = ${formatNumber(geometry.cover, 2)} in`, "end")}

      <text x="${margin}" y="${viewHeight - 44}" class="drawing-note">Dimension strings are kept outside the concrete profile and tied to the same layer coordinates used by the solver.</text>
      <text x="${margin}" y="${viewHeight - 22}" class="drawing-note">Compression-block depth, neutral axis, and effective depth update automatically with the calculated section state.</text>
    </svg>
  `;
}
