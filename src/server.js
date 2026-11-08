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
  res.json(usuario);
});

app.post('/api/logout', (req, res) => {
  encerrarSessao(req, res);
  res.status(204).end();
});

app.get('/api/sessao', (req, res) => {
  if (!req.usuario) return res.status(401).json({ erro: 'Nenhuma sessão ativa.' });
  res.json(req.usuario);
});

// RF-02 — Cadastrar doador (Recepcionista)
app.post('/api/doadores', exigir(Recepcionista), (req, res) => {
  const doador = repo.salvarDoador(new Doador(req.body));
  res.status(201).json(doador);
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
  res.json({ doador, doacoes: repo.historicoDoacoes(doador.id) });
});

// RF-03 — Realizar triagem (Profissional de Saúde: Médico ou Enfermeiro)
app.post('/api/triagens', exigir(ProfissionalDeSaude), (req, res) => {
  const { cpf, ...medicao } = req.body;
  const doador = repo.buscarDoadorPorCpf(cpf ?? '');
  if (!doador) return res.status(404).json({ erro: 'Doador não cadastrado.' });

  const triagem = req.usuario.realizarTriagem(doador, medicao);
  triagem.avaliar(repo.datasDoacoesDoDoador(doador.id));
  res.status(201).json(repo.salvarTriagem(triagem));
});

// RF-04 — Registrar doação (Enfermeiro)
app.post('/api/doacoes', exigir(Enfermeiro), (req, res) => {
  const { triagemId, volumeMl } = req.body;
  const triagem = repo.buscarTriagem(Number(triagemId));
  if (!triagem) return res.status(404).json({ erro: 'Triagem não encontrada.' });
  if (repo.triagemJaPossuiDoacao(triagem.id)) {
    return res.status(409).json({ erro: 'Esta triagem já possui uma doação registrada.' });
  }

  const doacao = req.usuario.registrarDoacao(triagem, volumeMl);
  const bolsa = doacao.gerarBolsa();
  const id = repo.salvarDoacaoComBolsa(doacao, bolsa);
  res.status(201).json({ id, bolsa });
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
    tipos: resumo,
  });
});

// RF-09 — Descartar bolsas vencidas (Gestor)
app.post('/api/estoque/descarte', exigir(Gestor), (req, res) => {
  const estoque = repo.carregarEstoque();
  const vencidas = estoque.listarVencidas();
  const quantidade = req.usuario.descartarBolsasVencidas(estoque);
  repo.salvarDescartes(vencidas);
  res.json({ quantidade });
});

// RF-10 — Gerar relatório mensal (Gestor)
app.get('/api/relatorios/:ano/:mes', exigir(Gestor), (req, res) => {
  const relatorio = req.usuario.gerarRelatorioMensal(req.params.mes, req.params.ano);
  relatorio.calcularTotais(repo.datasTodasDoacoes(), repo.listarBolsas());
  res.json(relatorio);
});

// Erros de regra de negócio viram respostas 400 com mensagem legível
app.use((erro, req, res, next) => {
  res.status(400).json({ erro: erro.message });
});

const criados = repo.garantirUsuariosDemo();
if (criados > 0) console.log(`${criados} contas de demonstração criadas (senha: ${repo.SENHA_DEMO}).`);

app.listen(PORTA, () => {
  console.log(`HemoControl rodando em http://localhost:${PORTA}`);
});
