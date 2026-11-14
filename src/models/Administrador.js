import { Usuario } from './Usuario.js';
import { Gestor } from './Gestor.js';
import { Hospital } from './Hospital.js';
import { cnpjValido } from './cnpj.js';
import { AcaoLog } from './enums.js';
import { criarConta, conferirAlvo, PERFIS_OPERACIONAIS } from './gestaoDeContas.js';
import { lerData } from './datas.js';

// Responsável técnico (TI). Não usa as telas do banco de sangue: é o único que cuida
// das contas (RN-12) e consulta o registro de atividades (RF-16).
export class Administrador extends Usuario {
  static PERFIL = 'ADMINISTRADOR';
  // RF-16: período máximo de uma consulta de logs, para a tela continuar leve
  static DIAS_MAXIMOS_CONSULTA = 90;

  // RN-12: gerencia todos os perfis, menos outros administradores. Contas de administrador
  // são criadas na instalação, pelo terminal do servidor (npm run admin).
  static get PERFIS_GERENCIADOS() { return [...PERFIS_OPERACIONAIS, Gestor]; }

  podeGerenciar(usuario) {
    return Administrador.PERFIS_GERENCIADOS.some((Classe) => usuario.perfil === Classe.PERFIL);
  }

  cadastrarUsuario(dados) {
    return criarConta(this, Administrador.PERFIS_GERENCIADOS, dados);
  }

  redefinirSenha(usuario) {
    conferirAlvo(this, usuario, { propria: 'redefinir a própria senha; use "Alterar senha"', outra: 'gerar senha' });
    return usuario.redefinirSenhaTemporaria();
  }

  desativarUsuario(usuario) {
    conferirAlvo(this, usuario, { propria: 'desativar a própria conta', outra: 'desativar a conta' });
    usuario.desativar();
  }

  reativarUsuario(usuario) {
    conferirAlvo(this, usuario, { propria: 'reativar a própria conta', outra: 'reativar a conta' });
    usuario.reativar();
  }

  // RF-18: cadastra o hospital que vai usar a integração. A chave é gerada em seguida
  // (gerarChaveHospital) e só o hash dela fica guardado. O CNPJ único é conferido pelo repositório.
  cadastrarHospital({ nome, cnpj }) {
    if (!String(nome ?? '').trim()) throw new Error('O nome do hospital é obrigatório.');
    if (!cnpjValido(cnpj)) throw new Error('CNPJ inválido.');
    return new Hospital({ nome, cnpj });
  }

  // RF-18: gera uma chave nova (no cadastro ou quando a anterior vazou ou foi perdida).
  // A chave anterior deixa de funcionar na hora; a nova só é mostrada uma vez.
  gerarChaveHospital(hospital) {
    if (!(hospital instanceof Hospital)) throw new Error('Hospital não encontrado.');
    if (hospital.id !== null && !hospital.estaAtivo()) throw new Error('Reative o hospital antes de gerar uma chave nova.');
    return hospital.gerarNovaChave();
  }

  // RF-18: um hospital desativado não consegue enviar solicitações pela integração
  // nem aparece para o gestor; as solicitações antigas continuam ligadas a ele.
  desativarHospital(hospital) {
    if (!(hospital instanceof Hospital)) throw new Error('Hospital não encontrado.');
    hospital.desativar();
  }

  reativarHospital(hospital) {
    if (!(hospital instanceof Hospital)) throw new Error('Hospital não encontrado.');
    hospital.reativar();
  }

  // RF-16: confere os filtros da consulta de logs. A busca em si é feita pelo repositório.
  consultarLogs({ de, ate, usuarioId, acao } = {}) {
    const hoje = new Date();
    const fim = ate ? lerData(ate) : hoje;
    const inicio = de ? lerData(de) : new Date(fim.getFullYear(), fim.getMonth(), fim.getDate() - 6);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) throw new Error('Data inválida no filtro.');
    if (inicio > fim) throw new Error('A data inicial não pode ser depois da final.');
    const dias = Math.round((fim - inicio) / 86_400_000) + 1;
    if (dias > Administrador.DIAS_MAXIMOS_CONSULTA) {
      throw new Error(`Consulte no máximo ${Administrador.DIAS_MAXIMOS_CONSULTA} dias por vez.`);
    }
    if (acao && !Object.values(AcaoLog).includes(acao)) throw new Error('Ação inválida no filtro.');
    const ateFimDoDia = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate(), 23, 59, 59, 999);
    return {
      de: new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()),
      ate: ateFimDoDia,
      usuarioId: usuarioId ? Number(usuarioId) : null,
      acao: acao || null,
    };
  }
}
