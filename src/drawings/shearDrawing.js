import { formatNumber } from "../utils/format.js";

function buildZonePositions(totalLength, edgeZoneLength, edgeSpacing, middleSpacing) {
  const leftStart = Math.min(edgeSpacing, Math.max(edgeZoneLength * 0.45, edgeSpacing * 0.75));
  const left = [];
  for (let x = leftStart; x <= edgeZoneLength + 1e-6; x += edgeSpacing) {
    left.push(Number(x.toFixed(3)));
  }

  const middle = [];
  const middleStart = edgeZoneLength + middleSpacing;
  const middleEnd = totalLength - edgeZoneLength - 1e-6;
  for (let x = middleStart; x < middleEnd; x += middleSpacing) {
    middle.push(Number(x.toFixed(3)));
  }

  const right = left.map((x) => Number((totalLength - x).toFixed(3))).reverse();
  const all = [...new Set([...left, ...middle, ...right])].sort((a, b) => a - b);

  return { left, middle, right, all };
}

function dimensionArrow(x1, x2, y, label, extensionY) {
  return `
    <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="dim-arrow" marker-start="url(#dimArrowShear)" marker-end="url(#dimArrowShear)" />
    <line x1="${x1}" y1="${y + 2}" x2="${x1}" y2="${extensionY}" class="dim-extension" />
    <line x1="${x2}" y1="${y + 2}" x2="${x2}" y2="${extensionY}" class="dim-extension" />
    <text x="${(x1 + x2) / 2}" y="${y - 8}" class="dim-text dim-text--center">${label}</text>
  `;
}

function leader(anchorX, anchorY, elbowX, textX, textY, label) {
  return `
    <polyline points="${anchorX},${anchorY} ${elbowX},${anchorY} ${textX},${textY - 4}" class="callout-line" />
    <text x="${textX}" y="${textY}" class="drawing-label">${label}</text>
  `;
}

export function renderShearDrawing(snapshot) {
  const { geometry, reinforcement, shear, state } = snapshot;
  const edgeSpacing = Math.max(1, Number(state.reinforcement.edgeStirrupSpacing) || state.reinforcement.stirrupSpacing);
  const middleSpacing = Math.max(1, Number(state.reinforcement.middleStirrupSpacing) || state.reinforcement.stirrupSpacing);
  const edgeZoneLength = Math.max(1, Number(state.reinforcement.edgeZoneLength) || 24);
  const middleZoneLength = Math.max(middleSpacing * 4, edgeZoneLength * 2.5, 42);
  const totalLength = edgeZoneLength * 2 + middleZoneLength;
  const positions = buildZonePositions(totalLength, edgeZoneLength, edgeSpacing, middleSpacing);

  const viewWidth = 1120;
  const viewHeight = 542;
  const beamX = 64;
  const beamY = 208;
  const beamLength = 792;
  const beamDepth = 152;
  const coverPx = Math.max(16, (geometry.cover / geometry.h) * beamDepth + 4);
  const cageLeft = beamX + coverPx + 10;
  const cageRight = beamX + beamLength - coverPx - 10;
  const cageTop = beamY + coverPx + 8;
  const cageBottom = beamY + beamDepth - coverPx - 8;
  const xScale = (cageRight - cageLeft) / totalLength;
  const leftBoundaryX = cageLeft + edgeZoneLength * xScale;
  const rightBoundaryX = cageRight - edgeZoneLength * xScale;
  const dvScaled = Math.min(beamDepth - 16, (shear.dv / geometry.h) * beamDepth);
  const crackStartX = cageLeft + edgeZoneLength * xScale * 0.7;
  const crackStartY = cageBottom - 4;
  const crackRun = 214;
  const crackRise = Math.min(beamDepth - 28, Math.tan((shear.thetaDeg * Math.PI) / 180) * crackRun);
  const infoBoxX = beamX + beamLength + 28;
  const midPair = positions.middle.length >= 2 ? positions.middle.slice(0, 2) : [edgeZoneLength, edgeZoneLength + middleSpacing];
  const leftPair = positions.left.length >= 2 ? positions.left.slice(0, 2) : [positions.left[0] ?? edgeSpacing, (positions.left[0] ?? edgeSpacing) + edgeSpacing];
  const rightPair = positions.right.length >= 2 ? positions.right.slice(-2) : [totalLength - edgeSpacing * 2, totalLength - edgeSpacing];

  const stirrupMarkup = positions.all
    .map((position) => {
      const x = cageLeft + position * xScale;
      return `<line x1="${x}" y1="${cageTop}" x2="${x}" y2="${cageBottom}" class="stirrup-line" />`;
    })
    .join("");

  return `
    <svg class="engineering-svg engineering-svg--shear" viewBox="0 0 ${viewWidth} ${viewHeight}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Shear reinforcement elevation detail">
      <defs>
        <marker id="dimArrowShear" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
          <path d="M0,5 L10,0 L8,5 L10,10 z" fill="#355168"></path>
        </marker>
      </defs>

      <rect x="18" y="18" width="${viewWidth - 36}" height="${viewHeight - 36}" rx="20" class="drawing-frame" />
      <text x="42" y="46" class="drawing-title">Shear Reinforcement Elevation</text>
      <text x="42" y="68" class="drawing-subtitle">Beam elevation with cover-respecting longitudinal steel, vertical stirrup lines, and symmetric edge and middle spacing regions</text>

      <rect x="${beamX}" y="${beamY}" width="${beamLength}" height="${beamDepth}" class="section-outline section-fill" />
      <rect x="${cageLeft}" y="${beamY}" width="${leftBoundaryX - cageLeft}" height="${beamDepth}" class="zone-shade" />
      <rect x="${rightBoundaryX}" y="${beamY}" width="${cageRight - rightBoundaryX}" height="${beamDepth}" class="zone-shade" />
      <line x1="${cageLeft}" y1="${cageTop}" x2="${cageRight}" y2="${cageTop}" class="rebar-line rebar-line--top" />
      <line x1="${cageLeft}" y1="${cageBottom}" x2="${cageRight}" y2="${cageBottom}" class="rebar-line rebar-line--bottom" />
      ${stirrupMarkup}

      <line x1="${leftBoundaryX}" y1="${beamY}" x2="${leftBoundaryX}" y2="${beamY + beamDepth}" class="zone-divider" />
      <line x1="${rightBoundaryX}" y1="${beamY}" x2="${rightBoundaryX}" y2="${beamY + beamDepth}" class="zone-divider" />

      ${dimensionArrow(cageLeft, leftBoundaryX, beamY - 78, `L_edge = ${formatNumber(edgeZoneLength, 1)} in`, beamY)}
      ${dimensionArrow(leftBoundaryX, rightBoundaryX, beamY - 104, `L_mid = ${formatNumber(middleZoneLength, 1)} in`, beamY)}
      ${dimensionArrow(rightBoundaryX, cageRight, beamY - 78, `L_edge = ${formatNumber(edgeZoneLength, 1)} in`, beamY)}

      ${dimensionArrow(cageLeft + leftPair[0] * xScale, cageLeft + leftPair[1] * xScale, beamY - 28, `s_edge = ${formatNumber(edgeSpacing, 1)} in`, beamY)}
      ${dimensionArrow(cageLeft + midPair[0] * xScale, cageLeft + midPair[1] * xScale, beamY + beamDepth + 36, `s_mid = ${formatNumber(middleSpacing, 1)} in`, beamY + beamDepth)}
      ${dimensionArrow(cageLeft + rightPair[0] * xScale, cageLeft + rightPair[1] * xScale, beamY - 28, `s_edge = ${formatNumber(edgeSpacing, 1)} in`, beamY)}

      <line x1="${beamX - 34}" y1="${beamY}" x2="${beamX - 34}" y2="${beamY + dvScaled}" class="dim-arrow" marker-start="url(#dimArrowShear)" marker-end="url(#dimArrowShear)" />
      <text x="${beamX - 16}" y="${beamY + dvScaled / 2}" class="dim-text dim-text--middle">dv = ${formatNumber(shear.dv, 2)} in</text>

      <path d="M ${crackStartX} ${crackStartY} L ${crackStartX + crackRun} ${crackStartY - crackRise}" class="shear-crack" />
      <text x="${crackStartX + 98}" y="${crackStartY - 12}" class="drawing-label">theta = ${formatNumber(shear.thetaDeg, 1)} deg</text>

      ${leader(cageLeft + 18, cageTop, beamX + 16, beamX + 18, beamY - 12, "Compression face")}
      ${leader(cageLeft + 42, cageBottom, beamX + 34, beamX + 18, beamY + beamDepth + 28, "Longitudinal tension steel")}

      <rect x="${infoBoxX}" y="${beamY}" width="184" height="${beamDepth}" rx="18" class="info-box" />
      <text x="${infoBoxX + 16}" y="${beamY + 28}" class="drawing-label">Av = ${formatNumber(reinforcement.shearArea, 2)} in^2</text>
      <text x="${infoBoxX + 16}" y="${beamY + 52}" class="drawing-label">s_edge = ${formatNumber(edgeSpacing, 1)} in</text>
      <text x="${infoBoxX + 16}" y="${beamY + 76}" class="drawing-label">s_mid = ${formatNumber(middleSpacing, 1)} in</text>
      <text x="${infoBoxX + 16}" y="${beamY + 100}" class="drawing-label">L_edge = ${formatNumber(edgeZoneLength, 1)} in</text>
      <text x="${infoBoxX + 16}" y="${beamY + 124}" class="drawing-label">beta = ${formatNumber(shear.beta, 2)}</text>
      <text x="${infoBoxX + 16}" y="${beamY + 148}" class="drawing-label">phiVn = ${formatNumber(shear.phiVn, 1)} k</text>

      <text x="42" y="${viewHeight - 24}" class="drawing-note">The edge and middle spacing regions are figure-only detailing controls; the shear-capacity calculation continues to use the governing design spacing input.</text>
    </svg>
  `;
}
