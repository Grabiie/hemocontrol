// Cria as contas de demonstração e popula o estoque com bolsas de exemplo.
// Uso: npm run seed
import { BolsaSangue } from './models/BolsaSangue.js';
import { TipoSanguineo } from './models/enums.js';
import { somarDias } from './models/datas.js';
import { salvarBolsaAvulsa, garantirUsuariosDemo, garantirHospitaisDemo, SENHA_DEMO } from './repositorios.js';

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

// Algumas bolsas já vencidas (coletadas há 40 dias), para demonstrar o descarte (RF-09)
const vencidas = [TipoSanguineo.A_POSITIVO, TipoSanguineo.O_POSITIVO, TipoSanguineo.B_POSITIVO, TipoSanguineo.O_POSITIVO];
for (const tipo of vencidas) {
  salvarBolsaAvulsa(new BolsaSangue({ tipoSanguineo: tipo, volumeMl: 450, dataColeta: somarDias(new Date(), -40) }));
}

console.log(`${total} bolsas de exemplo adicionadas ao estoque.`);
console.log(`${vencidas.length} bolsas vencidas adicionadas para demonstrar o descarte.`);

const criados = garantirUsuariosDemo();
if (criados > 0) console.log(`${criados} contas de demonstração criadas (senha: ${SENHA_DEMO}).`);

if (garantirHospitaisDemo() > 0) console.log('Hospitais de demonstração criados (veja as chaves de integração no README).');
