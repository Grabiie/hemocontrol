import { db } from './database.js';
import { Doador } from './models/Doador.js';
import { Triagem } from './models/Triagem.js';
import { BolsaSangue } from './models/BolsaSangue.js';
import { Estoque } from './models/Estoque.js';

// ---------- Doador ----------

function linhaParaDoador(linha) {
  return new Doador({
    id: linha.id,
    nome: linha.nome,
    cpf: linha.cpf,
    dataNascimento: linha.data_nascimento,
    sexo: linha.sexo,
    tipoSanguineo: linha.tipo_sanguineo,
    telefone: linha.telefone,
    consentimentoResponsavel: linha.consentimento_responsavel === 1,
  });
}

export function salvarDoador(doador) {
  try {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO doador (nome, cpf, data_nascimento, sexo, tipo_sanguineo, telefone, consentimento_responsavel)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        doador.nome,
        doador.cpf,
        doador.dataNascimento.toISOString().slice(0, 10),
        doador.sexo,
        doador.tipoSanguineo,
        doador.telefone,
        doador.consentimentoResponsavel ? 1 : 0,
      );
    return buscarDoadorPorId(Number(lastInsertRowid));
  } catch (erro) {
    if (erro.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Já existe um doador cadastrado com este CPF (RN-01).');
    }
    throw erro;
  }
}

export function buscarDoadorPorId(id) {
  const linha = db.prepare('SELECT * FROM doador WHERE id = ?').get(id);
  return linha ? linhaParaDoador(linha) : null;
}

export function buscarDoadorPorCpf(cpf) {
  const linha = db.prepare('SELECT * FROM doador WHERE cpf = ?').get(String(cpf).replace(/\D/g, ''));
  return linha ? linhaParaDoador(linha) : null;
}

// Datas das doações não canceladas do doador (usadas na RN-03)
export function datasDoacoesDoDoador(doadorId) {
  return db
    .prepare(
      `SELECT d.data_hora FROM doacao d
       JOIN triagem t ON t.id = d.triagem_id
       WHERE t.doador_id = ? AND d.cancelada = 0`,
    )
    .all(doadorId)
    .map((linha) => new Date(linha.data_hora));
}

// ---------- Triagem ----------

export function salvarTriagem(triagem) {
  const m = triagem.medicao;
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO triagem (doador_id, data_hora, apto, peso, pressao_sistolica, pressao_diastolica, hemoglobina)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      triagem.doador.id,
      triagem.dataHora.toISOString(),
      triagem.estaApta() ? 1 : 0,
      m.peso,
      m.pressaoSistolica,
      m.pressaoDiastolica,
      m.hemoglobina,
    );
  return buscarTriagem(Number(lastInsertRowid));
}

export function buscarTriagem(id) {
  const linha = db.prepare('SELECT * FROM triagem WHERE id = ?').get(id);
  if (!linha) return null;

  return new Triagem({
    id: linha.id,
    doador: buscarDoadorPorId(linha.doador_id),
    dataHora: linha.data_hora,
    apto: linha.apto === 1,
    medicao: {
      peso: linha.peso,
      pressaoSistolica: linha.pressao_sistolica,
      pressaoDiastolica: linha.pressao_diastolica,
      hemoglobina: linha.hemoglobina,
    },
  });
}

export function triagemJaPossuiDoacao(triagemId) {
  return Boolean(db.prepare('SELECT 1 FROM doacao WHERE triagem_id = ?').get(triagemId));
}

// ---------- Doação e bolsa ----------

function inserirBolsa(bolsa, doacaoId = null) {
  db.prepare(
    `INSERT INTO bolsa_sangue (codigo, doacao_id, tipo_sanguineo, volume_ml, data_coleta, data_validade, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    bolsa.codigo,
    doacaoId,
    bolsa.tipoSanguineo,
    bolsa.volumeMl,
    bolsa.dataColeta.toISOString(),
    bolsa.dataValidade.toISOString(),
    bolsa.status,
  );
}

// Salva a doação e a bolsa gerada numa única transação
export const salvarDoacaoComBolsa = db.transaction((doacao, bolsa) => {
  const { lastInsertRowid } = db
    .prepare('INSERT INTO doacao (triagem_id, data_hora, volume_ml, cancelada) VALUES (?, ?, ?, ?)')
    .run(doacao.triagem.id, doacao.dataHora.toISOString(), doacao.volumeMl, doacao.cancelada ? 1 : 0);

  if (bolsa) inserirBolsa(bolsa, Number(lastInsertRowid));
  return Number(lastInsertRowid);
});

// Usado apenas pelo script de dados de exemplo
export function salvarBolsaAvulsa(bolsa) {
  inserirBolsa(bolsa);
}

// ---------- Estoque ----------

export function carregarEstoque() {
  const estoque = new Estoque();
  db.prepare('SELECT * FROM bolsa_sangue').all().forEach((linha) => {
    estoque.adicionarBolsa(
      new BolsaSangue({
        codigo: linha.codigo,
        tipoSanguineo: linha.tipo_sanguineo,
        volumeMl: linha.volume_ml,
        dataColeta: linha.data_coleta,
        status: linha.status,
      }),
    );
  });
  return estoque;
}
