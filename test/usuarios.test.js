import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Usuario } from '../src/models/Usuario.js';
import { ProfissionalDeSaude } from '../src/models/ProfissionalDeSaude.js';
import { Recepcionista } from '../src/models/Recepcionista.js';
import { Medico } from '../src/models/Medico.js';
import { Enfermeiro } from '../src/models/Enfermeiro.js';
import { Gestor } from '../src/models/Gestor.js';
import { gerarHashSenha, conferirSenha } from '../src/models/senha.js';
import { Doador } from '../src/models/Doador.js';
import { formatarDataISO } from '../src/models/datas.js';

const dados = (login) => ({ nome: 'Teste', cpf: '111.444.777-35', login, senhaHash: gerarHashSenha('segredo') });

test('RNF-02: senha é guardada com hash e conferida corretamente', () => {
  const hash = gerarHashSenha('segredo');
  assert.ok(!hash.includes('segredo'));
  assert.notEqual(hash, gerarHashSenha('segredo')); // salt diferente a cada hash
  assert.equal(conferirSenha('segredo', hash), true);
  assert.equal(conferirSenha('errada', hash), false);
});

test('RF-01: autenticar aceita login e senha corretos e recusa os errados', () => {
  const gestor = new Gestor(dados('gestor'));
  assert.equal(gestor.autenticar('gestor', 'segredo'), true);
  assert.equal(gestor.autenticar('gestor', 'outra'), false);
  assert.equal(gestor.autenticar('outro', 'segredo'), false);
});

test('Usuario e ProfissionalDeSaude são abstratas', () => {
  assert.throws(() => new Usuario(dados('x')), /abstrata/);
  assert.throws(() => new ProfissionalDeSaude(dados('x')), /abstrata/);
});

test('Generalização: Médico e Enfermeiro são Profissionais de Saúde e Usuários', () => {
  const medico = new Medico({ ...dados('medico'), crm: 'CRM-SP 1' });
  const enfermeiro = new Enfermeiro({ ...dados('enfermeiro'), coren: 'COREN-SP 1' });
  const recepcionista = new Recepcionista(dados('recepcao'));

  for (const u of [medico, enfermeiro]) {
    assert.ok(u instanceof ProfissionalDeSaude);
    assert.ok(u instanceof Usuario);
  }
  assert.ok(!(recepcionista instanceof ProfissionalDeSaude));
  assert.equal(medico.perfil, 'MEDICO');
  assert.equal(enfermeiro.crm, undefined);
  assert.equal(enfermeiro.coren, 'COREN-SP 1');
});

test('Apenas profissionais de saúde realizam triagem e apenas enfermeiros registram doação', () => {
  const medico = new Medico({ ...dados('medico'), crm: 'CRM-SP 1' });
  const gestor = new Gestor(dados('gestor'));

  assert.equal(typeof medico.realizarTriagem, 'function');
  assert.equal(typeof medico.registrarDoacao, 'undefined');
  assert.equal(typeof gestor.realizarTriagem, 'undefined');
  assert.equal(typeof new Enfermeiro({ ...dados('enf'), coren: 'X' }).registrarDoacao, 'function');
});

test('RF-02: recepcionista confere o doador no cadastro', async () => {
  const { Doador } = await import('../src/models/Doador.js');
  const recepcionista = new Recepcionista(dados('recepcao'));
  const doador = new Doador({
    nome: 'Maria', cpf: '529.982.247-25', dataNascimento: '1995-04-12', sexo: 'FEMININO', tipoSanguineo: 'O_NEGATIVO',
  });
  assert.doesNotThrow(() => recepcionista.cadastrarDoador(doador));
  assert.throws(() => recepcionista.cadastrarDoador({ nome: 'qualquer' }), /dados do doador/);
});

test('RF-13: recepcionista corrige dados do doador mantendo id e CPF', async () => {
  const { Doador } = await import('../src/models/Doador.js');
  const recepcionista = new Recepcionista(dados('recepcao'));
  const atual = new Doador({
    id: 3, nome: 'Maria', cpf: '529.982.247-25', dataNascimento: '1995-04-12', sexo: 'FEMININO', tipoSanguineo: 'O_NEGATIVO',
  });

  const editado = recepcionista.editarDoador(atual, { nome: 'Maria Souza', telefone: '(11) 98765-4321', cpf: '111.444.777-35' }, true);
  assert.equal(editado.id, 3);
  assert.equal(editado.cpf, '52998224725');
  assert.equal(editado.nome, 'Maria Souza');
  assert.equal(editado.telefone, '11987654321');

  assert.throws(() => recepcionista.editarDoador(atual, { telefone: '9876' }, false), /Telefone inválido/);
});

test('RN-08: sexo e tipo sanguíneo só mudam enquanto o doador não tiver doações', async () => {
  const { Doador } = await import('../src/models/Doador.js');
  const recepcionista = new Recepcionista(dados('recepcao'));
  const atual = new Doador({
    id: 3, nome: 'Maria', cpf: '529.982.247-25', dataNascimento: '1995-04-12', sexo: 'FEMININO', tipoSanguineo: 'O_NEGATIVO',
  });

  assert.equal(recepcionista.editarDoador(atual, { tipoSanguineo: 'A_POSITIVO' }, false).tipoSanguineo, 'A_POSITIVO');
  assert.throws(() => recepcionista.editarDoador(atual, { tipoSanguineo: 'A_POSITIVO' }, true), /RN-08/);
  assert.throws(() => recepcionista.editarDoador(atual, { sexo: 'MASCULINO' }, true), /RN-08/);
  // Reenviar os mesmos valores não é alteração
  assert.equal(recepcionista.editarDoador(atual, { sexo: 'FEMININO', tipoSanguineo: 'O_NEGATIVO' }, true).sexo, 'FEMININO');
});

test('RN-11: cadastro aceita só doadores de 16 a 69 anos e recusa data no futuro', () => {
  const recepcionista = new Recepcionista({ ...dados('rec') });
  const anosAtras = (anos, dias = 0) => {
    const d = new Date();
    return formatarDataISO(new Date(d.getFullYear() - anos, d.getMonth(), d.getDate() + dias));
  };
  const novo = (dataNascimento) => new Doador({
    nome: 'Teste', cpf: '529.982.247-25', dataNascimento, sexo: 'FEMININO', tipoSanguineo: 'O_POSITIVO',
  });
  assert.throws(() => recepcionista.cadastrarDoador(novo(anosAtras(15))), /RN-11/);
  assert.doesNotThrow(() => recepcionista.cadastrarDoador(novo(anosAtras(16, -1))));
  assert.doesNotThrow(() => recepcionista.cadastrarDoador(novo(anosAtras(69))));
  assert.throws(() => recepcionista.cadastrarDoador(novo(anosAtras(71))), /RN-11/);
  assert.throws(() => recepcionista.cadastrarDoador(novo(anosAtras(130))), /RN-11/);
  assert.throws(() => novo(anosAtras(-1)), /futuro/);
});

test('RN-11: na edição a idade só é conferida se a data de nascimento mudar', () => {
  const recepcionista = new Recepcionista({ ...dados('rec2') });
  const antigo = new Doador({
    id: 1, nome: 'Veterano', cpf: '529.982.247-25', dataNascimento: '1950-01-10', sexo: 'MASCULINO', tipoSanguineo: 'A_POSITIVO',
  });
  assert.equal(recepcionista.editarDoador(antigo, { telefone: '11987654321' }, true).telefone, '11987654321');
  assert.throws(() => recepcionista.editarDoador(antigo, { dataNascimento: '1940-01-10' }, true), /RN-11/);
});

test('RN-02: acima de 69 anos o doador não pode doar', () => {
  const veterano = new Doador({
    id: 2, nome: 'Veterano', cpf: '529.982.247-25', dataNascimento: '1950-01-10', sexo: 'MASCULINO', tipoSanguineo: 'A_POSITIVO',
  });
  assert.match(veterano.listarImpedimentos(new Date('2026-11-12T10:00:00'), [new Date('2026-01-01')]).join(' '), /69 anos/);
});

test('RF-14: gestor cadastra usuário do perfil escolhido, com senha temporária', () => {
  const gestor = new Gestor({ ...dados('chefe'), id: 1 });
  const medico = gestor.cadastrarUsuario({
    nome: ' Joana Silva ', cpf: '529.982.247-25', login: 'Joana.Silva', perfil: 'MEDICO', registroProfissional: 'CRM-SP 1',
  });
  assert.ok(medico instanceof Medico);
  assert.equal(medico.login, 'joana.silva');
  assert.equal(medico.getNome(), 'Joana Silva');
  assert.equal(medico.crm, 'CRM-SP 1');

  const temporaria = gestor.redefinirSenha(medico);
  assert.match(temporaria, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.ok(!medico.senhaHash.includes(temporaria));
  assert.equal(medico.precisaTrocarSenha(), true);
  assert.equal(medico.autenticar('joana.silva', temporaria), true);
});

test('RF-14: cadastro de usuário recusa dados inválidos', () => {
  const gestor = new Gestor(dados('chefe2'));
  const base = { nome: 'Ana', cpf: '529.982.247-25', login: 'ana', perfil: 'RECEPCIONISTA' };
  assert.throws(() => gestor.cadastrarUsuario({ ...base, perfil: 'ADMIN' }), /perfil/);
  assert.throws(() => gestor.cadastrarUsuario({ ...base, cpf: '123.456.789-00' }), /CPF/);
  assert.throws(() => gestor.cadastrarUsuario({ ...base, login: 'a b' }), /login/);
  assert.throws(() => gestor.cadastrarUsuario({ ...base, perfil: 'ENFERMEIRO' }), /COREN/);
  assert.ok(gestor.cadastrarUsuario(base) instanceof Recepcionista);
});

test('RF-15: só o próprio usuário define a senha definitiva, confirmando a atual', () => {
  const gestor = new Gestor({ ...dados('chefe3'), id: 1 });
  const recep = new Recepcionista({ ...dados('rec3'), id: 2 });
  const temporaria = gestor.redefinirSenha(recep);
  assert.equal(recep.autenticar('rec3', 'segredo'), false);
  assert.throws(() => recep.trocarSenha('errada', 'minhaSenha1'), /atual está incorreta/);
  assert.throws(() => recep.trocarSenha(temporaria, '123'), /6 caracteres/);
  recep.trocarSenha(temporaria, 'minhaSenha1');
  assert.equal(recep.precisaTrocarSenha(), false);
  assert.equal(recep.autenticar('rec3', 'minhaSenha1'), true);
});

test('RF-14: gestor desativa e reativa contas, mas não a própria', () => {
  const gestor = new Gestor({ ...dados('chefe4'), id: 1 });
  const enf = new Enfermeiro({ ...dados('enf4'), id: 3, coren: 'X' });
  gestor.desativarUsuario(enf);
  assert.equal(enf.estaAtivo(), false);
  gestor.reativarUsuario(enf);
  assert.equal(enf.estaAtivo(), true);
  assert.throws(() => gestor.desativarUsuario(gestor), /própria conta/);
  assert.throws(() => gestor.redefinirSenha(gestor), /própria senha/);
});
