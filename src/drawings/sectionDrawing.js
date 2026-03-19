import { formatNumber } from "../utils/format.js";

function distributeXs(count, centerX, width) {
  if (count <= 1) {
    return [centerX];
  }

  const start = centerX - width / 2;
  const step = width / (count - 1);
  return Array.from({ length: count }, (_, index) => start + step * index);
}

function renderDimension(x1, y1, x2, y2, label, vertical = false) {
  const textX = vertical ? x1 - 14 : (x1 + x2) / 2;
  const textY = vertical ? (y1 + y2) / 2 : y1 - 12;

  return `
    <g class="dim-line">
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />
      <line x1="${x1}" y1="${y1}" x2="${x1 + (vertical ? -8 : 0)}" y2="${y1 + (vertical ? 0 : -8)}" />
      <line x1="${x2}" y1="${y2}" x2="${x2 + (vertical ? -8 : 0)}" y2="${y2 + (vertical ? 0 : -8)}" />
      <text x="${textX}" y="${textY}" class="dim-text" ${vertical ? `transform="rotate(-90 ${textX} ${textY})"` : ""}>${label}</text>
    </g>
  `;
}

export function renderSectionDrawing(snapshot) {
  const { geometry, reinforcement, flexure } = snapshot;
  const viewWidth = 640;
  const viewHeight = 430;
  const marginX = 76;
  const marginY = 54;
  const scale = Math.min((viewWidth - marginX * 2) / geometry.bf, (viewHeight - 120) / geometry.h);
  const sectionCenter = viewWidth / 2;
  const topY = marginY;
  const flangeX = sectionCenter - (geometry.bf * scale) / 2;
  const flangeY = topY;
  const flangeWidth = geometry.bf * scale;
  const flangeHeight = geometry.hf * scale;
  const webX = sectionCenter - (geometry.bw * scale) / 2;
  const webY = flangeY + flangeHeight;
  const webWidth = geometry.bw * scale;
  const webHeight = (geometry.h - geometry.hf) * scale;
  const stirrupInset = Math.max(8, reinforcement.stirrupBar.diameter * scale);
  const layerWidth = Math.min(flangeWidth * 0.8, Math.max(webWidth * 0.7, webWidth + 40));
  const compressionWidth = Math.min(flangeWidth * 0.55, Math.max(webWidth * 0.6, 40));
  const compressionY = topY;
  const tensionRows = reinforcement.tensionLayerCounts
    .map((count, layerIndex) => {
      const y =
        topY + (geometry.h - reinforcement.tensionLayerBottomDistances[layerIndex]) * scale;
      return distributeXs(count, sectionCenter, layerWidth).map(
        (x) =>
          `<circle cx="${x}" cy="${y}" r="${Math.max(5, reinforcement.tensionBar.diameter * scale * 0.42)}" class="bar bar--tension" />`
      );
    })
    .flat()
    .join("");

  const compressionRows =
    reinforcement.compressionArea > 0
      ? distributeXs(
          Math.max(1, Math.round(snapshot.state.reinforcement.compressionBarCount || 0)),
          sectionCenter,
          compressionWidth
        )
          .map((x) => {
            const y = topY + geometry.dPrime * scale;
            return `<circle cx="${x}" cy="${y}" r="${Math.max(5, reinforcement.compressionBar.diameter * scale * 0.42)}" class="bar bar--compression" />`;
          })
          .join("")
      : "";

  const compressionBlockSvg =
    flexure.sectionCase === "flange"
      ? `<rect x="${flangeX}" y="${compressionY}" width="${flangeWidth}" height="${flexure.a * scale}" class="compression-block" />`
      : `
          <rect x="${flangeX}" y="${compressionY}" width="${flangeWidth}" height="${flangeHeight}" class="compression-block" />
          <rect x="${webX}" y="${webY}" width="${webWidth}" height="${Math.max(0, (flexure.a - geometry.hf) * scale)}" class="compression-block" />
        `;

  const neutralAxisY = topY + flexure.c * scale;
  const effectiveDepthY = topY + geometry.d * scale;

  return `
    <svg viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="T-beam cross section drawing">
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="currentColor"></path>
        </marker>
      </defs>
      <rect x="18" y="18" width="${viewWidth - 36}" height="${viewHeight - 36}" rx="22" class="drawing-frame" />
      ${compressionBlockSvg}
      <path d="M ${flangeX} ${flangeY} h ${flangeWidth} v ${flangeHeight} h ${webX + webWidth - (flangeX + flangeWidth)} v ${webHeight} h -${webWidth} v -${webHeight} h -${webX - flangeX} z" class="section-outline" />
      <rect x="${webX + stirrupInset}" y="${topY + geometry.cover * scale}" width="${Math.max(0, webWidth - stirrupInset * 2)}" height="${Math.max(0, geometry.h * scale - geometry.cover * scale * 2)}" rx="8" class="stirrup-outline" />
      ${tensionRows}
      ${compressionRows}
      <line x1="${flangeX - 24}" y1="${neutralAxisY}" x2="${flangeX + flangeWidth + 24}" y2="${neutralAxisY}" class="neutral-axis" />
      <text x="${flangeX + flangeWidth + 28}" y="${neutralAxisY + 4}" class="drawing-label">N.A.</text>
      <line x1="${flangeX + flangeWidth + 44}" y1="${topY}" x2="${flangeX + flangeWidth + 44}" y2="${effectiveDepthY}" class="effective-depth-line" />
      <text x="${flangeX + flangeWidth + 52}" y="${topY + geometry.d * scale / 2}" class="drawing-label">d = ${formatNumber(geometry.d, 2)} in</text>
      ${renderDimension(flangeX, flangeY - 22, flangeX + flangeWidth, flangeY - 22, `bf = ${formatNumber(geometry.bf, 1)} in`)}
      ${renderDimension(webX, flangeY + flangeHeight + webHeight + 28, webX + webWidth, flangeY + flangeHeight + webHeight + 28, `bw = ${formatNumber(geometry.bw, 1)} in`)}
      ${renderDimension(flangeX - 30, flangeY, flangeX - 30, flangeY + flangeHeight + webHeight, `h = ${formatNumber(geometry.h, 1)} in`, true)}
      ${renderDimension(flangeX + flangeWidth + 20, flangeY, flangeX + flangeWidth + 20, flangeY + flangeHeight, `hf = ${formatNumber(geometry.hf, 1)} in`, true)}
      <text x="42" y="34" class="drawing-title">Parametric T-Beam Section</text>
      <text x="42" y="${viewHeight - 30}" class="drawing-note">Compression block, neutral axis, stirrups, and reinforcement update directly from the calculation engine.</text>
    </svg>
  `;
}

