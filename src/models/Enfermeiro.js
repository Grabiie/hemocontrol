import { ProfissionalDeSaude } from './ProfissionalDeSaude.js';
import { Doacao } from './Doacao.js';

export class Enfermeiro extends ProfissionalDeSaude {
  static PERFIL = 'ENFERMEIRO';

  #coren;

  constructor({ coren, ...dados }) {
    super(dados);
    this.#coren = coren;
  }

  get coren() { return this.#coren; }

  registrarDoacao(triagem, volumeMl) {
    return new Doacao({ triagem, volumeMl });
  }
}
