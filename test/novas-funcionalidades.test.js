import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Doador } from '../src/models/Doador.js';
import { Triagem } from '../src/models/Triagem.js';
import { Medico } from '../src/models/Medico.js';
import { Enfermeiro } from '../src/models/Enfermeiro.js';
import { InaptidaoTemporaria } from '../src/models/InaptidaoTemporaria.js';
import { BolsaSangue } from '../src/models/BolsaSangue.js';
import { Estoque } from '../src/models/Estoque.js';
import { Hospital } from '../src/models/Hospital.js';
import { Solicitacao } from '../src/models/Solicitacao.js';
import { Gestor } from '../src/models/Gestor.js';
import { gerarHashSenha } from '../src/models/senha.js';
import { somarDias } from '../src/models/datas.js';

const HOJE = new Date('2026-11-10T10:00:00');
const dadosUsuario = (login) => ({ nome: 'X', cpf: '1', login, senhaHash: gerarHashSenha('x') });
const medico = new Medico({ ...dadosUsuario('medico'), crm: 'CRM 1' });
const enfermeiro = new Enfermeiro({ ...dadosUsuario('enf'), coren: 'COREN 1' });
const gestor = new Gestor(dadosUsuario('gestor'));

const doador = () => new Doador({
  nome: 'Maria', cpf: '529.982.247-25', dataNascimento: '1995-04-12', sexo: 'FEMININO', tipoSanguineo: 'O_NEGATIVO',
});
const medicaoNormal = { peso: 62, pressaoSistolica: 120, pressaoDiastolica: 80, hemoglobina: 13.5 };
const triagem = (medicao = medicaoNormal, dataHora = HOJE) => new Triagem({ doador: doador(), medicao, dataHora });

// ---------- RF-11: inaptidão temporária ----------

test('RF-11: médico registra inaptidão só para triagem inapta', () => {
  const inapta = triagem({ ...medicaoNormal, hemoglobina: 11 });
  inapta.avaliar();
  const inaptidao = medico.registrarInaptidao(inapta, 'Anemia leve', 30);
  assert.equal(inaptidao.motivo, 'Anemia leve');
  assert.equal(inaptidao.estaVigente(somarDias(new Date(), 29)), true);
  assert.equal(inaptidao.estaVigente(somarDias(new Date(), 31)), false);

  const apta = triagem();
  apta.avaliar();
  assert.throws(() => medico.registrarInaptidao(apta, 'x', 30), /resultado "inapto"/);
});

test('RF-11: inaptidão exige motivo e prazo válido', () => {
  assert.throws(() => new InaptidaoTemporaria({ motivo: '  ', prazoDias: 10 }), /motivo/);
  assert.throws(() => new InaptidaoTemporaria({ motivo: 'x', prazoDias: 0 }), /prazo/);
  assert.throws(() => new InaptidaoTemporaria({ motivo: 'x', prazoDias: 400 }), /prazo/);
});

test('RF-11: triagem considera a inaptidão vigente e ignora a vencida', () => {
  const vigente = new InaptidaoTemporaria({ motivo: 'Gripe', dataInicio: somarDias(HOJE, -5), prazoDias: 15 });
  const vencida = new InaptidaoTemporaria({ motivo: 'Tatuagem', dataInicio: somarDias(HOJE, -400), prazoDias: 365 });

  const t1 = triagem();
  assert.equal(t1.avaliar([], [vigente, vencida]), false);
  assert.match(t1.getMotivos()[0], /Inaptidão temporária até .*Gripe/);
  assert.equal(t1.getMotivos().length, 1);

  const t2 = triagem();
  assert.equal(t2.avaliar([], [vencida]), true);
});

// ---------- Cancelamento de doação (fluxo 3a) ----------

test('Coleta interrompida: doação cancelada não gera bolsa e aceita volume abaixo do mínimo', () => {
  const t = triagem(medicaoNormal, new Date()); // RN-09: a coleta é no mesmo dia da triagem
  t.avaliar();
  const doacao = enfermeiro.registrarDoacao(t, 120, true);
  assert.equal(doacao.cancelada, true);
  assert.equal(doacao.gerarBolsa(), null);
  assert.equal(enfermeiro.registrarDoacao(t, 0, true).cancelada, true);
});

test('Coleta normal continua exigindo a RN-07', () => {
  const t = triagem(medicaoNormal, new Date());
  t.avaliar();
  assert.throws(() => enfermeiro.registrarDoacao(t, 120, false), /RN-07/);
  assert.throws(() => enfermeiro.registrarDoacao(t, 600, true), /RN-07/);
});

// ---------- RF-07, RF-08 e RNF-05: solicitações ----------

const hospital = new Hospital({ id: 1, nome: 'Hospital Teste', cnpj: '11.222.333/0001-81', chaveHash: Hospital.hashDaChave('chave-secreta') });
const bolsa = (diasAtras, tipo = 'O_NEGATIVO') =>
  new BolsaSangue({ tipoSanguineo: tipo, volumeMl: 450, dataColeta: somarDias(new Date(), -diasAtras) });

test('RNF-05: hospital valida a chave de acesso', () => {
  assert.equal(hospital.validarChave('chave-secreta'), true);
  assert.equal(hospital.validarChave('chave-errada'), false);
  assert.equal(hospital.validarChave(undefined), false);
});

test('RF-07: solicitação exige quantidade válida', () => {
  assert.throws(() => new Solicitacao({ hospital, tipoSanguineo: 'O_NEGATIVO', quantidade: 0 }), /quantidade/);
  assert.throws(() => new Solicitacao({ hospital, tipoSanguineo: 'X', quantidade: 2 }), /tipo sanguíneo/);
  assert.throws(() => gestor.registrarSolicitacao(new Solicitacao({ hospital, tipoSanguineo: 'O_NEGATIVO', quantidade: 2 })), /manuais/);
});

test('RF-08: atende priorizando a validade mais próxima, só do tipo pedido e sem vencidas', () => {
  const estoque = new Estoque();
  const maisAntiga = bolsa(30);
  const intermediaria = bolsa(20);
  const maisNova = bolsa(2);
  [maisNova, bolsa(40), maisAntiga, bolsa(25, 'A_POSITIVO'), intermediaria].forEach((b) => estoque.adicionarBolsa(b));

  const s = new Solicitacao({ hospital, tipoSanguineo: 'O_NEGATIVO', quantidade: 2 });
  assert.equal(gestor.atenderSolicitacao(s, estoque, false), true);
  assert.deepEqual(s.bolsas.map((b) => b.codigo), [maisAntiga.codigo, intermediaria.codigo]);
  assert.equal(s.status, 'ATENDIDA');
  assert.equal(maisAntiga.status, 'ENTREGUE');
  assert.equal(maisNova.status, 'DISPONIVEL');
  assert.ok(s.dataAtendimento instanceof Date);
  assert.throws(() => s.atender(estoque, false), /já foi atendida/);
});

test('RF-08: estoque insuficiente só atende se o gestor aceitar o parcial', () => {
  const estoque = new Estoque();
  estoque.adicionarBolsa(bolsa(5));
  const s = new Solicitacao({ hospital, tipoSanguineo: 'O_NEGATIVO', quantidade: 3 });

  assert.equal(s.atender(estoque, false), false);
  assert.equal(s.status, 'PENDENTE');
  assert.equal(s.atender(estoque, true), true);
  assert.equal(s.status, 'ATENDIDA_PARCIALMENTE');
  assert.equal(s.getQuantidadeAtendida(), 1);
});

test('RF-08: sem bolsas do tipo, a solicitação continua pendente', () => {
  const s = new Solicitacao({ hospital, tipoSanguineo: 'AB_NEGATIVO', quantidade: 1 });
  assert.equal(s.atender(new Estoque(), true), false);
  assert.equal(s.status, 'PENDENTE');
});

test('RF-10: relatório conta as solicitações atendidas no mês', () => {
  const relatorio = gestor.gerarRelatorioMensal(11, 2026);
  relatorio.calcularTotais([], [], [new Date('2026-11-03'), new Date('2026-10-28'), new Date('2026-11-20')]);
  assert.equal(relatorio.totalSolicitacoesAtendidas, 2);
});
