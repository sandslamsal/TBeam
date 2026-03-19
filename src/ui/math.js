import { escapeHtml } from "../utils/format.js";

export function katexHtml(expression, displayMode = false) {
  if (typeof window !== "undefined" && window.katex?.renderToString) {
    return window.katex.renderToString(expression, {
      displayMode,
      throwOnError: false,
      strict: "ignore"
    });
  }

  return `<code>${escapeHtml(expression)}</code>`;
}

export function equationBlock(expression) {
  return `<div class="equation-block">${katexHtml(expression, true)}</div>`;
}

export function equationInline(expression) {
  return `<span class="equation-inline">${katexHtml(expression, false)}</span>`;
}

