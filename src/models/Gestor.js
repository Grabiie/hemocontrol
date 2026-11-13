import { Usuario } from './Usuario.js';
import { RelatorioMensal } from './RelatorioMensal.js';
import { corrigirDadosDoDoador } from './edicaoDoador.js';

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

  // RF-13: o gestor também consulta e corrige os dados cadastrais do doador,
  // com as mesmas regras da recepção
  editarDoador(atual, novosDados, possuiDoacoes) {
    return corrigirDadosDoDoador(atual, novosDados, possuiDoacoes);
  }
}
