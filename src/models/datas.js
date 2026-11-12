// Funções auxiliares de datas usadas pelas classes de domínio

const MS_POR_DIA = 24 * 60 * 60 * 1000;

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
