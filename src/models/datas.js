// Funções auxiliares de datas usadas pelas classes de domínio

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export function somarDias(data, dias) {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

export function diasEntre(inicio, fim) {
  return Math.floor((fim.getTime() - inicio.getTime()) / MS_POR_DIA);
}
