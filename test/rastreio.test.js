import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Gestor } from '../src/models/Gestor.js';
import { BolsaSangue } from '../src/models/BolsaSangue.js';
import { gerarHashSenha } from '../src/models/senha.js';

const gestor = new Gestor({ id: 1, nome: 'Gestor', cpf: '11144477735', login: 'g', senhaHash: gerarHashSenha('segredo') });

test('RF-17: números são o nº da doação; HC- seguido de 8 caracteres é o código da bolsa', () => {
  assert.deepEqual(gestor.rastrear(' 12 '), { doacaoId: 12, codigo: null });
  assert.deepEqual(gestor.rastrear('hc-1a2b3c4d'), { doacaoId: null, codigo: 'HC-1A2B3C4D' });
  assert.deepEqual(gestor.rastrear('1A2B3C4D'), { doacaoId: null, codigo: 'HC-1A2B3C4D' });
  // 8 dígitos podem ser os dois: procura a doação e, se não achar, a bolsa
  assert.deepEqual(gestor.rastrear('12345678'), { doacaoId: 12345678, codigo: 'HC-12345678' });
  assert.throws(() => gestor.rastrear(''), /Informe/);
  assert.throws(() => gestor.rastrear('HC-123'), /código da bolsa/);
  assert.throws(() => gestor.rastrear('abc'), /código da bolsa/);
});

test('RF-17: bolsa disponível fora da validade aparece como vencida até o descarte', () => {
  const coleta = new Date(2026, 0, 1);
  const bolsa = new BolsaSangue({ tipoSanguineo: 'O_NEGATIVO', volumeMl: 450, dataColeta: coleta });
  assert.equal(bolsa.situacao(new Date(2026, 0, 10)), 'DISPONIVEL');
  assert.equal(bolsa.situacao(new Date(2026, 2, 1)), 'VENCIDA');
  bolsa.descartar(new Date(2026, 2, 1));
  assert.equal(bolsa.situacao(new Date(2026, 2, 1)), 'DESCARTADA');
});

test('RF-17: encontra a bolsa pelo código, mesmo sem doação (estoque inicial)', async () => {
  process.env.HEMOCONTROL_DB = path.join(mkdtempSync(path.join(tmpdir(), 'hemo-')), 'teste.db');
  const repo = await import('../src/repositorios.js');
  const bolsa = new BolsaSangue({ tipoSanguineo: 'A_POSITIVO', volumeMl: 450 });
  repo.salvarBolsaAvulsa(bolsa);
  const achado = repo.rastrearDoacaoOuBolsa({ codigo: bolsa.codigo });
  assert.equal(achado.bolsa.codigo, bolsa.codigo);
  assert.equal(achado.doacao, null);
  assert.equal(repo.rastrearDoacaoOuBolsa({ doacaoId: 999 }), null);
  assert.equal(repo.rastrearDoacaoOuBolsa({ codigo: 'HC-00000000' }), null);
});
