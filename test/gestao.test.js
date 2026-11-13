import { test } from 'node:test';
import assert from 'node:assert/strict';

import { BolsaSangue } from '../src/models/BolsaSangue.js';
import { Estoque } from '../src/models/Estoque.js';
import { Gestor } from '../src/models/Gestor.js';
import { RelatorioMensal } from '../src/models/RelatorioMensal.js';
import { gerarHashSenha } from '../src/models/senha.js';
import { somarDias } from '../src/models/datas.js';

const HOJE = new Date('2026-11-10T10:00:00');
const bolsa = (diasAtras, tipo = 'A_POSITIVO') =>
  new BolsaSangue({ tipoSanguineo: tipo, volumeMl: 450, dataColeta: somarDias(HOJE, -diasAtras) });
const gestor = () => new Gestor({ nome: 'G', cpf: '111', login: 'gestor', senhaHash: gerarHashSenha('x') });

test('RF-09: listarVencidas encontra só as bolsas disponíveis com validade expirada', () => {
  const estoque = new Estoque();
  [bolsa(5), bolsa(36), bolsa(40)].forEach((b) => estoque.adicionarBolsa(b));
  assert.equal(estoque.listarVencidas(HOJE).length, 2);
});

test('RF-09: descartar marca a bolsa como descartada e registra a data', () => {
  const estoque = new Estoque();
  const vencida = bolsa(40);
  estoque.adicionarBolsa(vencida);
  estoque.adicionarBolsa(bolsa(3));

  assert.equal(estoque.descartarVencidas(HOJE).length, 1);
  assert.equal(vencida.status, 'DESCARTADA');
  assert.deepEqual(vencida.dataDescarte, HOJE);
  assert.equal(estoque.listarVencidas(HOJE).length, 0);
  assert.equal(estoque.consultarDisponiveis('A_POSITIVO', HOJE).length, 1);
});

test('RF-09: gestor descarta as vencidas e informa a quantidade', () => {
  const estoque = new Estoque();
  [bolsa(40), bolsa(50, 'O_NEGATIVO'), bolsa(1)].forEach((b) => estoque.adicionarBolsa(b));
  assert.equal(gestor().descartarBolsasVencidas(estoque), 2);
  assert.equal(gestor().descartarBolsasVencidas(estoque), 0);
});

test('RF-10: relatório conta só doações e descartes do mês escolhido', () => {
  const doacoes = [new Date('2026-11-02'), new Date('2026-11-20'), new Date('2026-10-30')];
  const descartadaNov = bolsa(40); descartadaNov.descartar(new Date('2026-11-05T12:00:00'));
  const descartadaOut = bolsa(40); descartadaOut.descartar(new Date('2026-10-15T12:00:00'));

  const relatorio = gestor().gerarRelatorioMensal(11, 2026);
  relatorio.calcularTotais(doacoes, [descartadaNov, descartadaOut, bolsa(1)]);

  assert.equal(relatorio.totalDoacoes, 2);
  assert.equal(relatorio.totalBolsasDescartadas, 1);
  assert.equal(relatorio.totalSolicitacoesAtendidas, 0);
});

test('RF-10: relatório rejeita mês inválido', () => {
  assert.throws(() => new RelatorioMensal({ mes: 13, ano: 2026 }), /Mês inválido/);
});

test('RF-05: lista as bolsas que vencem nos próximos 7 dias, da validade mais próxima para a mais distante', () => {
  const estoque = new Estoque();
  const venceEm2 = bolsa(33);
  const venceEm6 = bolsa(29);
  [bolsa(5), venceEm6, bolsa(40), venceEm2, bolsa(27)].forEach((b) => estoque.adicionarBolsa(b));

  assert.equal(Estoque.DIAS_ALERTA_VENCIMENTO, 7);
  assert.deepEqual(estoque.listarProximasDoVencimento(HOJE).map((b) => b.codigo), [venceEm2.codigo, venceEm6.codigo]);

  venceEm2.marcarEntregue(HOJE); // data fixa: o teste não pode depender do dia em que roda
  assert.equal(estoque.listarProximasDoVencimento(HOJE).length, 1);
});
