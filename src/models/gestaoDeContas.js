// Regras de gestão de contas (RF-14) usadas pelo Gestor e pelo Administrador.
// O que muda entre os dois é a lista de perfis que cada um pode gerenciar (RN-12).
import { Usuario } from './Usuario.js';
import { Recepcionista } from './Recepcionista.js';
import { Medico } from './Medico.js';
import { Enfermeiro } from './Enfermeiro.js';
import { cpfValido } from './cpf.js';

// Erro de permissão (RN-12): vira 403 e fica no log como acesso negado
export class PermissaoNegada extends Error {}

const ROTULO = {
  RECEPCIONISTA: 'recepcionista', MEDICO: 'médico', ENFERMEIRO: 'enfermeiro',
  GESTOR: 'gestor', ADMINISTRADOR: 'administrador',
};

// O Gestor importa este módulo, então a classe Gestor chega por parâmetro (evita import circular)
export function criarConta(responsavel, classesPermitidas, { nome, cpf, login, perfil, registroProfissional }) {
  if (!perfil) throw new Error('Escolha o perfil do usuário.');
  const Classe = classesPermitidas.find((C) => C.PERFIL === perfil);
  if (!Classe) {
    throw new PermissaoNegada(`O perfil ${responsavel.perfil.toLowerCase()} não pode criar contas de ${ROTULO[perfil] ?? 'perfil desconhecido'} (RN-12).`);
  }
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

// Confere se o responsável pode agir sobre esta conta: nunca sobre a própria
// e só sobre os perfis que ele gerencia (RN-12)
export function conferirAlvo(responsavel, usuario, acao) {
  if (!(usuario instanceof Usuario)) throw new Error('Usuário não encontrado.');
  if (usuario.id !== null && usuario.id === responsavel.id) {
    throw new PermissaoNegada(`Você não pode ${acao.propria}.`);
  }
  if (!responsavel.podeGerenciar(usuario)) {
    throw new PermissaoNegada(`O perfil ${responsavel.perfil.toLowerCase()} não pode ${acao.outra} de um ${ROTULO[usuario.perfil]} (RN-12).`);
  }
}

export const PERFIS_OPERACIONAIS = [Recepcionista, Medico, Enfermeiro];
