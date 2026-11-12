import { Usuario } from './Usuario.js';
import { Doador } from './Doador.js';

export class Recepcionista extends Usuario {
  static PERFIL = 'RECEPCIONISTA';

  // RF-02: confere o doador antes de ele ser salvo; a gravação no banco
  // e a busca ficam com o repositório (camada de persistência).
  cadastrarDoador(doador) {
    if (!(doador instanceof Doador)) throw new Error('Informe os dados do doador.');
    if (!doador.validarCpf()) throw new Error('CPF inválido (RN-01).');
  }

  // RF-13: corrige os dados cadastrais e devolve o doador atualizado.
  // O CPF identifica o doador e não muda (RN-01). Sexo e tipo sanguíneo só podem
  // ser corrigidos enquanto ele não tiver doações, porque definem o intervalo
  // entre doações (RN-03) e o tipo das bolsas já geradas (RN-08).
  editarDoador(atual, novosDados, possuiDoacoes) {
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

    return new Doador({
      id: atual.id,
      cpf: atual.cpf,
      nome: novosDados.nome ?? atual.nome,
      dataNascimento: novosDados.dataNascimento ?? atual.dataNascimento,
      sexo,
      tipoSanguineo,
      telefone,
      consentimentoResponsavel: novosDados.consentimentoResponsavel ?? atual.consentimentoResponsavel,
    });
  }
}
