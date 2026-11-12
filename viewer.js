"use strict";

// Public display extracts of one archived COMSOL V7 solve, never a browser solve.
const sceneChoices = new Set(["surface", "slice_z_1", "slice_z_5", "slice_z_20", "isotherm_301"]);
const plotElement = document.querySelector("#v7-plot");
const sceneSelect = document.querySelector("#scene-select");
const sceneStatus = document.querySelector("#scene-status");
const sceneCache = new Map();
let requestedScene = 0;

async function renderScene(name) {
  if (!sceneChoices.has(name)) return;
  const request = ++requestedScene;
  sceneStatus.textContent = `Loading ${sceneSelect.selectedOptions[0].textContent}…`;
  try {
    let scene = sceneCache.get(name);
    if (!scene) {
      const response = await fetch(`scenes/${name}.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      scene = await response.json();
      if (scene.field !== "Si temperature" || scene.field_unit !== "K" ||
          scene.vertices_um.length !== scene.temperature_K.length ||
          scene.triangles.length !== scene.n_triangles) {
        throw new Error("Scene field or mesh integrity check failed");
      }
      sceneCache.set(name, scene);
    }
    if (request !== requestedScene) return;
    const trace = {
      type: "mesh3d",
      x: scene.vertices_um.map(v => v[0]),
      y: scene.vertices_um.map(v => v[1]),
      z: scene.vertices_um.map(v => v[2]),
      i: scene.triangles.map(t => t[0]),
      j: scene.triangles.map(t => t[1]),
      k: scene.triangles.map(t => t[2]),
      intensity: scene.temperature_K,
      intensitymode: "vertex",
      colorscale: "Viridis",
      cmin: 293.15,
      cmax: 305.508921574,
      colorbar: {title: "Si T (K)", thickness: 15, len: 0.76},
      hovertemplate: "x %{x:.2f} µm<br>y %{y:.2f} µm<br>z %{z:.2f} µm<br>T %{intensity:.3f} K<extra>Saved COMSOL V7</extra>",
      flatshading: false,
      lighting: {ambient: 0.9, diffuse: 0.25, specular: 0},
    };
    const layout = {
      title: {text: scene.label, font: {size: 15, color: "#193140"}},
      paper_bgcolor: "#f8fbfc", plot_bgcolor: "#f8fbfc",
      margin: {l: 0, r: 0, t: 48, b: 0},
      uirevision: "v7-camera",
      scene: {
        aspectmode: "data",
        xaxis: {title: "x (µm)"}, yaxis: {title: "y (µm)"}, zaxis: {title: "z (µm)"},
        camera: {eye: {x: 1.5, y: 1.5, z: 1.25}},
      },
    };
    await Plotly.react(plotElement, [trace], layout, {responsive: true, displaylogo: false, scrollZoom: true});
    sceneStatus.textContent = `${scene.n_triangles.toLocaleString()} saved display triangles · drag to rotate · wheel to zoom`;
  } catch (error) {
    if (request === requestedScene) sceneStatus.textContent = `Saved field unavailable: ${error.message}`;
  }
}
sceneSelect.addEventListener("change", () => renderScene(sceneSelect.value));
renderScene("surface");
