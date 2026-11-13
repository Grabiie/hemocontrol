import { conferirSenha, gerarHashSenha, gerarSenhaTemporaria } from './senha.js';

// <<abstract>> Usuario: dados de acesso comuns a todos os perfis
export class Usuario {
  // RF-15: tamanho mínimo da senha escolhida pelo próprio usuário
  static SENHA_MINIMA = 6;

  #id;
  #nome;
  #cpf;
  #login;
  #senhaHash;
  #ativo;           // RF-14: conta desativada não entra no sistema
  #deveTrocarSenha; // RF-14 e RF-15: senha temporária precisa ser trocada no primeiro acesso

  constructor({ id = null, nome, cpf, login, senhaHash, ativo = true, deveTrocarSenha = false }) {
    if (new.target === Usuario) {
      throw new Error('Usuario é abstrata: crie um Recepcionista, Gestor, Medico ou Enfermeiro.');
    }
    this.#id = id;
    this.#nome = nome;
    this.#cpf = String(cpf ?? '').replace(/\D/g, '');
    this.#login = login;
    this.#senhaHash = senhaHash;
    this.#ativo = Boolean(ativo);
    this.#deveTrocarSenha = Boolean(deveTrocarSenha);
  }

  get id() { return this.#id; }
  get login() { return this.#login; }
  get cpf() { return this.#cpf; }
  // Usado só pela camada de persistência para gravar o hash (RNF-02)
  get senhaHash() { return this.#senhaHash; }

  estaAtivo() { return this.#ativo; }
  precisaTrocarSenha() { return this.#deveTrocarSenha; }

  // Nome do perfil exibido na interface (cada subclasse informa o seu)
  get perfil() { return this.constructor.PERFIL; }

  autenticar(login, senha) {
    return login === this.#login && conferirSenha(senha, this.#senhaHash);
  }

  // RF-15: o próprio usuário troca a senha, confirmando a atual. Só ele conhece a senha nova.
  trocarSenha(senhaAtual, novaSenha) {
    if (!conferirSenha(senhaAtual, this.#senhaHash)) throw new Error('A senha atual está incorreta.');
    const senha = String(novaSenha ?? '');
    if (senha.length < Usuario.SENHA_MINIMA) {
      throw new Error(`A nova senha precisa ter pelo menos ${Usuario.SENHA_MINIMA} caracteres.`);
    }
    if (senha === senhaAtual) throw new Error('A nova senha precisa ser diferente da atual.');
    this.#senhaHash = gerarHashSenha(senha);
    this.#deveTrocarSenha = false;
  }

  // RF-14: gera uma senha temporária, que o usuário é obrigado a trocar no próximo acesso
  redefinirSenhaTemporaria() {
    const temporaria = gerarSenhaTemporaria();
    this.#senhaHash = gerarHashSenha(temporaria);
    this.#deveTrocarSenha = true;
    return temporaria;
  }

  desativar() { this.#ativo = false; }
  reativar() { this.#ativo = true; }

  getNome() {
    return this.#nome;
  }

  toJSON() {
    return { id: this.#id, nome: this.#nome, login: this.#login, perfil: this.perfil, deveTrocarSenha: this.#deveTrocarSenha };
  }
}
