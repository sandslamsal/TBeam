import { formatNumber } from "../utils/format.js";

function buildStirrupPositions(totalLength, spacing) {
  const leadIn = Math.max(spacing * 0.85, 4);
  const positions = [];
  for (let x = leadIn; x <= totalLength - leadIn + 1e-6; x += spacing) {
    positions.push(Number(x.toFixed(3)));
  }

  return positions;
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
  const { geometry, shear, state } = snapshot;
  const spacing = Math.max(1, Number(state.reinforcement.stirrupSpacing) || 1);
  const totalLength = Math.max(spacing * 10, 96);
  const positions = buildStirrupPositions(totalLength, spacing);

  const viewWidth = 1120;
  const viewHeight = 468;
  const frameInset = 18;
  const titleY = 46;
  const contentLeft = frameInset + 42;
  const contentRight = viewWidth - frameInset - 42;
  const contentTop = titleY + 54;
  const contentBottom = viewHeight - frameInset - 24;
  const beamLength = 792;
  const beamDepth = 152;
  const drawingWidth = beamLength + 34;
  const drawingHeight = 34 + beamDepth + 28;
  const beamX = contentLeft + (contentRight - contentLeft - drawingWidth) / 2 + 34;
  const beamY = contentTop + (contentBottom - contentTop - drawingHeight) / 2 + 34;
  const coverPx = Math.max(16, (geometry.cover / geometry.h) * beamDepth + 4);
  const cageLeft = beamX + coverPx + 10;
  const cageRight = beamX + beamLength - coverPx - 10;
  const cageTop = beamY + coverPx + 8;
  const cageBottom = beamY + beamDepth - coverPx - 8;
  const xScale = (cageRight - cageLeft) / totalLength;
  const dvScaled = Math.min(beamDepth - 16, (shear.dv / geometry.h) * beamDepth);
  const crackStartX = cageLeft + (positions[1] ?? spacing * 1.5) * xScale;
  const crackStartY = cageBottom - 4;
  const crackRun = 214;
  const crackRise = Math.min(beamDepth - 28, Math.tan((shear.thetaDeg * Math.PI) / 180) * crackRun);
  const spacingPair = positions.length >= 2 ? positions.slice(0, 2) : [spacing, spacing * 2];

  const stirrupMarkup = positions
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

      <rect x="${frameInset}" y="${frameInset}" width="${viewWidth - frameInset * 2}" height="${viewHeight - frameInset * 2}" rx="20" class="drawing-frame" />
      <text x="42" y="46" class="drawing-title">Shear Reinforcement Elevation</text>

      <rect x="${beamX}" y="${beamY}" width="${beamLength}" height="${beamDepth}" class="section-outline section-fill" />
      <line x1="${cageLeft}" y1="${cageTop}" x2="${cageRight}" y2="${cageTop}" class="rebar-line rebar-line--top" />
      <line x1="${cageLeft}" y1="${cageBottom}" x2="${cageRight}" y2="${cageBottom}" class="rebar-line rebar-line--bottom" />
      ${stirrupMarkup}

      ${dimensionArrow(cageLeft + spacingPair[0] * xScale, cageLeft + spacingPair[1] * xScale, beamY - 34, `s = ${formatNumber(spacing, 1)} in`, beamY)}

      <line x1="${beamX - 34}" y1="${beamY}" x2="${beamX - 34}" y2="${beamY + dvScaled}" class="dim-arrow" marker-start="url(#dimArrowShear)" marker-end="url(#dimArrowShear)" />
      <text x="${beamX - 16}" y="${beamY + dvScaled / 2}" class="dim-text dim-text--middle">dv = ${formatNumber(shear.dv, 2)} in</text>

      <path d="M ${crackStartX} ${crackStartY} L ${crackStartX + crackRun} ${crackStartY - crackRise}" class="shear-crack" />
      <text x="${crackStartX + 98}" y="${crackStartY - 12}" class="drawing-label">theta = ${formatNumber(shear.thetaDeg, 1)} deg</text>

      ${leader(cageLeft + 18, cageTop, beamX + 16, beamX + 18, beamY - 12, "Compression face")}
      ${leader(cageLeft + 42, cageBottom, beamX + 34, beamX + 18, beamY + beamDepth + 28, "Longitudinal tension steel")}
    </svg>
  `;
}
