import { somarDias } from './datas.js';

// RF-11: registrada pelo médico quando a triagem resulta em "inapto"
export class InaptidaoTemporaria {
  static PRAZO_MAXIMO_DIAS = 365;

  #id;
  #motivo;
  #dataInicio;
  #dataFim;

  constructor({ id = null, motivo, dataInicio = new Date(), dataFim = null, prazoDias = null }) {
    const texto = String(motivo ?? '').trim();
    if (!texto) throw new Error('Informe o motivo da inaptidão.');

    this.#id = id;
    this.#motivo = texto;
    this.#dataInicio = new Date(dataInicio);

    if (dataFim) {
      this.#dataFim = new Date(dataFim);
    } else {
      const prazo = Number(prazoDias);
      if (!Number.isInteger(prazo) || prazo < 1 || prazo > InaptidaoTemporaria.PRAZO_MAXIMO_DIAS) {
        throw new Error(`O prazo deve ser um número inteiro de 1 a ${InaptidaoTemporaria.PRAZO_MAXIMO_DIAS} dias.`);
      }
      this.#dataFim = somarDias(this.#dataInicio, prazo);
    }
  }

  get id() { return this.#id; }
  get motivo() { return this.#motivo; }
  get dataInicio() { return this.#dataInicio; }
  get dataFim() { return this.#dataFim; }

  estaVigente(data = new Date()) {
    return data >= this.#dataInicio && data < this.#dataFim;
  }

  toJSON() {
    return {
      id: this.#id,
      motivo: this.#motivo,
      dataInicio: this.#dataInicio.toISOString(),
      dataFim: this.#dataFim.toISOString(),
    };
  }
}
