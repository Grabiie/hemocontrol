const TIPOS = {
  A_POSITIVO: 'A+', A_NEGATIVO: 'A-', B_POSITIVO: 'B+', B_NEGATIVO: 'B-',
  AB_POSITIVO: 'AB+', AB_NEGATIVO: 'AB-', O_POSITIVO: 'O+', O_NEGATIVO: 'O-',
};

const selectTipo = document.getElementById('select-tipo');
for (const [valor, rotulo] of Object.entries(TIPOS)) {
  selectTipo.add(new Option(rotulo, valor));
}

// Máscara de CPF: 52998224725 -> 529.982.247-25
function formatarCpf(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}

document.querySelectorAll('input[name=cpf]').forEach((campo) => {
  campo.addEventListener('input', () => {
    // Mantém o cursor no lugar certo ao inserir pontos e traço
    const digitosAntesDoCursor = campo.value.slice(0, campo.selectionStart).replace(/\D/g, '').length;
    campo.value = formatarCpf(campo.value);

    let pos = 0;
    for (let contados = 0; pos < campo.value.length && contados < digitosAntesDoCursor; pos++) {
      if (/\d/.test(campo.value[pos])) contados++;
    }
    campo.setSelectionRange(pos, pos);
  });
});

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
  try {
    const triagem = await enviar('/api/triagens', dadosDoForm(e.target));
    if (triagem.apto) {
      mostrar('msg-triagem', `Triagem nº ${triagem.id}: doador APTO.`, 'sucesso');
      document.querySelector('#form-doacao [name=triagemId]').value = triagem.id;
    } else {
      mostrar('msg-triagem', `Triagem nº ${triagem.id}: doador INAPTO.`, 'erro');
      const lista = document.createElement('ul');
      lista.className = 'motivos';
      for (const motivo of triagem.motivos) {
        lista.appendChild(Object.assign(document.createElement('li'), { textContent: motivo }));
      }
      document.getElementById('msg-triagem').appendChild(lista);
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
    e.target.triagemId.value = '';
  } catch (erro) {
    mostrar('msg-doacao', erro.message, 'erro');
  }
});

// Estoque
async function atualizarEstoque(tipoDestacado) {
  const resposta = await fetch('/api/estoque');
  if (!resposta.ok) return;
  const { limiteCritico, tipos } = await resposta.json();
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

  if (usuario.perfil === 'GESTOR') atualizarEstoque();
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
