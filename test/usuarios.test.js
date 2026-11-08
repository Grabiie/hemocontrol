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
