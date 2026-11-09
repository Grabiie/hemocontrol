import { Usuario } from './Usuario.js';
import { Doador } from './Doador.js';

export class Recepcionista extends Usuario {
  static PERFIL = 'RECEPCIONISTA';

  // RF-02: confere o doador antes de ele ser salvo; a gravação no banco
  // e a busca por CPF ficam com o repositório (camada de persistência).
  cadastrarDoador(doador) {
    if (!(doador instanceof Doador)) throw new Error('Informe os dados do doador.');
    if (!doador.validarCpf()) throw new Error('CPF inválido (RN-01).');
  }
}
