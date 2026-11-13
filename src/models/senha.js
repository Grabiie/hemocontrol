import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// RNF-02: senhas armazenadas com hash (scrypt + salt), nunca em texto puro

export function gerarHashSenha(senha) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(senha, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

// RF-14: senha temporária entregue pelo gestor (sem letras e números que se confundem, como O e 0)
export function gerarSenhaTemporaria() {
  const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  const s = [...bytes].map((b) => alfabeto[b % alfabeto.length]).join('');
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export function conferirSenha(senha, senhaHash) {
  const [salt, hash] = String(senhaHash).split(':');
  if (!salt || !hash) return false;
  const esperado = Buffer.from(hash, 'hex');
  const calculado = scryptSync(String(senha), salt, esperado.length);
  return timingSafeEqual(esperado, calculado);
}
