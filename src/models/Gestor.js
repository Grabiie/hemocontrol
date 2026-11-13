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

  // RF-14: cria a conta de um novo usuário do sistema, já com a senha em hash.
  // A unicidade do login é conferida pelo repositório ao salvar.
  cadastrarUsuario({ nome, cpf, login, perfil, senha, registroProfissional }) {
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

    const usuario = new Classe({
      nome: String(nome).trim(), cpf, login: loginLimpo, senhaHash: null,
      crm: registro || undefined, coren: registro || undefined,
    });
    usuario.alterarSenha(senha);
    return usuario;
  }

  // RF-14: o gestor define uma nova senha para qualquer usuário (por exemplo, quando ele esquece a dele)
  redefinirSenha(usuario, novaSenha) {
    if (!(usuario instanceof Usuario)) throw new Error('Usuário não encontrado.');
    usuario.alterarSenha(novaSenha);
  }
}
