import { AcaoLog, validarEnum } from './enums.js';

// RF-16 e RNF-07: uma linha do registro de atividades. Depois de criada não muda:
// não há setters, e o banco recusa UPDATE e DELETE na tabela de logs.
export class RegistroLog {
  #id;
  #dataHora;
  #usuario;   // quem fez; nulo quando não há usuário (login recusado, integração, terminal)
  #acao;
  #descricao;
  #origem;    // endereço IP, "integração" ou "terminal"

  constructor({ id = null, dataHora = new Date(), usuario = null, acao, descricao = '', origem = '' }) {
    this.#id = id;
    this.#dataHora = new Date(dataHora);
    this.#usuario = usuario;
    this.#acao = validarEnum(AcaoLog, acao, 'ação do log');
    const texto = String(descricao ?? '').trim();
    if (!texto) throw new Error('O registro de log precisa de uma descrição.');
    this.#descricao = texto.slice(0, 500);
    this.#origem = String(origem ?? '').slice(0, 60);
  }

  get id() { return this.#id; }
  get dataHora() { return this.#dataHora; }
  get usuario() { return this.#usuario; }
  get acao() { return this.#acao; }
  get descricao() { return this.#descricao; }
  get origem() { return this.#origem; }

  toJSON() {
    return {
      id: this.#id,
      dataHora: this.#dataHora.toISOString(),
      usuario: this.#usuario,
      acao: this.#acao,
      descricao: this.#descricao,
      origem: this.#origem,
    };
  }
}
