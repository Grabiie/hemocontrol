import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Usuario } from '../src/models/Usuario.js';
import { ProfissionalDeSaude } from '../src/models/ProfissionalDeSaude.js';
import { Recepcionista } from '../src/models/Recepcionista.js';
import { Medico } from '../src/models/Medico.js';
import { Enfermeiro } from '../src/models/Enfermeiro.js';
import { Gestor } from '../src/models/Gestor.js';
import { gerarHashSenha, conferirSenha } from '../src/models/senha.js';

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
