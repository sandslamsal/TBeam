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
  const positions = [];
  const safeEdgeZone = Math.max(edgeZoneLength, edgeSpacing * 1.8);
  const rightZoneStart = totalLength - safeEdgeZone;

  for (let x = edgeSpacing; x <= safeEdgeZone + 1e-6; x += edgeSpacing) {
    positions.push(x);
  }

  for (let x = safeEdgeZone + middleSpacing; x < rightZoneStart - 1e-6; x += middleSpacing) {
    positions.push(x);
  }

  for (let x = rightZoneStart; x <= totalLength - edgeSpacing * 0.2 + 1e-6; x += edgeSpacing) {
    positions.push(x);
  }

  return [...new Set(positions.map((value) => Number(value.toFixed(3))))].sort((left, right) => left - right);
}

export function renderShearDrawing(snapshot) {
  const { geometry, reinforcement, shear, state } = snapshot;
  const edgeSpacing = Math.max(1, Number(state.reinforcement.edgeStirrupSpacing) || state.reinforcement.stirrupSpacing);
  const middleSpacing = Math.max(1, Number(state.reinforcement.middleStirrupSpacing) || state.reinforcement.stirrupSpacing);
  const edgeZoneLength = Math.max(1, Number(state.reinforcement.edgeZoneLength) || 24);
  const schematicLength = Math.max(
    edgeZoneLength * 2 + middleSpacing * 4,
    edgeSpacing * 4 + middleSpacing * 3,
    96
  );

  const viewWidth = 1080;
  const viewHeight = 470;
  const beamX = 64;
  const beamY = 154;
  const beamLength = 760;
  const beamDepth = 176;
  const coverPx = Math.max(16, (geometry.cover / geometry.h) * beamDepth);
  const stirrupDiaPx = Math.max(3, (reinforcement.stirrupBar.diameter / geometry.h) * beamDepth);
  const cageLeft = beamX + coverPx + 8;
  const cageRight = beamX + beamLength - coverPx - 8;
  const cageTop = beamY + coverPx + stirrupDiaPx / 2;
  const cageBottom = beamY + beamDepth - coverPx - stirrupDiaPx / 2;
  const cageLength = cageRight - cageLeft;
  const xScale = cageLength / schematicLength;
  const dvScaled = Math.min(beamDepth - 28, (shear.dv / geometry.h) * beamDepth);
  const safeEdgeZoneLengthPx = Math.max(edgeZoneLength, edgeSpacing * 1.8) * xScale;
  const positions = buildZonePositions(schematicLength, edgeZoneLength, edgeSpacing, middleSpacing);
  const stirrupWidth = 28;
  const stirrupMarkup = positions
    .map((position) => {
      const x = cageLeft + position * xScale - stirrupWidth / 2;
      return stirrupPath(x, cageTop, cageBottom, stirrupWidth);
    })
    .join("");
  const leftEdgePositions = positions.filter((position) => position <= Math.max(edgeZoneLength, edgeSpacing * 1.8) + 1e-6);
  const middlePositions = positions.filter(
    (position) =>
      position > Math.max(edgeZoneLength, edgeSpacing * 1.8) + 1e-6 &&
      position < schematicLength - Math.max(edgeZoneLength, edgeSpacing * 1.8) - 1e-6
  );
  const leftEdgeX1 = cageLeft + (leftEdgePositions[0] ?? edgeSpacing) * xScale;
  const leftEdgeX2 = cageLeft + (leftEdgePositions[1] ?? (leftEdgePositions[0] ?? edgeSpacing) + edgeSpacing) * xScale;
  const middleAnchorIndex = Math.max(0, Math.floor(middlePositions.length / 2) - 1);
  const middleX1 =
    cageLeft + (middlePositions[middleAnchorIndex] ?? schematicLength / 2 - middleSpacing / 2) * xScale;
  const middleX2 =
    cageLeft + (middlePositions[middleAnchorIndex + 1] ?? schematicLength / 2 + middleSpacing / 2) * xScale;
  const crackStartX = cageLeft + safeEdgeZoneLengthPx * 0.72;
  const crackStartY = cageBottom - 8;
  const crackRun = 196;
  const crackRise = Math.min(beamDepth - 40, Math.tan((shear.thetaDeg * Math.PI) / 180) * crackRun);
  const infoBoxX = beamX + beamLength + 30;
  const edgeZoneEndX = cageLeft + safeEdgeZoneLengthPx;

  return `
    <svg viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="Shear reinforcement elevation detail">
      <defs>
        <marker id="dimArrowShear" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
          <path d="M0,5 L10,0 L8,5 L10,10 z" fill="#355168"></path>
        </marker>
      </defs>

      <rect x="18" y="18" width="${viewWidth - 36}" height="${viewHeight - 36}" rx="20" class="drawing-frame" />
      <text x="42" y="46" class="drawing-title">Shear Reinforcement Elevation</text>
      <text x="42" y="68" class="drawing-subtitle">Closed ties inside the concrete cover, variable stirrup zones, longitudinal steel lines, and section shear terms shown as an RC beam elevation detail</text>

      <rect x="${beamX}" y="${beamY}" width="${beamLength}" height="${beamDepth}" class="section-outline section-fill" />
      <line x1="${cageLeft}" y1="${cageTop}" x2="${cageRight}" y2="${cageTop}" class="rebar-line rebar-line--top" />
      <line x1="${cageLeft}" y1="${cageBottom}" x2="${cageRight}" y2="${cageBottom}" class="rebar-line rebar-line--bottom" />
      ${stirrupMarkup}

      <line x1="${beamX + 22}" y1="${beamY}" x2="${beamX + 22}" y2="${beamY + beamDepth}" class="callout-line" />
      <text x="${beamX + 32}" y="${beamY + 20}" class="drawing-label">Compression face</text>
      <text x="${beamX + 32}" y="${beamY + beamDepth - 12}" class="drawing-label">Longitudinal tension steel</text>

      <path d="M ${crackStartX} ${crackStartY} L ${crackStartX + crackRun} ${crackStartY - crackRise}" class="shear-crack" />
      <line x1="${crackStartX + 66}" y1="${crackStartY - 24}" x2="${crackStartX + 120}" y2="${crackStartY - 24}" class="callout-line" />
      <text x="${crackStartX + 128}" y="${crackStartY - 20}" class="drawing-label">theta = ${formatNumber(shear.thetaDeg, 1)} deg</text>

      <line x1="${beamX - 34}" y1="${beamY}" x2="${beamX - 34}" y2="${beamY + dvScaled}" class="dim-arrow" marker-start="url(#dimArrowShear)" marker-end="url(#dimArrowShear)" />
      <text x="${beamX - 16}" y="${beamY + dvScaled / 2 + 4}" class="dim-text">dv = ${formatNumber(shear.dv, 2)} in</text>

      <line x1="${leftEdgeX1}" y1="${beamY - 20}" x2="${leftEdgeX2}" y2="${beamY - 20}" class="dim-arrow" marker-start="url(#dimArrowShear)" marker-end="url(#dimArrowShear)" />
      <line x1="${leftEdgeX1}" y1="${beamY - 6}" x2="${leftEdgeX1}" y2="${beamY}" class="dim-extension" />
      <line x1="${leftEdgeX2}" y1="${beamY - 6}" x2="${leftEdgeX2}" y2="${beamY}" class="dim-extension" />
      <text x="${(leftEdgeX1 + leftEdgeX2) / 2}" y="${beamY - 30}" class="dim-text dim-text--center">s_edge = ${formatNumber(edgeSpacing, 1)} in</text>

      <line x1="${middleX1}" y1="${beamY - 44}" x2="${middleX2}" y2="${beamY - 44}" class="dim-arrow" marker-start="url(#dimArrowShear)" marker-end="url(#dimArrowShear)" />
      <line x1="${middleX1}" y1="${beamY - 26}" x2="${middleX1}" y2="${beamY}" class="dim-extension" />
      <line x1="${middleX2}" y1="${beamY - 26}" x2="${middleX2}" y2="${beamY}" class="dim-extension" />
      <text x="${(middleX1 + middleX2) / 2}" y="${beamY - 54}" class="dim-text dim-text--center">s_mid = ${formatNumber(middleSpacing, 1)} in</text>

      <line x1="${cageLeft}" y1="${beamY - 68}" x2="${edgeZoneEndX}" y2="${beamY - 68}" class="dim-arrow" marker-start="url(#dimArrowShear)" marker-end="url(#dimArrowShear)" />
      <line x1="${cageLeft}" y1="${beamY - 50}" x2="${cageLeft}" y2="${beamY}" class="dim-extension" />
      <line x1="${edgeZoneEndX}" y1="${beamY - 50}" x2="${edgeZoneEndX}" y2="${beamY}" class="dim-extension" />
      <text x="${(cageLeft + edgeZoneEndX) / 2}" y="${beamY - 78}" class="dim-text dim-text--center">L_edge = ${formatNumber(edgeZoneLength, 1)} in each end</text>

      <rect x="${infoBoxX}" y="${beamY}" width="190" height="${beamDepth}" rx="18" class="info-box" />
      <text x="${infoBoxX + 18}" y="${beamY + 28}" class="drawing-label">Av = ${formatNumber(reinforcement.shearArea, 2)} in^2</text>
      <text x="${infoBoxX + 18}" y="${beamY + 52}" class="drawing-label">s_edge = ${formatNumber(edgeSpacing, 1)} in</text>
      <text x="${infoBoxX + 18}" y="${beamY + 76}" class="drawing-label">s_mid = ${formatNumber(middleSpacing, 1)} in</text>
      <text x="${infoBoxX + 18}" y="${beamY + 100}" class="drawing-label">L_edge = ${formatNumber(edgeZoneLength, 1)} in</text>
      <text x="${infoBoxX + 18}" y="${beamY + 124}" class="drawing-label">beta = ${formatNumber(shear.beta, 2)}</text>
      <text x="${infoBoxX + 18}" y="${beamY + 148}" class="drawing-label">Vc = ${formatNumber(shear.vc, 1)} k</text>
      <text x="${infoBoxX + 18}" y="${beamY + 172}" class="drawing-label">phiVn = ${formatNumber(shear.phiVn, 1)} k</text>

      <text x="42" y="${viewHeight - 26}" class="drawing-note">The shear cage respects the concrete cover and uses figure-only edge and middle stirrup zones so the elevation can show realistic end-region detailing without changing the solver.</text>
    </svg>
  `;
}
