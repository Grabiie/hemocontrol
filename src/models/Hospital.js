import { timingSafeEqual } from 'node:crypto';

// Sistema externo que envia solicitações de bolsas (RF-07, RNF-05)
export class Hospital {
  #id;
  #nome;
  #cnpj;
  #chaveAcesso;

  constructor({ id = null, nome, cnpj, chaveAcesso }) {
    this.#id = id;
    this.#nome = nome;
    this.#cnpj = String(cnpj ?? '').replace(/\D/g, '');
    this.#chaveAcesso = chaveAcesso;
  }

  get id() { return this.#id; }
  get nome() { return this.#nome; }
  get cnpj() { return this.#cnpj; }

  // RNF-05: comparação em tempo constante, para não vazar a chave por tempo de resposta
  validarChave(chave) {
    const esperada = Buffer.from(String(this.#chaveAcesso));
    const recebida = Buffer.from(String(chave ?? ''));
    return esperada.length === recebida.length && timingSafeEqual(esperada, recebida);
  }

  toJSON() {
    return { id: this.#id, nome: this.#nome, cnpj: this.#cnpj };
  }
}
