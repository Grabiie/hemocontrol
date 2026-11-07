// Popula o estoque com bolsas de exemplo para demonstração.
// Uso: npm run seed
import { BolsaSangue } from './models/BolsaSangue.js';
import { TipoSanguineo } from './models/enums.js';
import { somarDias } from './models/datas.js';
import { salvarBolsaAvulsa } from './repositorios.js';

// Quantidade por tipo: alguns acima e outros abaixo do limite crítico
const quantidades = {
  [TipoSanguineo.A_POSITIVO]: 14,
  [TipoSanguineo.A_NEGATIVO]: 6,
  [TipoSanguineo.B_POSITIVO]: 11,
  [TipoSanguineo.B_NEGATIVO]: 3,
  [TipoSanguineo.AB_POSITIVO]: 10,
  [TipoSanguineo.AB_NEGATIVO]: 2,
  [TipoSanguineo.O_POSITIVO]: 18,
  [TipoSanguineo.O_NEGATIVO]: 9,
};

let total = 0;
for (const [tipo, quantidade] of Object.entries(quantidades)) {
  for (let i = 0; i < quantidade; i++) {
    const dataColeta = somarDias(new Date(), -(i % 20)); // coletas dos últimos 20 dias
    salvarBolsaAvulsa(new BolsaSangue({ tipoSanguineo: tipo, volumeMl: 450, dataColeta }));
    total++;
  }
}

console.log(`${total} bolsas de exemplo adicionadas ao estoque.`);
