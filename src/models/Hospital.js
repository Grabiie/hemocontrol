import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// Sistema externo que envia solicitações de bolsas (RF-07, RNF-05).
// O administrador cadastra o hospital e gera a chave de acesso da integração (RF-18).
// Como a senha dos usuários, a chave nunca é guardada: só o hash (RNF-02).
export class Hospital {
  static PREFIXO_CHAVE = 'hc_';

  #id;
  #nome;
  #cnpj;
  #chaveHash;
  #ativo;
  #chaveGeradaEm;

  constructor({ id = null, nome, cnpj, chaveHash = null, ativo = true, chaveGeradaEm = null }) {
    this.#id = id;
    this.#nome = String(nome ?? '').trim();
    this.#cnpj = String(cnpj ?? '').replace(/\D/g, '');
    this.#chaveHash = chaveHash;
    this.#ativo = ativo;
    this.#chaveGeradaEm = chaveGeradaEm ? new Date(chaveGeradaEm) : null;
  }

  static hashDaChave(chave) {
    return `sha256:${createHash('sha256').update(String(chave ?? '')).digest('hex')}`;
  }

  get id() { return this.#id; }
  get nome() { return this.#nome; }
  get cnpj() { return this.#cnpj; }
  get chaveHash() { return this.#chaveHash; }
  get chaveGeradaEm() { return this.#chaveGeradaEm; }

  estaAtivo() { return this.#ativo; }
  desativar() { this.#ativo = false; }
  reativar() { this.#ativo = true; }

  // RF-18: cria uma chave nova e devolve o valor, que só aparece desta vez.
  // A chave anterior deixa de funcionar na mesma hora.
  gerarNovaChave(data = new Date()) {
    const chave = Hospital.PREFIXO_CHAVE + randomBytes(24).toString('base64url');
    this.#chaveHash = Hospital.hashDaChave(chave);
    this.#chaveGeradaEm = data;
    return chave;
  }

  // RNF-05: compara os hashes em tempo constante; hospital desativado não é aceito
  validarChave(chave) {
    if (!this.#ativo || !this.#chaveHash) return false;
    const esperada = Buffer.from(this.#chaveHash);
    const recebida = Buffer.from(Hospital.hashDaChave(chave));
    return esperada.length === recebida.length && timingSafeEqual(esperada, recebida);
  }

  toJSON() {
    return {
      id: this.#id, nome: this.#nome, cnpj: this.#cnpj, ativo: this.#ativo,
      chaveGeradaEm: this.#chaveGeradaEm?.toISOString() ?? null,
    };
  }
}
