import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// RNF-02: senhas armazenadas com hash (scrypt + salt), nunca em texto puro

export function gerarHashSenha(senha) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(senha, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function conferirSenha(senha, senhaHash) {
  const [salt, hash] = String(senhaHash).split(':');
  if (!salt || !hash) return false;
  const esperado = Buffer.from(hash, 'hex');
  const calculado = scryptSync(String(senha), salt, esperado.length);
  return timingSafeEqual(esperado, calculado);
}
