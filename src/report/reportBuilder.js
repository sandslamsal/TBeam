import { renderFlexureDrawing } from "../drawings/flexureDrawing.js";
import { renderSectionDrawing } from "../drawings/sectionDrawing.js";
import { renderShearDrawing } from "../drawings/shearDrawing.js";
import { equationBlock } from "../ui/math.js";
import { escapeHtml, formatNumber } from "../utils/format.js";

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
                ${equationBlock(step.equation)}
                ${equationBlock(step.detail)}
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function buildReportHtml(snapshot, autoPrint) {
  const geometryRows = [
    ["Flange width bf", `${formatNumber(snapshot.geometry.bf, 2)} in`],
    ["Flange thickness hf", `${formatNumber(snapshot.geometry.hf, 2)} in`],
    ["Web width bw", `${formatNumber(snapshot.geometry.bw, 2)} in`],
    ["Overall depth h", `${formatNumber(snapshot.geometry.h, 2)} in`],
    ["Effective depth d", `${formatNumber(snapshot.geometry.d, 2)} in`],
    ["Neutral axis c", `${formatNumber(snapshot.flexure.c, 2)} in`],
    ["Compression block a", `${formatNumber(snapshot.flexure.a, 2)} in`]
  ];

  const materialRows = [
    ["Concrete strength f'c", `${formatNumber(snapshot.state.materials.fc, 2)} ksi`],
    ["Steel yield strength fy", `${formatNumber(snapshot.state.materials.fy, 2)} ksi`],
    ["Steel modulus Es", `${formatNumber(snapshot.state.materials.es, 0)} ksi`]
  ];

  const reinforcementRows = [
    [
      "Tension reinforcement",
      `${snapshot.state.reinforcement.tensionBarCount} ${snapshot.state.reinforcement.tensionBarSize} bars`
    ],
    ["Tension steel area As", `${formatNumber(snapshot.reinforcement.tensionArea, 2)} in^2`],
    [
      "Compression reinforcement",
      snapshot.state.reinforcement.compressionEnabled
        ? `${snapshot.state.reinforcement.compressionBarCount} ${snapshot.state.reinforcement.compressionBarSize} bars`
        : "Not provided"
    ],
    ["Compression steel area As'", `${formatNumber(snapshot.reinforcement.compressionArea, 2)} in^2`],
    [
      "Stirrups",
      `${snapshot.state.reinforcement.stirrupLegs} legs of ${snapshot.state.reinforcement.stirrupBarSize} @ ${formatNumber(
        snapshot.state.reinforcement.stirrupSpacing,
        1
      )} in`
    ],
    ["Transverse steel area Av", `${formatNumber(snapshot.reinforcement.shearArea, 2)} in^2`]
  ];

  const summaryRows = [
    ["Compression block behavior", snapshot.flexure.sectionCase === "flange" ? "Within flange" : "Extends into web"],
    ["Nominal moment Mn", `${formatNumber(snapshot.flexure.mnKipFt, 1)} k-ft`],
    ["Design moment phi Mn", `${formatNumber(snapshot.flexure.phiMnKipFt, 1)} k-ft`],
    ["Concrete shear Vc", `${formatNumber(snapshot.shear.vc, 1)} k`],
    ["Stirrup shear Vs", `${formatNumber(snapshot.shear.vs, 1)} k`],
    ["Nominal shear Vn", `${formatNumber(snapshot.shear.vn, 1)} k`],
    ["Design shear phi Vn", `${formatNumber(snapshot.shear.phiVn, 1)} k`]
  ];

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
        .report-shell {
          max-width: 1100px;
          margin: 0 auto;
          padding: 36px;
        }
        .report-hero {
          padding: 28px 30px;
          border: 1px solid var(--line);
          border-radius: 24px;
          background: var(--paper);
        }
        .report-hero h1,
        h2,
        h3 {
          font-family: "Fraunces", serif;
        }
        .report-hero h1 {
          margin: 0 0 8px;
          font-size: 2.5rem;
        }
        .report-kicker {
          margin: 0 0 8px;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .report-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
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
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th,
        td {
          padding: 10px 0;
          border-bottom: 1px solid var(--line);
          text-align: left;
          vertical-align: top;
        }
        th {
          width: 45%;
          color: var(--muted);
          font-weight: 600;
        }
        .report-drawing-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
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
        }
        .report-step h3 {
          margin: 0 0 10px;
          font-size: 1.05rem;
        }
        .equation-block {
          margin: 8px 0;
          padding: 12px 14px;
          border-radius: 14px;
          background: white;
          overflow-x: auto;
        }
        @media print {
          body {
            background: white;
          }
          .report-shell {
            padding: 0;
          }
          .report-card,
          .report-section,
          .report-hero {
            break-inside: avoid;
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      <main class="report-shell">
        <header class="report-hero">
          <p class="report-kicker">Cast-in-Place Reinforced Concrete T-Beam Design Report</p>
          <h1>${escapeHtml(snapshot.state.project.name || "TBeam Design Package")}</h1>
          <p>Prepared for ${escapeHtml(snapshot.state.project.designer || "Design Team")} on ${escapeHtml(
            snapshot.state.project.date || ""
          )}. This report summarizes flexural and shear capacity per AASHTO LRFD Bridge Design Specifications, 9th Edition.</p>
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
              <h2>Steel Layout</h2>
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
            <p class="report-kicker">Engineering Drawings</p>
            <h2>Parametric Figure Package</h2>
          </div>
          <div class="report-drawing-grid">
            ${renderSectionDrawing(snapshot)}
            ${renderFlexureDrawing(snapshot)}
            ${renderShearDrawing(snapshot)}
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
  const reportWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!reportWindow) {
    return false;
  }

  reportWindow.document.open();
  reportWindow.document.write(buildReportHtml(snapshot, autoPrint));
  reportWindow.document.close();
  return true;
}

