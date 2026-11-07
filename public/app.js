const TIPOS = {
  A_POSITIVO: 'A+', A_NEGATIVO: 'A-', B_POSITIVO: 'B+', B_NEGATIVO: 'B-',
  AB_POSITIVO: 'AB+', AB_NEGATIVO: 'AB-', O_POSITIVO: 'O+', O_NEGATIVO: 'O-',
};

const selectTipo = document.getElementById('select-tipo');
for (const [valor, rotulo] of Object.entries(TIPOS)) {
  selectTipo.add(new Option(rotulo, valor));
}

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
  const corpo = await resposta.json();
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
    document.querySelector('#form-triagem [name=cpf]').value = doador.cpf;
    e.target.reset();
  } catch (erro) {
    mostrar('msg-doador', erro.message, 'erro');
  }
});

// 2. Realizar triagem
document.getElementById('form-triagem').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const triagem = await enviar('/api/triagens', dadosDoForm(e.target));
    if (triagem.apto) {
      mostrar('msg-triagem', `Triagem nº ${triagem.id}: doador APTO.`, 'sucesso');
      document.querySelector('#form-doacao [name=triagemId]').value = triagem.id;
    } else {
      mostrar('msg-triagem', `Triagem nº ${triagem.id}: doador INAPTO para doar no momento.`, 'erro');
    }
  } catch (erro) {
    mostrar('msg-triagem', erro.message, 'erro');
  }
});

// 3. Registrar doação
document.getElementById('form-doacao').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const { bolsa } = await enviar('/api/doacoes', dadosDoForm(e.target));
    const validade = new Date(bolsa.dataValidade).toLocaleDateString('pt-BR');
    mostrar('msg-doacao', `Bolsa ${bolsa.codigo} (${TIPOS[bolsa.tipoSanguineo]}) gerada, válida até ${validade}.`, 'sucesso');
    await atualizarEstoque(bolsa.tipoSanguineo);
  } catch (erro) {
    mostrar('msg-doacao', erro.message, 'erro');
  }
});

// Estoque
async function atualizarEstoque(tipoDestacado) {
  const { limiteCritico, tipos } = await (await fetch('/api/estoque')).json();
  document.getElementById('limite').textContent = limiteCritico;

  const grade = document.getElementById('grade-estoque');
  grade.innerHTML = '';
  for (const t of tipos) {
    const card = document.createElement('div');
    card.className = `tipo${t.critico ? ' critico' : ''}${t.tipo === tipoDestacado ? ' atualizado' : ''}`;
    card.innerHTML = `
      <div class="rotulo">${t.rotulo}</div>
      <div class="quantidade">${t.quantidade} bolsa${t.quantidade === 1 ? '' : 's'}</div>
      <div class="status">${t.critico ? 'ESTOQUE CRÍTICO' : 'Normal'}</div>`;
    grade.appendChild(card);
  }

  if (tipoDestacado) {
    setTimeout(() => grade.querySelector('.atualizado')?.classList.remove('atualizado'), 800);
  }
}

atualizarEstoque();
