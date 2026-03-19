import test from "node:test";
import assert from "node:assert/strict";

import { runAnalysis } from "../src/analysis/runAnalysis.js";
import { DEFAULT_STATE } from "../src/state/defaults.js";

function cloneState() {
  return structuredClone(DEFAULT_STATE);
}

test("default example computes positive flexural and shear capacity", () => {
  const snapshot = runAnalysis(cloneState());

  assert.equal(snapshot.flexure.sectionCase, "flange");
  assert.ok(snapshot.geometry.d > snapshot.geometry.hf);
  assert.ok(snapshot.flexure.phiMnKipFt > 1000);
  assert.ok(snapshot.shear.phiVn > 150);
  assert.ok(snapshot.flexure.tensionControlled);
});

test("heavy reinforcement forces the compression block into the web", () => {
  const state = cloneState();
  state.geometry.bf = 48;
  state.geometry.hf = 5;
  state.geometry.bw = 12;
  state.geometry.h = 40;
  state.materials.fc = 4;
  state.reinforcement.tensionBarSize = "#14";
  state.reinforcement.tensionBarCount = 12;
  state.reinforcement.tensionLayers = 3;

  const snapshot = runAnalysis(state);

  assert.equal(snapshot.flexure.sectionCase, "web");
  assert.ok(snapshot.flexure.a > snapshot.geometry.hf);
  assert.ok(snapshot.flexure.phiMnKipFt > 2000);
});

test("manual effective depth override is honored", () => {
  const state = cloneState();
  state.geometry.manualEffectiveDepth = true;
  state.geometry.effectiveDepthOverride = 31.5;

  const snapshot = runAnalysis(state);

  assert.equal(snapshot.geometry.d, 31.5);
});

test("shear resistance respects the AASHTO web crushing limit", () => {
  const state = cloneState();
  state.reinforcement.stirrupBarSize = "#6";
  state.reinforcement.stirrupLegs = 4;
  state.reinforcement.stirrupSpacing = 2;

  const snapshot = runAnalysis(state);

  assert.ok(snapshot.shear.controlsLimit);
  assert.equal(Number(snapshot.shear.vn.toFixed(3)), Number(snapshot.shear.vnLimit.toFixed(3)));
});
