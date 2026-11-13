// Comandos do responsável técnico (TI), executados no terminal do servidor (RN-12).
// Servem para o que nenhuma conta faz pela tela: criar administradores e
// recuperar o acesso de um administrador. Cada comando fica no log (RF-16).
//
//   npm run admin -- criar <login> "<nome>" <cpf>   cria um administrador
//   npm run admin -- senha <login>                  gera senha temporária para qualquer conta
//   npm run admin -- desativar <login>              desativa qualquer conta
//   npm run admin -- reativar <login>               reativa qualquer conta
import { Administrador } from './models/Administrador.js';
import { RegistroLog } from './models/RegistroLog.js';
import { AcaoLog } from './models/enums.js';
import { cpfValido } from './models/cpf.js';
import * as repo from './repositorios.js';

const [comando, ...args] = process.argv.slice(2);
const ORIGEM = 'terminal do servidor';

function log(acao, descricao) {
  repo.registrarLog(new RegistroLog({ acao, descricao: `Pelo terminal: ${descricao}`, origem: ORIGEM }));
}

function contaPeloLogin(login) {
  const usuario = repo.buscarUsuarioPorLogin(login);
  if (!usuario) throw new Error(`Não existe conta com o login "${login}".`);
  return usuario;
}

const descrever = (u) => `${u.getNome()} (${u.login}, ${u.perfil.toLowerCase()})`;

const comandos = {
  criar([login, nome, cpf]) {
    if (!login || !nome || !cpf) throw new Error('Uso: npm run admin -- criar <login> "<nome>" <cpf>');
    if (!cpfValido(cpf)) throw new Error('CPF inválido.');
    if (!/^[a-z0-9._-]{3,30}$/.test(login)) throw new Error('Login inválido: use de 3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado.');
    const novo = new Administrador({ nome, cpf, login, senhaHash: null });
    const senha = novo.redefinirSenhaTemporaria();
    const salvo = repo.salvarUsuario(novo);
    log(AcaoLog.USUARIO_CADASTRADO, `cadastrou ${descrever(salvo)}.`);
    console.log(`Administrador ${nome} criado. Senha temporária: ${senha}`);
  },
  senha([login]) {
    const usuario = contaPeloLogin(login);
    const senha = usuario.redefinirSenhaTemporaria();
    repo.atualizarSenha(usuario);
    log(AcaoLog.SENHA_REDEFINIDA, `gerou senha temporária para ${descrever(usuario)}.`);
    console.log(`Senha temporária de ${usuario.getNome()}: ${senha}`);
  },
  desativar([login]) {
    const usuario = contaPeloLogin(login);
    usuario.desativar();
    repo.atualizarSituacaoUsuario(usuario);
    log(AcaoLog.USUARIO_DESATIVADO, `desativou ${descrever(usuario)}.`);
    console.log(`${usuario.getNome()} desativado(a). Se estiver logado(a), perde o acesso na próxima ação.`);
  },
  reativar([login]) {
    const usuario = contaPeloLogin(login);
    usuario.reativar();
    repo.atualizarSituacaoUsuario(usuario);
    log(AcaoLog.USUARIO_REATIVADO, `reativou ${descrever(usuario)}.`);
    console.log(`${usuario.getNome()} reativado(a).`);
  },
};

try {
  if (!comandos[comando]) {
    console.log('Comandos: criar <login> "<nome>" <cpf> | senha <login> | desativar <login> | reativar <login>');
    process.exitCode = 1;
  } else {
    comandos[comando](args);
  }
} catch (erro) {
  console.error(erro.message);
  process.exitCode = 1;
}
