import { MedicaoClinica } from './MedicaoClinica.js';

export class Triagem {
  #id;
  #dataHora;
  #apto;
  #motivos;  // motivos da inaptidão (vazio quando apto)
  #doador;   // associação Doador 1 — 0..* Triagem
  #medicao;  // composição Triagem ◆ MedicaoClinica

  constructor({ id = null, doador, medicao, dataHora = new Date(), apto = null, motivos = [] }) {
    if (!doador) throw new Error('A triagem precisa de um doador.');

    this.#id = id;
    this.#doador = doador;
    // A triagem cria a própria medição: a parte nasce e morre com o todo.
    this.#medicao = medicao instanceof MedicaoClinica ? medicao : new MedicaoClinica(medicao);
    this.#dataHora = new Date(dataHora);
    this.#apto = apto ?? false;
    this.#motivos = [...motivos];
  }

  get id() { return this.#id; }
  get dataHora() { return this.#dataHora; }
  get doador() { return this.#doador; }
  get medicao() { return this.#medicao; }

  // RN-02, RN-03 e RN-06
  avaliar(datasDoacoes = []) {
    this.#motivos = [
      ...this.#doador.listarImpedimentos(this.#dataHora, datasDoacoes),
      ...this.#medicao.listarAlteracoes(this.#doador.sexo),
    ];
    this.#apto = this.#motivos.length === 0;
    return this.#apto;
  }

  estaApta() {
    return this.#apto;
  }

  getMotivos() {
    return [...this.#motivos];
  }

  toJSON() {
    return {
      id: this.#id,
      dataHora: this.#dataHora.toISOString(),
      apto: this.#apto,
      motivos: [...this.#motivos],
      doador: this.#doador.toJSON(),
      medicao: this.#medicao.toJSON(),
    };
  }
}
