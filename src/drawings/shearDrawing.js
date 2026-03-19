import { formatNumber } from "../utils/format.js";

function stirrupPath(x, topY, bottomY, width = 28, hook = 12) {
  return `
    <path
      d="M ${x} ${topY + hook}
         L ${x} ${bottomY}
         L ${x + width} ${bottomY}
         L ${x + width} ${topY + hook}
         M ${x} ${topY + hook} l 9 -${hook}
         M ${x + width} ${topY + hook} l -9 -${hook}"
      class="stirrup-outline"
    />
  `;
}

function buildZonePositions(totalLength, edgeZoneLength, edgeSpacing, middleSpacing) {
  const leftStart = Math.min(edgeSpacing, Math.max(edgeZoneLength * 0.45, edgeSpacing * 0.6));
  const leftPositions = [];
  for (let x = leftStart; x <= edgeZoneLength + 1e-6; x += edgeSpacing) {
    leftPositions.push(x);
  }

  const rightPositions = leftPositions.map((x) => totalLength - x).reverse();
  const middlePositions = [];
  const middleStart = edgeZoneLength + middleSpacing;
  const middleEnd = totalLength - edgeZoneLength - 1e-6;
  for (let x = middleStart; x < middleEnd; x += middleSpacing) {
    middlePositions.push(x);
  }

  return [...new Set([...leftPositions, ...middlePositions, ...rightPositions].map((value) => Number(value.toFixed(3))))].sort(
    (left, right) => left - right
  );
}

function dimensionArrow(x1, x2, y, label, beamY) {
  return `
    <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="dim-arrow" marker-start="url(#dimArrowShear)" marker-end="url(#dimArrowShear)" />
    <line x1="${x1}" y1="${y + 2}" x2="${x1}" y2="${beamY}" class="dim-extension" />
    <line x1="${x2}" y1="${y + 2}" x2="${x2}" y2="${beamY}" class="dim-extension" />
    <text x="${(x1 + x2) / 2}" y="${y - 8}" class="dim-text dim-text--center">${label}</text>
  `;
}

export function renderShearDrawing(snapshot) {
  const { geometry, reinforcement, shear, state } = snapshot;
  const edgeSpacing = Math.max(1, Number(state.reinforcement.edgeStirrupSpacing) || state.reinforcement.stirrupSpacing);
  const middleSpacing = Math.max(1, Number(state.reinforcement.middleStirrupSpacing) || state.reinforcement.stirrupSpacing);
  const edgeZoneLength = Math.max(1, Number(state.reinforcement.edgeZoneLength) || 24);
  const middleZoneLength = Math.max(middleSpacing * 4, edgeZoneLength * 2.5, 42);
  const totalLength = edgeZoneLength * 2 + middleZoneLength;

  const viewWidth = 1100;
  const viewHeight = 500;
  const beamX = 70;
  const beamY = 172;
  const beamLength = 780;
  const beamDepth = 160;
  const coverPx = Math.max(16, (geometry.cover / geometry.h) * beamDepth);
  const cageLeft = beamX + coverPx + 10;
  const cageRight = beamX + beamLength - coverPx - 10;
  const cageTop = beamY + coverPx;
  const cageBottom = beamY + beamDepth - coverPx;
  const xScale = (cageRight - cageLeft) / totalLength;
  const positions = buildZonePositions(totalLength, edgeZoneLength, edgeSpacing, middleSpacing);
  const stirrupMarkup = positions
    .map((position) => stirrupPath(cageLeft + position * xScale - 14, cageTop, cageBottom, 28))
    .join("");
  const leftBoundaryX = cageLeft + edgeZoneLength * xScale;
  const rightBoundaryX = cageRight - edgeZoneLength * xScale;
  const middleDimStart = leftBoundaryX;
  const middleDimEnd = rightBoundaryX;
  const leftEdgePositions = positions.filter((position) => position <= edgeZoneLength + 1e-6);
  const rightEdgePositions = positions.filter((position) => position >= totalLength - edgeZoneLength - 1e-6);
  const leftSpacingX1 = cageLeft + (leftEdgePositions[0] ?? edgeSpacing) * xScale;
  const leftSpacingX2 = cageLeft + (leftEdgePositions[1] ?? (leftEdgePositions[0] ?? edgeSpacing) + edgeSpacing) * xScale;
  const rightSpacingX1 = cageLeft + (rightEdgePositions[Math.max(0, rightEdgePositions.length - 2)] ?? totalLength - edgeZoneLength) * xScale;
  const rightSpacingX2 = cageLeft + (rightEdgePositions[rightEdgePositions.length - 1] ?? totalLength - edgeSpacing) * xScale;
  const crackStartX = cageLeft + edgeZoneLength * xScale * 0.72;
  const crackStartY = cageBottom - 6;
  const crackRun = 210;
  const crackRise = Math.min(beamDepth - 30, Math.tan((shear.thetaDeg * Math.PI) / 180) * crackRun);
  const dvScaled = Math.min(beamDepth - 16, (shear.dv / geometry.h) * beamDepth);
  const infoBoxX = beamX + beamLength + 28;

  return `
    <svg viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="Shear reinforcement elevation detail">
      <defs>
        <marker id="dimArrowShear" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
          <path d="M0,5 L10,0 L8,5 L10,10 z" fill="#355168"></path>
        </marker>
      </defs>

      <rect x="18" y="18" width="${viewWidth - 36}" height="${viewHeight - 36}" rx="20" class="drawing-frame" />
      <text x="42" y="46" class="drawing-title">Shear Reinforcement Elevation</text>
      <text x="42" y="68" class="drawing-subtitle">Beam-elevation style detailing with closed ties inside cover, tighter edge zones, wider middle-zone spacing, and symmetric end-region dimensions</text>

      <rect x="${beamX}" y="${beamY}" width="${beamLength}" height="${beamDepth}" class="section-outline section-fill" />
      <line x1="${cageLeft}" y1="${cageTop}" x2="${cageRight}" y2="${cageTop}" class="rebar-line rebar-line--top" />
      <line x1="${cageLeft}" y1="${cageBottom}" x2="${cageRight}" y2="${cageBottom}" class="rebar-line rebar-line--bottom" />
      ${stirrupMarkup}

      <line x1="${leftBoundaryX}" y1="${beamY}" x2="${leftBoundaryX}" y2="${beamY + beamDepth}" class="dim-extension" />
      <line x1="${rightBoundaryX}" y1="${beamY}" x2="${rightBoundaryX}" y2="${beamY + beamDepth}" class="dim-extension" />

      ${dimensionArrow(cageLeft, leftBoundaryX, beamY - 82, `L_edge = ${formatNumber(edgeZoneLength, 1)} in`, beamY)}
      ${dimensionArrow(leftBoundaryX, rightBoundaryX, beamY - 108, `L_mid = ${formatNumber(middleZoneLength, 1)} in`, beamY)}
      ${dimensionArrow(rightBoundaryX, cageRight, beamY - 82, `L_edge = ${formatNumber(edgeZoneLength, 1)} in`, beamY)}
      ${dimensionArrow(leftSpacingX1, leftSpacingX2, beamY - 32, `s_edge = ${formatNumber(edgeSpacing, 1)} in`, beamY)}
      ${dimensionArrow(rightSpacingX1, rightSpacingX2, beamY - 32, `s_edge = ${formatNumber(edgeSpacing, 1)} in`, beamY)}

      <line x1="${beamX - 34}" y1="${beamY}" x2="${beamX - 34}" y2="${beamY + dvScaled}" class="dim-arrow" marker-start="url(#dimArrowShear)" marker-end="url(#dimArrowShear)" />
      <text x="${beamX - 16}" y="${beamY + dvScaled / 2 + 4}" class="dim-text">dv = ${formatNumber(shear.dv, 2)} in</text>

      <path d="M ${crackStartX} ${crackStartY} L ${crackStartX + crackRun} ${crackStartY - crackRise}" class="shear-crack" />
      <text x="${crackStartX + 94}" y="${crackStartY - 12}" class="drawing-label">theta = ${formatNumber(shear.thetaDeg, 1)} deg</text>
      <text x="${beamX + 18}" y="${beamY + 18}" class="drawing-label">Compression face</text>
      <text x="${beamX + 18}" y="${beamY + beamDepth - 10}" class="drawing-label">Longitudinal tension steel</text>
      <text x="${leftBoundaryX + 12}" y="${beamY - 58}" class="drawing-label">s_mid = ${formatNumber(middleSpacing, 1)} in</text>

      <rect x="${infoBoxX}" y="${beamY}" width="182" height="${beamDepth}" rx="18" class="info-box" />
      <text x="${infoBoxX + 16}" y="${beamY + 28}" class="drawing-label">Av = ${formatNumber(reinforcement.shearArea, 2)} in^2</text>
      <text x="${infoBoxX + 16}" y="${beamY + 52}" class="drawing-label">s_edge = ${formatNumber(edgeSpacing, 1)} in</text>
      <text x="${infoBoxX + 16}" y="${beamY + 76}" class="drawing-label">s_mid = ${formatNumber(middleSpacing, 1)} in</text>
      <text x="${infoBoxX + 16}" y="${beamY + 100}" class="drawing-label">L_edge = ${formatNumber(edgeZoneLength, 1)} in</text>
      <text x="${infoBoxX + 16}" y="${beamY + 124}" class="drawing-label">beta = ${formatNumber(shear.beta, 2)}</text>
      <text x="${infoBoxX + 16}" y="${beamY + 148}" class="drawing-label">phiVn = ${formatNumber(shear.phiVn, 1)} k</text>

      <text x="42" y="${viewHeight - 26}" class="drawing-note">The end-region spacing sketch is configurable for visualization only, so the drawing can mirror standard detailing sheets without changing the shear-capacity calculation inputs.</text>
    </svg>
  `;
}
