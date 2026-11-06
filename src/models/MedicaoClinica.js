import { Sexo } from './enums.js';

// RN-02: peso mínimo
const PESO_MINIMO = 50;

// RN-06: critérios clínicos da triagem
const HEMOGLOBINA = {
  [Sexo.MASCULINO]: { min: 13.0, max: 18.5 },
  [Sexo.FEMININO]: { min: 12.5, max: 16.5 },
};
const SISTOLICA = { min: 90, max: 180 };
const DIASTOLICA = { min: 60, max: 100 };

// Parte da composição Triagem ◆ MedicaoClinica:
// só existe dentro de uma triagem.
export class MedicaoClinica {
  #peso;
  #pressaoSistolica;
  #pressaoDiastolica;
  #hemoglobina;

  constructor({ peso, pressaoSistolica, pressaoDiastolica, hemoglobina }) {
    this.#peso = MedicaoClinica.#numeroPositivo(peso, 'peso');
    this.#pressaoSistolica = MedicaoClinica.#numeroPositivo(pressaoSistolica, 'pressão sistólica');
    this.#pressaoDiastolica = MedicaoClinica.#numeroPositivo(pressaoDiastolica, 'pressão diastólica');
    this.#hemoglobina = MedicaoClinica.#numeroPositivo(hemoglobina, 'hemoglobina');
  }

  static #numeroPositivo(valor, campo) {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero <= 0) throw new Error(`Valor inválido para ${campo}.`);
    return numero;
  }

  get peso() { return this.#peso; }
  get pressaoSistolica() { return this.#pressaoSistolica; }
  get pressaoDiastolica() { return this.#pressaoDiastolica; }
  get hemoglobina() { return this.#hemoglobina; }

  estaDentroDosLimites(sexo) {
    const hb = HEMOGLOBINA[sexo];
    return (
      this.#peso >= PESO_MINIMO &&
      this.#hemoglobina >= hb.min && this.#hemoglobina <= hb.max &&
      this.#pressaoSistolica >= SISTOLICA.min && this.#pressaoSistolica <= SISTOLICA.max &&
      this.#pressaoDiastolica >= DIASTOLICA.min && this.#pressaoDiastolica <= DIASTOLICA.max
    );
  }

  toJSON() {
    return {
      peso: this.#peso,
      pressaoSistolica: this.#pressaoSistolica,
      pressaoDiastolica: this.#pressaoDiastolica,
      hemoglobina: this.#hemoglobina,
    };
  }
}
