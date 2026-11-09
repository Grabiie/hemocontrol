# Diagrama de Classes (projeto) — HemoControl

Especificação das classes e relacionamentos, na notação da Aula 6 e 7. O diagrama desenhado no Draw.io está em `diagrama-de-classes.png`.

## Convenções

- Atributos: `visibilidade nome: tipo = valorInicial {propriedades}`
- Métodos: `visibilidade nome(parâmetros): tipoRetorno`
- Visibilidade: `-` privado (atributos), `+` público (métodos e constantes)
- Nomes de classe no singular, como substantivos. Atributos e métodos em camelCase.
- Constantes ligadas às regras de negócio usam `{readOnly}`.

## Enumerações

Desenhe como caixas `<<enumeration>>`, sem linhas ligando aos atributos que as usam.

```
<<enumeration>>
TipoSanguineo
A_POSITIVO, A_NEGATIVO, B_POSITIVO, B_NEGATIVO,
AB_POSITIVO, AB_NEGATIVO, O_POSITIVO, O_NEGATIVO
```

```
<<enumeration>>
Sexo
MASCULINO, FEMININO
```

```
<<enumeration>>
StatusBolsa
DISPONIVEL, ENTREGUE, DESCARTADA
```

```
<<enumeration>>
StatusSolicitacao
PENDENTE, ATENDIDA, ATENDIDA_PARCIALMENTE
```

## Classes

### Hierarquia de usuários

```
<<abstract>>
Usuario
-----------------------------------
- id: int
- nome: String
- cpf: String
- login: String
- senhaHash: String
-----------------------------------
+ autenticar(login: String, senha: String): boolean
+ getNome(): String
```

```
Recepcionista
-----------------------------------
(sem atributos próprios)
-----------------------------------
+ cadastrarDoador(doador: Doador): void
```

```
Gestor
-----------------------------------
(sem atributos próprios)
-----------------------------------
+ registrarSolicitacao(solicitacao: Solicitacao): void
+ atenderSolicitacao(solicitacao: Solicitacao, estoque: Estoque, aceitaParcial: boolean): boolean
+ descartarBolsasVencidas(estoque: Estoque): int
+ gerarRelatorioMensal(mes: int, ano: int): RelatorioMensal
```

```
<<abstract>>
ProfissionalDeSaude
-----------------------------------
(sem atributos próprios)
-----------------------------------
+ realizarTriagem(doador: Doador, medicao: MedicaoClinica): Triagem
```

```
Medico
-----------------------------------
- crm: String
-----------------------------------
+ registrarInaptidao(triagem: Triagem, motivo: String, prazoDias: int): InaptidaoTemporaria
```

```
Enfermeiro
-----------------------------------
- coren: String
-----------------------------------
+ registrarDoacao(triagem: Triagem, volumeMl: int, coletaInterrompida: boolean): Doacao
```

### Doador, triagem e doação

```
Doador
-----------------------------------
- id: int
- nome: String
- cpf: String
- dataNascimento: Date
- sexo: Sexo
- tipoSanguineo: TipoSanguineo
- telefone: String
- consentimentoResponsavel: boolean = false
-----------------------------------
+ validarCpf(): boolean
+ calcularIdade(dataReferencia: Date): int
+ listarImpedimentos(data: Date, datasDoacoes: List<Date>): List<String>
+ calcularProximaDataDoacao(datasDoacoes: List<Date>): Date
+ podeDoarEm(data: Date, datasDoacoes: List<Date>): boolean
```

```
MedicaoClinica
-----------------------------------
- peso: double
- pressaoSistolica: int
- pressaoDiastolica: int
- hemoglobina: double
-----------------------------------
+ listarAlteracoes(sexo: Sexo): List<String>
+ calcularVolumeMaximo(sexo: Sexo): int
+ estaDentroDosLimites(sexo: Sexo): boolean
```

```
Triagem
-----------------------------------
- id: int
- dataHora: Date
- apto: boolean = false
- motivos: List<String>
-----------------------------------
+ avaliar(datasDoacoes: List<Date>, inaptidoes: List<InaptidaoTemporaria>): boolean
+ estaApta(): boolean
+ getMotivos(): List<String>
```

```
InaptidaoTemporaria
-----------------------------------
- id: int
- motivo: String
- dataInicio: Date
- dataFim: Date
+ PRAZO_MAXIMO_DIAS: int = 365 {readOnly}
-----------------------------------
+ estaVigente(data: Date): boolean
```

```
Doacao
-----------------------------------
- id: int
- dataHora: Date
- volumeMl: int
- cancelada: boolean = false
+ VOLUME_MINIMO_ML: int = 300 {readOnly}
+ VOLUME_MAXIMO_ML: int = 495 {readOnly}
-----------------------------------
+ gerarBolsa(): BolsaSangue
+ cancelar(): void
```

### Bolsas e estoque

```
BolsaSangue
-----------------------------------
- codigo: String
- tipoSanguineo: TipoSanguineo
- volumeMl: int
- dataColeta: Date
- dataValidade: Date
- status: StatusBolsa = DISPONIVEL
- dataDescarte: Date
+ VALIDADE_DIAS: int = 35 {readOnly}
-----------------------------------
+ calcularValidade(): Date
+ estaVencida(dataReferencia: Date): boolean
+ descartar(): void
+ marcarEntregue(): void
```

```
Estoque
-----------------------------------
+ LIMITE_CRITICO: int = 10 {readOnly}
+ DIAS_ALERTA_VENCIMENTO: int = 7 {readOnly}
-----------------------------------
+ adicionarBolsa(bolsa: BolsaSangue): void
+ consultarDisponiveis(tipo: TipoSanguineo): List<BolsaSangue>
+ estaCritico(tipo: TipoSanguineo): boolean
+ listarProximasDoVencimento(dataReferencia: Date): List<BolsaSangue>
+ listarVencidas(dataReferencia: Date): List<BolsaSangue>
+ descartarVencidas(dataReferencia: Date): int
```

### Solicitações e relatório

```
Hospital
-----------------------------------
- id: int
- nome: String
- cnpj: String
- chaveAcesso: String
-----------------------------------
+ validarChave(chave: String): boolean
```

```
Solicitacao
-----------------------------------
- id: int
- dataSolicitacao: Date
- tipoSanguineo: TipoSanguineo
- quantidade: int
- status: StatusSolicitacao = PENDENTE
- origemManual: boolean = false
- dataAtendimento: Date
+ QUANTIDADE_MAXIMA: int = 50 {readOnly}
-----------------------------------
+ atender(estoque: Estoque, aceitaParcial: boolean): boolean
+ getQuantidadeAtendida(): int
```

```
RelatorioMensal
-----------------------------------
- mes: int
- ano: int
- totalDoacoes: int
- totalBolsasDescartadas: int
- totalSolicitacoesAtendidas: int
-----------------------------------
+ calcularTotais(datasDoacoes: List<Date>, bolsas: List<BolsaSangue>, datasAtendimentos: List<Date>): void
```

## Relacionamentos

A multiplicidade fica ao lado da classe a que se refere, como no exemplo `Cliente "1" -- "0..*" Locacao` da Aula 5.

| # | Classe A | Mult. A | Nome (verbo) | Mult. B | Classe B | Tipo |
|---|---|---|---|---|---|---|
| 1 | Recepcionista | | — | | Usuario | Generalização |
| 2 | Gestor | | — | | Usuario | Generalização |
| 3 | ProfissionalDeSaude | | — | | Usuario | Generalização |
| 4 | Medico | | — | | ProfissionalDeSaude | Generalização |
| 5 | Enfermeiro | | — | | ProfissionalDeSaude | Generalização |
| 6 | Doador | 1 | passa por | 0..* | Triagem | Associação |
| 7 | ProfissionalDeSaude | 1 | realiza | 0..* | Triagem | Associação |
| 8 | Triagem | 1 | é composta por | 1 | MedicaoClinica | **Composição** (losango em Triagem) |
| 9 | Triagem | 1 | resulta em | 0..1 | InaptidaoTemporaria | Associação |
| 10 | Medico | 1 | registra | 0..* | InaptidaoTemporaria | Associação |
| 11 | Triagem | 1 | autoriza | 0..1 | Doacao | Associação |
| 12 | Enfermeiro | 1 | coleta | 0..* | Doacao | Associação |
| 13 | Doacao | 1 | gera | 0..1 | BolsaSangue | Associação |
| 14 | Estoque | 1 | agrega | 0..* | BolsaSangue | **Agregação** (losango em Estoque) |
| 15 | Solicitacao | 0..1 | recebe | 0..* | BolsaSangue | Associação |
| 16 | Hospital | 1 | faz | 0..* | Solicitacao | Associação |
| 17 | Gestor | 1 | gera | 0..* | RelatorioMensal | Associação |

### Justificativa das classificações (árvore de decisão da Aula 6 e 7)

- **Generalização:** Recepcionista, Gestor e ProfissionalDeSaude "são um" Usuario, pois compartilham os dados de acesso. Médico e Enfermeiro "são um" ProfissionalDeSaude, como no diagrama de casos de uso.
- **Composição (Triagem e MedicaoClinica):** a parte sobrevive sem o todo? Não. Peso, pressão e hemoglobina só fazem sentido dentro de uma triagem.
- **Agregação (Estoque e BolsaSangue):** a parte sobrevive sem o todo? Sim. A bolsa continua existindo depois de sair do estoque, quando é entregue a uma solicitação.
- **Demais relacionamentos:** não há herança nem relação todo-parte, então são associações simples.

## Coerência com os outros artefatos

| Artefato | Onde aparece no diagrama de classes |
|---|---|
| RN-01 (CPF único) | `Doador.cpf` e `validarCpf()` |
| RN-02 (idade e peso) | `Doador.calcularIdade()`, `consentimentoResponsavel`, `MedicaoClinica.peso` |
| RN-03 (intervalo) | `Doador.podeDoarEm()` e `Doador.calcularProximaDataDoacao()` |
| RN-04 (validade) | `BolsaSangue.VALIDADE_DIAS`, `calcularValidade()`, `estaVencida()` |
| RN-05 (triagem obrigatória) | associação Triagem 1 → 0..1 Doacao |
| RN-07 (volume da doação) | `Doacao.VOLUME_MINIMO_ML`, `Doacao.VOLUME_MAXIMO_ML` e `MedicaoClinica.calcularVolumeMaximo()` |
| RN-06 (critérios clínicos) | `MedicaoClinica.estaDentroDosLimites()` |
| RF-05 (bolsas perto de vencer) | `Estoque.DIAS_ALERTA_VENCIMENTO` e `Estoque.listarProximasDoVencimento()` |
| RF-06 (alerta de estoque) | `Estoque.LIMITE_CRITICO` e `estaCritico()` |
| RF-07 (solicitação manual ou integrada) | `Solicitacao.origemManual` |
| RNF-05 (chave de acesso) | `Hospital.chaveAcesso` e `validarChave()` |
| RF-09 (descarte) | `Gestor.descartarBolsasVencidas()`, `Estoque.listarVencidas()`, `BolsaSangue.dataDescarte` |
| RF-10 (relatório) | `Gestor.gerarRelatorioMensal()` e `RelatorioMensal.calcularTotais()` |
| RF-07 (registrar solicitação) | classe `Solicitacao`, `Solicitacao.origemManual` e `Gestor.registrarSolicitacao()` |
| RF-08 (atender solicitação) | `Solicitacao.atender()` e `Gestor.atenderSolicitacao()` |
| RF-11 (inaptidão temporária) | classe `InaptidaoTemporaria`, `Medico.registrarInaptidao()` e o parâmetro `inaptidoes` de `Triagem.avaliar()` |
| Fluxo 3a de Registrar Doação (coleta interrompida) | `Doacao.cancelada`, `Doacao.cancelar()` e `Enfermeiro.registrarDoacao(..., coletaInterrompida)` |

## Checklist antes de exportar

- [ ] Atributos com visibilidade e tipo; métodos com visibilidade, parâmetros e retorno
- [ ] Multiplicidade nas duas pontas de **todas** as associações
- [ ] Losango vazado em Estoque (agregação) e preenchido em Triagem (composição)
- [ ] Triângulo vazado nas setas de herança, apontando para a superclasse
- [ ] Usuario e ProfissionalDeSaude marcadas como `<<abstract>>`
- [ ] Nomes de classe no singular e sem acentos
