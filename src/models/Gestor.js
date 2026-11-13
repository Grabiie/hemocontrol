import { Usuario } from './Usuario.js';
import { RelatorioMensal } from './RelatorioMensal.js';
import { Recepcionista } from './Recepcionista.js';
import { Medico } from './Medico.js';
import { Enfermeiro } from './Enfermeiro.js';
import { cpfValido } from './cpf.js';

export class Gestor extends Usuario {
  static PERFIL = 'GESTOR';

  // RF-07: registro manual, usado quando a integração com o hospital não está disponível
  registrarSolicitacao(solicitacao) {
    if (!solicitacao.origemManual) {
      throw new Error('O gestor só registra solicitações manuais.');
    }
  }

  // RF-08
  atenderSolicitacao(solicitacao, estoque, aceitaParcial) {
    return solicitacao.atender(estoque, aceitaParcial);
  }

  // RF-09: descarta as bolsas vencidas e retorna quantas foram descartadas
  descartarBolsasVencidas(estoque) {
    return estoque.descartarVencidas(new Date()).length;
  }

  // RF-10
  gerarRelatorioMensal(mes, ano) {
    return new RelatorioMensal({ mes, ano });
  }

  // RF-14: cria a conta de um novo usuário. A senha inicial é temporária (redefinirSenha)
  // e o próprio usuário cria a definitiva no primeiro acesso, então o gestor não a conhece.
  // A unicidade do login e do CPF é conferida pelo repositório ao salvar.
  cadastrarUsuario({ nome, cpf, login, perfil, registroProfissional }) {
    const Classe = { RECEPCIONISTA: Recepcionista, MEDICO: Medico, ENFERMEIRO: Enfermeiro, GESTOR: Gestor }[perfil];
    if (!Classe) throw new Error('Escolha o perfil do usuário.');
    if (!String(nome ?? '').trim()) throw new Error('O nome do usuário é obrigatório.');
    if (!cpfValido(cpf)) throw new Error('CPF inválido.');
    const loginLimpo = String(login ?? '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(loginLimpo)) {
      throw new Error('O login deve ter de 3 a 30 caracteres: letras sem acento, números, ponto, hífen ou sublinhado.');
    }
    const registro = String(registroProfissional ?? '').trim();
    if (Classe === Medico && !registro) throw new Error('Informe o CRM do médico.');
    if (Classe === Enfermeiro && !registro) throw new Error('Informe o COREN do enfermeiro.');

    return new Classe({
      nome: String(nome).trim(), cpf, login: loginLimpo, senhaHash: null,
      crm: registro || undefined, coren: registro || undefined,
    });
  }

  // RF-14: gera uma senha temporária para o usuário (por exemplo, quando ele esquece a dele).
  // O gestor não escolhe a senha: o usuário cria a própria no próximo acesso (RF-15).
  redefinirSenha(usuario) {
    this.#conferirOutroUsuario(usuario, 'redefinir a própria senha por aqui; use "Alterar minha senha"');
    return usuario.redefinirSenhaTemporaria();
  }

  // RF-14: em vez de excluir, desativa. A conta deixa de entrar no sistema, mas os registros
  // feitos por ela (inaptidões, triagens, doações) continuam ligados a quem os fez.
  desativarUsuario(usuario) {
    this.#conferirOutroUsuario(usuario, 'desativar a própria conta');
    usuario.desativar();
  }

  reativarUsuario(usuario) {
    this.#conferirOutroUsuario(usuario, 'reativar a própria conta');
    usuario.reativar();
  }

  #conferirOutroUsuario(usuario, acao) {
    if (!(usuario instanceof Usuario)) throw new Error('Usuário não encontrado.');
    if (usuario.id !== null && usuario.id === this.id) throw new Error(`O gestor não pode ${acao}.`);
  }
}
