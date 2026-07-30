import {
  calcularFechaVencimiento,
  esFinDeSemana,
  esMismoDia,
  periodoDe,
} from './cobranza.service';

describe('CobranzaService helpers', () => {
  it('periodoDe formatea YYYY-MM con mes de dos dígitos', () => {
    expect(periodoDe(new Date(2026, 0, 15))).toBe('2026-01');
    expect(periodoDe(new Date(2026, 10, 3))).toBe('2026-11');
  });

  it('esFinDeSemana detecta sábado y domingo', () => {
    // 2026-01-03 es sábado, 2026-01-04 es domingo, 2026-01-05 es lunes
    expect(esFinDeSemana(new Date(2026, 0, 3))).toBe(true);
    expect(esFinDeSemana(new Date(2026, 0, 4))).toBe(true);
    expect(esFinDeSemana(new Date(2026, 0, 5))).toBe(false);
  });

  it('calcularFechaVencimiento no mueve un día hábil', () => {
    const hoy = new Date(2026, 0, 5); // lunes
    const vencimiento = calcularFechaVencimiento(hoy, 5);
    expect(esMismoDia(vencimiento, new Date(2026, 0, 5))).toBe(true);
  });

  it('calcularFechaVencimiento corre al siguiente día hábil si cae en fin de semana', () => {
    const hoy = new Date(2026, 0, 1);
    // día de pago 3 en enero 2026 cae sábado -> debe correr a lunes 5
    const vencimiento = calcularFechaVencimiento(hoy, 3);
    expect(esMismoDia(vencimiento, new Date(2026, 0, 5))).toBe(true);
  });

  it('calcularFechaVencimiento respeta el último día del mes cuando diaPago lo excede', () => {
    // abril 2026 tiene 30 días, y el día 30 cae jueves (no hay corrimiento)
    const hoy = new Date(2026, 3, 1);
    const vencimiento = calcularFechaVencimiento(hoy, 31);
    expect(vencimiento.getMonth()).toBe(3);
    expect(vencimiento.getDate()).toBe(30);
  });

  it('esMismoDia ignora la hora', () => {
    const a = new Date(2026, 5, 10, 3, 0, 0);
    const b = new Date(2026, 5, 10, 23, 59, 0);
    expect(esMismoDia(a, b)).toBe(true);
  });
});
