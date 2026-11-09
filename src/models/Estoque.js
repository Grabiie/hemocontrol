import { StatusBolsa } from './enums.js';

// Todo da agregação Estoque ◇ BolsaSangue:
// as bolsas continuam existindo fora do estoque (entregues ou descartadas).
export class Estoque {
  // RF-06: limite para o alerta de estoque crítico
  static LIMITE_CRITICO = 10;

  // RF-05: bolsas que vencem dentro deste prazo são destacadas para uso prioritário
  static DIAS_ALERTA_VENCIMENTO = 7;

  #bolsas = [];

  adicionarBolsa(bolsa) {
    this.#bolsas.push(bolsa);
  }

  consultarDisponiveis(tipo, dataReferencia = new Date()) {
    return this.#bolsas.filter(
      (b) => b.tipoSanguineo === tipo && b.status === StatusBolsa.DISPONIVEL && !b.estaVencida(dataReferencia),
    );
  }

  estaCritico(tipo, dataReferencia = new Date()) {
    return this.consultarDisponiveis(tipo, dataReferencia).length < Estoque.LIMITE_CRITICO;
  }

  // RF-05: bolsas disponíveis que vencem nos próximos dias, da validade mais próxima para a mais distante
  listarProximasDoVencimento(dataReferencia = new Date()) {
    const limite = new Date(dataReferencia.getTime() + Estoque.DIAS_ALERTA_VENCIMENTO * 24 * 60 * 60 * 1000);
    return this.#bolsas
      .filter((b) => b.status === StatusBolsa.DISPONIVEL && !b.estaVencida(dataReferencia) && b.dataValidade <= limite)
      .sort((a, b) => a.dataValidade - b.dataValidade);
  }

  // Bolsas ainda marcadas como disponíveis, mas com a validade expirada (RN-04)
  listarVencidas(dataReferencia = new Date()) {
    return this.#bolsas.filter(
      (b) => b.status === StatusBolsa.DISPONIVEL && b.estaVencida(dataReferencia),
    );
  }

  // RF-09: retorna as bolsas descartadas, para que possam ser persistidas
  descartarVencidas(dataReferencia = new Date()) {
    const vencidas = this.listarVencidas(dataReferencia);
    vencidas.forEach((b) => b.descartar(dataReferencia));
    return vencidas;
  }
}
