// Enumerações do diagrama de classes (<<enumeration>>)

export const TipoSanguineo = Object.freeze({
  A_POSITIVO: 'A_POSITIVO',
  A_NEGATIVO: 'A_NEGATIVO',
  B_POSITIVO: 'B_POSITIVO',
  B_NEGATIVO: 'B_NEGATIVO',
  AB_POSITIVO: 'AB_POSITIVO',
  AB_NEGATIVO: 'AB_NEGATIVO',
  O_POSITIVO: 'O_POSITIVO',
  O_NEGATIVO: 'O_NEGATIVO',
});

// Rótulos usados na interface (A+, A-, ...)
export const ROTULO_TIPO = Object.freeze({
  A_POSITIVO: 'A+',
  A_NEGATIVO: 'A-',
  B_POSITIVO: 'B+',
  B_NEGATIVO: 'B-',
  AB_POSITIVO: 'AB+',
  AB_NEGATIVO: 'AB-',
  O_POSITIVO: 'O+',
  O_NEGATIVO: 'O-',
});

export const Sexo = Object.freeze({
  MASCULINO: 'MASCULINO',
  FEMININO: 'FEMININO',
});

export const StatusBolsa = Object.freeze({
  DISPONIVEL: 'DISPONIVEL',
  ENTREGUE: 'ENTREGUE',
  DESCARTADA: 'DESCARTADA',
});

export function validarEnum(enumeracao, valor, nomeCampo) {
  if (!Object.values(enumeracao).includes(valor)) {
    throw new Error(`Valor inválido para ${nomeCampo}: ${valor}`);
  }
  return valor;
}
