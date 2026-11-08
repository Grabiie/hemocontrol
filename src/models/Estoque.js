import { StatusBolsa } from './enums.js';

// Todo da agregação Estoque ◇ BolsaSangue:
// as bolsas continuam existindo fora do estoque (entregues ou descartadas).
export class Estoque {
  // RF-06: limite para o alerta de estoque crítico
  static LIMITE_CRITICO = 10;

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
