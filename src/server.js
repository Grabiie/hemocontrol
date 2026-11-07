import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { Doador } from './models/Doador.js';
import { Triagem } from './models/Triagem.js';
import { Doacao } from './models/Doacao.js';
import { Estoque } from './models/Estoque.js';
import { TipoSanguineo, ROTULO_TIPO } from './models/enums.js';
import * as repo from './repositorios.js';

const app = express();
const PORTA = process.env.PORT ?? 3000;
const pastaPublica = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

app.use(express.json());
app.use(express.static(pastaPublica));

// RF-02 — Cadastrar doador
app.post('/api/doadores', (req, res) => {
  const doador = repo.salvarDoador(new Doador(req.body));
  res.status(201).json(doador);
});

app.get('/api/doadores/:cpf', (req, res) => {
  const doador = repo.buscarDoadorPorCpf(req.params.cpf);
  if (!doador) return res.status(404).json({ erro: 'Doador não encontrado.' });
  res.json(doador);
});

// RF-03 — Realizar triagem
app.post('/api/triagens', (req, res) => {
  const { cpf, ...medicao } = req.body;
  const doador = repo.buscarDoadorPorCpf(cpf ?? '');
  if (!doador) return res.status(404).json({ erro: 'Doador não cadastrado.' });

  const triagem = new Triagem({ doador, medicao });
  triagem.avaliar(repo.datasDoacoesDoDoador(doador.id));
  res.status(201).json(repo.salvarTriagem(triagem));
});

// RF-04 — Registrar doação (gera a bolsa e inclui no estoque)
app.post('/api/doacoes', (req, res) => {
  const { triagemId, volumeMl } = req.body;
  const triagem = repo.buscarTriagem(Number(triagemId));
  if (!triagem) return res.status(404).json({ erro: 'Triagem não encontrada.' });
  if (repo.triagemJaPossuiDoacao(triagem.id)) {
    return res.status(409).json({ erro: 'Esta triagem já possui uma doação registrada.' });
  }

  const doacao = new Doacao({ triagem, volumeMl });
  const bolsa = doacao.gerarBolsa();
  const id = repo.salvarDoacaoComBolsa(doacao, bolsa);
  res.status(201).json({ id, bolsa });
});

// RF-05 e RF-06 — Consultar estoque com alerta de estoque crítico
app.get('/api/estoque', (req, res) => {
  const estoque = repo.carregarEstoque();
  const resumo = Object.values(TipoSanguineo).map((tipo) => ({
    tipo,
    rotulo: ROTULO_TIPO[tipo],
    quantidade: estoque.consultarDisponiveis(tipo).length,
    critico: estoque.estaCritico(tipo),
  }));
  res.json({ limiteCritico: Estoque.LIMITE_CRITICO, tipos: resumo });
});

// Erros de regra de negócio viram respostas 400 com mensagem legível
app.use((erro, req, res, next) => {
  res.status(400).json({ erro: erro.message });
});

app.listen(PORTA, () => {
  console.log(`HemoControl rodando em http://localhost:${PORTA}`);
});
