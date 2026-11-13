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

  // RF-17: interpreta o que foi digitado no rastreio. Só números é o nº da doação;
  // "HC-" seguido de 8 letras/números (ou só os 8, sem o prefixo) é o código da bolsa.
  // A busca em si é feita pelo repositório.
  rastrear(termo) {
    const texto = String(termo ?? '').trim().toUpperCase().replace(/\s+/g, '');
    if (!texto) throw new Error('Informe o número da doação ou o código da bolsa.');
    if (/^\d{1,7}$/.test(texto)) return { doacaoId: Number(texto), codigo: null };
    const codigo = texto.startsWith('HC-') ? texto : `HC-${texto}`;
    if (/^HC-[0-9A-F]{8}$/.test(codigo)) {
      // 8 dígitos sem prefixo podem ser os dois: tenta a doação e, se não houver, a bolsa
      return { doacaoId: /^\d{8}$/.test(texto) ? Number(texto) : null, codigo };
    }
    throw new Error('Digite o número da doação (ex.: 12) ou o código da bolsa (ex.: HC-1A2B3C4D).');
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
