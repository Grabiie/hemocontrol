import { randomBytes } from 'node:crypto';
import { buscarUsuarioPorId } from './repositorios.js';

// Sessões em memória: token aleatório no cookie -> id do usuário.
// Reiniciar o servidor encerra todas as sessões.
const sessoes = new Map();
const COOKIE = 'hemocontrol_sessao';
const DURACAO_MS = 8 * 60 * 60 * 1000; // 8 horas

function lerCookie(req) {
  const cabecalho = req.headers.cookie ?? '';
  for (const parte of cabecalho.split(';')) {
    const [nome, ...valor] = parte.trim().split('=');
    if (nome === COOKIE) return decodeURIComponent(valor.join('='));
  }
  return null;
}

export function iniciarSessao(res, usuario) {
  const token = randomBytes(32).toString('hex');
  sessoes.set(token, { usuarioId: usuario.id, expiraEm: Date.now() + DURACAO_MS });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'strict', maxAge: DURACAO_MS });
}

// RF-14: depois de uma troca de senha, derruba as outras sessões abertas daquele usuário
export function encerrarOutrasSessoes(usuarioId, req) {
  const atual = lerCookie(req);
  for (const [token, sessao] of sessoes) {
    if (sessao.usuarioId === usuarioId && token !== atual) sessoes.delete(token);
  }
}

export function encerrarSessao(req, res) {
  const token = lerCookie(req);
  if (token) sessoes.delete(token);
  res.clearCookie(COOKIE);
}

// Middleware: coloca o usuário logado em req.usuario (ou null)
export function carregarUsuario(req, res, next) {
  const token = lerCookie(req);
  const sessao = token ? sessoes.get(token) : null;

  if (sessao && sessao.expiraEm > Date.now()) {
    req.usuario = buscarUsuarioPorId(sessao.usuarioId);
    // RF-14: conta desativada perde o acesso na hora
    if (req.usuario && !req.usuario.estaAtivo()) {
      sessoes.delete(token);
      req.usuario = null;
    }
  } else {
    if (sessao) sessoes.delete(token);
    req.usuario = null;
  }
  next();
}

// Middleware de permissão: aceita classes da hierarquia de Usuario.
// Como usa instanceof, exigir(ProfissionalDeSaude) libera Medico e Enfermeiro.
export function exigir(...classesPermitidas) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ erro: 'Faça login para continuar.' });
    }
    // RF-15: com senha temporária, o usuário só pode trocá-la antes de usar o sistema
    if (req.usuario.precisaTrocarSenha()) {
      return res.status(403).json({ erro: 'Crie uma senha nova antes de continuar.', trocarSenha: true });
    }
    if (!classesPermitidas.some((Classe) => req.usuario instanceof Classe)) {
      return res.status(403).json({ erro: 'Seu perfil não tem permissão para esta ação.' });
    }
    next();
  };
}
