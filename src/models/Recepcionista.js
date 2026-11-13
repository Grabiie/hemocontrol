import { Usuario } from './Usuario.js';
import { Doador } from './Doador.js';
import { conferirIdade, corrigirDadosDoDoador } from './edicaoDoador.js';

export class Recepcionista extends Usuario {
  static PERFIL = 'RECEPCIONISTA';

  // RF-02: confere o doador antes de ele ser salvo; a gravação no banco
  // e a busca ficam com o repositório (camada de persistência).
  cadastrarDoador(doador) {
    if (!(doador instanceof Doador)) throw new Error('Informe os dados do doador.');
    if (!doador.validarCpf()) throw new Error('CPF inválido (RN-01).');
    conferirIdade(doador);
  }

  // RF-13: as regras da edição ficam em edicaoDoador.js, compartilhadas com o Gestor
  editarDoador(atual, novosDados, possuiDoacoes) {
    return corrigirDadosDoDoador(atual, novosDados, possuiDoacoes);
  }
}
