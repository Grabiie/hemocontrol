// RF-16: grava uma linha no log de atividades. Uma falha ao gravar o log
// não desfaz a operação que já foi feita; fica avisada no console do servidor.
import { RegistroLog } from './models/RegistroLog.js';
import { registrarLog } from './repositorios.js';

export function origemDaRequisicao(req) {
  return String(req?.ip ?? '').replace(/^::ffff:/, '');
}

export function registrar(req, acao, descricao, usuario = req?.usuario ?? null, origem = origemDaRequisicao(req)) {
  try {
    registrarLog(new RegistroLog({ usuario, acao, descricao, origem }));
  } catch (erro) {
    console.error('Não foi possível gravar o log de atividades:', erro.message);
  }
}
