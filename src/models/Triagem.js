import { MedicaoClinica } from './MedicaoClinica.js';
import { Doacao } from './Doacao.js';
import { mesmoDia } from './datas.js';

export class Triagem {
  // RN-10: no máximo 3 triagens por doador no mesmo dia
  static LIMITE_DIARIO = 3;

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

  // RN-02, RN-03, RN-06 e inaptidões temporárias vigentes (RF-11)
  avaliar(datasDoacoes = [], inaptidoes = []) {
    const vigentes = inaptidoes
      .filter((i) => i.estaVigente(this.#dataHora))
      .map((i) => `Inaptidão temporária até ${i.dataFim.toLocaleDateString('pt-BR')}: ${i.motivo} (RF-11).`);

    this.#motivos = [
      ...vigentes,
      ...this.#doador.listarImpedimentos(this.#dataHora, datasDoacoes),
      ...this.#medicao.listarAlteracoes(this.#doador.sexo),
    ];
    this.#apto = this.#motivos.length === 0;
    return this.#apto;
  }

  estaApta() {
    return this.#apto;
  }

  // RN-09: a triagem só libera a coleta no mesmo dia em que foi feita
  ehDoDia(data = new Date()) {
    return mesmoDia(this.#dataHora, data);
  }

  // RN-10: outra triagem do mesmo dia com exatamente a mesma medição
  repeteMedicaoDe(outra) {
    return mesmoDia(this.#dataHora, outra.dataHora) && this.#medicao.equals(outra.medicao);
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
      // RN-07: volume máximo que pode ser coletado deste doador
      volumeMaximoMl: Math.min(Doacao.VOLUME_MAXIMO_ML, this.#medicao.calcularVolumeMaximo(this.#doador.sexo)),
      doador: this.#doador.toJSON(),
      medicao: this.#medicao.toJSON(),
    };
  }
}
