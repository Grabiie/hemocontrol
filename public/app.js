const TIPOS = {
  A_POSITIVO: 'A+', A_NEGATIVO: 'A-', B_POSITIVO: 'B+', B_NEGATIVO: 'B-',
  AB_POSITIVO: 'AB+', AB_NEGATIVO: 'AB-', O_POSITIVO: 'O+', O_NEGATIVO: 'O-',
};

let usuarioAtual = null;

const selectTipo = document.getElementById('select-tipo');
for (const [valor, rotulo] of Object.entries(TIPOS)) {
  selectTipo.add(new Option(rotulo, valor));
}

// ---------- Máscaras de digitação ----------

// CPF: 52998224725 -> 529.982.247-25
function formatarCpf(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}

// Telefone: 11987654321 -> (11) 98765-4321 (celular) | 1134567890 -> (11) 3456-7890 (fixo)
function formatarTelefone(valor) {
  let d = valor.replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2); // remove o código do país (+55)
  d = d.slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Aplica uma máscara mantendo o cursor no lugar certo ao inserir os separadores
function aplicarMascara(seletor, formatar) {
  document.querySelectorAll(seletor).forEach((campo) => {
    campo.addEventListener('input', () => {
      const digitosAntesDoCursor = campo.value.slice(0, campo.selectionStart).replace(/\D/g, '').length;
      campo.value = formatar(campo.value);

      let pos = 0;
      for (let contados = 0; pos < campo.value.length && contados < digitosAntesDoCursor; pos++) {
        if (/\d/.test(campo.value[pos])) contados++;
      }
      campo.setSelectionRange(pos, pos);
    });
  });
}

aplicarMascara('input[name=cpf]', formatarCpf);
aplicarMascara('input[name=telefone]', formatarTelefone);

function mostrar(id, texto, tipo) {
  const el = document.getElementById(id);
  el.textContent = texto;
  el.className = `mensagem ${tipo}`;
}

async function enviar(url, dados) {
  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  if (resposta.status === 401) mostrarLogin();
  const corpo = resposta.status === 204 ? {} : await resposta.json();
  if (!resposta.ok) throw new Error(corpo.erro ?? 'Erro inesperado.');
  return corpo;
}

function dadosDoForm(form) {
  return Object.fromEntries(new FormData(form));
}

// 1. Cadastrar doador
document.getElementById('form-doador').addEventListener('submit', async (e) => {
  e.preventDefault();
  const dados = dadosDoForm(e.target);
  dados.consentimentoResponsavel = e.target.consentimentoResponsavel.checked;
  try {
    const doador = await enviar('/api/doadores', dados);
    mostrar('msg-doador', `Doador ${doador.nome} cadastrado (tipo ${TIPOS[doador.tipoSanguineo]}).`, 'sucesso');
    document.querySelector('#form-triagem [name=cpf]').value = formatarCpf(doador.cpf);
    e.target.reset();
  } catch (erro) {
    mostrar('msg-doador', erro.message, 'erro');
  }
});

// 2. Realizar triagem
document.getElementById('form-triagem').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formInaptidao = document.getElementById('form-inaptidao');
  formInaptidao.hidden = true;
  mostrar('msg-inaptidao', '', '');
  try {
    const triagem = await enviar('/api/triagens', dadosDoForm(e.target));
    if (triagem.apto) {
      mostrar('msg-triagem', `Triagem nº ${triagem.id}: doador APTO.`, 'sucesso');
      document.querySelector('#form-doacao [name=triagemId]').value = triagem.id;

      // RN-07: ajusta o campo de volume ao máximo permitido para este doador
      const campoVolume = document.querySelector('#form-doacao [name=volumeMl]');
      campoVolume.max = triagem.volumeMaximoMl;
      campoVolume.value = Math.min(450, triagem.volumeMaximoMl);
      document.getElementById('dica-volume').textContent =
        `Máximo para este doador: ${triagem.volumeMaximoMl} mL (mínimo de 300 mL).`;
    } else {
      mostrar('msg-triagem', `Triagem nº ${triagem.id}: doador INAPTO.`, 'erro');
      const lista = document.createElement('ul');
      lista.className = 'motivos';
      for (const motivo of triagem.motivos) {
        lista.appendChild(Object.assign(document.createElement('li'), { textContent: motivo }));
      }
      document.getElementById('msg-triagem').appendChild(lista);

      // RF-11 (<<extend>> de Realizar Triagem): só o médico registra a inaptidão temporária
      if (usuarioAtual?.perfil === 'MEDICO') {
        formInaptidao.dataset.triagemId = triagem.id;
        formInaptidao.motivo.value = triagem.motivos.map((m) => m.replace(/\s*\((RN|RF)-\d+\)\.?$/, '')).join('; ');
        formInaptidao.prazoDias.value = 30;
        formInaptidao.hidden = false;
      }
    }
  } catch (erro) {
    mostrar('msg-triagem', erro.message, 'erro');
  }
});

// RF-11 — Registrar inaptidão temporária (Médico)
document.getElementById('form-inaptidao').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const inaptidao = await enviar(`/api/triagens/${e.target.dataset.triagemId}/inaptidao`, dadosDoForm(e.target));
    mostrar('msg-inaptidao',
      `Inaptidão registrada. O doador não poderá doar até ${new Date(inaptidao.dataFim).toLocaleDateString('pt-BR')}.`, 'sucesso');
    e.target.hidden = true;
  } catch (erro) {
    mostrar('msg-inaptidao', erro.message, 'erro');
  }
});

// 3. Registrar doação
document.getElementById('form-doacao').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const dados = dadosDoForm(e.target);
    dados.coletaInterrompida = e.target.coletaInterrompida.checked;
    const { id, cancelada, bolsa } = await enviar('/api/doacoes', dados);
    if (cancelada) {
      mostrar('msg-doacao', `Doação nº ${id} registrada como cancelada (coleta interrompida). Nenhuma bolsa foi gerada.`, 'sucesso');
    } else {
      const validade = new Date(bolsa.dataValidade).toLocaleDateString('pt-BR');
      mostrar('msg-doacao', `Bolsa ${bolsa.codigo} (${TIPOS[bolsa.tipoSanguineo]}) gerada, válida até ${validade}.`, 'sucesso');
    }
    e.target.triagemId.value = '';
    e.target.coletaInterrompida.checked = false;
    e.target.volumeMl.min = 300;
  } catch (erro) {
    mostrar('msg-doacao', erro.message, 'erro');
  }
});

// ---------- Utilitários de exibição ----------

const ROTULO_STATUS = { DISPONIVEL: 'Disponível', ENTREGUE: 'Entregue', DESCARTADA: 'Descartada' };
const NOMES_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const formatarData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
const plural = (n, singular, pluralTexto) => `${n} ${n === 1 ? singular : pluralTexto}`;

function criar(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// Monta uma tabela só com textContent (sem HTML vindo de dados)
function criarTabela(colunas, linhas, rolagem = false) {
  const tabela = criar('table', 'tabela');
  const cabecalho = tabela.createTHead().insertRow();
  for (const c of colunas) cabecalho.appendChild(criar('th', null, c));
  const corpo = tabela.createTBody();
  for (const valores of linhas) {
    const linha = corpo.insertRow();
    for (const v of valores) linha.insertCell().textContent = v;
  }
  if (!rolagem) return tabela;
  const caixa = criar('div', 'rolagem');
  caixa.appendChild(tabela);
  return caixa;
}

function criarCartoes(itens) {
  const grade = criar('div', 'cartoes');
  for (const [numero, descricao] of itens) {
    const card = criar('div', 'total');
    card.append(criar('div', 'numero', numero), criar('div', 'descricao', descricao));
    grade.appendChild(card);
  }
  return grade;
}

// Coleta interrompida: o volume pode ficar abaixo de 300 mL
document.querySelector('#form-doacao [name=coletaInterrompida]').addEventListener('change', (e) => {
  document.querySelector('#form-doacao [name=volumeMl]').min = e.target.checked ? 0 : 300;
});

// ---------- Estoque e bolsas vencidas (RF-05, RF-06, RF-09) ----------

async function atualizarEstoque() {
  const resposta = await fetch('/api/estoque');
  if (!resposta.ok) return;
  const { limiteCritico, vencidas, tipos } = await resposta.json();
  document.getElementById('limite').textContent = limiteCritico;

  const grade = document.getElementById('grade-estoque');
  grade.innerHTML = '';
  for (const t of tipos) {
    const card = criar('div', `tipo${t.critico ? ' critico' : ''}`);
    card.append(
      criar('div', 'rotulo', t.rotulo),
      criar('div', 'quantidade', plural(t.quantidade, 'bolsa', 'bolsas')),
      criar('div', 'status', t.critico ? 'ESTOQUE CRÍTICO' : 'Normal'),
    );
    grade.appendChild(card);
  }

  const botao = document.getElementById('botao-descartar');
  const area = document.getElementById('area-vencidas');
  botao.disabled = vencidas === 0;
  botao.textContent = vencidas === 0 ? 'Descartar bolsas vencidas' : `Descartar ${plural(vencidas, 'bolsa vencida', 'bolsas vencidas')}`;
  document.getElementById('info-vencidas').textContent =
    vencidas === 0 ? 'Nenhuma bolsa vencida no estoque.' : 'Confira a lista antes de descartar.';

  area.hidden = vencidas === 0;
  if (vencidas > 0) await listarVencidas();
}

async function listarVencidas() {
  const resposta = await fetch('/api/estoque/vencidas');
  if (!resposta.ok) return;
  const bolsas = await resposta.json();
  const hoje = new Date();

  const linhas = bolsas.map((b) => {
    const dias = Math.floor((hoje - new Date(b.dataValidade)) / 86400000);
    return [b.codigo, TIPOS[b.tipoSanguineo], formatarData(b.dataColeta), formatarData(b.dataValidade),
      dias <= 0 ? 'hoje' : plural(dias, 'dia', 'dias')];
  });

  const destino = document.getElementById('tabela-vencidas');
  destino.innerHTML = '';
  destino.appendChild(criarTabela(['Bolsa', 'Tipo', 'Coleta', 'Validade', 'Vencida há'], linhas, true));
}

document.getElementById('botao-descartar').addEventListener('click', async () => {
  try {
    const { quantidade, codigos } = await enviar('/api/estoque/descarte', {});
    mostrar('msg-estoque', `${plural(quantidade, 'bolsa descartada', 'bolsas descartadas')}: ${codigos.join(', ')}.`, 'sucesso');
    await atualizarEstoque();
  } catch (erro) {
    mostrar('msg-estoque', erro.message, 'erro');
  }
});

// ---------- Solicitações de hospitais (RF-07, RF-08) ----------

const ROTULO_SOLICITACAO = {
  PENDENTE: ['Pendente', 'pendente'],
  ATENDIDA: ['Atendida', 'atendida'],
  ATENDIDA_PARCIALMENTE: ['Atendida parcialmente', 'parcial'],
};

const selectTipoSolicitacao = document.getElementById('select-tipo-solicitacao');
for (const [valor, rotulo] of Object.entries(TIPOS)) selectTipoSolicitacao.add(new Option(rotulo, valor));

async function carregarHospitais() {
  const resposta = await fetch('/api/hospitais');
  if (!resposta.ok) return;
  const select = document.getElementById('select-hospital');
  select.innerHTML = '';
  for (const h of await resposta.json()) select.add(new Option(h.nome, h.id));
}

async function atualizarSolicitacoes() {
  const resposta = await fetch('/api/solicitacoes');
  if (!resposta.ok) return;
  const solicitacoes = await resposta.json();
  const destino = document.getElementById('lista-solicitacoes');
  destino.innerHTML = '';

  if (solicitacoes.length === 0) {
    destino.appendChild(criar('p', 'vazio', 'Nenhuma solicitação registrada.'));
    return;
  }

  const tabela = criarTabela(['Nº', 'Data', 'Hospital', 'Tipo', 'Pedido', 'Origem', 'Situação', ''], []);
  const corpo = tabela.tBodies[0];
  for (const s of solicitacoes) {
    const linha = corpo.insertRow();
    const [rotulo, classe] = ROTULO_SOLICITACAO[s.status];
    const situacao = s.status === 'PENDENTE'
      ? `${rotulo} · ${plural(s.disponiveis, 'disponível', 'disponíveis')} no estoque`
      : `${rotulo} · ${s.quantidadeAtendida} de ${s.quantidade}`;

    for (const valor of [s.id, formatarData(s.dataSolicitacao), s.hospital.nome, TIPOS[s.tipoSanguineo],
      plural(s.quantidade, 'bolsa', 'bolsas'), s.origemManual ? 'Manual' : 'Integração']) {
      linha.insertCell().textContent = valor;
    }
    const celulaSituacao = linha.insertCell();
    celulaSituacao.appendChild(criar('span', `selo ${classe}`, situacao));

    const celulaAcao = linha.insertCell();
    if (s.status === 'PENDENTE') {
      const botao = criar('button', null, 'Atender');
      botao.type = 'button';
      botao.addEventListener('click', () => atenderSolicitacao(s.id, false));
      celulaAcao.appendChild(botao);
    }
  }
  destino.appendChild(tabela);
}

// RF-08 — se faltar bolsa, o sistema oferece o atendimento parcial (fluxo alternativo 3a)
async function atenderSolicitacao(id, aceitaParcial) {
  const msg = document.getElementById('msg-solicitacao');
  mostrar('msg-solicitacao', '', '');
  const resposta = await fetch(`/api/solicitacoes/${id}/atendimento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aceitaParcial }),
  });
  const r = await resposta.json();
  if (resposta.status === 401) return mostrarLogin();

  if (!resposta.ok) {
    mostrar('msg-solicitacao', `Solicitação nº ${id}: ${r.erro}`, 'erro');
    if (r.podeAtenderParcial) {
      const acao = criar('div', 'acao-parcial');
      const botao = criar('button', 'secundario', `Atender parcialmente com ${plural(r.disponiveis, 'bolsa', 'bolsas')}`);
      botao.type = 'button';
      botao.addEventListener('click', () => atenderSolicitacao(id, true));
      acao.appendChild(botao);
      msg.appendChild(acao);
    }
    return;
  }

  let texto = `Solicitação nº ${r.id} ${r.status === 'ATENDIDA' ? 'atendida' : 'atendida parcialmente'}: ` +
    `${plural(r.quantidadeAtendida, 'bolsa entregue', 'bolsas entregues')} (${r.bolsas.join(', ')}).`;
  if (r.estoqueCritico) texto += ` Atenção: o estoque de ${TIPOS[r.tipoSanguineo]} ficou crítico.`;
  mostrar('msg-solicitacao', texto, 'sucesso');
  await Promise.all([atualizarSolicitacoes(), atualizarEstoque()]);
}

// RF-07 — registro manual pelo gestor
document.getElementById('form-solicitacao').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const s = await enviar('/api/solicitacoes', dadosDoForm(e.target));
    mostrar('msg-solicitacao',
      `Solicitação nº ${s.id} registrada: ${plural(s.quantidade, 'bolsa', 'bolsas')} ${TIPOS[s.tipoSanguineo]} para ${s.hospital.nome}.`, 'sucesso');
    await atualizarSolicitacoes();
  } catch (erro) {
    mostrar('msg-solicitacao', erro.message, 'erro');
  }
});

// ---------- Relatório mensal (RF-10) ----------

let ultimoRelatorio = null;

document.getElementById('form-relatorio').addEventListener('submit', async (e) => {
  e.preventDefault();
  const [ano, mes] = e.target.mes.value.split('-');
  const resultado = document.getElementById('resultado-relatorio');
  resultado.innerHTML = '';
  document.getElementById('botoes-exportar').hidden = true;
  mostrar('msg-relatorio', '', '');

  try {
    const resposta = await fetch(`/api/relatorios/${ano}/${mes}`);
    const r = await resposta.json();
    if (resposta.status === 401) mostrarLogin();
    if (!resposta.ok) throw new Error(r.erro ?? 'Erro ao gerar o relatório.');

    ultimoRelatorio = r;
    renderizarRelatorio(r, resultado);
    document.getElementById('botoes-exportar').hidden = false;
  } catch (erro) {
    mostrar('msg-relatorio', erro.message, 'erro');
  }
});

function renderizarRelatorio(r, destino) {
  const geradoEm = new Date(r.geradoEm);
  destino.append(
    criar('h3', null, `Relatório de ${NOMES_MESES[r.mes - 1]} de ${r.ano}`),
    criar('p', 'meta-relatorio',
      `Gerado em ${geradoEm.toLocaleDateString('pt-BR')} às ${geradoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} por ${r.geradoPor}`),
    criarCartoes([
      [r.totalDoacoes, 'doações registradas'],
      [r.totalBolsasDescartadas, 'bolsas descartadas'],
      [r.totalSolicitacoesAtendidas, 'solicitações atendidas'],
    ]),
  );

  destino.append(
    criar('h3', null, `Destino das ${plural(r.bolsasColetadas.length, 'bolsa coletada', 'bolsas coletadas')} no mês`),
    criarCartoes([
      [r.destino.DISPONIVEL, 'em estoque'],
      [r.destino.ENTREGUE, 'entregues a hospitais'],
      [r.destino.DESCARTADA, 'descartadas'],
    ]),
  );

  destino.appendChild(criar('h3', null, 'Bolsas descartadas no mês'));
  if (r.bolsasDescartadas.length === 0) {
    destino.appendChild(criar('p', 'vazio', 'Nenhuma bolsa descartada neste mês.'));
  } else {
    destino.appendChild(criarTabela(
      ['Bolsa', 'Tipo', 'Origem', 'Coleta', 'Validade', 'Descarte'],
      r.bolsasDescartadas.map((b) => [b.codigo, TIPOS[b.tipoSanguineo], b.origem,
        formatarData(b.dataColeta), formatarData(b.dataValidade), formatarData(b.dataDescarte)]),
    ));
  }

  destino.appendChild(criar('h3', null, 'Bolsas coletadas no mês'));
  if (r.bolsasColetadas.length === 0) {
    destino.appendChild(criar('p', 'vazio', 'Nenhuma bolsa coletada neste mês.'));
  } else {
    destino.appendChild(criarTabela(
      ['Bolsa', 'Tipo', 'Volume', 'Origem', 'Coleta', 'Validade', 'Situação', 'Destino'],
      r.bolsasColetadas.map((b) => [b.codigo, TIPOS[b.tipoSanguineo], `${b.volumeMl} mL`, b.origem,
        formatarData(b.dataColeta), formatarData(b.dataValidade), ROTULO_STATUS[b.status], b.destino ?? '—']),
      true,
    ));
  }

}

// Exportar PDF: usa a impressão do navegador ("Salvar como PDF") só com o relatório
document.getElementById('botao-pdf').addEventListener('click', () => {
  document.body.classList.add('imprimindo-relatorio');
  window.print();
});
window.addEventListener('afterprint', () => document.body.classList.remove('imprimindo-relatorio'));

// Exportar planilha: CSV com ";" e BOM, para abrir direto no Excel em português
document.getElementById('botao-csv').addEventListener('click', () => {
  if (!ultimoRelatorio) return;
  const r = ultimoRelatorio;

  const porCodigo = new Map();
  for (const b of [...r.bolsasColetadas, ...r.bolsasDescartadas]) porCodigo.set(b.codigo, b);

  const campo = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const linhas = [
    ['Bolsa', 'Tipo', 'Volume (mL)', 'Origem', 'Coleta', 'Validade', 'Situação', 'Destino', 'Descarte'],
    ...[...porCodigo.values()].map((b) => [b.codigo, TIPOS[b.tipoSanguineo], b.volumeMl, b.origem,
      formatarData(b.dataColeta), formatarData(b.dataValidade), ROTULO_STATUS[b.status],
      b.destino ?? '', b.dataDescarte ? formatarData(b.dataDescarte) : '']),
  ];
  const csv = '﻿' + linhas.map((l) => l.map(campo).join(';')).join('\r\n');

  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = `relatorio-hemocontrol-${r.ano}-${String(r.mes).padStart(2, '0')}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

// ---------- Histórico de doações (RF-12) ----------

document.getElementById('form-historico').addEventListener('submit', async (e) => {
  e.preventDefault();
  const resultado = document.getElementById('resultado-historico');
  resultado.innerHTML = '';
  mostrar('msg-historico', '', '');

  const cpf = e.target.cpf.value.replace(/\D/g, '');
  try {
    const resposta = await fetch(`/api/doadores/${cpf}/historico`);
    const dados = await resposta.json();
    if (resposta.status === 401) mostrarLogin();
    if (!resposta.ok) throw new Error(dados.erro ?? 'Erro ao consultar o histórico.');

    const { doador, doacoes, inaptidao } = dados;
    const cabecalho = document.createElement('p');
    cabecalho.className = 'historico-doador';
    cabecalho.textContent = `${doador.nome} · tipo ${TIPOS[doador.tipoSanguineo]} · ` +
      (doacoes.length === 1 ? '1 doação' : `${doacoes.length} doações`);
    resultado.appendChild(cabecalho);
    if (inaptidao) {
      resultado.appendChild(criar('p', 'alerta-inaptidao',
        `Inapto temporariamente até ${formatarData(inaptidao.dataFim)}: ${inaptidao.motivo}`));
    }

    if (doacoes.length === 0) {
      resultado.appendChild(Object.assign(document.createElement('p'), {
        className: 'vazio', textContent: 'Nenhuma doação registrada.',
      }));
      return;
    }

    const tabela = document.createElement('table');
    tabela.className = 'historico';
    tabela.innerHTML = '<thead><tr><th>Data</th><th>Volume</th><th>Bolsa</th><th>Situação</th></tr></thead>';
    const corpo = document.createElement('tbody');
    for (const d of doacoes) {
      const linha = corpo.insertRow();
      const situacao = d.cancelada ? 'Cancelada' : ROTULO_STATUS[d.bolsa?.status] ?? '—';
      for (const valor of [
        new Date(d.dataHora).toLocaleDateString('pt-BR'),
        `${d.volumeMl} mL`,
        d.bolsa?.codigo ?? '—',
        situacao,
      ]) {
        linha.insertCell().textContent = valor;
      }
    }
    tabela.appendChild(corpo);
    resultado.appendChild(tabela);
  } catch (erro) {
    mostrar('msg-historico', erro.message, 'erro');
  }
});

// ---------- Login e perfis (RF-01) ----------

const ROTULO_PERFIL = {
  RECEPCIONISTA: 'Recepcionista',
  MEDICO: 'Médico',
  ENFERMEIRO: 'Enfermeiro',
  GESTOR: 'Gestor',
};

function mostrarLogin() {
  document.getElementById('sistema').hidden = true;
  document.getElementById('usuario-logado').hidden = true;
  document.getElementById('tela-login').hidden = false;
}

function mostrarSistema(usuario) {
  usuarioAtual = usuario;
  document.getElementById('form-inaptidao').hidden = true;
  document.getElementById('nome-usuario').textContent = usuario.nome;
  document.getElementById('perfil-usuario').textContent = ROTULO_PERFIL[usuario.perfil];
  document.getElementById('usuario-logado').hidden = false;
  document.getElementById('tela-login').hidden = true;

  // Cada perfil vê apenas os painéis que tem permissão para usar
  document.querySelectorAll('[data-perfis]').forEach((painel) => {
    painel.hidden = !painel.dataset.perfis.split(' ').includes(usuario.perfil);
  });
  document.querySelectorAll('#sistema .mensagem').forEach((m) => { m.textContent = ''; });
  document.getElementById('sistema').hidden = false;

  document.getElementById('resultado-historico').innerHTML = '';
  document.getElementById('resultado-relatorio').innerHTML = '';
  document.getElementById('botoes-exportar').hidden = true;
  ultimoRelatorio = null;

  if (usuario.perfil === 'GESTOR') {
    const hoje = new Date();
    document.querySelector('#form-relatorio [name=mes]').value =
      `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    atualizarEstoque();
    carregarHospitais();
    atualizarSolicitacoes();
  }
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const usuario = await enviar('/api/login', dadosDoForm(e.target));
    e.target.reset();
    mostrar('msg-login', '', '');
    mostrarSistema(usuario);
  } catch (erro) {
    mostrar('msg-login', erro.message, 'erro');
  }
});

document.getElementById('botao-sair').addEventListener('click', async () => {
  await enviar('/api/logout', {});
  document.querySelectorAll('#sistema form').forEach((f) => f.reset());
  mostrarLogin();
});

async function iniciar() {
  const resposta = await fetch('/api/sessao');
  if (resposta.ok) mostrarSistema(await resposta.json());
  else mostrarLogin();
}

iniciar();
