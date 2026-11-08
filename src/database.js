import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const caminho = process.env.HEMOCONTROL_DB ?? path.join(raiz, 'hemocontrol.db');

export const db = new Database(caminho);
db.pragma('foreign_keys = ON');

db.exec(`
  -- Uma tabela para toda a hierarquia de Usuario; a coluna "perfil" indica a subclasse
  CREATE TABLE IF NOT EXISTS usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    login TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,              -- RNF-02
    perfil TEXT NOT NULL,                  -- RECEPCIONISTA, GESTOR, MEDICO ou ENFERMEIRO
    registro_profissional TEXT             -- CRM do médico ou COREN do enfermeiro
  );

  CREATE TABLE IF NOT EXISTS doador (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL UNIQUE,            -- RN-01
    data_nascimento TEXT NOT NULL,
    sexo TEXT NOT NULL,
    tipo_sanguineo TEXT NOT NULL,
    telefone TEXT,
    consentimento_responsavel INTEGER NOT NULL DEFAULT 0
  );

  -- A medição clínica fica na própria tabela da triagem (composição)
  CREATE TABLE IF NOT EXISTS triagem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doador_id INTEGER NOT NULL REFERENCES doador(id),
    data_hora TEXT NOT NULL,
    apto INTEGER NOT NULL,
    peso REAL NOT NULL,
    pressao_sistolica INTEGER NOT NULL,
    pressao_diastolica INTEGER NOT NULL,
    hemoglobina REAL NOT NULL,
    motivos TEXT NOT NULL DEFAULT '[]'    -- motivos da inaptidão, em JSON
  );

  -- RF-11: no máximo uma inaptidão por triagem (Triagem 1 — 0..1 InaptidaoTemporaria)
  CREATE TABLE IF NOT EXISTS inaptidao_temporaria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    triagem_id INTEGER NOT NULL UNIQUE REFERENCES triagem(id),
    medico_id INTEGER NOT NULL REFERENCES usuario(id),
    motivo TEXT NOT NULL,
    data_inicio TEXT NOT NULL,
    data_fim TEXT NOT NULL
  );

  -- Sistema externo que envia solicitações (RF-07, RNF-05)
  CREATE TABLE IF NOT EXISTS hospital (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cnpj TEXT NOT NULL UNIQUE,
    chave_acesso TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS solicitacao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hospital_id INTEGER NOT NULL REFERENCES hospital(id),
    data_solicitacao TEXT NOT NULL,
    tipo_sanguineo TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    status TEXT NOT NULL,
    origem_manual INTEGER NOT NULL DEFAULT 0,
    data_atendimento TEXT
  );

  CREATE TABLE IF NOT EXISTS doacao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    triagem_id INTEGER NOT NULL UNIQUE REFERENCES triagem(id),  -- Triagem 1 — 0..1 Doacao
    data_hora TEXT NOT NULL,
    volume_ml INTEGER NOT NULL,
    cancelada INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS bolsa_sangue (
    codigo TEXT PRIMARY KEY,
    doacao_id INTEGER UNIQUE REFERENCES doacao(id),             -- Doacao 1 — 0..1 BolsaSangue
    tipo_sanguineo TEXT NOT NULL,
    volume_ml INTEGER NOT NULL,
    data_coleta TEXT NOT NULL,
    data_validade TEXT NOT NULL,
    status TEXT NOT NULL,
    data_descarte TEXT                     -- preenchida quando a bolsa é descartada (RF-09)
  );
`);

// Migração: bancos criados antes da coluna "motivos" recebem a coluna nova
const colunasTriagem = db.prepare('PRAGMA table_info(triagem)').all().map((c) => c.name);
if (!colunasTriagem.includes('motivos')) {
  db.exec(`ALTER TABLE triagem ADD COLUMN motivos TEXT NOT NULL DEFAULT '[]'`);
}

const colunasBolsa = db.prepare('PRAGMA table_info(bolsa_sangue)').all().map((c) => c.name);
if (!colunasBolsa.includes('data_descarte')) {
  db.exec('ALTER TABLE bolsa_sangue ADD COLUMN data_descarte TEXT');
}
// Solicitacao 0..1 — 0..* BolsaSangue: a bolsa entregue guarda a solicitação que a recebeu (RF-08)
if (!colunasBolsa.includes('solicitacao_id')) {
  db.exec('ALTER TABLE bolsa_sangue ADD COLUMN solicitacao_id INTEGER REFERENCES solicitacao(id)');
}
