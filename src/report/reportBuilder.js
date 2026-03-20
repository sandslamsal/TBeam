import { renderFlexureDrawing } from "../drawings/flexureDrawing.js";
import { renderSectionDrawing } from "../drawings/sectionDrawing.js";
import { renderShearDrawing } from "../drawings/shearDrawing.js";
import { equationBlock } from "../ui/math.js";
import { downloadTextFile, escapeHtml, formatNumber, slugify } from "../utils/format.js";

function tableRows(items) {
  return items
    .map(
      ([label, value]) => `
        <tr>
          <th>${escapeHtml(label)}</th>
          <td>${escapeHtml(value)}</td>
        </tr>
      `
    )
    .join("");
}

function renderValuesTable(values = []) {
  if (!values.length) {
    return "";
  }

  return `
    <table class="report-value-table">
      <tbody>
        ${values
          .map(
            ([label, value]) => `
              <tr>
                <th>${escapeHtml(label)}</th>
                <td>${escapeHtml(value)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderStepTable(title, steps) {
  return `
    <section class="report-section">
      <div class="report-section__header">
        <p class="report-kicker">Calculation Log</p>
        <h2>${escapeHtml(title)}</h2>
      </div>
      <div class="report-step-stack">
        ${steps
          .map(
            (step) => `
              <article class="report-step">
                <h3>${escapeHtml(step.title)}</h3>
                ${step.narrative ? `<p class="report-step__narrative">${escapeHtml(step.narrative)}</p>` : ""}
                ${(step.equations || []).map((equation) => equationBlock(equation)).join("")}
                ${(step.substitutions || []).map((equation) => equationBlock(equation)).join("")}
                ${renderValuesTable(step.values)}
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderDrawingFigure(title, svgMarkup) {
  return `
    <figure class="report-figure">
      <figcaption>${escapeHtml(title)}</figcaption>
      ${svgMarkup}
    </figure>
  `;
}

function layerScheduleRows(layers, familyLabel) {
  if (!layers.length) {
    return [[`${familyLabel} layers`, "None"]];
  }

  return layers.map((layer) => [
    `${familyLabel} L${layer.index + 1}`,
    `${layer.barCount} ${layer.barSize} | area ${formatNumber(layer.area, 2)} in^2 | y = ${formatNumber(layer.depth, 2)} in`
  ]);
}

export function buildReportHtml(snapshot, autoPrint = false) {
  const geometryRows = [
    ["Flange width bf", `${formatNumber(snapshot.geometry.bf, 2)} in`],
    ["Flange thickness hf", `${formatNumber(snapshot.geometry.hf, 2)} in`],
    ["Web width bw", `${formatNumber(snapshot.geometry.bw, 2)} in`],
    ["Overall depth h", `${formatNumber(snapshot.geometry.h, 2)} in`],
    ["Effective depth d", `${formatNumber(snapshot.geometry.d, 2)} in`],
    ["Top steel depth d'", `${formatNumber(snapshot.geometry.dPrime, 2)} in`],
    ["Neutral axis c", `${formatNumber(snapshot.flexure.c, 2)} in`],
    ["Compression block a", `${formatNumber(snapshot.flexure.a, 2)} in`]
  ];

  const materialRows = [
    ["Concrete strength f'c", `${formatNumber(snapshot.state.materials.fc, 2)} ksi`],
    ["Steel yield strength fy", `${formatNumber(snapshot.state.materials.fy, 2)} ksi`],
    ["Steel modulus Es", `${formatNumber(snapshot.state.materials.es, 0)} ksi`]
  ];

  const reinforcementRows = [
    ["Bottom steel area As", `${formatNumber(snapshot.reinforcement.tensionArea, 2)} in^2`],
    ["Top steel area As'", `${formatNumber(snapshot.reinforcement.compressionArea, 2)} in^2`],
    ["Transverse steel area Av", `${formatNumber(snapshot.reinforcement.shearArea, 2)} in^2`],
    [
      "Stirrups",
      `${snapshot.state.reinforcement.stirrupLegs} legs of ${snapshot.state.reinforcement.stirrupBarSize} @ ${formatNumber(
        snapshot.state.reinforcement.stirrupSpacing,
        1
      )} in`
    ]
  ];

  const summaryRows = [
    ["Compression block behavior", snapshot.flexure.sectionCase === "flange" ? "Within flange" : "Extends into web"],
    ["Nominal moment Mn", `${formatNumber(snapshot.flexure.mnKipFt, 2)} k-ft`],
    ["Design moment phiMn", `${formatNumber(snapshot.flexure.phiMnKipFt, 2)} k-ft`],
    ["Concrete shear Vc", `${formatNumber(snapshot.shear.vc, 2)} k`],
    ["Stirrup shear Vs", `${formatNumber(snapshot.shear.vs, 2)} k`],
    ["Nominal shear Vn", `${formatNumber(snapshot.shear.vn, 2)} k`],
    ["Design shear phiVn", `${formatNumber(snapshot.shear.phiVn, 2)} k`]
  ];

  const logoMarkup = snapshot.state.project.companyLogoDataUrl
    ? `<div class="report-logo"><img src="${snapshot.state.project.companyLogoDataUrl}" alt="Company logo"></div>`
    : `<div class="report-logo report-logo--placeholder">${escapeHtml(
        snapshot.state.project.companyName || snapshot.state.project.designer || "Engineering"
      )}</div>`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(snapshot.state.project.name || "TBeam Report")}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
      <style>
        :root {
          --ink: #12263a;
          --muted: #516174;
          --line: rgba(18, 38, 58, 0.14);
          --accent: #c65d22;
          --paper: #fffdfa;
          --panel: #f7f2ea;
        }

        * { box-sizing: border-box; }
        body {
          margin: 0;
          color: var(--ink);
          font-family: "IBM Plex Sans", sans-serif;
          background: linear-gradient(180deg, #f4ede2 0%, #fffdfa 40%, #f3f6f8 100%);
        }
        img,
        svg {
          max-width: 100%;
        }
        .report-shell {
          max-width: 1180px;
          margin: 0 auto;
          padding: 32px;
        }
        .report-hero {
          display: grid;
          grid-template-columns: 180px minmax(0, 1fr);
          gap: 22px;
          padding: 24px 28px;
          border: 1px solid var(--line);
          border-radius: 24px;
          background: var(--paper);
        }
        .report-logo {
          height: 108px;
          border: 1px solid var(--line);
          border-radius: 18px;
          display: grid;
          place-items: center;
          background: #fff;
          overflow: hidden;
          font: 600 0.98rem "IBM Plex Sans", sans-serif;
          color: var(--muted);
        }
        .report-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 14px;
        }
        .report-kicker {
          margin: 0 0 8px;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .report-hero h1,
        h2,
        h3 {
          font-family: "Fraunces", serif;
        }
        .report-hero h1 {
          margin: 0 0 10px;
          font-size: 2.45rem;
        }
        .report-title-block {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px 18px;
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid var(--line);
        }
        .report-title-block div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }
        .report-title-block span {
          color: var(--muted);
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .report-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 18px;
          margin-top: 22px;
        }
        .report-card,
        .report-section {
          margin-top: 22px;
          padding: 22px;
          border: 1px solid var(--line);
          border-radius: 22px;
          background: var(--paper);
          min-width: 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        th,
        td {
          padding: 10px 0;
          border-bottom: 1px solid var(--line);
          text-align: left;
          vertical-align: top;
          overflow-wrap: anywhere;
        }
        th {
          width: 42%;
          color: var(--muted);
          font-weight: 600;
        }
        strong,
        p,
        li,
        h1,
        h2,
        h3,
        figcaption {
          overflow-wrap: anywhere;
        }
        .report-layer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 18px;
        }
        .report-drawing-grid {
          display: grid;
          gap: 18px;
        }
        .report-figure {
          margin: 0;
          padding: 18px;
          border: 1px solid var(--line);
          border-radius: 20px;
          background: white;
          break-inside: avoid;
          page-break-inside: avoid;
          overflow: hidden;
        }
        .report-figure figcaption {
          margin: 0 0 12px;
          color: var(--muted);
          font: 600 0.84rem "IBM Plex Mono", monospace;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .report-figure .engineering-svg {
          display: block;
          width: 100%;
          height: auto;
        }
        .report-section__header {
          display: grid;
          gap: 4px;
          min-width: 0;
        }
        .report-step-stack {
          display: grid;
          gap: 16px;
        }
        .report-step {
          padding: 16px;
          border-radius: 18px;
          background: var(--panel);
          border: 1px solid var(--line);
          min-width: 0;
        }
        .report-step h3 {
          margin: 0 0 10px;
          font-size: 1.05rem;
        }
        .report-step__narrative {
          margin: 0 0 12px;
          color: var(--muted);
          line-height: 1.55;
        }
        .report-value-table th {
          width: 32%;
        }
        .equation-block {
          margin: 8px 0;
          padding: 12px 14px;
          border-radius: 14px;
          background: white;
          overflow-x: auto;
        }
        .engineering-svg {
          display: block;
          width: 100%;
          height: auto;
          overflow: visible;
          background: transparent;
          color-scheme: light;
        }
        .section-outline {
          fill: none;
          stroke: #132740;
          stroke-width: 2.2;
        }
        .section-fill {
          fill: rgba(29, 107, 120, 0.08);
        }
        .compression-block {
          fill: rgba(198, 97, 43, 0.18);
          stroke: rgba(198, 97, 43, 0.45);
          stroke-width: 1.4;
        }
        .bar {
          stroke: #10253a;
          stroke-width: 1.6;
        }
        .bar--bottom {
          fill: rgba(29, 107, 120, 0.78);
        }
        .bar--top {
          fill: rgba(198, 97, 43, 0.74);
        }
        .stirrup-outline,
        .stirrup-line {
          fill: none;
          stroke: #1d6b78;
          stroke-width: 2.1;
        }
        .neutral-axis,
        .effective-depth-line,
        .stress-axis,
        .lever-arm-line,
        .force-arrow,
        .dim-arrow,
        .dim-extension,
        .callout-line,
        .shear-crack,
        .zone-divider,
        .result-divider,
        .panel-divider {
          stroke: #10253a;
          stroke-width: 1.8;
          fill: none;
        }
        .neutral-axis {
          stroke: #1d6b78;
          stroke-dasharray: 7 6;
        }
        .effective-depth-line {
          stroke: #c8612b;
          stroke-dasharray: 6 4;
        }
        .lever-arm-line,
        .lever-arm-cap {
          stroke: #c8612b;
          stroke-width: 1.8;
        }
        .force-arrow--compression {
          color: #c8612b;
        }
        .force-arrow--tension {
          color: #1d6b78;
        }
        .dim-arrow {
          stroke: rgba(16, 37, 58, 0.56);
        }
        .dim-extension,
        .callout-line {
          stroke: rgba(16, 37, 58, 0.34);
          stroke-width: 1.3;
        }
        .panel-divider,
        .zone-divider,
        .result-divider {
          stroke: rgba(16, 37, 58, 0.22);
          stroke-dasharray: 6 5;
          stroke-width: 1.2;
        }
        .shear-crack {
          stroke: #c8612b;
          stroke-width: 2.4;
          stroke-dasharray: 8 6;
        }
        .drawing-frame {
          fill: white;
          stroke: rgba(16, 37, 58, 0.12);
        }
        .diagram-panel,
        .info-box {
          fill: rgba(248, 242, 233, 0.92);
          stroke: rgba(16, 37, 58, 0.12);
        }
        .zone-shade {
          fill: rgba(16, 37, 58, 0.04);
        }
        .drawing-title {
          font: 700 17px "IBM Plex Sans", sans-serif;
          fill: #10253a;
        }
        .drawing-subtitle,
        .drawing-panel-title {
          font: 500 12px "IBM Plex Mono", monospace;
          fill: #58697b;
        }
        .drawing-label,
        .dim-text,
        .drawing-note {
          font: 500 13px "IBM Plex Mono", monospace;
          fill: #37495b;
        }
        .drawing-label--muted {
          fill: #617284;
        }
        .drawing-label--end,
        .dim-text--end,
        .result-value {
          text-anchor: end;
        }
        .dim-text--center {
          text-anchor: middle;
        }
        .dim-text--middle {
          dominant-baseline: middle;
        }
        .drawing-note {
          font-size: 12px;
        }
        .rebar-line {
          stroke-width: 3;
        }
        .rebar-line--top {
          stroke: rgba(198, 97, 43, 0.78);
        }
        .rebar-line--bottom {
          stroke: rgba(29, 107, 120, 0.82);
        }
        .strain-guide {
          stroke: rgba(29, 107, 120, 0.74);
          stroke-width: 2.2;
          fill: none;
        }
        .steel-stress-line {
          stroke-width: 2.2;
        }
        .steel-stress-line--compression {
          stroke: rgba(198, 97, 43, 0.8);
          color: rgba(198, 97, 43, 0.8);
        }
        .steel-stress-line--tension {
          stroke: rgba(29, 107, 120, 0.9);
          color: rgba(29, 107, 120, 0.9);
        }
        @page {
          size: A4 portrait;
          margin: 12mm;
        }
        @media print {
          html,
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .report-shell {
            width: 186mm;
            max-width: 186mm;
            padding: 0;
            overflow: hidden;
          }
          .report-card,
          .report-section,
          .report-hero,
          .report-figure,
          .report-step {
            break-inside: avoid;
            page-break-inside: avoid;
            box-shadow: none;
            background: white;
          }
          .report-card,
          .report-section,
          .report-hero,
          .report-figure {
            border-color: rgba(18, 38, 58, 0.18);
          }
          .report-hero {
            grid-template-columns: 44mm minmax(0, 1fr);
            gap: 14px;
            padding: 14px 16px;
          }
          .report-logo {
            height: 28mm;
          }
          .report-title-block {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .report-grid,
          .report-layer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }
          .report-drawing-grid {
            gap: 12px;
          }
          .report-card,
          .report-section,
          .report-figure {
            padding: 14px;
          }
          .report-step {
            padding: 12px;
          }
          .report-section__header,
          .report-hero h1,
          .report-step h3,
          .report-figure figcaption {
            break-after: avoid;
            page-break-after: avoid;
          }
          .engineering-svg {
            background: white !important;
          }
          .drawing-frame,
          .diagram-panel,
          .info-box {
            fill: white !important;
          }
          .section-fill {
            fill: rgba(29, 107, 120, 0.05) !important;
          }
          .compression-block {
            fill: rgba(198, 97, 43, 0.12) !important;
          }
          .zone-shade {
            fill: rgba(16, 37, 58, 0.03) !important;
          }
        }
        @media (max-width: 860px) {
          .report-shell {
            padding: 20px;
          }
          .report-hero {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <main class="report-shell">
        <header class="report-hero">
          ${logoMarkup}
          <div>
            <p class="report-kicker">Cast-in-Place Reinforced Concrete T-Beam Design Report</p>
            <h1>${escapeHtml(snapshot.state.project.name || "TBeam Design Package")}</h1>
            <p>This report summarizes flexural and shear capacity calculations per AASHTO LRFD Bridge Design Specifications, 9th Edition.</p>
            <div class="report-title-block">
              <div><span>Designer</span><strong>${escapeHtml(snapshot.state.project.designer || "Not provided")}</strong></div>
              <div><span>Checked By / QC</span><strong>${escapeHtml(snapshot.state.project.checkedBy || "Not provided")}</strong></div>
              <div><span>Company</span><strong>${escapeHtml(snapshot.state.project.companyName || "Not provided")}</strong></div>
              <div><span>Date</span><strong>${escapeHtml(snapshot.state.project.date || "")}</strong></div>
              <div><span>QC Date</span><strong>${escapeHtml(snapshot.state.project.checkedDate || "")}</strong></div>
              <div><span>Section</span><strong>T-Beam Flexure and Shear Capacity</strong></div>
            </div>
          </div>
        </header>

        <section class="report-grid">
          <article class="report-card">
            <div class="report-section__header">
              <p class="report-kicker">Section Geometry</p>
              <h2>Cross-Section Inputs</h2>
            </div>
            <table>${tableRows(geometryRows)}</table>
          </article>
          <article class="report-card">
            <div class="report-section__header">
              <p class="report-kicker">Materials</p>
              <h2>Material Properties</h2>
            </div>
            <table>${tableRows(materialRows)}</table>
          </article>
          <article class="report-card">
            <div class="report-section__header">
              <p class="report-kicker">Reinforcement</p>
              <h2>Steel Summary</h2>
            </div>
            <table>${tableRows(reinforcementRows)}</table>
          </article>
          <article class="report-card">
            <div class="report-section__header">
              <p class="report-kicker">Design Summary</p>
              <h2>Capacity Envelope</h2>
            </div>
            <table>${tableRows(summaryRows)}</table>
          </article>
        </section>

        <section class="report-section">
          <div class="report-section__header">
            <p class="report-kicker">Layer Schedule</p>
            <h2>Top and Bottom Reinforcement Layout</h2>
          </div>
          <div class="report-layer-grid">
            <article class="report-card">
              <table>${tableRows(layerScheduleRows(snapshot.reinforcement.bottomLayers, "Bottom"))}</table>
            </article>
            <article class="report-card">
              <table>${tableRows(layerScheduleRows(snapshot.reinforcement.topLayers, "Top"))}</table>
            </article>
          </div>
        </section>

        <section class="report-section">
          <div class="report-section__header">
            <p class="report-kicker">Engineering Drawings</p>
            <h2>Parametric Figure Package</h2>
          </div>
          <div class="report-drawing-grid">
            ${renderDrawingFigure("Main T-Beam Section", renderSectionDrawing(snapshot))}
            ${renderDrawingFigure("Flexural Strain Compatibility", renderFlexureDrawing(snapshot))}
            ${renderDrawingFigure("Shear Reinforcement Elevation", renderShearDrawing(snapshot))}
          </div>
        </section>

        ${renderStepTable("Flexural Capacity", snapshot.flexure.steps)}
        ${renderStepTable("Shear Capacity", snapshot.shear.steps)}

        <section class="report-section">
          <div class="report-section__header">
            <p class="report-kicker">Design Notes</p>
            <h2>Assumptions and Commentary</h2>
          </div>
          <ul>
            ${snapshot.assumptions.map((assumption) => `<li>${escapeHtml(assumption)}</li>`).join("")}
          </ul>
          <p>${escapeHtml(snapshot.state.project.notes || "")}</p>
        </section>
      </main>
      ${
        autoPrint
          ? `<script>window.addEventListener("load", () => window.print());</script>`
          : ""
      }
    </body>
    </html>
  `;
}

export function openReportWindow(snapshot, autoPrint = false) {
  const reportWindow = window.open("about:blank", "_blank");
  if (!reportWindow) {
    return false;
  }

  reportWindow.document.open();
  reportWindow.document.write(buildReportHtml(snapshot, autoPrint));
  reportWindow.document.close();
  return true;
}

export function downloadReportFile(snapshot) {
  const fileName = `${slugify(snapshot.state.project.name || "tbeam-report")}.html`;
  downloadTextFile(fileName, buildReportHtml(snapshot, false), "text/html;charset=utf-8");
}
