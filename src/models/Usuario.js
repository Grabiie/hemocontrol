import { conferirSenha } from './senha.js';

// <<abstract>> Usuario: dados de acesso comuns a todos os perfis
export class Usuario {
  #id;
  #nome;
  #cpf;
  #login;
  #senhaHash;

  constructor({ id = null, nome, cpf, login, senhaHash }) {
    if (new.target === Usuario) {
      throw new Error('Usuario é abstrata: crie um Recepcionista, Gestor, Medico ou Enfermeiro.');
    }
    this.#id = id;
    this.#nome = nome;
    this.#cpf = String(cpf ?? '').replace(/\D/g, '');
    this.#login = login;
    this.#senhaHash = senhaHash;
  }

  get id() { return this.#id; }
  get login() { return this.#login; }
  get cpf() { return this.#cpf; }

  // Nome do perfil exibido na interface (cada subclasse informa o seu)
  get perfil() { return this.constructor.PERFIL; }

  autenticar(login, senha) {
    return login === this.#login && conferirSenha(senha, this.#senhaHash);
  }

  getNome() {
    return this.#nome;
  }

  toJSON() {
    return { id: this.#id, nome: this.#nome, login: this.#login, perfil: this.perfil };
  }
}
