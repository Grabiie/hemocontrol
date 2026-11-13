import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Gestor } from '../src/models/Gestor.js';
import { Administrador } from '../src/models/Administrador.js';
import { Medico } from '../src/models/Medico.js';
import { Recepcionista } from '../src/models/Recepcionista.js';
import { RegistroLog } from '../src/models/RegistroLog.js';
import { PermissaoNegada } from '../src/models/gestaoDeContas.js';
import { AcaoLog } from '../src/models/enums.js';
import { gerarHashSenha } from '../src/models/senha.js';

const conta = (Classe, id, extra = {}) =>
  new Classe({ id, nome: `Pessoa ${id}`, cpf: '11144477735', login: `p${id}`, senhaHash: gerarHashSenha('segredo'), ...extra });

const novoGestor = { nome: 'Helena Prado', cpf: '529.982.247-25', login: 'helena', perfil: 'GESTOR' };

test('RN-12: só o administrador gerencia contas; o gestor não tem essas funções', () => {
  const gestor = conta(Gestor, 1);
  for (const metodo of ['cadastrarUsuario', 'redefinirSenha', 'desativarUsuario', 'reativarUsuario']) {
    assert.equal(typeof gestor[metodo], 'undefined', metodo);
  }
});

test('RF-13: gestor corrige dados do doador com as mesmas regras da recepção', async () => {
  const { Doador } = await import('../src/models/Doador.js');
  const gestor = conta(Gestor, 1);
  const doador = new Doador({ id: 1, nome: 'Ana', cpf: '529.982.247-25', dataNascimento: '1990-01-01', sexo: 'FEMININO', tipoSanguineo: 'A_POSITIVO' });
  assert.equal(gestor.editarDoador(doador, { nome: 'Ana Lima' }, true).nome, 'Ana Lima');
  assert.throws(() => gestor.editarDoador(doador, { tipoSanguineo: 'O_NEGATIVO' }, true), /RN-08/);
});

test('RN-12: administrador gerencia gestores e contas operacionais', () => {
  const admin = conta(Administrador, 1);
  const gestor = conta(Gestor, 2);
  const medico = conta(Medico, 3, { crm: 'CRM-SP 1' });
  assert.ok(admin.cadastrarUsuario(novoGestor) instanceof Gestor);
  admin.desativarUsuario(gestor);
  assert.equal(gestor.estaAtivo(), false);
  admin.reativarUsuario(gestor);
  assert.equal(gestor.estaAtivo(), true);
  assert.match(admin.redefinirSenha(medico), /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(medico.precisaTrocarSenha(), true);
});

test('RN-12: administrador não cria nem mexe em outro administrador, nem na própria conta', () => {
  const admin = conta(Administrador, 1);
  assert.throws(() => admin.cadastrarUsuario({ ...novoGestor, perfil: 'ADMINISTRADOR' }), PermissaoNegada);
  assert.throws(() => admin.desativarUsuario(conta(Administrador, 2)), PermissaoNegada);
  assert.throws(() => admin.desativarUsuario(admin), /própria conta/);
});

test('Administrador não é Gestor: não herda as funções do banco de sangue', () => {
  const admin = conta(Administrador, 1);
  assert.equal(admin instanceof Gestor, false);
  assert.equal(typeof admin.gerarRelatorioMensal, 'undefined');
});

test('RF-16: consulta de logs usa os últimos 7 dias por padrão e confere o período', () => {
  const admin = conta(Administrador, 1);
  const padrao = admin.consultarLogs({});
  assert.equal(Math.round((padrao.ate - padrao.de) / 86_400_000), 7); // 7 dias, com o de hoje até 23:59
  const filtro = admin.consultarLogs({ de: '2026-11-01', ate: '2026-11-10', acao: 'LOGIN', usuarioId: '4' });
  assert.equal(filtro.de.getDate(), 1);
  assert.equal(filtro.ate.getHours(), 23);
  assert.equal(filtro.usuarioId, 4);
  assert.throws(() => admin.consultarLogs({ de: '2026-11-10', ate: '2026-11-01' }), /depois da final/);
  assert.throws(() => admin.consultarLogs({ de: '2026-01-01', ate: '2026-11-10' }), /90 dias/);
  assert.throws(() => admin.consultarLogs({ acao: 'APAGAR_TUDO' }), /Ação inválida/);
});

test('RF-16: registro de log exige ação válida e descrição', () => {
  assert.throws(() => new RegistroLog({ acao: 'QUALQUER', descricao: 'x' }), /ação do log/);
  assert.throws(() => new RegistroLog({ acao: AcaoLog.LOGIN, descricao: '  ' }), /descrição/);
  const r = new RegistroLog({ acao: AcaoLog.LOGIN, descricao: 'Entrou.', origem: '127.0.0.1' });
  assert.equal(r.usuario, null);
  assert.equal('descricao' in Object.getOwnPropertyDescriptors(RegistroLog.prototype), true);
  assert.equal(Object.getOwnPropertyDescriptor(RegistroLog.prototype, 'descricao').set, undefined);
});

test('RNF-07: o banco grava logs, mas recusa alterar ou apagar', async () => {
  process.env.HEMOCONTROL_DB = path.join(mkdtempSync(path.join(tmpdir(), 'hemo-')), 'teste.db');
  const { db } = await import('../src/database.js');
  const repo = await import('../src/repositorios.js');
  repo.registrarLog(new RegistroLog({ acao: AcaoLog.LOGIN, descricao: 'Entrou no sistema.', origem: '127.0.0.1' }));
  const admin = conta(Administrador, 1);
  const { total, registros } = repo.listarLogs(admin.consultarLogs({}));
  assert.equal(total, 1);
  assert.equal(registros[0].descricao, 'Entrou no sistema.');
  assert.throws(() => db.exec("UPDATE log_auditoria SET descricao = 'outra'"), /não pode ser alterado/);
  assert.throws(() => db.exec('DELETE FROM log_auditoria'), /não pode ser apagado/);
});
