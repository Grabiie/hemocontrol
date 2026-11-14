import { db, transacao } from './database.js';
import { formatarDataISO } from './models/datas.js';
import { Doador } from './models/Doador.js';
import { Triagem } from './models/Triagem.js';
import { BolsaSangue } from './models/BolsaSangue.js';
import { Estoque } from './models/Estoque.js';
import { Recepcionista } from './models/Recepcionista.js';
import { Gestor } from './models/Gestor.js';
import { Administrador } from './models/Administrador.js';
import { RegistroLog } from './models/RegistroLog.js';
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
  [Administrador.PERFIL]: Administrador,
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
    ativo: linha.ativo !== 0,
    deveTrocarSenha: linha.deve_trocar_senha === 1,
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

// RF-14: lista as contas do sistema (sem o hash da senha), com a situação e
// o registro da última senha temporária gerada pelo gestor
export function listarUsuarios() {
  return db
    .prepare(
      `SELECT u.id, u.nome, u.cpf, u.login, u.perfil, u.registro_profissional, u.ativo, u.deve_trocar_senha,
              u.senha_redefinida_em, g.nome AS redefinida_por
       FROM usuario u LEFT JOIN usuario g ON g.id = u.senha_redefinida_por
       ORDER BY u.ativo DESC, u.nome COLLATE NOCASE`,
    )
    .all()
    .map((l) => ({
      id: l.id, nome: l.nome, cpf: l.cpf, login: l.login, perfil: l.perfil,
      registroProfissional: l.registro_profissional,
      ativo: l.ativo !== 0,
      deveTrocarSenha: l.deve_trocar_senha === 1,
      senhaRedefinidaEm: l.senha_redefinida_em,
      senhaRedefinidaPor: l.redefinida_por,
    }));
}

export function buscarUsuarioPorCpf(cpf) {
  const linha = db.prepare('SELECT * FROM usuario WHERE cpf = ?').get(String(cpf ?? '').replace(/\D/g, ''));
  return linha ? linhaParaUsuario(linha) : null;
}

// RF-14: grava um usuário novo; login e CPF não podem se repetir
export function salvarUsuario(usuario) {
  if (buscarUsuarioPorLogin(usuario.login)) throw new Error(`O login "${usuario.login}" já está em uso.`);
  const mesmoCpf = buscarUsuarioPorCpf(usuario.cpf);
  if (mesmoCpf) throw new Error(`Este CPF já pertence ao usuário ${mesmoCpf.getNome()} (${mesmoCpf.login}).`);
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO usuario (nome, cpf, login, senha_hash, perfil, registro_profissional, deve_trocar_senha)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(usuario.getNome(), usuario.cpf, usuario.login, usuario.senhaHash, usuario.perfil,
      usuario.crm ?? usuario.coren ?? null, usuario.precisaTrocarSenha() ? 1 : 0);
  return buscarUsuarioPorId(Number(lastInsertRowid));
}

// RF-14 e RF-15: grava a senha (só o hash, RNF-02). Quando quem redefiniu foi o gestor
// ou o administrador, guarda também quando e por quem, para aparecer na lista de usuários.
export function atualizarSenha(usuario, responsavelId = null) {
  db.prepare('UPDATE usuario SET senha_hash = ?, deve_trocar_senha = ? WHERE id = ?')
    .run(usuario.senhaHash, usuario.precisaTrocarSenha() ? 1 : 0, usuario.id);
  if (responsavelId !== null) {
    db.prepare('UPDATE usuario SET senha_redefinida_em = ?, senha_redefinida_por = ? WHERE id = ?')
      .run(new Date().toISOString(), responsavelId, usuario.id);
  }
}

export function atualizarSituacaoUsuario(usuario) {
  db.prepare('UPDATE usuario SET ativo = ? WHERE id = ?').run(usuario.estaAtivo() ? 1 : 0, usuario.id);
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
  { nome: 'Carla Mendes', cpf: '52998224725', login: 'admin', perfil: Administrador.PERFIL },
];

export function garantirUsuariosDemo() {
  const inserir = db.prepare(
    `INSERT OR IGNORE INTO usuario (nome, cpf, login, senha_hash, perfil, registro_profissional)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const renomear = db.prepare('UPDATE usuario SET nome = ? WHERE login = ? AND nome = ?');
  let criados = 0;
  for (const u of USUARIOS_DEMO) {
    if (u.nomeAntigo) renomear.run(u.nome, u.login, u.nomeAntigo);
    if (buscarUsuarioPorLogin(u.login)) continue;
    inserir.run(u.nome, u.cpf, u.login, gerarHashSenha(SENHA_DEMO), u.perfil, u.registro ?? null);
    criados++;
  }
  return criados;
}

// ---------- Log de atividades (RF-16, RNF-07) ----------

// Só existe inserção: não há função para alterar ou apagar logs
export function registrarLog(registro) {
  db.prepare('INSERT INTO log_auditoria (data_hora, usuario_id, acao, descricao, origem) VALUES (?, ?, ?, ?, ?)')
    .run(registro.dataHora.toISOString(), registro.usuario?.id ?? null, registro.acao, registro.descricao, registro.origem);
}

// Busca os logs do filtro (já conferido por Administrador.consultarLogs), do mais novo para o mais antigo
export function listarLogs({ de, ate, usuarioId = null, acao = null }, { limite = 100, deslocamento = 0 } = {}) {
  const condicoes = ['l.data_hora BETWEEN ? AND ?'];
  const valores = [de.toISOString(), ate.toISOString()];
  if (usuarioId) { condicoes.push('l.usuario_id = ?'); valores.push(usuarioId); }
  if (acao) { condicoes.push('l.acao = ?'); valores.push(acao); }
  const where = condicoes.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) AS n FROM log_auditoria l WHERE ${where}`).get(...valores).n;
  const linhas = db
    .prepare(
      `SELECT l.*, u.nome AS usuario_nome, u.login AS usuario_login, u.perfil AS usuario_perfil
       FROM log_auditoria l LEFT JOIN usuario u ON u.id = l.usuario_id
       WHERE ${where} ORDER BY l.data_hora DESC, l.id DESC LIMIT ? OFFSET ?`,
    )
    .all(...valores, limite, deslocamento);
  const registros = linhas.map((l) => new RegistroLog({
    id: l.id,
    dataHora: l.data_hora,
    usuario: l.usuario_id ? { id: l.usuario_id, nome: l.usuario_nome, login: l.usuario_login, perfil: l.usuario_perfil } : null,
    acao: l.acao,
    descricao: l.descricao,
    origem: l.origem,
  }));
  return { total, registros };
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

// ---------- Rastreio de doação ou bolsa (RF-17) ----------

// Junta doação, triagem, doador, bolsa e o hospital que recebeu a bolsa (se foi entregue).
// Procura pelo nº da doação ou pelo código da bolsa; devolve null quando não encontra.
// Parte da bolsa (LEFT JOIN com a doação) para achar também as bolsas do estoque inicial,
// que não têm doação; para a doação cancelada, que não tem bolsa, parte da doação.
const SELECAO_RASTREIO = `
  SELECT d.id AS doacao_id, d.data_hora, d.volume_ml AS doacao_volume, d.cancelada,
         t.id AS triagem_id, t.data_hora AS triagem_data,
         o.nome AS doador_nome, o.cpf AS doador_cpf, o.tipo_sanguineo AS doador_tipo,
         b.codigo, b.tipo_sanguineo, b.volume_ml, b.data_coleta, b.status, b.data_descarte,
         s.id AS solicitacao_id, s.data_atendimento, h.nome AS hospital_nome`;
const JUNCOES_RASTREIO = `
  LEFT JOIN triagem t ON t.id = d.triagem_id
  LEFT JOIN doador o ON o.id = t.doador_id
  LEFT JOIN solicitacao s ON s.id = b.solicitacao_id
  LEFT JOIN hospital h ON h.id = s.hospital_id`;

export function rastrearDoacaoOuBolsa({ doacaoId = null, codigo = null }) {
  let linha;
  if (doacaoId) {
    linha = db.prepare(`${SELECAO_RASTREIO} FROM doacao d LEFT JOIN bolsa_sangue b ON b.doacao_id = d.id
      ${JUNCOES_RASTREIO} WHERE d.id = ?`).get(doacaoId);
  }
  if (!linha && codigo) {
    linha = db.prepare(`${SELECAO_RASTREIO} FROM bolsa_sangue b LEFT JOIN doacao d ON d.id = b.doacao_id
      ${JUNCOES_RASTREIO} WHERE b.codigo = ?`).get(codigo);
  }
  if (!linha) return null;
  return {
    doacao: linha.doacao_id ? {
      id: linha.doacao_id,
      dataHora: linha.data_hora,
      volumeMl: linha.doacao_volume,
      cancelada: linha.cancelada === 1,
      triagem: { id: linha.triagem_id, dataHora: linha.triagem_data },
    } : null,
    doador: linha.doador_nome ? { nome: linha.doador_nome, cpf: linha.doador_cpf, tipoSanguineo: linha.doador_tipo } : null,
    bolsa: linha.codigo ? linhaParaBolsa(linha) : null,
    entrega: linha.solicitacao_id ? {
      solicitacaoId: linha.solicitacao_id, hospital: linha.hospital_nome, dataAtendimento: linha.data_atendimento,
    } : null,
  };
}

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
  return new Hospital({
    id: linha.id, nome: linha.nome, cnpj: linha.cnpj, chaveHash: linha.chave_acesso,
    ativo: linha.ativo !== 0, chaveGeradaEm: linha.chave_gerada_em,
  });
}

// Só os ativos: são os que o gestor pode escolher numa solicitação manual (RF-07)
export function listarHospitais({ incluirInativos = false } = {}) {
  const onde = incluirInativos ? '' : 'WHERE ativo = 1';
  return db.prepare(`SELECT * FROM hospital ${onde} ORDER BY nome COLLATE NOCASE`).all().map(linhaParaHospital);
}

// RF-18: lista do administrador, com quem gerou a chave atual e quantas solicitações o hospital já fez
export function listarHospitaisParaAdmin() {
  return db
    .prepare(
      `SELECT h.*, u.nome AS gerada_por,
              (SELECT COUNT(*) FROM solicitacao s WHERE s.hospital_id = h.id) AS solicitacoes,
              (SELECT MAX(s.data_solicitacao) FROM solicitacao s WHERE s.hospital_id = h.id AND s.origem_manual = 0) AS ultima_integracao
       FROM hospital h LEFT JOIN usuario u ON u.id = h.chave_gerada_por
       ORDER BY h.ativo DESC, h.nome COLLATE NOCASE`,
    )
    .all()
    .map((l) => ({
      ...linhaParaHospital(l).toJSON(),
      chaveGeradaPor: l.gerada_por,
      solicitacoes: l.solicitacoes,
      ultimaIntegracao: l.ultima_integracao,
    }));
}

export function buscarHospitalPorId(id) {
  const linha = db.prepare('SELECT * FROM hospital WHERE id = ?').get(id);
  return linha ? linhaParaHospital(linha) : null;
}

export function buscarHospitalPorCnpj(cnpj) {
  const linha = db.prepare('SELECT * FROM hospital WHERE cnpj = ?').get(String(cnpj ?? '').replace(/\D/g, ''));
  return linha ? linhaParaHospital(linha) : null;
}

// RNF-05: procura pelo hash da chave (o banco não tem a chave) e confere com validarChave().
// Devolve o hospital mesmo desativado, para a integração poder dizer o motivo da recusa.
export function buscarHospitalPorChave(chave) {
  const linha = db.prepare('SELECT * FROM hospital WHERE chave_acesso = ?').get(Hospital.hashDaChave(chave));
  return linha ? linhaParaHospital(linha) : null;
}

// RF-18: grava um hospital novo; o CNPJ não pode se repetir
export function salvarHospital(hospital, responsavelId = null) {
  const mesmoCnpj = buscarHospitalPorCnpj(hospital.cnpj);
  if (mesmoCnpj) throw new Error(`Este CNPJ já pertence ao ${mesmoCnpj.nome}.`);
  if (!hospital.chaveHash) throw new Error('Gere a chave de acesso antes de salvar o hospital.');
  const { lastInsertRowid } = db
    .prepare('INSERT INTO hospital (nome, cnpj, chave_acesso, ativo, chave_gerada_em, chave_gerada_por) VALUES (?, ?, ?, ?, ?, ?)')
    .run(hospital.nome, hospital.cnpj, hospital.chaveHash, hospital.estaAtivo() ? 1 : 0,
      hospital.chaveGeradaEm?.toISOString() ?? null, responsavelId);
  return buscarHospitalPorId(Number(lastInsertRowid));
}

export function atualizarChaveHospital(hospital, responsavelId = null) {
  db.prepare('UPDATE hospital SET chave_acesso = ?, chave_gerada_em = ?, chave_gerada_por = ? WHERE id = ?')
    .run(hospital.chaveHash, hospital.chaveGeradaEm?.toISOString() ?? null, responsavelId, hospital.id);
}

export function atualizarSituacaoHospital(hospital) {
  db.prepare('UPDATE hospital SET ativo = ? WHERE id = ?').run(hospital.estaAtivo() ? 1 : 0, hospital.id);
}

// Hospitais de demonstração, com chaves fixas para testar a integração (estão no README).
// Hospitais cadastrados pelo administrador recebem chaves aleatórias (RF-18).
export const HOSPITAIS_DEMO = [
  { nome: 'Hospital Santa Clara', cnpj: '11222333000181', chaveAcesso: 'hsc-demo-7f3a9c' },
  { nome: 'Hospital São Lucas', cnpj: '44555666000181', chaveAcesso: 'hsl-demo-2b8e4d' },
];

export function garantirHospitaisDemo() {
  const inserir = db.prepare('INSERT OR IGNORE INTO hospital (nome, cnpj, chave_acesso) VALUES (?, ?, ?)');
  let criados = 0;
  for (const h of HOSPITAIS_DEMO) criados += inserir.run(h.nome, h.cnpj, Hospital.hashDaChave(h.chaveAcesso)).changes;
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
