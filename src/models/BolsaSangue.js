import { randomUUID } from 'node:crypto';
import { StatusBolsa, TipoSanguineo, validarEnum } from './enums.js';
import { somarDias } from './datas.js';

export class BolsaSangue {
  // RN-04: validade da bolsa
  static VALIDADE_DIAS = 35;

  #codigo;
  #tipoSanguineo;
  #volumeMl;
  #dataColeta;
  #dataValidade;
  #status;

  constructor({ codigo = null, tipoSanguineo, volumeMl, dataColeta = new Date(), status = StatusBolsa.DISPONIVEL }) {
    this.#codigo = codigo ?? `HC-${randomUUID().slice(0, 8).toUpperCase()}`;
    this.#tipoSanguineo = validarEnum(TipoSanguineo, tipoSanguineo, 'tipo sanguíneo');
    this.#volumeMl = Number(volumeMl);
    this.#dataColeta = new Date(dataColeta);
    this.#status = validarEnum(StatusBolsa, status, 'status da bolsa');
    this.#dataValidade = this.calcularValidade();
  }

  get codigo() { return this.#codigo; }
  get tipoSanguineo() { return this.#tipoSanguineo; }
  get volumeMl() { return this.#volumeMl; }
  get dataColeta() { return this.#dataColeta; }
  get dataValidade() { return this.#dataValidade; }
  get status() { return this.#status; }

  calcularValidade() {
    return somarDias(this.#dataColeta, BolsaSangue.VALIDADE_DIAS);
  }

  estaVencida(dataReferencia = new Date()) {
    return dataReferencia > this.#dataValidade;
  }

  descartar() {
    this.#status = StatusBolsa.DESCARTADA;
  }

  marcarEntregue() {
    if (this.estaVencida()) throw new Error('Bolsa vencida não pode ser entregue (RN-04).');
    this.#status = StatusBolsa.ENTREGUE;
  }

  toJSON() {
    return {
      codigo: this.#codigo,
      tipoSanguineo: this.#tipoSanguineo,
      volumeMl: this.#volumeMl,
      dataColeta: this.#dataColeta.toISOString(),
      dataValidade: this.#dataValidade.toISOString(),
      status: this.#status,
    };
  }
}
