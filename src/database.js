import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const caminho = process.env.HEMOCONTROL_DB ?? path.join(raiz, 'hemocontrol.db');

export const db = new Database(caminho);
db.pragma('foreign_keys = ON');

db.exec(`
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
    hemoglobina REAL NOT NULL
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
    status TEXT NOT NULL
  );
`);
