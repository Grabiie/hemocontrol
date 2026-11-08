import { Usuario } from './Usuario.js';
import { Triagem } from './Triagem.js';

// <<abstract>> ProfissionalDeSaude: Medico e Enfermeiro herdam a triagem
export class ProfissionalDeSaude extends Usuario {
  constructor(dados) {
    super(dados);
    if (new.target === ProfissionalDeSaude) {
      throw new Error('ProfissionalDeSaude é abstrata: crie um Medico ou Enfermeiro.');
    }
  }

  realizarTriagem(doador, medicao) {
    return new Triagem({ doador, medicao });
  }
}
