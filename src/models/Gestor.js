import { Usuario } from './Usuario.js';
import { RelatorioMensal } from './RelatorioMensal.js';
import { criarConta, conferirAlvo, PERFIS_OPERACIONAIS } from './gestaoDeContas.js';

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

  // RN-12: o gestor cuida só das contas operacionais. Contas de gestor ficam com o
  // Administrador, para que um gestor não consiga bloquear ou assumir a conta de outro.
  static get PERFIS_GERENCIADOS() { return PERFIS_OPERACIONAIS; }

  podeGerenciar(usuario) {
    return this.constructor.PERFIS_GERENCIADOS.some((Classe) => usuario.perfil === Classe.PERFIL);
  }

  // RF-14: cria a conta de um novo usuário. A senha inicial é temporária (redefinirSenha)
  // e o próprio usuário cria a definitiva no primeiro acesso, então o responsável não a conhece.
  // A unicidade do login e do CPF é conferida pelo repositório ao salvar.
  cadastrarUsuario(dados) {
    return criarConta(this, this.constructor.PERFIS_GERENCIADOS, dados);
  }

  // RF-14: gera uma senha temporária (por exemplo, quando o usuário esquece a dele).
  // Quem gera não escolhe a senha: o usuário cria a própria no próximo acesso (RF-15).
  redefinirSenha(usuario) {
    conferirAlvo(this, usuario, { propria: 'redefinir a própria senha; use "Alterar senha"', outra: 'gerar senha' });
    return usuario.redefinirSenhaTemporaria();
  }

  // RF-14: em vez de excluir, desativa. A conta deixa de entrar no sistema, mas os registros
  // feitos por ela (inaptidões, triagens, doações) continuam ligados a quem os fez.
  desativarUsuario(usuario) {
    conferirAlvo(this, usuario, { propria: 'desativar a própria conta', outra: 'desativar a conta' });
    usuario.desativar();
  }

  reativarUsuario(usuario) {
    conferirAlvo(this, usuario, { propria: 'reativar a própria conta', outra: 'reativar a conta' });
    usuario.reativar();
  }
}
