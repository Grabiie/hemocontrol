import { Sexo, TipoSanguineo, validarEnum } from './enums.js';
import { diasEntre, somarDias } from './datas.js';

// RN-02: idade mínima e limite para a primeira doação
const IDADE_MINIMA = 16;
const IDADE_MAIORIDADE = 18;
const IDADE_MAXIMA_PRIMEIRA_DOACAO = 60;

// RN-03: intervalo mínimo (dias) e limite anual de doações por sexo
const INTERVALO_DIAS = { [Sexo.MASCULINO]: 60, [Sexo.FEMININO]: 90 };
const LIMITE_ANUAL = { [Sexo.MASCULINO]: 4, [Sexo.FEMININO]: 3 };

export class Doador {
  #id;
  #nome;
  #cpf;
  #dataNascimento;
  #sexo;
  #tipoSanguineo;
  #telefone;
  #consentimentoResponsavel;

  constructor({ id = null, nome, cpf, dataNascimento, sexo, tipoSanguineo, telefone, consentimentoResponsavel = false }) {
    if (!nome || !nome.trim()) throw new Error('O nome do doador é obrigatório.');

    this.#id = id;
    this.#nome = nome.trim();
    this.#cpf = String(cpf).replace(/\D/g, '');
    this.#dataNascimento = new Date(dataNascimento);
    this.#sexo = validarEnum(Sexo, sexo, 'sexo');
    this.#tipoSanguineo = validarEnum(TipoSanguineo, tipoSanguineo, 'tipo sanguíneo');
    // Guarda só os dígitos: 10 (fixo) ou 11 (celular), com DDD
    this.#telefone = String(telefone ?? '').replace(/\D/g, '');
    this.#consentimentoResponsavel = Boolean(consentimentoResponsavel);

    if (Number.isNaN(this.#dataNascimento.getTime())) throw new Error('Data de nascimento inválida.');
    if (!this.validarCpf()) throw new Error('CPF inválido.');
    // Só valida no cadastro (id nulo), para não quebrar registros antigos já salvos no banco
    if (id === null && this.#telefone && ![10, 11].includes(this.#telefone.length)) {
      throw new Error('Telefone inválido: informe o DDD e o número, com 10 ou 11 dígitos.');
    }
  }

  get id() { return this.#id; }
  get nome() { return this.#nome; }
  get cpf() { return this.#cpf; }
  get dataNascimento() { return this.#dataNascimento; }
  get sexo() { return this.#sexo; }
  get tipoSanguineo() { return this.#tipoSanguineo; }
  get telefone() { return this.#telefone; }
  get consentimentoResponsavel() { return this.#consentimentoResponsavel; }

  // Validação dos dígitos verificadores do CPF
  validarCpf() {
    const cpf = this.#cpf;
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    const digito = (tamanho) => {
      let soma = 0;
      for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i);
      const resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
    };

    return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
  }

  calcularIdade(dataReferencia = new Date()) {
    const nasc = this.#dataNascimento;
    let idade = dataReferencia.getFullYear() - nasc.getFullYear();
    const aindaNaoFezAniversario =
      dataReferencia.getMonth() < nasc.getMonth() ||
      (dataReferencia.getMonth() === nasc.getMonth() && dataReferencia.getDate() < nasc.getDate());
    if (aindaNaoFezAniversario) idade--;
    return idade;
  }

  // RN-02 e RN-03: lista os motivos que impedem a doação na data informada
  listarImpedimentos(data, datasDoacoes = []) {
    const motivos = [];
    const idade = this.calcularIdade(data);

    if (idade < IDADE_MINIMA) {
      motivos.push(`Idade abaixo do mínimo de ${IDADE_MINIMA} anos (RN-02).`);
    } else if (idade < IDADE_MAIORIDADE && !this.#consentimentoResponsavel) {
      motivos.push('Menor de 18 anos sem consentimento do responsável (RN-02).');
    }
    if (datasDoacoes.length === 0 && idade > IDADE_MAXIMA_PRIMEIRA_DOACAO) {
      motivos.push(`Primeira doação só é permitida até ${IDADE_MAXIMA_PRIMEIRA_DOACAO} anos (RN-02).`);
    }

    if (datasDoacoes.length > 0) {
      const ultima = new Date(Math.max(...datasDoacoes.map((d) => d.getTime())));
      const intervalo = INTERVALO_DIAS[this.#sexo];
      const diasDesdeUltima = diasEntre(ultima, data);
      if (diasDesdeUltima < intervalo) {
        const quando =
          diasDesdeUltima === 0 ? 'hoje' :
          diasDesdeUltima === 1 ? 'há 1 dia' :
          `há ${diasDesdeUltima} dias`;
        motivos.push(`Última doação ${quando}; o intervalo mínimo é de ${intervalo} dias (RN-03).`);
      }

      const limite = LIMITE_ANUAL[this.#sexo];
      const doacoesNoUltimoAno = datasDoacoes.filter((d) => diasEntre(d, data) < 365).length;
      if (doacoesNoUltimoAno >= limite) {
        motivos.push(`Limite de ${limite} doações nos últimos 12 meses atingido (RN-03).`);
      }
    }

    return motivos;
  }

  // RN-03: primeira data em que o intervalo mínimo e o limite anual estarão cumpridos.
  // Retorna null para quem nunca doou (não há espera a cumprir).
  calcularProximaDataDoacao(datasDoacoes = []) {
    if (datasDoacoes.length === 0) return null;

    const datas = [...datasDoacoes].sort((a, b) => a - b);
    const limite = LIMITE_ANUAL[this.#sexo];
    let proxima = somarDias(datas[datas.length - 1], INTERVALO_DIAS[this.#sexo]);

    // Enquanto houver doações demais nos 12 meses anteriores, espera a mais antiga sair da janela
    for (;;) {
      const noUltimoAno = datas.filter((d) => diasEntre(d, proxima) < 365);
      if (noUltimoAno.length < limite) return proxima;
      proxima = somarDias(noUltimoAno[noUltimoAno.length - limite], 365);
    }
  }

  podeDoarEm(data, datasDoacoes = []) {
    return this.listarImpedimentos(data, datasDoacoes).length === 0;
  }

  toJSON() {
    return {
      id: this.#id,
      nome: this.#nome,
      cpf: this.#cpf,
      dataNascimento: this.#dataNascimento.toISOString().slice(0, 10),
      sexo: this.#sexo,
      tipoSanguineo: this.#tipoSanguineo,
      telefone: this.#telefone,
      consentimentoResponsavel: this.#consentimentoResponsavel,
    };
  }
}
