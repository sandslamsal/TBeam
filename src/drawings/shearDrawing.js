import { formatNumber } from "../utils/format.js";

export function renderShearDrawing(snapshot) {
  const { geometry, reinforcement, shear } = snapshot;
  const viewWidth = 640;
  const viewHeight = 350;
  const originX = 72;
  const originY = 64;
  const beamLength = 470;
  const beamDepth = 170;
  const stirrupCount = 6;
  const spacingPx = beamLength / (stirrupCount + 1);
  const crackAngle = shear.thetaDeg;
  const crackRun = 160;
  const crackRise = Math.tan((crackAngle * Math.PI) / 180) * crackRun;
  const dvScaled = (shear.dv / geometry.h) * beamDepth;

  const stirrups = Array.from({ length: stirrupCount }, (_, index) => {
    const x = originX + spacingPx * (index + 1);
    return `<rect x="${x - 12}" y="${originY + 16}" width="24" height="${beamDepth - 32}" rx="8" class="stirrup-outline" />`;
  }).join("");

  return `
    <svg viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="Shear reinforcement diagram">
      <rect x="18" y="18" width="${viewWidth - 36}" height="${viewHeight - 36}" rx="22" class="drawing-frame" />
      <text x="42" y="34" class="drawing-title">Shear Reinforcement Diagram</text>

      <rect x="${originX}" y="${originY}" width="${beamLength}" height="${beamDepth}" rx="18" class="section-outline section-fill" />
      ${stirrups}
      <path d="M ${originX + 54} ${originY + beamDepth - 26} L ${originX + 54 + crackRun} ${originY + beamDepth - 26 - crackRise}" class="shear-crack" />
      <line x1="${originX - 24}" y1="${originY + beamDepth}" x2="${originX - 24}" y2="${originY + beamDepth - dvScaled}" class="effective-depth-line" />
      <text x="${originX - 38}" y="${originY + beamDepth - dvScaled / 2}" class="drawing-label" transform="rotate(-90 ${originX - 38} ${originY + beamDepth - dvScaled / 2})">dv = ${formatNumber(shear.dv, 2)} in</text>
      <line x1="${originX + spacingPx}" y1="${originY + beamDepth + 24}" x2="${originX + spacingPx * 2}" y2="${originY + beamDepth + 24}" class="dim-line" />
      <text x="${originX + spacingPx * 1.5}" y="${originY + beamDepth + 16}" class="dim-text">s = ${formatNumber(snapshot.state.reinforcement.stirrupSpacing, 1)} in</text>
      <text x="${originX + 248}" y="${originY + 38}" class="drawing-label">Av = ${formatNumber(reinforcement.shearArea, 2)} in²</text>
      <text x="${originX + 248}" y="${originY + 62}" class="drawing-label">θ = ${formatNumber(shear.thetaDeg, 1)}°</text>
      <text x="${originX + 248}" y="${originY + 86}" class="drawing-label">β = ${formatNumber(shear.beta, 2)}</text>
      <text x="${originX + 248}" y="${originY + 110}" class="drawing-label">Vc = ${formatNumber(shear.vc, 1)} k</text>
      <text x="${originX + 248}" y="${originY + 134}" class="drawing-label">Vs = ${formatNumber(shear.vs, 1)} k</text>
      <text x="42" y="${viewHeight - 30}" class="drawing-note">Repeated stirrups, diagonal compression field angle, and effective shear depth are shown using the same parameters used in the shear capacity module.</text>
    </svg>
  `;
}
