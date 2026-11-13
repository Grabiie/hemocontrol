import { db, transacao } from './database.js';
import { formatarDataISO } from './models/datas.js';
import { Doador } from './models/Doador.js';
import { Triagem } from './models/Triagem.js';
import { BolsaSangue } from './models/BolsaSangue.js';
import { Estoque } from './models/Estoque.js';
import { Recepcionista } from './models/Recepcionista.js';
import { Gestor } from './models/Gestor.js';
import { Medico } from './models/Medico.js';
import { Enfermeiro } from './models/Enfermeiro.js';
import { gerarHashSenha } from './models/senha.js';
import { InaptidaoTemporaria } from './models/InaptidaoTemporaria.js';
import { Hospital } from './models/Hospital.js';
import { Solicitacao } from './models/Solicitacao.js';

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

// RNF-06: preferência de tema do usuário. É uma configuração da interface,
// por isso fica só no banco e não faz parte da classe Usuario do domínio.
export function buscarTemaUsuario(id) {
  return db.prepare('SELECT tema FROM usuario WHERE id = ?').get(id)?.tema ?? null;
}

export function salvarTemaUsuario(id, tema) {
  db.prepare('UPDATE usuario SET tema = ? WHERE id = ?').run(tema, id);
}

// Contas de demonstração, uma por perfil (criadas só se ainda não existirem)
export const SENHA_DEMO = 'hemo123';
// O perfil já aparece ao lado do nome na tela, então o nome não repete o cargo.
// "nomeAntigo" renomeia as contas criadas por versões anteriores do seed.
const USUARIOS_DEMO = [
  { nome: 'Rita Souza', nomeAntigo: 'Rita Recepção', cpf: '11144477735', login: 'recepcao', perfil: Recepcionista.PERFIL },
  { nome: 'Marcos Lima', nomeAntigo: 'Dr. Marcos Lima', cpf: '39053344705', login: 'medico', perfil: Medico.PERFIL, registro: 'CRM-SP 123456' },
  { nome: 'Paula Reis', nomeAntigo: 'Enf. Paula Reis', cpf: '15350946056', login: 'enfermeiro', perfil: Enfermeiro.PERFIL, registro: 'COREN-SP 654321' },
  { nome: 'Gustavo Almeida', nomeAntigo: 'Gustavo Gestor', cpf: '28625587887', login: 'gestor', perfil: Gestor.PERFIL },
];

export function garantirUsuariosDemo() {
  const inserir = db.prepare(
    `INSERT OR IGNORE INTO usuario (nome, cpf, login, senha_hash, perfil, registro_profissional)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const renomear = db.prepare('UPDATE usuario SET nome = ? WHERE login = ? AND nome = ?');
  let criados = 0;
  for (const u of USUARIOS_DEMO) {
    renomear.run(u.nome, u.login, u.nomeAntigo);
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
        formatarDataISO(doador.dataNascimento),
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

// RF-13: atualiza os dados cadastrais (o CPF não muda)
export function atualizarDoador(doador) {
  db.prepare(
    `UPDATE doador SET nome = ?, data_nascimento = ?, sexo = ?, tipo_sanguineo = ?, telefone = ?, consentimento_responsavel = ?
     WHERE id = ?`,
  ).run(
    doador.nome,
    formatarDataISO(doador.dataNascimento),
    doador.sexo,
    doador.tipoSanguineo,
    doador.telefone,
    doador.consentimentoResponsavel ? 1 : 0,
    doador.id,
  );
  return buscarDoadorPorId(doador.id);
}

// RF-13: busca por parte do nome (sem diferenciar acentos e maiúsculas) ou do CPF
const semAcento = (texto) => String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function buscarDoadores(texto, limite = 20) {
  const termo = String(texto ?? '').trim();
  if (termo.length < 2) return [];
  const digitos = termo.replace(/\D/g, '');
  const buscaPorCpf = digitos.length >= 3 && /^[\d.\-\s]+$/.test(termo);

  return db
    .prepare('SELECT * FROM doador ORDER BY nome')
    .all()
    .filter((linha) => (buscaPorCpf ? linha.cpf.includes(digitos) : semAcento(linha.nome).includes(semAcento(termo))))
    .slice(0, limite)
    .map(linhaParaDoador);
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

// Triagens do doador feitas no mesmo dia, da mais recente para a mais antiga (RN-09 e RN-10)
export function triagensDoDoadorNoDia(doadorId, data = new Date()) {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);
  return db
    .prepare(
      `SELECT id FROM triagem WHERE doador_id = ? AND data_hora >= ? AND data_hora < ?
       ORDER BY data_hora DESC, id DESC`,
    )
    .all(doadorId, inicio.toISOString(), fim.toISOString())
    .map((linha) => buscarTriagem(linha.id));
}

// Triagem apta de hoje que ainda não virou doação (RN-05 e RN-09)
export function triagemAptaPendente(doadorId) {
  return triagensDoDoadorNoDia(doadorId)
    .find((t) => t.estaApta() && !triagemJaPossuiDoacao(t.id)) ?? null;
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
export const salvarDoacaoComBolsa = transacao((doacao, bolsa) => {
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

function linhaParaBolsa(linha) {
  return new BolsaSangue({
    codigo: linha.codigo,
    tipoSanguineo: linha.tipo_sanguineo,
    volumeMl: linha.volume_ml,
    dataColeta: linha.data_coleta,
    status: linha.status,
    dataDescarte: linha.data_descarte,
  });
}

export function listarBolsas() {
  return db.prepare('SELECT * FROM bolsa_sangue').all().map(linhaParaBolsa);
}

export function carregarEstoque() {
  const estoque = new Estoque();
  listarBolsas().forEach((bolsa) => estoque.adicionarBolsa(bolsa));
  return estoque;
}

// RF-09: grava o novo status e a data de descarte das bolsas
export const salvarDescartes = transacao((bolsas) => {
  const atualizar = db.prepare('UPDATE bolsa_sangue SET status = ?, data_descarte = ? WHERE codigo = ?');
  for (const bolsa of bolsas) {
    atualizar.run(bolsa.status, bolsa.dataDescarte?.toISOString() ?? null, bolsa.codigo);
  }
});

// ---------- Relatório e histórico ----------

// Bolsas com a doação que as originou, para o detalhamento do relatório (RF-10).
// Bolsas sem doação são as do estoque inicial criado pelo seed.
// Também traz o hospital que recebeu cada bolsa entregue (RF-08).
export function listarBolsasComOrigem() {
  return db
    .prepare(
      `SELECT b.*, d.id AS doacao_id_origem, h.nome AS hospital_destino, s.id AS solicitacao_destino
       FROM bolsa_sangue b
       LEFT JOIN doacao d ON d.id = b.doacao_id
       LEFT JOIN solicitacao s ON s.id = b.solicitacao_id
       LEFT JOIN hospital h ON h.id = s.hospital_id
       ORDER BY b.data_coleta`,
    )
    .all()
    .map((linha) => ({
      bolsa: linhaParaBolsa(linha),
      doacaoId: linha.doacao_id_origem,
      destino: linha.hospital_destino ? `${linha.hospital_destino} (solicitação nº ${linha.solicitacao_destino})` : null,
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

// ---------- Inaptidão temporária (RF-11) ----------

export function triagemJaPossuiInaptidao(triagemId) {
  return Boolean(db.prepare('SELECT 1 FROM inaptidao_temporaria WHERE triagem_id = ?').get(triagemId));
}

export function salvarInaptidao(inaptidao, triagemId, medicoId) {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO inaptidao_temporaria (triagem_id, medico_id, motivo, data_inicio, data_fim)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(triagemId, medicoId, inaptidao.motivo, inaptidao.dataInicio.toISOString(), inaptidao.dataFim.toISOString());
  return Number(lastInsertRowid);
}

export function inaptidoesDoDoador(doadorId) {
  return db
    .prepare(
      `SELECT i.* FROM inaptidao_temporaria i
       JOIN triagem t ON t.id = i.triagem_id
       WHERE t.doador_id = ?
       ORDER BY i.data_fim DESC`,
    )
    .all(doadorId)
    .map((linha) => new InaptidaoTemporaria({
      id: linha.id, motivo: linha.motivo, dataInicio: linha.data_inicio, dataFim: linha.data_fim,
    }));
}

// ---------- Hospitais e solicitações (RF-07, RF-08, RNF-05) ----------

function linhaParaHospital(linha) {
  return new Hospital({ id: linha.id, nome: linha.nome, cnpj: linha.cnpj, chaveAcesso: linha.chave_acesso });
}

export function listarHospitais() {
  return db.prepare('SELECT * FROM hospital ORDER BY nome').all().map(linhaParaHospital);
}

export function buscarHospitalPorId(id) {
  const linha = db.prepare('SELECT * FROM hospital WHERE id = ?').get(id);
  return linha ? linhaParaHospital(linha) : null;
}

// RNF-05: encontra o hospital dono da chave, comparando com validarChave()
export function buscarHospitalPorChave(chave) {
  return listarHospitais().find((h) => h.validarChave(chave)) ?? null;
}

// Hospitais de demonstração, com as chaves usadas na integração
export const HOSPITAIS_DEMO = [
  { nome: 'Hospital Santa Clara', cnpj: '11222333000181', chaveAcesso: 'hsc-demo-7f3a9c' },
  { nome: 'Hospital São Lucas', cnpj: '44555666000172', chaveAcesso: 'hsl-demo-2b8e4d' },
];

export function garantirHospitaisDemo() {
  const inserir = db.prepare('INSERT OR IGNORE INTO hospital (nome, cnpj, chave_acesso) VALUES (?, ?, ?)');
  let criados = 0;
  for (const h of HOSPITAIS_DEMO) criados += inserir.run(h.nome, h.cnpj, h.chaveAcesso).changes;
  return criados;
}

function linhaParaSolicitacao(linha) {
  const bolsas = db.prepare('SELECT * FROM bolsa_sangue WHERE solicitacao_id = ?').all(linha.id).map(linhaParaBolsa);
  return new Solicitacao({
    id: linha.id,
    hospital: buscarHospitalPorId(linha.hospital_id),
    tipoSanguineo: linha.tipo_sanguineo,
    quantidade: linha.quantidade,
    dataSolicitacao: linha.data_solicitacao,
    status: linha.status,
    origemManual: linha.origem_manual === 1,
    dataAtendimento: linha.data_atendimento,
    bolsas,
  });
}

export function salvarSolicitacao(solicitacao) {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO solicitacao (hospital_id, data_solicitacao, tipo_sanguineo, quantidade, status, origem_manual)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      solicitacao.hospital.id,
      solicitacao.dataSolicitacao.toISOString(),
      solicitacao.tipoSanguineo,
      solicitacao.quantidade,
      solicitacao.status,
      solicitacao.origemManual ? 1 : 0,
    );
  return buscarSolicitacao(Number(lastInsertRowid));
}

export function buscarSolicitacao(id) {
  const linha = db.prepare('SELECT * FROM solicitacao WHERE id = ?').get(id);
  return linha ? linhaParaSolicitacao(linha) : null;
}

// Pendentes primeiro, depois as mais recentes
export function listarSolicitacoes() {
  return db
    .prepare(`SELECT * FROM solicitacao ORDER BY status = 'PENDENTE' DESC, data_solicitacao DESC`)
    .all()
    .map(linhaParaSolicitacao);
}

// RF-08: grava o atendimento e marca as bolsas como entregues a esta solicitação
export const salvarAtendimento = transacao((solicitacao) => {
  db.prepare('UPDATE solicitacao SET status = ?, data_atendimento = ? WHERE id = ?')
    .run(solicitacao.status, solicitacao.dataAtendimento.toISOString(), solicitacao.id);
  const atualizar = db.prepare('UPDATE bolsa_sangue SET status = ?, solicitacao_id = ? WHERE codigo = ?');
  for (const bolsa of solicitacao.bolsas) atualizar.run(bolsa.status, solicitacao.id, bolsa.codigo);
});

// Datas de atendimento das solicitações (RF-10)
export function datasAtendimentos() {
  return db
    .prepare('SELECT data_atendimento FROM solicitacao WHERE data_atendimento IS NOT NULL')
    .all()
    .map((linha) => new Date(linha.data_atendimento));
}
