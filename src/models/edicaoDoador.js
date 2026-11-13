import { Doador } from './Doador.js';

// Regras do cadastro e da edição de doador, usadas pela Recepcionista (RF-02 e RF-13)
// e pelo Gestor (RF-13).

// RN-11: o cadastro só aceita quem tem de 16 a 69 anos, a faixa em que se pode doar
export function conferirIdade(doador) {
  if (!doador.estaNaFaixaDeIdade()) {
    throw new Error(
      `O doador precisa ter de ${Doador.IDADE_MINIMA} a ${Doador.IDADE_MAXIMA} anos; ` +
      `pela data de nascimento informada ele tem ${doador.calcularIdade()} (RN-11).`,
    );
  }
}

// RF-13: corrige os dados cadastrais e devolve o doador atualizado.
// O CPF identifica o doador e não muda (RN-01). Sexo e tipo sanguíneo só podem
// ser corrigidos enquanto ele não tiver doações, porque definem o intervalo
// entre doações (RN-03) e o tipo das bolsas já geradas (RN-08).
export function corrigirDadosDoDoador(atual, novosDados, possuiDoacoes) {
  if (!(atual instanceof Doador)) throw new Error('Doador não encontrado.');

  const sexo = novosDados.sexo ?? atual.sexo;
  const tipoSanguineo = novosDados.tipoSanguineo ?? atual.tipoSanguineo;
  if (possuiDoacoes && (sexo !== atual.sexo || tipoSanguineo !== atual.tipoSanguineo)) {
    throw new Error('Sexo e tipo sanguíneo não podem ser alterados depois da primeira doação (RN-08).');
  }

  const telefone = String(novosDados.telefone ?? atual.telefone).replace(/\D/g, '');
  if (telefone && ![10, 11].includes(telefone.length)) {
    throw new Error('Telefone inválido: informe o DDD e o número, com 10 ou 11 dígitos.');
  }

  const atualizado = new Doador({
    id: atual.id,
    cpf: atual.cpf,
    nome: novosDados.nome ?? atual.nome,
    dataNascimento: novosDados.dataNascimento ?? atual.dataNascimento,
    sexo,
    tipoSanguineo,
    telefone,
    consentimentoResponsavel: novosDados.consentimentoResponsavel ?? atual.consentimentoResponsavel,
  });
  // RN-11 só vale quando a data de nascimento for corrigida: quem já está cadastrado
  // pode passar dos 69 anos e continuar tendo os outros dados atualizados
  if (atualizado.dataNascimento.getTime() !== atual.dataNascimento.getTime()) {
    if (atualizado.dataNascimento > new Date()) throw new Error('A data de nascimento não pode estar no futuro.');
    conferirIdade(atualizado);
  }
  return atualizado;
}
