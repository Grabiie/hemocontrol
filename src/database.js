import { createHash } from 'node:crypto';
// SQLite nativo do Node (22.13 ou mais novo): não precisa compilar nada no npm install
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const caminho = process.env.HEMOCONTROL_DB ?? path.join(raiz, 'hemocontrol.db');

export const db = new DatabaseSync(caminho);
db.exec('PRAGMA foreign_keys = ON');

// Executa a função dentro de uma transação: grava tudo ou nada
export function transacao(funcao) {
  return (...args) => {
    db.exec('BEGIN');
    try {
      const resultado = funcao(...args);
      db.exec('COMMIT');
      return resultado;
    } catch (erro) {
      db.exec('ROLLBACK');
      throw erro;
    }
  };
}

db.exec(`
  -- Uma tabela para toda a hierarquia de Usuario; a coluna "perfil" indica a subclasse
  CREATE TABLE IF NOT EXISTS usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    login TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,              -- RNF-02
    perfil TEXT NOT NULL,                  -- RECEPCIONISTA, GESTOR, MEDICO, ENFERMEIRO ou ADMINISTRADOR
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

  -- Sistema externo que envia solicitações (RF-07, RNF-05, RF-18).
  -- chave_acesso guarda só o hash da chave ("sha256:..."), nunca a chave em si.
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

  -- RF-16: registro de atividades. usuario_id fica nulo quando não há usuário logado
  -- (login recusado, solicitação vinda da integração, comando no terminal).
  CREATE TABLE IF NOT EXISTS log_auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_hora TEXT NOT NULL,
    usuario_id INTEGER REFERENCES usuario(id),
    acao TEXT NOT NULL,
    descricao TEXT NOT NULL,
    origem TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS idx_log_data ON log_auditoria(data_hora);

  -- RNF-07: o log só recebe linhas novas; o próprio banco recusa alterar ou apagar
  CREATE TRIGGER IF NOT EXISTS log_sem_alteracao BEFORE UPDATE ON log_auditoria
  BEGIN SELECT RAISE(ABORT, 'O log de atividades não pode ser alterado (RNF-07).'); END;
  CREATE TRIGGER IF NOT EXISTS log_sem_exclusao BEFORE DELETE ON log_auditoria
  BEGIN SELECT RAISE(ABORT, 'O log de atividades não pode ser apagado (RNF-07).'); END;
`);

// Migração: bancos criados antes da coluna "motivos" recebem a coluna nova
const colunasTriagem = db.prepare('PRAGMA table_info(triagem)').all().map((c) => c.name);
if (!colunasTriagem.includes('motivos')) {
  db.exec(`ALTER TABLE triagem ADD COLUMN motivos TEXT NOT NULL DEFAULT '[]'`);
}

// RNF-06: tema preferido do usuário ('claro' ou 'escuro'); nulo enquanto ele não escolher
const colunasUsuario = db.prepare('PRAGMA table_info(usuario)').all().map((c) => c.name);
if (!colunasUsuario.includes('tema')) {
  db.exec('ALTER TABLE usuario ADD COLUMN tema TEXT');
}
// RF-14 e RF-15: conta ativa, senha temporária pendente e registro de quem redefiniu a senha
if (!colunasUsuario.includes('ativo')) {
  db.exec('ALTER TABLE usuario ADD COLUMN ativo INTEGER NOT NULL DEFAULT 1');
}
if (!colunasUsuario.includes('deve_trocar_senha')) {
  db.exec('ALTER TABLE usuario ADD COLUMN deve_trocar_senha INTEGER NOT NULL DEFAULT 0');
}
if (!colunasUsuario.includes('senha_redefinida_em')) {
  db.exec('ALTER TABLE usuario ADD COLUMN senha_redefinida_em TEXT');
  db.exec('ALTER TABLE usuario ADD COLUMN senha_redefinida_por INTEGER REFERENCES usuario(id)');
}

// RF-18: hospital ativo, quando e por quem a chave atual foi gerada
const colunasHospital = db.prepare('PRAGMA table_info(hospital)').all().map((c) => c.name);
if (!colunasHospital.includes('ativo')) {
  db.exec('ALTER TABLE hospital ADD COLUMN ativo INTEGER NOT NULL DEFAULT 1');
  db.exec('ALTER TABLE hospital ADD COLUMN chave_gerada_em TEXT');
  db.exec('ALTER TABLE hospital ADD COLUMN chave_gerada_por INTEGER REFERENCES usuario(id)');
}
// RNF-02 aplicado à chave: bancos antigos guardavam a chave em texto puro; passam a guardar o hash
for (const { id, chave_acesso: chave } of db.prepare("SELECT id, chave_acesso FROM hospital WHERE chave_acesso NOT LIKE 'sha256:%'").all()) {
  db.prepare('UPDATE hospital SET chave_acesso = ? WHERE id = ?')
    .run(`sha256:${createHash('sha256').update(chave).digest('hex')}`, id);
}
// O CNPJ do hospital de demonstração São Lucas estava com o dígito verificador errado
db.prepare("UPDATE hospital SET cnpj = '44555666000181' WHERE cnpj = '44555666000172'").run();

const colunasBolsa = db.prepare('PRAGMA table_info(bolsa_sangue)').all().map((c) => c.name);
if (!colunasBolsa.includes('data_descarte')) {
  db.exec('ALTER TABLE bolsa_sangue ADD COLUMN data_descarte TEXT');
}
// Solicitacao 0..1 — 0..* BolsaSangue: a bolsa entregue guarda a solicitação que a recebeu (RF-08)
if (!colunasBolsa.includes('solicitacao_id')) {
  db.exec('ALTER TABLE bolsa_sangue ADD COLUMN solicitacao_id INTEGER REFERENCES solicitacao(id)');
}
