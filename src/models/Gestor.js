import { Usuario } from './Usuario.js';
import { RelatorioMensal } from './RelatorioMensal.js';

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
}
