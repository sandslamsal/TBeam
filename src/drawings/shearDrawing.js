import { formatNumber } from "../utils/format.js";

function stirrupPath(x, topY, bottomY, width = 34, hook = 14) {
  return `
    <path
      d="M ${x} ${topY + hook}
         L ${x} ${bottomY}
         L ${x + width} ${bottomY}
         L ${x + width} ${topY + hook}
         M ${x} ${topY + hook} l 10 -${hook}
         M ${x + width} ${topY + hook} l -10 -${hook}"
      class="stirrup-outline"
    />
  `;
}

export function renderShearDrawing(snapshot) {
  const { geometry, reinforcement, shear } = snapshot;
  const viewWidth = 980;
  const viewHeight = 420;
  const beamX = 64;
  const beamY = 136;
  const beamLength = 650;
  const beamDepth = 170;
  const cageTop = beamY + 28;
  const cageBottom = beamY + beamDepth - 28;
  const stirrupCount = 6;
  const spacingPx = beamLength / (stirrupCount + 1);
  const stirrupWidth = 34;
  const dvScaled = Math.min(beamDepth - 20, (shear.dv / geometry.h) * beamDepth);
  const crackStartX = beamX + 124;
  const crackStartY = cageBottom - 10;
  const crackRun = 190;
  const crackRise = Math.min(beamDepth - 46, Math.tan((shear.thetaDeg * Math.PI) / 180) * crackRun);
  const stirrups = Array.from({ length: stirrupCount }, (_, index) => {
    const x = beamX + spacingPx * (index + 1) - stirrupWidth / 2;
    return stirrupPath(x, cageTop, cageBottom, stirrupWidth);
  }).join("");

  return `
    <svg viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="Beam elevation with shear reinforcement">
      <defs>
        <marker id="dimArrowShear" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
          <path d="M0,5 L10,0 L8,5 L10,10 z" fill="#355168"></path>
        </marker>
      </defs>

      <rect x="18" y="18" width="${viewWidth - 36}" height="${viewHeight - 36}" rx="20" class="drawing-frame" />
      <text x="42" y="46" class="drawing-title">Shear Reinforcement Elevation</text>
      <text x="42" y="68" class="drawing-subtitle">Beam elevation with closed ties, longitudinal cage, stirrup spacing, effective shear depth, and LRFD beta-theta parameters</text>

      <text x="${beamX}" y="112" class="drawing-panel-title">Beam elevation detail</text>
      <rect x="${beamX}" y="${beamY}" width="${beamLength}" height="${beamDepth}" class="section-outline section-fill" />
      <line x1="${beamX + 28}" y1="${cageTop}" x2="${beamX + beamLength - 28}" y2="${cageTop}" class="rebar-line rebar-line--top" />
      <line x1="${beamX + 28}" y1="${cageBottom}" x2="${beamX + beamLength - 28}" y2="${cageBottom}" class="rebar-line rebar-line--bottom" />
      ${stirrups}

      <path d="M ${crackStartX} ${crackStartY} L ${crackStartX + crackRun} ${crackStartY - crackRise}" class="shear-crack" />
      <line x1="${crackStartX}" y1="${crackStartY}" x2="${crackStartX + 64}" y2="${crackStartY}" class="callout-line" />
      <text x="${crackStartX + 72}" y="${crackStartY - 8}" class="drawing-label">theta = ${formatNumber(shear.thetaDeg, 1)} deg</text>

      <line x1="${beamX - 34}" y1="${beamY}" x2="${beamX - 34}" y2="${beamY + dvScaled}" class="dim-arrow" marker-start="url(#dimArrowShear)" marker-end="url(#dimArrowShear)" />
      <text x="${beamX - 18}" y="${beamY + dvScaled / 2 + 4}" class="dim-text">dv = ${formatNumber(shear.dv, 2)} in</text>

      <line x1="${beamX + spacingPx * 2}" y1="${beamY - 28}" x2="${beamX + spacingPx * 3}" y2="${beamY - 28}" class="dim-arrow" marker-start="url(#dimArrowShear)" marker-end="url(#dimArrowShear)" />
      <line x1="${beamX + spacingPx * 2}" y1="${beamY - 10}" x2="${beamX + spacingPx * 2}" y2="${beamY}" class="dim-extension" />
      <line x1="${beamX + spacingPx * 3}" y1="${beamY - 10}" x2="${beamX + spacingPx * 3}" y2="${beamY}" class="dim-extension" />
      <text x="${beamX + spacingPx * 2.5 - 22}" y="${beamY - 38}" class="dim-text">s = ${formatNumber(snapshot.state.reinforcement.stirrupSpacing, 1)} in</text>

      <line x1="${beamX + 26}" y1="${beamY}" x2="${beamX + 26}" y2="${beamY + beamDepth}" class="callout-line" />
      <text x="${beamX + 34}" y="${beamY + 18}" class="drawing-label">Compression face</text>
      <text x="${beamX + 34}" y="${beamY + beamDepth - 12}" class="drawing-label">Longitudinal tension steel</text>

      <rect x="${beamX + beamLength + 34}" y="${beamY}" width="176" height="${beamDepth}" rx="18" class="info-box" />
      <text x="${beamX + beamLength + 54}" y="${beamY + 30}" class="drawing-label">Av = ${formatNumber(reinforcement.shearArea, 2)} in^2</text>
      <text x="${beamX + beamLength + 54}" y="${beamY + 54}" class="drawing-label">s = ${formatNumber(snapshot.state.reinforcement.stirrupSpacing, 1)} in</text>
      <text x="${beamX + beamLength + 54}" y="${beamY + 78}" class="drawing-label">beta = ${formatNumber(shear.beta, 2)}</text>
      <text x="${beamX + beamLength + 54}" y="${beamY + 102}" class="drawing-label">theta = ${formatNumber(shear.thetaDeg, 1)} deg</text>
      <text x="${beamX + beamLength + 54}" y="${beamY + 126}" class="drawing-label">Vc = ${formatNumber(shear.vc, 1)} k</text>
      <text x="${beamX + beamLength + 54}" y="${beamY + 150}" class="drawing-label">Vs = ${formatNumber(shear.vs, 1)} k</text>
      <text x="${beamX + beamLength + 54}" y="${beamY + 174}" class="drawing-label">phiVn = ${formatNumber(shear.phiVn, 1)} k</text>

      <text x="42" y="${viewHeight - 26}" class="drawing-note">Closed stirrups are shown as a real beam cage rather than a schematic box, with spacing and shear-depth dimensions kept outside the concrete outline.</text>
    </svg>
  `;
}
