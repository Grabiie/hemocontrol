import { db } from './database.js';
import { Doador } from './models/Doador.js';
import { Triagem } from './models/Triagem.js';
import { BolsaSangue } from './models/BolsaSangue.js';
import { Estoque } from './models/Estoque.js';
import { Recepcionista } from './models/Recepcionista.js';
import { Gestor } from './models/Gestor.js';
import { Medico } from './models/Medico.js';
import { Enfermeiro } from './models/Enfermeiro.js';
import { gerarHashSenha } from './models/senha.js';

// ---------- Usuário ----------

const CLASSE_POR_PERFIL = {
  [Recepcionista.PERFIL]: Recepcionista,
  [Gestor.PERFIL]: Gestor,
  [Medico.PERFIL]: Medico,
  [Enfermeiro.PERFIL]: Enfermeiro,
};

function linhaParaUsuario(linha) {
  const Classe = CLASSE_POR_PERFIL[linha.perfil];
  if (!Classe) throw new Error(`Perfil desconhecido: ${linha.perfil}`);
  return new Classe({
    id: linha.id,
    nome: linha.nome,
    cpf: linha.cpf,
    login: linha.login,
    senhaHash: linha.senha_hash,
    crm: linha.registro_profissional,
    coren: linha.registro_profissional,
  });
}

export function buscarUsuarioPorLogin(login) {
  const linha = db.prepare('SELECT * FROM usuario WHERE login = ?').get(String(login ?? '').trim());
  return linha ? linhaParaUsuario(linha) : null;
}

export function buscarUsuarioPorId(id) {
  const linha = db.prepare('SELECT * FROM usuario WHERE id = ?').get(id);
  return linha ? linhaParaUsuario(linha) : null;
}

// Contas de demonstração, uma por perfil (criadas só se ainda não existirem)
export const SENHA_DEMO = 'hemo123';
const USUARIOS_DEMO = [
  { nome: 'Rita Recepção', cpf: '11144477735', login: 'recepcao', perfil: Recepcionista.PERFIL },
  { nome: 'Dr. Marcos Lima', cpf: '39053344705', login: 'medico', perfil: Medico.PERFIL, registro: 'CRM-SP 123456' },
  { nome: 'Enf. Paula Reis', cpf: '15350946056', login: 'enfermeiro', perfil: Enfermeiro.PERFIL, registro: 'COREN-SP 654321' },
  { nome: 'Gustavo Gestor', cpf: '28625587887', login: 'gestor', perfil: Gestor.PERFIL },
];

export function garantirUsuariosDemo() {
  const inserir = db.prepare(
    `INSERT OR IGNORE INTO usuario (nome, cpf, login, senha_hash, perfil, registro_profissional)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  let criados = 0;
  for (const u of USUARIOS_DEMO) {
    if (buscarUsuarioPorLogin(u.login)) continue;
    inserir.run(u.nome, u.cpf, u.login, gerarHashSenha(SENHA_DEMO), u.perfil, u.registro ?? null);
    criados++;
  }
  return criados;
}

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
      `INSERT INTO triagem (doador_id, data_hora, apto, peso, pressao_sistolica, pressao_diastolica, hemoglobina, motivos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      triagem.doador.id,
      triagem.dataHora.toISOString(),
      triagem.estaApta() ? 1 : 0,
      m.peso,
      m.pressaoSistolica,
      m.pressaoDiastolica,
      m.hemoglobina,
      JSON.stringify(triagem.getMotivos()),
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
    motivos: JSON.parse(linha.motivos ?? '[]'),
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

export function listarBolsas() {
  return db.prepare('SELECT * FROM bolsa_sangue').all().map(
    (linha) =>
      new BolsaSangue({
        codigo: linha.codigo,
        tipoSanguineo: linha.tipo_sanguineo,
        volumeMl: linha.volume_ml,
        dataColeta: linha.data_coleta,
        status: linha.status,
        dataDescarte: linha.data_descarte,
      }),
  );
}

export function carregarEstoque() {
  const estoque = new Estoque();
  listarBolsas().forEach((bolsa) => estoque.adicionarBolsa(bolsa));
  return estoque;
}

// RF-09: grava o novo status e a data de descarte das bolsas
export const salvarDescartes = db.transaction((bolsas) => {
  const atualizar = db.prepare('UPDATE bolsa_sangue SET status = ?, data_descarte = ? WHERE codigo = ?');
  for (const bolsa of bolsas) {
    atualizar.run(bolsa.status, bolsa.dataDescarte?.toISOString() ?? null, bolsa.codigo);
  }
});

// ---------- Relatório e histórico ----------

// Bolsas com a doação que as originou, para o detalhamento do relatório (RF-10).
// Bolsas sem doação são as do estoque inicial criado pelo seed.
export function listarBolsasComOrigem() {
  return db
    .prepare(
      `SELECT b.*, d.id AS doacao_id_origem
       FROM bolsa_sangue b
       LEFT JOIN doacao d ON d.id = b.doacao_id
       ORDER BY b.data_coleta`,
    )
    .all()
    .map((linha) => ({
      bolsa: new BolsaSangue({
        codigo: linha.codigo,
        tipoSanguineo: linha.tipo_sanguineo,
        volumeMl: linha.volume_ml,
        dataColeta: linha.data_coleta,
        status: linha.status,
        dataDescarte: linha.data_descarte,
      }),
      doacaoId: linha.doacao_id_origem,
    }));
}

// Datas de todas as doações não canceladas (RF-10)
export function datasTodasDoacoes() {
  return db
    .prepare('SELECT data_hora FROM doacao WHERE cancelada = 0')
    .all()
    .map((linha) => new Date(linha.data_hora));
}

// RF-12: doações de um doador, da mais recente para a mais antiga
export function historicoDoacoes(doadorId) {
  return db
    .prepare(
      `SELECT d.id, d.data_hora, d.volume_ml, d.cancelada, b.codigo, b.status, b.data_validade
       FROM doacao d
       JOIN triagem t ON t.id = d.triagem_id
       LEFT JOIN bolsa_sangue b ON b.doacao_id = d.id
       WHERE t.doador_id = ?
       ORDER BY d.data_hora DESC`,
    )
    .all(doadorId)
    .map((linha) => ({
      id: linha.id,
      dataHora: linha.data_hora,
      volumeMl: linha.volume_ml,
      cancelada: linha.cancelada === 1,
      bolsa: linha.codigo ? { codigo: linha.codigo, status: linha.status, dataValidade: linha.data_validade } : null,
    }));
}
