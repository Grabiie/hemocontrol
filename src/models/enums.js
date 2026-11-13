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

export const StatusSolicitacao = Object.freeze({
  PENDENTE: 'PENDENTE',
  ATENDIDA: 'ATENDIDA',
  ATENDIDA_PARCIALMENTE: 'ATENDIDA_PARCIALMENTE',
});

// RF-16: o que fica registrado no log de atividades
export const AcaoLog = Object.freeze({
  LOGIN: 'LOGIN',
  LOGIN_RECUSADO: 'LOGIN_RECUSADO',
  LOGOUT: 'LOGOUT',
  ACESSO_NEGADO: 'ACESSO_NEGADO',
  SENHA_ALTERADA: 'SENHA_ALTERADA',
  SENHA_REDEFINIDA: 'SENHA_REDEFINIDA',
  USUARIO_CADASTRADO: 'USUARIO_CADASTRADO',
  USUARIO_DESATIVADO: 'USUARIO_DESATIVADO',
  USUARIO_REATIVADO: 'USUARIO_REATIVADO',
  DOADOR_CADASTRADO: 'DOADOR_CADASTRADO',
  DOADOR_ATUALIZADO: 'DOADOR_ATUALIZADO',
  TRIAGEM_REGISTRADA: 'TRIAGEM_REGISTRADA',
  INAPTIDAO_REGISTRADA: 'INAPTIDAO_REGISTRADA',
  DOACAO_REGISTRADA: 'DOACAO_REGISTRADA',
  BOLSAS_DESCARTADAS: 'BOLSAS_DESCARTADAS',
  SOLICITACAO_REGISTRADA: 'SOLICITACAO_REGISTRADA',
  SOLICITACAO_ATENDIDA: 'SOLICITACAO_ATENDIDA',
  RELATORIO_GERADO: 'RELATORIO_GERADO',
});

export const ROTULO_ACAO_LOG = Object.freeze({
  LOGIN: 'Entrou no sistema',
  LOGIN_RECUSADO: 'Login recusado',
  LOGOUT: 'Saiu do sistema',
  ACESSO_NEGADO: 'Acesso negado',
  SENHA_ALTERADA: 'Alterou a própria senha',
  SENHA_REDEFINIDA: 'Gerou senha temporária',
  USUARIO_CADASTRADO: 'Cadastrou usuário',
  USUARIO_DESATIVADO: 'Desativou usuário',
  USUARIO_REATIVADO: 'Reativou usuário',
  DOADOR_CADASTRADO: 'Cadastrou doador',
  DOADOR_ATUALIZADO: 'Editou doador',
  TRIAGEM_REGISTRADA: 'Registrou triagem',
  INAPTIDAO_REGISTRADA: 'Registrou inaptidão',
  DOACAO_REGISTRADA: 'Registrou doação',
  BOLSAS_DESCARTADAS: 'Descartou bolsas',
  SOLICITACAO_REGISTRADA: 'Registrou solicitação',
  SOLICITACAO_ATENDIDA: 'Atendeu solicitação',
  RELATORIO_GERADO: 'Gerou relatório',
});
