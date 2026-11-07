import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Doador } from '../src/models/Doador.js';
import { MedicaoClinica } from '../src/models/MedicaoClinica.js';
import { Triagem } from '../src/models/Triagem.js';
import { Doacao } from '../src/models/Doacao.js';
import { BolsaSangue } from '../src/models/BolsaSangue.js';
import { Estoque } from '../src/models/Estoque.js';
import { somarDias } from '../src/models/datas.js';

const HOJE = new Date('2026-11-10T10:00:00');

function doador(dados = {}) {
  return new Doador({
    nome: 'Maria Silva',
    cpf: '529.982.247-25',
    dataNascimento: '1995-04-12',
    sexo: 'FEMININO',
    tipoSanguineo: 'O_NEGATIVO',
    ...dados,
  });
}

const medicaoNormal = { peso: 62, pressaoSistolica: 120, pressaoDiastolica: 80, hemoglobina: 13.5 };

test('RN-01: rejeita CPF com dígitos verificadores inválidos', () => {
  assert.throws(() => doador({ cpf: '123.456.789-00' }), /CPF inválido/);
});

test('RN-02: menor de 16 anos não pode doar', () => {
  assert.equal(doador({ dataNascimento: '2011-01-01' }).podeDoarEm(HOJE), false);
});

test('RN-02: 16 e 17 anos só doam com consentimento do responsável', () => {
  assert.equal(doador({ dataNascimento: '2009-06-01' }).podeDoarEm(HOJE), false);
  assert.equal(doador({ dataNascimento: '2009-06-01', consentimentoResponsavel: true }).podeDoarEm(HOJE), true);
});

test('RN-02: primeira doação só até 60 anos', () => {
  const idoso = doador({ dataNascimento: '1960-01-01' });
  assert.equal(idoso.podeDoarEm(HOJE, []), false);
  assert.equal(idoso.podeDoarEm(HOJE, [somarDias(HOJE, -200)]), true);
});

test('RN-03: respeita intervalo de 90 dias para mulheres e 60 para homens', () => {
  const ha70dias = [somarDias(HOJE, -70)];
  assert.equal(doador().podeDoarEm(HOJE, ha70dias), false);
  assert.equal(doador({ sexo: 'MASCULINO' }).podeDoarEm(HOJE, ha70dias), true);
});

test('RN-03: respeita o limite anual de doações', () => {
  const tresNoAno = [-100, -200, -300].map((d) => somarDias(HOJE, d));
  assert.equal(doador().podeDoarEm(HOJE, tresNoAno), false);
});

test('RN-06: hemoglobina fora da faixa torna o doador inapto', () => {
  const baixa = new MedicaoClinica({ ...medicaoNormal, hemoglobina: 11.9 });
  assert.equal(baixa.estaDentroDosLimites('FEMININO'), false);
  assert.equal(new MedicaoClinica(medicaoNormal).estaDentroDosLimites('FEMININO'), true);
});

test('RN-02/RN-06: peso abaixo de 50 kg torna o doador inapto', () => {
  const leve = new MedicaoClinica({ ...medicaoNormal, peso: 48 });
  assert.equal(leve.estaDentroDosLimites('FEMININO'), false);
});

test('RN-05: doação exige triagem apta', () => {
  const inapta = new Triagem({ doador: doador(), medicao: { ...medicaoNormal, peso: 45 }, dataHora: HOJE });
  inapta.avaliar();
  assert.throws(() => new Doacao({ triagem: inapta, volumeMl: 450 }), /RN-05/);
});

test('RF-04/RN-04: doação gera bolsa do tipo do doador, válida por 35 dias', () => {
  const triagem = new Triagem({ doador: doador(), medicao: medicaoNormal, dataHora: HOJE });
  assert.equal(triagem.avaliar(), true);

  const bolsa = new Doacao({ triagem, volumeMl: 450, dataHora: HOJE }).gerarBolsa();
  assert.equal(bolsa.tipoSanguineo, 'O_NEGATIVO');
  assert.deepEqual(bolsa.dataValidade, somarDias(HOJE, BolsaSangue.VALIDADE_DIAS));
});

test('RF-06: estoque é crítico abaixo de 10 bolsas e ignora vencidas', () => {
  const estoque = new Estoque();
  for (let i = 0; i < 10; i++) {
    estoque.adicionarBolsa(new BolsaSangue({ tipoSanguineo: 'A_POSITIVO', volumeMl: 450, dataColeta: HOJE }));
  }
  assert.equal(estoque.estaCritico('A_POSITIVO', HOJE), false);

  estoque.adicionarBolsa(new BolsaSangue({ tipoSanguineo: 'B_NEGATIVO', volumeMl: 450, dataColeta: somarDias(HOJE, -40) }));
  assert.equal(estoque.consultarDisponiveis('B_NEGATIVO', HOJE).length, 0);
  assert.equal(estoque.descartarVencidas(HOJE).length, 1);
});
