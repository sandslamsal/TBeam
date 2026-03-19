export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

export function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return "0.00";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

export function formatSignedNumber(value, digits = 2) {
  const numeric = Number.isFinite(value) ? value : 0;
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${formatNumber(numeric, digits)}`;
}

export function formatPercent(value, digits = 1) {
  return `${formatNumber(value * 100, digits)}%`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getByPath(object, path) {
  return path.split(".").reduce((cursor, key) => cursor?.[key], object);
}

export function setByPath(object, path, value) {
  const segments = path.split(".");
  let cursor = object;

  while (segments.length > 1) {
    const segment = segments.shift();
    if (!cursor[segment] || typeof cursor[segment] !== "object") {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }

  cursor[segments[0]] = value;
}
