import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { Doador } from './models/Doador.js';
import { Estoque } from './models/Estoque.js';
import { Recepcionista } from './models/Recepcionista.js';
import { ProfissionalDeSaude } from './models/ProfissionalDeSaude.js';
import { Enfermeiro } from './models/Enfermeiro.js';
import { Gestor } from './models/Gestor.js';
import { Administrador } from './models/Administrador.js';
import { PermissaoNegada } from './models/gestaoDeContas.js';
import { Usuario } from './models/Usuario.js';
import { Medico } from './models/Medico.js';
import { Triagem } from './models/Triagem.js';
import { Solicitacao } from './models/Solicitacao.js';
import { TipoSanguineo, ROTULO_TIPO, AcaoLog, ROTULO_ACAO_LOG } from './models/enums.js';
import * as repo from './repositorios.js';
import { carregarUsuario, exigir, iniciarSessao, encerrarSessao, encerrarOutrasSessoes } from './sessoes.js';
import { registrar, origemDaRequisicao } from './auditoria.js';

const app = express();
const PORTA = process.env.PORT ?? 3000;
const pastaPublica = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

app.use(express.json());
// Atrás de um proxy, o IP de origem do log (RF-16) vem do cabeçalho X-Forwarded-For
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY);
app.use(express.static(pastaPublica));
app.use(carregarUsuario);

// RF-01 — Autenticar usuário
app.post('/api/login', (req, res) => {
  const { login, senha } = req.body ?? {};
  const usuario = repo.buscarUsuarioPorLogin(login);
  const tentativa = String(login ?? '').trim().slice(0, 40);
  if (!usuario || !usuario.autenticar(login, senha)) {
    // RF-16: a tentativa fica ligada à conta quando o login existe, para ver ataques a ela
    registrar(req, AcaoLog.LOGIN_RECUSADO,
      usuario ? `Senha incorreta para o login "${tentativa}".` : `Login inexistente: "${tentativa}".`, usuario);
    return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
  }
  if (!usuario.estaAtivo()) {
    registrar(req, AcaoLog.LOGIN_RECUSADO, `Conta desativada: "${tentativa}".`, usuario);
    return res.status(403).json({ erro: 'Esta conta está desativada. Procure o gestor ou o administrador.' });
  }
  iniciarSessao(res, usuario);
  registrar(req, AcaoLog.LOGIN, usuario.precisaTrocarSenha() ? 'Com senha temporária.' : 'Com a própria senha.', usuario);
  res.json({ ...usuario.toJSON(), tema: repo.buscarTemaUsuario(usuario.id) });
});

app.post('/api/logout', (req, res) => {
  if (req.usuario) registrar(req, AcaoLog.LOGOUT, 'Sessão encerrada pelo usuário.');
  encerrarSessao(req, res);
  res.status(204).end();
});

app.get('/api/sessao', (req, res) => {
  if (!req.usuario) return res.status(401).json({ erro: 'Nenhuma sessão ativa.' });
  res.json({ ...req.usuario.toJSON(), tema: repo.buscarTemaUsuario(req.usuario.id) });
});

// RNF-06 — Salvar o tema preferido do usuário logado
app.put('/api/preferencias/tema', exigir(Usuario), (req, res) => {
  const { tema } = req.body ?? {};
  if (tema !== 'claro' && tema !== 'escuro') {
    return res.status(400).json({ erro: 'Tema inválido: use "claro" ou "escuro".' });
  }
  repo.salvarTemaUsuario(req.usuario.id, tema);
  res.json({ tema });
});

// RF-15 — Alterar a própria senha (qualquer usuário logado, inclusive com senha temporária)
app.put('/api/minha-senha', (req, res) => {
  if (!req.usuario) return res.status(401).json({ erro: 'Faça login para continuar.' });
  const { senhaAtual, novaSenha } = req.body ?? {};
  const eraTemporaria = req.usuario.precisaTrocarSenha();
  req.usuario.trocarSenha(senhaAtual, novaSenha);
  repo.atualizarSenha(req.usuario);
  encerrarOutrasSessoes(req.usuario.id, req);
  registrar(req, AcaoLog.SENHA_ALTERADA, eraTemporaria ? 'Trocou a senha temporária pela própria.' : 'Alterou a própria senha.');
  res.json({ ...req.usuario.toJSON(), tema: repo.buscarTemaUsuario(req.usuario.id) });
});

// RF-14 — Gerenciar usuários (só o Administrador; RN-12)
const descreverConta = (u) => `${u.getNome()} (${u.login}, ${u.perfil.toLowerCase()})`;

app.get('/api/usuarios', exigir(Administrador), (req, res) => {
  const responsavel = req.usuario;
  res.json({
    perfisGerenciados: responsavel.constructor.PERFIS_GERENCIADOS.map((Classe) => Classe.PERFIL),
    usuarios: repo.listarUsuarios().map((u) => ({
      ...u,
      gerenciavel: u.id !== responsavel.id && responsavel.podeGerenciar(u),
    })),
  });
});

// Confere o CPF assim que é digitado, antes de preencher o resto do cadastro
app.get('/api/usuarios/cpf/:cpf', exigir(Administrador), (req, res) => {
  const usuario = repo.buscarUsuarioPorCpf(req.params.cpf);
  res.json(usuario ? { cadastrado: true, nome: usuario.getNome(), login: usuario.login } : { cadastrado: false });
});

// Cadastra com senha temporária: quem cadastra a entrega e o usuário cria a definitiva no primeiro acesso
app.post('/api/usuarios', exigir(Administrador), (req, res) => {
  const novo = req.usuario.cadastrarUsuario(req.body ?? {});
  const senhaTemporaria = novo.redefinirSenhaTemporaria();
  const salvo = repo.salvarUsuario(novo);
  repo.atualizarSenha(salvo, req.usuario.id);
  registrar(req, AcaoLog.USUARIO_CADASTRADO, `Cadastrou ${descreverConta(salvo)}.`);
  res.status(201).json({ usuario: salvo, senhaTemporaria });
});

function buscarConta(req, res) {
  const usuario = repo.buscarUsuarioPorId(Number(req.params.id));
  if (!usuario) res.status(404).json({ erro: 'Usuário não encontrado.' });
  return usuario;
}

app.put('/api/usuarios/:id/senha', exigir(Administrador), (req, res) => {
  const usuario = buscarConta(req, res);
  if (!usuario) return;
  const senhaTemporaria = req.usuario.redefinirSenha(usuario);
  repo.atualizarSenha(usuario, req.usuario.id);
  encerrarOutrasSessoes(usuario.id, req);
  registrar(req, AcaoLog.SENHA_REDEFINIDA, `Gerou senha temporária para ${descreverConta(usuario)}.`);
  res.json({ senhaTemporaria });
});

// Desativar no lugar de excluir: o histórico continua ligado a quem fez cada registro
app.put('/api/usuarios/:id/situacao', exigir(Administrador), (req, res) => {
  const usuario = buscarConta(req, res);
  if (!usuario) return;
  if (req.body?.ativo) req.usuario.reativarUsuario(usuario);
  else req.usuario.desativarUsuario(usuario);
  repo.atualizarSituacaoUsuario(usuario);
  if (!usuario.estaAtivo()) encerrarOutrasSessoes(usuario.id, req);
  registrar(req, usuario.estaAtivo() ? AcaoLog.USUARIO_REATIVADO : AcaoLog.USUARIO_DESATIVADO,
    `${usuario.estaAtivo() ? 'Reativou' : 'Desativou'} ${descreverConta(usuario)}.`);
  res.json({ ativo: usuario.estaAtivo() });
});

// RF-16 — Consultar o log de atividades (Administrador)
const POR_PAGINA = 50;

app.get('/api/logs/acoes', exigir(Administrador), (req, res) => {
  res.json(Object.values(AcaoLog).map((acao) => ({ acao, rotulo: ROTULO_ACAO_LOG[acao] })));
});

app.get('/api/logs', exigir(Administrador), (req, res) => {
  const filtro = req.usuario.consultarLogs(req.query);
  if (req.query.formato === 'csv') {
    const { registros } = repo.listarLogs(filtro, { limite: 50_000 });
    const campo = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const linhas = registros.map((r) => [
      r.dataHora.toLocaleString('pt-BR'), r.usuario?.nome ?? '', r.usuario?.login ?? '',
      ROTULO_ACAO_LOG[r.acao], r.descricao, r.origem,
    ].map(campo).join(';'));
    res.type('text/csv; charset=utf-8').attachment('log-de-atividades.csv');
    return res.send('\uFEFF' + ['Data e hora;Nome;Login;Ação;Descrição;Origem', ...linhas].join('\r\n'));
  }
  const pagina = Math.max(1, Number(req.query.pagina) || 1);
  const { total, registros } = repo.listarLogs(filtro, { limite: POR_PAGINA, deslocamento: (pagina - 1) * POR_PAGINA });
  res.json({
    total, pagina, porPagina: POR_PAGINA,
    registros: registros.map((r) => ({ ...r.toJSON(), rotulo: ROTULO_ACAO_LOG[r.acao] })),
  });
});

const CAMPOS_DOADOR = {
  nome: 'nome', cpf: 'CPF', dataNascimento: 'nascimento', sexo: 'sexo',
  tipoSanguineo: 'tipo sanguíneo', telefone: 'telefone', consentimentoResponsavel: 'consentimento do responsável',
};

// RF-02 — Cadastrar doador (Recepcionista)
app.post('/api/doadores', exigir(Recepcionista), (req, res) => {
  const doador = new Doador(req.body);
  req.usuario.cadastrarDoador(doador);
  const salvo = repo.salvarDoador(doador);
  registrar(req, AcaoLog.DOADOR_CADASTRADO, `Doador nº ${salvo.id}: ${salvo.nome}.`);
  res.status(201).json(salvo);
});

// RF-13 — Buscar doadores por nome ou CPF (Recepcionista e Gestor)
app.get('/api/doadores', exigir(Recepcionista, Gestor), (req, res) => {
  res.json(repo.buscarDoadores(req.query.busca).map((d) => ({
    ...d.toJSON(),
    possuiDoacoes: repo.datasDoacoesDoDoador(d.id).length > 0,
  })));
});

// RF-13 — Editar dados cadastrais do doador (Recepcionista e Gestor)
app.put('/api/doadores/:id', exigir(Recepcionista, Gestor), (req, res) => {
  const atual = repo.buscarDoadorPorId(Number(req.params.id));
  if (!atual) return res.status(404).json({ erro: 'Doador não encontrado.' });

  const possuiDoacoes = repo.datasDoacoesDoDoador(atual.id).length > 0;
  const atualizado = req.usuario.editarDoador(atual, req.body ?? {}, possuiDoacoes);
  const salvo = repo.atualizarDoador(atualizado);
  // RF-16: registra quais campos mudaram (sem copiar os valores, que são dados pessoais)
  const antes = atual.toJSON();
  const depois = salvo.toJSON();
  const mudou = Object.keys(CAMPOS_DOADOR).filter((c) => String(antes[c] ?? '') !== String(depois[c] ?? ''));
  if (mudou.length > 0) {
    registrar(req, AcaoLog.DOADOR_ATUALIZADO,
      `Doador nº ${salvo.id}: ${salvo.nome}. Alterou ${mudou.map((c) => CAMPOS_DOADOR[c]).join(', ')}.`);
  }
  res.json({ ...salvo.toJSON(), possuiDoacoes });
});

app.get('/api/doadores/:cpf', exigir(Recepcionista, ProfissionalDeSaude), (req, res) => {
  const doador = repo.buscarDoadorPorCpf(req.params.cpf);
  if (!doador) return res.status(404).json({ erro: 'Doador não encontrado.' });
  res.json(doador);
});

// RF-12 — busca por nome (ou parte do CPF) para escolher de quem ver o histórico.
// Devolve só o necessário para diferenciar homônimos: nome, nascimento, tipo e CPF.
app.get('/api/historico/doadores', exigir(Recepcionista, ProfissionalDeSaude, Gestor), (req, res) => {
  res.json(repo.buscarDoadores(req.query.busca, 10).map((d) => ({
    nome: d.nome, cpf: d.cpf, dataNascimento: d.toJSON().dataNascimento, tipoSanguineo: d.tipoSanguineo,
  })));
});

// RF-12 — Consultar histórico de doações (perfis do banco de sangue; o Administrador não precisa dos dados dos doadores)
app.get('/api/doadores/:cpf/historico', exigir(Recepcionista, ProfissionalDeSaude, Gestor), (req, res) => {
  const doador = repo.buscarDoadorPorCpf(req.params.cpf);
  if (!doador) return res.status(404).json({ erro: 'Doador não encontrado.' });
  const inaptidao = repo.inaptidoesDoDoador(doador.id).find((i) => i.estaVigente()) ?? null;

  // Próxima data em que pode doar: RN-03 e, se houver, o fim da inaptidão temporária (RF-11)
  let proximaDoacao = doador.calcularProximaDataDoacao(repo.datasDoacoesDoDoador(doador.id));
  if (inaptidao && (!proximaDoacao || inaptidao.dataFim > proximaDoacao)) proximaDoacao = inaptidao.dataFim;

  res.json({
    doador,
    inaptidao,
    proximaDoacao: proximaDoacao?.toISOString() ?? null,
    doacoes: repo.historicoDoacoes(doador.id),
  });
});

// RF-03 — Realizar triagem (Profissional de Saúde: Médico ou Enfermeiro)
app.post('/api/triagens', exigir(ProfissionalDeSaude), (req, res) => {
  const { cpf, ...medicao } = req.body;
  const doador = repo.buscarDoadorPorCpf(cpf ?? '');
  if (!doador) return res.status(404).json({ erro: 'Doador não cadastrado.' });

  const triagem = req.usuario.realizarTriagem(doador, medicao);

  // RN-10: evita triagens repetidas por cliques seguidos e limita as triagens do dia
  const doDia = repo.triagensDoDoadorNoDia(doador.id, triagem.dataHora);
  const ultima = doDia[0];
  if (ultima && triagem.repeteMedicaoDe(ultima)) {
    const hora = ultima.dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return res.status(409).json({
      erro: `Triagem nº ${ultima.id}, feita hoje às ${hora}, já tem exatamente esta medição. Altere os valores se o doador foi reavaliado (RN-10).`,
    });
  }
  if (doDia.length >= Triagem.LIMITE_DIARIO) {
    return res.status(429).json({
      erro: `Limite de ${Triagem.LIMITE_DIARIO} triagens por dia atingido para ${doador.nome}. Uma nova triagem só amanhã (RN-10).`,
    });
  }

  triagem.avaliar(repo.datasDoacoesDoDoador(doador.id), repo.inaptidoesDoDoador(doador.id));
  const salva = repo.salvarTriagem(triagem);
  registrar(req, AcaoLog.TRIAGEM_REGISTRADA,
    `Triagem nº ${salva.id} de ${doador.nome}: ${salva.estaApta() ? 'apto' : 'inapto'}.`);
  res.status(201).json(salva);
});

// RF-11 — Registrar inaptidão temporária (Médico), estendendo a triagem inapta
app.post('/api/triagens/:id/inaptidao', exigir(Medico), (req, res) => {
  const triagem = repo.buscarTriagem(Number(req.params.id));
  if (!triagem) return res.status(404).json({ erro: 'Triagem não encontrada.' });
  if (repo.triagemJaPossuiInaptidao(triagem.id)) {
    return res.status(409).json({ erro: 'Esta triagem já possui uma inaptidão registrada.' });
  }

  const { motivo, prazoDias } = req.body ?? {};
  const inaptidao = req.usuario.registrarInaptidao(triagem, motivo, prazoDias);
  repo.salvarInaptidao(inaptidao, triagem.id, req.usuario.id);
  registrar(req, AcaoLog.INAPTIDAO_REGISTRADA,
    `Triagem nº ${triagem.id} de ${triagem.doador.nome}: inapto até ${inaptidao.dataFim.toLocaleDateString('pt-BR')}.`);
  res.status(201).json(inaptidao);
});

// A triagem pode ter sido feita antes de outra doação ou de uma inaptidão:
// confere de novo a RN-02, a RN-03 e a inaptidão temporária (RF-11) no momento da coleta.
function impedimentosParaColeta(doador, agora = new Date()) {
  return [
    ...repo.inaptidoesDoDoador(doador.id)
      .filter((i) => i.estaVigente(agora))
      .map((i) => `Inaptidão temporária até ${i.dataFim.toLocaleDateString('pt-BR')}: ${i.motivo} (RF-11).`),
    ...doador.listarImpedimentos(agora, repo.datasDoacoesDoDoador(doador.id)),
  ];
}

// RF-04, passos 1 e 2 — Busca o doador pelo CPF e a triagem apta que libera a coleta (Enfermeiro)
app.get('/api/doadores/:cpf/triagem-para-doacao', exigir(Enfermeiro), (req, res) => {
  const doador = repo.buscarDoadorPorCpf(req.params.cpf);
  if (!doador) return res.status(404).json({ erro: 'Doador não cadastrado.' });

  const impedimentos = impedimentosParaColeta(doador);
  if (impedimentos.length > 0) {
    return res.status(409).json({ erro: `Doação não autorizada. ${impedimentos.join(' ')}` });
  }
  const triagem = repo.triagemAptaPendente(doador.id);
  if (!triagem) {
    return res.status(409).json({ erro: `${doador.nome} não tem triagem apta de hoje aguardando coleta. Faça a triagem antes (RN-05 e RN-09).` });
  }
  res.json(triagem);
});

// RF-04 — Registrar doação (Enfermeiro)
app.post('/api/doacoes', exigir(Enfermeiro), (req, res) => {
  const { triagemId, volumeMl, coletaInterrompida } = req.body;
  const triagem = repo.buscarTriagem(Number(triagemId));
  if (!triagem) return res.status(404).json({ erro: 'Triagem não encontrada.' });
  if (repo.triagemJaPossuiDoacao(triagem.id)) {
    return res.status(409).json({ erro: 'Esta triagem já possui uma doação registrada.' });
  }

  if (!triagem.estaApta()) {
    return res.status(409).json({ erro: 'Esta triagem não é apta para doação (RN-05).' });
  }
  const impedimentos = impedimentosParaColeta(triagem.doador);
  if (impedimentos.length > 0) {
    return res.status(409).json({ erro: `Doação não autorizada. ${impedimentos.join(' ')}` });
  }

  const doacao = req.usuario.registrarDoacao(triagem, volumeMl, coletaInterrompida);
  const bolsa = doacao.gerarBolsa(); // null quando a doação foi cancelada
  const id = repo.salvarDoacaoComBolsa(doacao, bolsa);
  registrar(req, AcaoLog.DOACAO_REGISTRADA, bolsa
    ? `Doação nº ${id} de ${triagem.doador.nome}: ${doacao.volumeMl} mL, bolsa ${bolsa.codigo}.`
    : `Doação nº ${id} de ${triagem.doador.nome}: coleta interrompida, sem bolsa.`);
  res.status(201).json({ id, cancelada: doacao.cancelada, bolsa });
});

// RF-17 — Rastrear doação ou bolsa (Gestor): pelo nº da doação ou pelo código da bolsa

app.get('/api/rastreio', exigir(Gestor), (req, res) => {
  const criterio = req.usuario.rastrear(req.query.termo);
  const achado = repo.rastrearDoacaoOuBolsa(criterio);
  if (!achado) {
    return res.status(404).json({
      erro: criterio.doacaoId && !criterio.codigo
        ? `Não existe doação nº ${criterio.doacaoId}.`
        : `Nenhuma doação ou bolsa encontrada para "${String(req.query.termo).trim()}".`,
    });
  }
  const { doacao, doador, bolsa, entrega } = achado;
  res.json({
    doacao,
    // RNF-03: a tela mostra o CPF mascarado e só revela quando o gestor clica
    doador,
    bolsa: bolsa ? { ...bolsa.toJSON(), situacao: bolsa.situacao() } : null,
    entrega,
  });
});

// RF-05 e RF-06 — Consultar estoque com alerta de estoque crítico (Gestor)
app.get('/api/estoque', exigir(Gestor), (req, res) => {
  const estoque = repo.carregarEstoque();
  const resumo = Object.values(TipoSanguineo).map((tipo) => ({
    tipo,
    rotulo: ROTULO_TIPO[tipo],
    quantidade: estoque.consultarDisponiveis(tipo).length,
    critico: estoque.estaCritico(tipo),
  }));
  res.json({
    limiteCritico: Estoque.LIMITE_CRITICO,
    vencidas: estoque.listarVencidas().length,
    diasAlertaVencimento: Estoque.DIAS_ALERTA_VENCIMENTO,
    proximasDoVencimento: estoque.listarProximasDoVencimento(),
    tipos: resumo,
  });
});

// RF-09 — Listar as bolsas vencidas antes do descarte (Gestor)
app.get('/api/estoque/vencidas', exigir(Gestor), (req, res) => {
  res.json(repo.carregarEstoque().listarVencidas());
});

// RF-09 — Descartar bolsas vencidas (Gestor)
app.post('/api/estoque/descarte', exigir(Gestor), (req, res) => {
  const estoque = repo.carregarEstoque();
  const vencidas = estoque.listarVencidas();
  const quantidade = req.usuario.descartarBolsasVencidas(estoque);
  repo.salvarDescartes(vencidas);
  if (quantidade > 0) {
    registrar(req, AcaoLog.BOLSAS_DESCARTADAS,
      `${quantidade} bolsa(s) vencida(s): ${vencidas.map((b) => b.codigo).join(', ')}.`);
  }
  res.json({ quantidade, codigos: vencidas.map((b) => b.codigo) });
});

// RF-10 — Gerar relatório mensal com o destino de cada bolsa (Gestor)
app.get('/api/relatorios/:ano/:mes', exigir(Gestor), (req, res) => {
  const relatorio = req.usuario.gerarRelatorioMensal(req.params.mes, req.params.ano);
  relatorio.calcularTotais(repo.datasTodasDoacoes(), repo.listarBolsas(), repo.datasAtendimentos());
  registrar(req, AcaoLog.RELATORIO_GERADO, `Relatório de ${String(relatorio.mes).padStart(2, '0')}/${relatorio.ano}.`);

  const noMes = (data) =>
    data instanceof Date && data.getMonth() + 1 === relatorio.mes && data.getFullYear() === relatorio.ano;
  const linha = ({ bolsa, doacaoId, destino }) => ({
    ...bolsa.toJSON(),
    origem: doacaoId ? `Doação nº ${doacaoId}` : 'Estoque inicial',
    destino,
  });

  const bolsas = repo.listarBolsasComOrigem();
  const coletadas = bolsas.filter(({ bolsa }) => noMes(bolsa.dataColeta));
  const descartadas = bolsas.filter(({ bolsa }) => bolsa.status === 'DESCARTADA' && noMes(bolsa.dataDescarte));

  // Para onde foram as bolsas coletadas no mês
  const destino = { DISPONIVEL: 0, ENTREGUE: 0, DESCARTADA: 0 };
  coletadas.forEach(({ bolsa }) => { destino[bolsa.status]++; });

  res.json({
    ...relatorio.toJSON(),
    geradoEm: new Date().toISOString(),
    geradoPor: req.usuario.getNome(),
    destino,
    bolsasColetadas: coletadas.map(linha),
    bolsasDescartadas: descartadas.map(linha),
  });
});

// ---------- Solicitações de hospitais (RF-07, RF-08, RNF-05) ----------

const descreverSolicitacao = (s) =>
  `Solicitação nº ${s.id} de ${s.hospital.nome}: ${s.quantidade} bolsa(s) ${ROTULO_TIPO[s.tipoSanguineo]}`;

app.get('/api/hospitais', exigir(Gestor), (req, res) => {
  res.json(repo.listarHospitais());
});

app.get('/api/solicitacoes', exigir(Gestor), (req, res) => {
  const estoque = repo.carregarEstoque();
  res.json(repo.listarSolicitacoes().map((s) => ({
    ...s.toJSON(),
    disponiveis: estoque.consultarDisponiveis(s.tipoSanguineo).length,
  })));
});

// RF-07 — Registro manual pelo gestor (quando a integração não está disponível)
app.post('/api/solicitacoes', exigir(Gestor), (req, res) => {
  const { hospitalId, tipoSanguineo, quantidade } = req.body ?? {};
  const hospital = repo.buscarHospitalPorId(Number(hospitalId));
  if (!hospital) return res.status(404).json({ erro: 'Hospital não encontrado.' });

  const solicitacao = new Solicitacao({ hospital, tipoSanguineo, quantidade, origemManual: true });
  req.usuario.registrarSolicitacao(solicitacao);
  const salva = repo.salvarSolicitacao(solicitacao);
  registrar(req, AcaoLog.SOLICITACAO_REGISTRADA, `${descreverSolicitacao(salva)}, registro manual.`);
  res.status(201).json(salva);
});

// RF-07 e RNF-05 — Registro pelo sistema do hospital, autenticado pela chave de acesso
app.post('/api/integracao/solicitacoes', (req, res) => {
  const chave = req.get('X-Chave-Acesso');
  if (!chave) return res.status(401).json({ erro: 'Informe a chave de acesso no cabeçalho X-Chave-Acesso (RNF-05).' });

  const hospital = repo.buscarHospitalPorChave(chave);
  if (!hospital) return res.status(403).json({ erro: 'Chave de acesso inválida (RNF-05).' });

  const { tipoSanguineo, quantidade } = req.body ?? {};
  const solicitacao = new Solicitacao({ hospital, tipoSanguineo, quantidade, origemManual: false });
  const salva = repo.salvarSolicitacao(solicitacao);
  registrar(req, AcaoLog.SOLICITACAO_REGISTRADA, `${descreverSolicitacao(salva)}, via integração.`, null,
    `integração (${origemDaRequisicao(req)})`);
  res.status(201).json(salva);
});

// RF-08 — Atender solicitação, priorizando as bolsas de validade mais próxima
app.post('/api/solicitacoes/:id/atendimento', exigir(Gestor), (req, res) => {
  const solicitacao = repo.buscarSolicitacao(Number(req.params.id));
  if (!solicitacao) return res.status(404).json({ erro: 'Solicitação não encontrada.' });

  const estoque = repo.carregarEstoque();
  const disponiveis = estoque.consultarDisponiveis(solicitacao.tipoSanguineo).length;
  const aceitaParcial = Boolean(req.body?.aceitaParcial);

  if (!req.usuario.atenderSolicitacao(solicitacao, estoque, aceitaParcial)) {
    const erro = disponiveis === 0
      ? 'Não há bolsas disponíveis deste tipo. A solicitação continua pendente.'
      : `Há apenas ${disponiveis} de ${solicitacao.quantidade} bolsas disponíveis.`;
    return res.status(409).json({ erro, disponiveis, podeAtenderParcial: disponiveis > 0 });
  }

  repo.salvarAtendimento(solicitacao);
  registrar(req, AcaoLog.SOLICITACAO_ATENDIDA, `${descreverSolicitacao(solicitacao)}: ${
    solicitacao.status === 'ATENDIDA' ? 'atendida' : `atendida parcialmente (${solicitacao.bolsas.length} bolsa(s))`}.`);
  res.json({
    ...solicitacao.toJSON(),
    // Fluxo alternativo 2a: alerta de estoque crítico após a baixa (RF-06)
    estoqueCritico: estoque.estaCritico(solicitacao.tipoSanguineo),
  });
});

// Erros de regra de negócio viram respostas 400 com mensagem legível
app.use((erro, req, res, next) => {
  if (erro instanceof PermissaoNegada) {
    registrar(req, AcaoLog.ACESSO_NEGADO, `${erro.message} (${req.method} ${req.originalUrl})`);
    return res.status(403).json({ erro: erro.message });
  }
  res.status(400).json({ erro: erro.message });
});

repo.garantirHospitaisDemo();
const criados = repo.garantirUsuariosDemo();
if (criados > 0) console.log(`${criados} contas de demonstração criadas (senha: ${repo.SENHA_DEMO}).`);

app.listen(PORTA, () => {
  console.log(`HemoControl rodando em http://localhost:${PORTA}`);
});
