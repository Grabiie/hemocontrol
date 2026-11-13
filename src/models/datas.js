// Funções auxiliares de datas usadas pelas classes de domínio

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// "1995-04-12" vira meia-noite no horário local (new Date() leria como UTC e erraria o dia)
export function lerData(valor) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor ?? ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(valor);
}

// Data no formato AAAA-MM-DD, no horário local
export function formatarDataISO(data) {
  const d = new Date(data);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function somarDias(data, dias) {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

// Mesmo dia do calendário, no fuso horário do servidor
export function mesmoDia(a, b) {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

export function diasEntre(inicio, fim) {
  return Math.floor((fim.getTime() - inicio.getTime()) / MS_POR_DIA);
}
