import { StatusSolicitacao, TipoSanguineo, validarEnum } from './enums.js';

export class Solicitacao {
  static QUANTIDADE_MAXIMA = 50;

  #id;
  #dataSolicitacao;
  #tipoSanguineo;
  #quantidade;
  #status;
  #origemManual;
  #dataAtendimento;
  #hospital; // associação Hospital 1 — 0..* Solicitacao
  #bolsas;   // associação Solicitacao 0..1 — 0..* BolsaSangue

  constructor({
    id = null, hospital, tipoSanguineo, quantidade, dataSolicitacao = new Date(),
    status = StatusSolicitacao.PENDENTE, origemManual = false, dataAtendimento = null, bolsas = [],
  }) {
    if (!hospital) throw new Error('Informe o hospital solicitante.');
    const qtd = Number(quantidade);
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > Solicitacao.QUANTIDADE_MAXIMA) {
      throw new Error(`A quantidade deve ser um número inteiro de 1 a ${Solicitacao.QUANTIDADE_MAXIMA} bolsas.`);
    }

    this.#id = id;
    this.#hospital = hospital;
    this.#tipoSanguineo = validarEnum(TipoSanguineo, tipoSanguineo, 'tipo sanguíneo');
    this.#quantidade = qtd;
    this.#dataSolicitacao = new Date(dataSolicitacao);
    this.#status = validarEnum(StatusSolicitacao, status, 'status da solicitação');
    this.#origemManual = Boolean(origemManual);
    this.#dataAtendimento = dataAtendimento ? new Date(dataAtendimento) : null;
    this.#bolsas = [...bolsas];
  }

  get id() { return this.#id; }
  get hospital() { return this.#hospital; }
  get tipoSanguineo() { return this.#tipoSanguineo; }
  get quantidade() { return this.#quantidade; }
  get dataSolicitacao() { return this.#dataSolicitacao; }
  get status() { return this.#status; }
  get origemManual() { return this.#origemManual; }
  get dataAtendimento() { return this.#dataAtendimento; }
  get bolsas() { return [...this.#bolsas]; }

  // RF-08: baixa do estoque as bolsas do tipo pedido, priorizando a validade mais próxima.
  // Retorna false (e não altera nada) quando não há bolsas, ou quando há menos do que
  // o pedido e o atendimento parcial não foi aceito.
  atender(estoque, aceitaParcial = false) {
    if (this.#status !== StatusSolicitacao.PENDENTE) {
      throw new Error('Esta solicitação já foi atendida.');
    }

    const disponiveis = estoque
      .consultarDisponiveis(this.#tipoSanguineo) // RN-04: vencidas já ficam de fora
      .sort((a, b) => a.dataValidade - b.dataValidade);

    if (disponiveis.length === 0) return false;
    if (disponiveis.length < this.#quantidade && !aceitaParcial) return false;

    const selecionadas = disponiveis.slice(0, this.#quantidade);
    selecionadas.forEach((bolsa) => bolsa.marcarEntregue());
    this.#bolsas.push(...selecionadas);
    this.#status = selecionadas.length === this.#quantidade
      ? StatusSolicitacao.ATENDIDA
      : StatusSolicitacao.ATENDIDA_PARCIALMENTE;
    this.#dataAtendimento = new Date();
    return true;
  }

  getQuantidadeAtendida() {
    return this.#bolsas.length;
  }

  toJSON() {
    return {
      id: this.#id,
      hospital: this.#hospital.toJSON(),
      tipoSanguineo: this.#tipoSanguineo,
      quantidade: this.#quantidade,
      quantidadeAtendida: this.getQuantidadeAtendida(),
      dataSolicitacao: this.#dataSolicitacao.toISOString(),
      dataAtendimento: this.#dataAtendimento?.toISOString() ?? null,
      status: this.#status,
      origemManual: this.#origemManual,
      bolsas: this.#bolsas.map((b) => b.codigo),
    };
  }
}
