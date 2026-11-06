import { BolsaSangue } from './BolsaSangue.js';

export class Doacao {
  #id;
  #dataHora;
  #volumeMl;
  #cancelada;
  #triagem; // associação Triagem 1 — 0..1 Doacao

  constructor({ id = null, triagem, volumeMl, dataHora = new Date(), cancelada = false }) {
    // RN-05: nenhuma doação sem triagem prévia com resultado "apto"
    if (!triagem || !triagem.estaApta()) {
      throw new Error('A doação exige uma triagem com resultado "apto" (RN-05).');
    }

    const volume = Number(volumeMl);
    if (!Number.isInteger(volume) || volume <= 0) throw new Error('Volume coletado inválido.');

    this.#id = id;
    this.#triagem = triagem;
    this.#volumeMl = volume;
    this.#dataHora = new Date(dataHora);
    this.#cancelada = Boolean(cancelada);
  }

  get id() { return this.#id; }
  get dataHora() { return this.#dataHora; }
  get volumeMl() { return this.#volumeMl; }
  get cancelada() { return this.#cancelada; }
  get triagem() { return this.#triagem; }

  // Doacao 1 — 0..1 BolsaSangue: doação cancelada não gera bolsa
  gerarBolsa() {
    if (this.#cancelada) return null;
    return new BolsaSangue({
      tipoSanguineo: this.#triagem.doador.tipoSanguineo,
      volumeMl: this.#volumeMl,
      dataColeta: this.#dataHora,
    });
  }

  cancelar() {
    this.#cancelada = true;
  }
}
