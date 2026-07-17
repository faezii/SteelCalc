/*
 * SteelCalc engine — pure weight & conversion functions.
 * No DOM, no dependencies. Import this anywhere (UI, tests, or a future REST API).
 *
 * All linear profiles return kilograms per metre (kg/m).
 * Density defaults to 7850 kg/m³ (mild steel). Pass a custom value for other grades.
 *
 * Formula basis: weight = cross-sectional area × length × density.
 */
(function (root) {
  'use strict';

  var DEFAULT_DENSITY = 7850; // kg/m³, mild steel

  // Round the value to a sensible number of decimals for display.
  function round(n, dp) {
    if (dp == null) dp = 3;
    var f = Math.pow(10, dp);
    return Math.round((n + Number.EPSILON) * f) / f;
  }

  // --- Cross-sectional areas (mm²) -----------------------------------------

  function areaRoundBar(d) {
    return (Math.PI / 4) * d * d;
  }

  function areaPipe(od, t) {
    var id = od - 2 * t;
    if (id < 0) return null;
    return (Math.PI / 4) * (od * od - id * id);
  }

  function areaRectHollow(h, b, t) {
    if (h - 2 * t <= 0 || b - 2 * t <= 0) return null;
    return h * b - (h - 2 * t) * (b - 2 * t);
  }

  // I / H beam by the plate-area method (ignores root fillets → ~2–4% light).
  function areaBeam(depth, flangeWidth, webThk, flangeThk) {
    if (depth - 2 * flangeThk <= 0) return null;
    return 2 * flangeWidth * flangeThk + (depth - 2 * flangeThk) * webThk;
  }

  // --- Weights --------------------------------------------------------------

  function mm2ToKgPerM(areaMm2, rho) {
    return areaMm2 * 1e-6 * (rho || DEFAULT_DENSITY);
  }

  function roundBarPerM(d, rho) {
    return mm2ToKgPerM(areaRoundBar(d), rho);
  }

  function pipePerM(od, t, rho) {
    var a = areaPipe(od, t);
    return a == null ? null : mm2ToKgPerM(a, rho);
  }

  function rectHollowPerM(h, b, t, rho) {
    var a = areaRectHollow(h, b, t);
    return a == null ? null : mm2ToKgPerM(a, rho);
  }

  function beamPerM(depth, flangeWidth, webThk, flangeThk, rho) {
    var a = areaBeam(depth, flangeWidth, webThk, flangeThk);
    return a == null ? null : mm2ToKgPerM(a, rho);
  }

  // Plate weight for one sheet (kg). length & width in metres, thickness in mm.
  function plateWeight(lengthM, widthM, thkMm, rho) {
    return lengthM * widthM * (thkMm / 1000) * (rho || DEFAULT_DENSITY);
  }

  // --- Unit conversion ------------------------------------------------------

  var UNITS = {
    length: { // factor → metres
      mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048
    },
    weight: { // factor → kilograms
      g: 0.001, kg: 1, t: 1000, lb: 0.45359237
    },
    area: { // factor → square metres
      'mm²': 1e-6, 'cm²': 1e-4, 'm²': 1, 'in²': 0.00064516, 'ft²': 0.09290304
    }
  };

  function convert(value, from, to, category) {
    var table = UNITS[category];
    if (!table || !(from in table) || !(to in table)) return null;
    return (value * table[from]) / table[to];
  }

  root.STEEL = {
    DEFAULT_DENSITY: DEFAULT_DENSITY,
    round: round,
    areaRoundBar: areaRoundBar,
    areaPipe: areaPipe,
    areaRectHollow: areaRectHollow,
    areaBeam: areaBeam,
    roundBarPerM: roundBarPerM,
    pipePerM: pipePerM,
    rectHollowPerM: rectHollowPerM,
    beamPerM: beamPerM,
    plateWeight: plateWeight,
    UNITS: UNITS,
    convert: convert
  };
})(typeof window !== 'undefined' ? window : this);
