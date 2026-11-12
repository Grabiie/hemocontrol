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

// RN-07: volume máximo de coleta por quilo de peso
const ML_POR_KG = { [Sexo.MASCULINO]: 9, [Sexo.FEMININO]: 8 };

const fmt = (n) => n.toLocaleString('pt-BR');

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

  // RN-02 e RN-06: lista os valores fora dos limites
  listarAlteracoes(sexo) {
    const motivos = [];
    const hb = HEMOGLOBINA[sexo];
    const foraDa = (valor, faixa) => valor < faixa.min || valor > faixa.max;

    if (this.#peso < PESO_MINIMO) {
      motivos.push(`Peso de ${fmt(this.#peso)} kg abaixo do mínimo de ${PESO_MINIMO} kg (RN-02).`);
    }
    if (foraDa(this.#hemoglobina, hb)) {
      motivos.push(`Hemoglobina de ${fmt(this.#hemoglobina)} g/dL fora da faixa de ${fmt(hb.min)} a ${fmt(hb.max)} g/dL (RN-06).`);
    }
    if (foraDa(this.#pressaoSistolica, SISTOLICA) || foraDa(this.#pressaoDiastolica, DIASTOLICA)) {
      motivos.push(
        `Pressão de ${this.#pressaoSistolica}x${this.#pressaoDiastolica} mmHg fora da faixa de ` +
        `${SISTOLICA.min}-${SISTOLICA.max} x ${DIASTOLICA.min}-${DIASTOLICA.max} mmHg (RN-06).`,
      );
    }

    return motivos;
  }

  // RN-07: no máximo 9 mL/kg (homens) ou 8 mL/kg (mulheres) do peso medido
  calcularVolumeMaximo(sexo) {
    return Math.floor(this.#peso * ML_POR_KG[sexo]);
  }

  // RN-10: usada para impedir que a mesma medição seja registrada duas vezes
  equals(outra) {
    return outra instanceof MedicaoClinica
      && this.#peso === outra.peso
      && this.#pressaoSistolica === outra.pressaoSistolica
      && this.#pressaoDiastolica === outra.pressaoDiastolica
      && this.#hemoglobina === outra.hemoglobina;
  }

  estaDentroDosLimites(sexo) {
    return this.listarAlteracoes(sexo).length === 0;
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
