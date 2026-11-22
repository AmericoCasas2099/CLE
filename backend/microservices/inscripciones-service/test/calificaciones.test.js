const test = require("node:test");
const assert = require("node:assert/strict");
const { calcularFinal } = require("../src/services/calculoPonderado");
const unidades = [
  { unidad_id: 1, ponderacion: "25.00" },
  { unidad_id: 2, ponderacion: "25.00" },
  { unidad_id: 3, ponderacion: "50.00" }
];
test("sin calificaciones regresa null", () => {
  assert.equal(calcularFinal(unidades, []), null);
});
test("si faltan unidades devuelve null (no cero)", () => {
  assert.equal(calcularFinal(unidades, [
    { unidad_id: 1, calificacion: 80 },
    { unidad_id: 2, calificacion: 90 }
  ]), null);
});
test("promedio ponderado: 80*25% + 90*25% + 100*50% = 92.50", () => {
  assert.equal(calcularFinal(unidades, [
    { unidad_id: 1, calificacion: 80 },
    { unidad_id: 2, calificacion: 90 },
    { unidad_id: 3, calificacion: 100 }
  ]), 92.5);
});
test("las ponderaciones proporcionales 0.25/0.25/0.50 son válidas", () => {
  assert.equal(calcularFinal(unidades.map(u => ({...u, ponderacion: Number(u.ponderacion)/100})), [
    { unidad_id: 1, calificacion: 80 },
    { unidad_id: 2, calificacion: 90 },
    { unidad_id: 3, calificacion: 100 }
  ]), 92.5);
});
test("rechaza unidad que no pertenece al nivel", () => {
  assert.throws(() => calcularFinal(unidades, [{ unidad_id: 9, calificacion: 90 }]),
    { codigo: "CALIFICACIONES_INCONSISTENTES" });
});
test("rechaza ponderaciones inválidas", () => {
  assert.throws(() => calcularFinal([{ unidad_id: 1, ponderacion: 0 }], []),
    { codigo: "UNIDADES_INVALIDAS" });
});
