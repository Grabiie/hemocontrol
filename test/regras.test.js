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

test('RF-03: triagem inapta informa todos os motivos', () => {
  const triagem = new Triagem({
    doador: doador(),
    medicao: { peso: 45, pressaoSistolica: 120, pressaoDiastolica: 80, hemoglobina: 11.0 },
    dataHora: HOJE,
  });
  assert.equal(triagem.avaliar([somarDias(HOJE, -30)]), false);

  const motivos = triagem.getMotivos();
  assert.equal(motivos.length, 3);
  assert.match(motivos.join(' '), /intervalo mínimo/);
  assert.match(motivos.join(' '), /Peso/);
  assert.match(motivos.join(' '), /Hemoglobina/);
});

test('RF-03: motivo do intervalo usa singular e "hoje" corretamente', () => {
  const d = doador();
  assert.match(d.listarImpedimentos(HOJE, [somarDias(HOJE, -1)])[0], /há 1 dia;/);
  assert.match(d.listarImpedimentos(HOJE, [HOJE])[0], /Última doação hoje;/);
  assert.match(d.listarImpedimentos(HOJE, [somarDias(HOJE, -30)])[0], /há 30 dias;/);
});

test('RF-03: triagem apta não tem motivos', () => {
  const triagem = new Triagem({ doador: doador(), medicao: medicaoNormal, dataHora: HOJE });
  assert.equal(triagem.avaliar(), true);
  assert.deepEqual(triagem.getMotivos(), []);
});

test('RN-07: volume máximo é de 8 mL/kg para mulheres e 9 mL/kg para homens', () => {
  const medicao = new MedicaoClinica({ ...medicaoNormal, peso: 52 });
  assert.equal(medicao.calcularVolumeMaximo('FEMININO'), 416);
  assert.equal(medicao.calcularVolumeMaximo('MASCULINO'), 468);
});

test('RN-07: doação recusa volume abaixo de 300 mL ou acima de 495 mL', () => {
  const triagem = new Triagem({ doador: doador(), medicao: { ...medicaoNormal, peso: 80 }, dataHora: HOJE });
  triagem.avaliar();
  assert.throws(() => new Doacao({ triagem, volumeMl: 299 }), /abaixo do mínimo de 300 mL/);
  assert.throws(() => new Doacao({ triagem, volumeMl: 600 }), /máximo permitido para este doador: 495 mL/);
  assert.equal(new Doacao({ triagem, volumeMl: 495 }).volumeMl, 495);
});

test('RN-07: doação recusa volume acima do limite pelo peso do doador', () => {
  const triagem = new Triagem({ doador: doador(), medicao: { ...medicaoNormal, peso: 52 }, dataHora: HOJE });
  triagem.avaliar();
  assert.throws(() => new Doacao({ triagem, volumeMl: 450 }), /máximo permitido para este doador: 416 mL/);
  assert.equal(new Doacao({ triagem, volumeMl: 416 }).volumeMl, 416);
  assert.equal(triagem.toJSON().volumeMaximoMl, 416);
});

test('Telefone é guardado só com dígitos e precisa ter 10 ou 11 dígitos no cadastro', () => {
  assert.equal(doador({ telefone: '(11) 98765-4321' }).telefone, '11987654321');
  assert.equal(doador({ telefone: '(11) 3456-7890' }).telefone, '1134567890');
  assert.equal(doador({ telefone: '' }).telefone, '');
  assert.throws(() => doador({ telefone: '98765-4321' }), /Telefone inválido/);
  // Registros antigos carregados do banco (com id) não são bloqueados
  assert.equal(doador({ id: 7, telefone: '123' }).telefone, '123');
});

test('RN-03: próxima data de doação respeita o intervalo de cada sexo', () => {
  const ultima = somarDias(HOJE, -20);
  assert.equal(doador().calcularProximaDataDoacao([]), null);
  assert.deepEqual(doador().calcularProximaDataDoacao([ultima]), somarDias(ultima, 90));
  assert.deepEqual(doador({ sexo: 'MASCULINO' }).calcularProximaDataDoacao([ultima]), somarDias(ultima, 60));
});

test('RN-03: próxima data de doação espera o limite anual liberar', () => {
  // Mulher com 3 doações em 12 meses: só pode doar quando a mais antiga completar 1 ano
  const datas = [-300, -200, -100].map((d) => somarDias(HOJE, d));
  const proxima = doador().calcularProximaDataDoacao(datas);
  assert.deepEqual(proxima, somarDias(datas[0], 365));
  assert.equal(doador().podeDoarEm(proxima, datas), true);
  assert.equal(doador().podeDoarEm(somarDias(proxima, -1), datas), false);
});
