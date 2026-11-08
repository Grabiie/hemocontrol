import { ProfissionalDeSaude } from './ProfissionalDeSaude.js';
import { InaptidaoTemporaria } from './InaptidaoTemporaria.js';

export class Medico extends ProfissionalDeSaude {
  static PERFIL = 'MEDICO';

  #crm;

  constructor({ crm, ...dados }) {
    super(dados);
    this.#crm = crm;
  }

  get crm() { return this.#crm; }

  // RF-11: só faz sentido para uma triagem com resultado "inapto"
  registrarInaptidao(triagem, motivo, prazoDias) {
    if (triagem.estaApta()) {
      throw new Error('A inaptidão temporária só pode ser registrada para uma triagem com resultado "inapto".');
    }
    return new InaptidaoTemporaria({ motivo, prazoDias });
  }
}
