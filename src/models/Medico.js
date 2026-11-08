import { ProfissionalDeSaude } from './ProfissionalDeSaude.js';

export class Medico extends ProfissionalDeSaude {
  static PERFIL = 'MEDICO';

  #crm;

  constructor({ crm, ...dados }) {
    super(dados);
    this.#crm = crm;
  }

  get crm() { return this.#crm; }
}
