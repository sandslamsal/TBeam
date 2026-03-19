import { formatNumber } from "../utils/format.js";

export function renderFlexureDrawing(snapshot) {
  const { geometry, flexure } = snapshot;
  const viewWidth = 640;
  const viewHeight = 350;
  const leftX = 90;
  const topY = 48;
  const memberHeight = 240;
  const scale = memberHeight / geometry.h;
  const blockHeight = flexure.a * scale;
  const neutralAxisY = topY + flexure.c * scale;
  const tensionY = topY + geometry.d * scale;
  const compressionY = topY + flexure.concreteCentroidY * scale;
  const sectionWidth = 86;
  const forceX = 420;
  const stressX = 232;

  return `
    <svg viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="Flexural stress diagram">
      <rect x="18" y="18" width="${viewWidth - 36}" height="${viewHeight - 36}" rx="22" class="drawing-frame" />
      <text x="42" y="34" class="drawing-title">Flexural Stress and Force Diagram</text>

      <g transform="translate(${leftX},0)">
        <rect x="0" y="${topY}" width="${sectionWidth}" height="${memberHeight}" rx="20" class="section-outline section-fill" />
        <rect x="0" y="${topY}" width="${sectionWidth}" height="${blockHeight}" class="compression-block" />
        <line x1="-16" y1="${neutralAxisY}" x2="${sectionWidth + 16}" y2="${neutralAxisY}" class="neutral-axis" />
        <line x1="${sectionWidth + 22}" y1="${topY}" x2="${sectionWidth + 22}" y2="${tensionY}" class="effective-depth-line" />
        <text x="${sectionWidth + 34}" y="${topY + memberHeight / 2}" class="drawing-label">d = ${formatNumber(geometry.d, 2)} in</text>
        <text x="-4" y="${topY - 12}" class="drawing-label">Section</text>
      </g>

      <g transform="translate(${stressX},0)">
        <polygon points="0,${topY} 104,${topY} 104,${topY + blockHeight} 0,${topY + blockHeight}" class="compression-block" />
        <line x1="0" y1="${neutralAxisY}" x2="128" y2="${neutralAxisY}" class="neutral-axis" />
        <line x1="0" y1="${tensionY}" x2="128" y2="${tensionY}" class="stress-axis" />
        <text x="0" y="${topY - 12}" class="drawing-label">Whitney block</text>
        <text x="112" y="${topY + blockHeight / 2}" class="drawing-label">a = ${formatNumber(flexure.a, 2)} in</text>
        <text x="112" y="${neutralAxisY + 4}" class="drawing-label">c = ${formatNumber(flexure.c, 2)} in</text>
      </g>

      <g transform="translate(${forceX},0)">
        <line x1="56" y1="${compressionY}" x2="56" y2="${tensionY}" class="lever-arm-line" />
        <line x1="36" y1="${compressionY}" x2="76" y2="${compressionY}" class="lever-arm-cap" />
        <line x1="36" y1="${tensionY}" x2="76" y2="${tensionY}" class="lever-arm-cap" />
        <text x="86" y="${(compressionY + tensionY) / 2}" class="drawing-label">z = ${formatNumber(flexure.leverArm, 2)} in</text>
        <path d="M56 ${compressionY + 34} V ${compressionY - 18}" class="force-arrow force-arrow--compression" marker-end="url(#flexure-arrow)" />
        <path d="M56 ${tensionY - 34} V ${tensionY + 18}" class="force-arrow force-arrow--tension" marker-end="url(#flexure-arrow)" />
        <text x="92" y="${compressionY + 4}" class="drawing-label">C = ${formatNumber(
          flexure.concreteForce + flexure.compressionSteelForce,
          1
        )} k</text>
        <text x="92" y="${tensionY + 4}" class="drawing-label">T = ${formatNumber(flexure.tensionForce, 1)} k</text>
        <text x="0" y="${topY - 12}" class="drawing-label">Internal forces</text>
      </g>

      <text x="42" y="${viewHeight - 30}" class="drawing-note">The flexural diagram highlights compression block depth, neutral axis, steel force equilibrium, and the resulting internal lever arm.</text>

      <defs>
        <marker id="flexure-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="currentColor"></path>
        </marker>
      </defs>
    </svg>
  `;
}

