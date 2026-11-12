import { BolsaSangue } from './BolsaSangue.js';

export class Doacao {
  // RN-07: faixa de volume admitida por doação (450 mL ± 45 mL; abaixo de 300 mL a bolsa é desprezada)
  static VOLUME_MINIMO_ML = 300;
  static VOLUME_MAXIMO_ML = 495;

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
    // RN-09: a coleta acontece no mesmo dia da triagem
    if (id === null && !triagem.ehDoDia(dataHora)) {
      throw new Error(`A triagem é de ${triagem.dataHora.toLocaleDateString('pt-BR')}; a coleta exige uma triagem do mesmo dia (RN-09).`);
    }

    const volume = Number(volumeMl);
    if (!Number.isInteger(volume) || volume < 0 || (volume === 0 && !cancelada)) {
      throw new Error('Volume coletado inválido.');
    }

    // RN-07: faixa geral e limite pelo peso medido na triagem.
    // Numa coleta interrompida (doação cancelada), o volume pode ficar abaixo do mínimo.
    const limitePorPeso = triagem.medicao.calcularVolumeMaximo(triagem.doador.sexo);
    const maximo = Math.min(Doacao.VOLUME_MAXIMO_ML, limitePorPeso);
    if (!cancelada && volume < Doacao.VOLUME_MINIMO_ML) {
      throw new Error(`Volume de ${volume} mL abaixo do mínimo de ${Doacao.VOLUME_MINIMO_ML} mL (RN-07).`);
    }
    if (volume > maximo) {
      throw new Error(`Volume de ${volume} mL acima do máximo permitido para este doador: ${maximo} mL (RN-07).`);
    }

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
