import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { Doador } from './models/Doador.js';
import { Estoque } from './models/Estoque.js';
import { Recepcionista } from './models/Recepcionista.js';
import { ProfissionalDeSaude } from './models/ProfissionalDeSaude.js';
import { Enfermeiro } from './models/Enfermeiro.js';
import { Gestor } from './models/Gestor.js';
import { Usuario } from './models/Usuario.js';
import { Medico } from './models/Medico.js';
import { Triagem } from './models/Triagem.js';
import { Solicitacao } from './models/Solicitacao.js';
import { TipoSanguineo, ROTULO_TIPO } from './models/enums.js';
import * as repo from './repositorios.js';
import { carregarUsuario, exigir, iniciarSessao, encerrarSessao } from './sessoes.js';

const app = express();
const PORTA = process.env.PORT ?? 3000;
const pastaPublica = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

app.use(express.json());
app.use(express.static(pastaPublica));
app.use(carregarUsuario);

// RF-01 — Autenticar usuário
app.post('/api/login', (req, res) => {
  const { login, senha } = req.body ?? {};
  const usuario = repo.buscarUsuarioPorLogin(login);
  if (!usuario || !usuario.autenticar(login, senha)) {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
  }
  iniciarSessao(res, usuario);
  res.json({ ...usuario.toJSON(), tema: repo.buscarTemaUsuario(usuario.id) });
});

app.post('/api/logout', (req, res) => {
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

// RF-02 — Cadastrar doador (Recepcionista)
app.post('/api/doadores', exigir(Recepcionista), (req, res) => {
  const doador = new Doador(req.body);
  req.usuario.cadastrarDoador(doador);
  res.status(201).json(repo.salvarDoador(doador));
});

// RF-13 — Buscar doadores por nome ou CPF (Recepcionista)
app.get('/api/doadores', exigir(Recepcionista), (req, res) => {
  res.json(repo.buscarDoadores(req.query.busca).map((d) => ({
    ...d.toJSON(),
    possuiDoacoes: repo.datasDoacoesDoDoador(d.id).length > 0,
  })));
});

// RF-13 — Editar dados cadastrais do doador (Recepcionista)
app.put('/api/doadores/:id', exigir(Recepcionista), (req, res) => {
  const atual = repo.buscarDoadorPorId(Number(req.params.id));
  if (!atual) return res.status(404).json({ erro: 'Doador não encontrado.' });

  const possuiDoacoes = repo.datasDoacoesDoDoador(atual.id).length > 0;
  const atualizado = req.usuario.editarDoador(atual, req.body ?? {}, possuiDoacoes);
  res.json({ ...repo.atualizarDoador(atualizado).toJSON(), possuiDoacoes });
});

app.get('/api/doadores/:cpf', exigir(Recepcionista, ProfissionalDeSaude), (req, res) => {
  const doador = repo.buscarDoadorPorCpf(req.params.cpf);
  if (!doador) return res.status(404).json({ erro: 'Doador não encontrado.' });
  res.json(doador);
});

// RF-12 — Consultar histórico de doações (todos os perfis autenticados)
app.get('/api/doadores/:cpf/historico', exigir(Usuario), (req, res) => {
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
  res.status(201).json(repo.salvarTriagem(triagem));
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
  res.status(201).json({ id, cancelada: doacao.cancelada, bolsa });
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
  res.json({ quantidade, codigos: vencidas.map((b) => b.codigo) });
});

// RF-10 — Gerar relatório mensal com o destino de cada bolsa (Gestor)
app.get('/api/relatorios/:ano/:mes', exigir(Gestor), (req, res) => {
  const relatorio = req.usuario.gerarRelatorioMensal(req.params.mes, req.params.ano);
  relatorio.calcularTotais(repo.datasTodasDoacoes(), repo.listarBolsas(), repo.datasAtendimentos());

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
  res.status(201).json(repo.salvarSolicitacao(solicitacao));
});

// RF-07 e RNF-05 — Registro pelo sistema do hospital, autenticado pela chave de acesso
app.post('/api/integracao/solicitacoes', (req, res) => {
  const chave = req.get('X-Chave-Acesso');
  if (!chave) return res.status(401).json({ erro: 'Informe a chave de acesso no cabeçalho X-Chave-Acesso (RNF-05).' });

  const hospital = repo.buscarHospitalPorChave(chave);
  if (!hospital) return res.status(403).json({ erro: 'Chave de acesso inválida (RNF-05).' });

  const { tipoSanguineo, quantidade } = req.body ?? {};
  const solicitacao = new Solicitacao({ hospital, tipoSanguineo, quantidade, origemManual: false });
  res.status(201).json(repo.salvarSolicitacao(solicitacao));
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
  res.json({
    ...solicitacao.toJSON(),
    // Fluxo alternativo 2a: alerta de estoque crítico após a baixa (RF-06)
    estoqueCritico: estoque.estaCritico(solicitacao.tipoSanguineo),
  });
});

// Erros de regra de negócio viram respostas 400 com mensagem legível
app.use((erro, req, res, next) => {
  res.status(400).json({ erro: erro.message });
});

repo.garantirHospitaisDemo();
const criados = repo.garantirUsuariosDemo();
if (criados > 0) console.log(`${criados} contas de demonstração criadas (senha: ${repo.SENHA_DEMO}).`);

app.listen(PORTA, () => {
  console.log(`HemoControl rodando em http://localhost:${PORTA}`);
});
