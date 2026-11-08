import { StatusBolsa } from './enums.js';

// RF-10: totais de um mês
export class RelatorioMensal {
  #mes;
  #ano;
  #totalDoacoes = 0;
  #totalBolsasDescartadas = 0;
  #totalSolicitacoesAtendidas = 0;

  constructor({ mes, ano }) {
    const m = Number(mes);
    const a = Number(ano);
    if (!Number.isInteger(m) || m < 1 || m > 12) throw new Error('Mês inválido.');
    if (!Number.isInteger(a) || a < 2000 || a > 2100) throw new Error('Ano inválido.');
    this.#mes = m;
    this.#ano = a;
  }

  get mes() { return this.#mes; }
  get ano() { return this.#ano; }
  get totalDoacoes() { return this.#totalDoacoes; }
  get totalBolsasDescartadas() { return this.#totalBolsasDescartadas; }
  get totalSolicitacoesAtendidas() { return this.#totalSolicitacoesAtendidas; }

  #pertenceAoMes(data) {
    return data instanceof Date && data.getMonth() + 1 === this.#mes && data.getFullYear() === this.#ano;
  }

  // As solicitações (RF-07 e RF-08) ainda não foram implementadas,
  // então o total de solicitações atendidas permanece zero.
  calcularTotais(datasDoacoes = [], bolsas = []) {
    this.#totalDoacoes = datasDoacoes.filter((d) => this.#pertenceAoMes(d)).length;
    this.#totalBolsasDescartadas = bolsas.filter(
      (b) => b.status === StatusBolsa.DESCARTADA && this.#pertenceAoMes(b.dataDescarte),
    ).length;
  }

  toJSON() {
    return {
      mes: this.#mes,
      ano: this.#ano,
      totalDoacoes: this.#totalDoacoes,
      totalBolsasDescartadas: this.#totalBolsasDescartadas,
      totalSolicitacoesAtendidas: this.#totalSolicitacoesAtendidas,
    };
  }
}
