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
  assert.equal(snapshot.reinforcement.bottomLayers.length, 2);
  assert.equal(snapshot.reinforcement.topLayers.length, 1);
});

test("heavy reinforcement forces the compression block into the web", () => {
  const state = cloneState();
  state.geometry.bf = 48;
  state.geometry.hf = 5;
  state.geometry.bw = 12;
  state.geometry.h = 40;
  state.materials.fc = 4;
  state.reinforcement.bottomLayers = [
    { barSize: "#14", barCount: 4 },
    { barSize: "#14", barCount: 4 },
    { barSize: "#14", barCount: 4 }
  ];
  state.reinforcement.topLayers = [];

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

test("layer-based reinforcement depths are derived separately for top and bottom rows", () => {
  const state = cloneState();
  state.geometry.cover = 2.5;
  state.geometry.h = 48;
  state.geometry.bw = 16;
  state.reinforcement.bottomLayerSpacing = 2;
  state.reinforcement.topLayerSpacing = 3;
  state.reinforcement.bottomLayers = [
    { barSize: "#10", barCount: 4 },
    { barSize: "#9", barCount: 3 }
  ];
  state.reinforcement.topLayers = [
    { barSize: "#6", barCount: 2 },
    { barSize: "#5", barCount: 2 }
  ];

  const snapshot = runAnalysis(state);

  assert.ok(snapshot.reinforcement.bottomLayers[0].depth > snapshot.reinforcement.bottomLayers[1].depth);
  assert.ok(snapshot.reinforcement.topLayers[0].depth < snapshot.reinforcement.topLayers[1].depth);
  assert.ok(snapshot.geometry.d > snapshot.geometry.dPrime);
  assert.ok(snapshot.reinforcement.bottomLayers.every((layer) => layer.xOffsets.every((offset) => Math.abs(offset) <= state.geometry.bw / 2)));
});
