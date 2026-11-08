import { Usuario } from './Usuario.js';
import { RelatorioMensal } from './RelatorioMensal.js';

export class Gestor extends Usuario {
  static PERFIL = 'GESTOR';

  // RF-09: descarta as bolsas vencidas e retorna quantas foram descartadas
  descartarBolsasVencidas(estoque) {
    return estoque.descartarVencidas(new Date()).length;
  }

  // RF-10
  gerarRelatorioMensal(mes, ano) {
    return new RelatorioMensal({ mes, ano });
  }
}
