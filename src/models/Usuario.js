import { conferirSenha, gerarHashSenha } from './senha.js';

// <<abstract>> Usuario: dados de acesso comuns a todos os perfis
export class Usuario {
  // RF-14: tamanho mínimo da senha definida pelo gestor
  static SENHA_MINIMA = 6;

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
  // Usado só pela camada de persistência para gravar o hash (RNF-02)
  get senhaHash() { return this.#senhaHash; }

  // Nome do perfil exibido na interface (cada subclasse informa o seu)
  get perfil() { return this.constructor.PERFIL; }

  autenticar(login, senha) {
    return login === this.#login && conferirSenha(senha, this.#senhaHash);
  }

  // RF-14: troca a senha guardando apenas o hash (RNF-02)
  alterarSenha(novaSenha) {
    const senha = String(novaSenha ?? '');
    if (senha.length < Usuario.SENHA_MINIMA) {
      throw new Error(`A senha precisa ter pelo menos ${Usuario.SENHA_MINIMA} caracteres.`);
    }
    this.#senhaHash = gerarHashSenha(senha);
  }

  getNome() {
    return this.#nome;
  }

  toJSON() {
    return { id: this.#id, nome: this.#nome, login: this.#login, perfil: this.perfil };
  }
}
