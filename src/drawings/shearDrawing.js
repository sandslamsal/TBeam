import { formatNumber } from "../utils/format.js";

function stirrupPath(x, topY, bottomY, hook = 14) {
  const width = 26;
  return `
    <path d="M ${x} ${topY + hook} L ${x} ${bottomY} L ${x + width} ${bottomY} L ${x + width} ${topY + hook} M ${x} ${topY + hook} l 10 -${hook} M ${x + width} ${topY + hook} l -10 -${hook}" class="stirrup-outline" />
  `;
}

export function renderShearDrawing(snapshot) {
  const { geometry, reinforcement, shear } = snapshot;
  const viewWidth = 860;
  const viewHeight = 370;
  const beamX = 76;
  const beamY = 118;
  const beamLength = 560;
  const beamDepth = 150;
  const cageTop = beamY + 22;
  const cageBottom = beamY + beamDepth - 22;
  const stirrupCount = 7;
  const spacingPx = beamLength / (stirrupCount + 1);
  const dvScaled = (shear.dv / geometry.h) * beamDepth;
  const crackRun = 170;
  const crackRise = Math.tan((shear.thetaDeg * Math.PI) / 180) * crackRun;

  const stirrups = Array.from({ length: stirrupCount }, (_, index) => {
    const x = beamX + spacingPx * (index + 1) - 13;
    return stirrupPath(x, cageTop, cageBottom);
  }).join("");

  return `
    <svg viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="Beam elevation with shear reinforcement">
      <defs>
        <marker id="dimArrowShear" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
          <path d="M0,5 L10,0 L8,5 L10,10 z" fill="#355168"></path>
        </marker>
      </defs>

      <rect x="18" y="18" width="${viewWidth - 36}" height="${viewHeight - 36}" rx="24" class="drawing-frame" />
      <text x="42" y="46" class="drawing-title">Shear Reinforcement Elevation</text>
      <text x="42" y="70" class="drawing-subtitle">Closed stirrups, longitudinal cage, shear crack inclination, and LRFD shear terms positioned as a beam elevation detail</text>

      <text x="${beamX}" y="98" class="drawing-panel-title">Beam elevation</text>
      <rect x="${beamX}" y="${beamY}" width="${beamLength}" height="${beamDepth}" class="section-outline section-fill" />
      <line x1="${beamX + 26}" y1="${cageTop}" x2="${beamX + beamLength - 26}" y2="${cageTop}" class="rebar-line rebar-line--top" />
      <line x1="${beamX + 26}" y1="${cageBottom}" x2="${beamX + beamLength - 26}" y2="${cageBottom}" class="rebar-line rebar-line--bottom" />
      ${stirrups}
      <path d="M ${beamX + 72} ${cageBottom - 10} L ${beamX + 72 + crackRun} ${cageBottom - 10 - crackRise}" class="shear-crack" />

      <line x1="${beamX - 34}" y1="${beamY + beamDepth}" x2="${beamX - 34}" y2="${beamY + beamDepth - dvScaled}" class="dim-arrow" marker-start="url(#dimArrowShear)" marker-end="url(#dimArrowShear)" />
      <text x="${beamX - 18}" y="${beamY + beamDepth - dvScaled / 2}" class="dim-text">dv = ${formatNumber(shear.dv, 2)} in</text>

      <line x1="${beamX + spacingPx}" y1="${beamY - 24}" x2="${beamX + spacingPx * 2}" y2="${beamY - 24}" class="dim-arrow" marker-start="url(#dimArrowShear)" marker-end="url(#dimArrowShear)" />
      <line x1="${beamX + spacingPx}" y1="${beamY - 8}" x2="${beamX + spacingPx}" y2="${beamY}" class="dim-extension" />
      <line x1="${beamX + spacingPx * 2}" y1="${beamY - 8}" x2="${beamX + spacingPx * 2}" y2="${beamY}" class="dim-extension" />
      <text x="${beamX + spacingPx * 1.5 - 18}" y="${beamY - 34}" class="dim-text">s = ${formatNumber(snapshot.state.reinforcement.stirrupSpacing, 1)} in</text>

      <rect x="${beamX + beamLength + 38}" y="${beamY}" width="150" height="${beamDepth}" rx="18" class="info-box" />
      <text x="${beamX + beamLength + 56}" y="${beamY + 30}" class="drawing-label">Av = ${formatNumber(reinforcement.shearArea, 2)} in²</text>
      <text x="${beamX + beamLength + 56}" y="${beamY + 56}" class="drawing-label">θ = ${formatNumber(shear.thetaDeg, 1)}°</text>
      <text x="${beamX + beamLength + 56}" y="${beamY + 82}" class="drawing-label">β = ${formatNumber(shear.beta, 2)}</text>
      <text x="${beamX + beamLength + 56}" y="${beamY + 108}" class="drawing-label">Vc = ${formatNumber(shear.vc, 1)} k</text>
      <text x="${beamX + beamLength + 56}" y="${beamY + 134}" class="drawing-label">Vs = ${formatNumber(shear.vs, 1)} k</text>

      <text x="42" y="${viewHeight - 30}" class="drawing-note">The shear elevation uses a realistic RC beam cage with closed stirrups, longitudinal reinforcement lines, spacing callouts, and a diagonal compression-field angle.</text>
    </svg>
  `;
}
