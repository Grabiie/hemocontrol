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

  // Fluxo alternativo 3a de Registrar Doação: com a coleta interrompida,
  // a doação é registrada como cancelada e não gera bolsa.
  registrarDoacao(triagem, volumeMl, coletaInterrompida = false) {
    return new Doacao({ triagem, volumeMl, cancelada: Boolean(coletaInterrompida) });
  }
}
