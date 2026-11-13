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

```
<<enumeration>>
AcaoLog
LOGIN, LOGIN_RECUSADO, LOGOUT, ACESSO_NEGADO,
SENHA_ALTERADA, SENHA_REDEFINIDA, USUARIO_CADASTRADO,
USUARIO_DESATIVADO, USUARIO_REATIVADO, DOADOR_CADASTRADO,
DOADOR_ATUALIZADO, TRIAGEM_REGISTRADA, INAPTIDAO_REGISTRADA,
DOACAO_REGISTRADA, BOLSAS_DESCARTADAS, SOLICITACAO_REGISTRADA,
SOLICITACAO_ATENDIDA, RELATORIO_GERADO
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
- ativo: boolean = true
- deveTrocarSenha: boolean = false
+ SENHA_MINIMA: int = 6 {readOnly}
-----------------------------------
+ autenticar(login: String, senha: String): boolean
+ trocarSenha(senhaAtual: String, novaSenha: String): void
+ redefinirSenhaTemporaria(): String
+ estaAtivo(): boolean
+ precisaTrocarSenha(): boolean
+ desativar(): void
+ reativar(): void
+ getNome(): String
```

```
Recepcionista
-----------------------------------
(sem atributos próprios)
-----------------------------------
+ cadastrarDoador(doador: Doador): void
+ editarDoador(atual: Doador, novosDados: Doador, possuiDoacoes: boolean): Doador
```

```
Gestor
-----------------------------------
+ PERFIS_GERENCIADOS: List<String> = [RECEPCIONISTA, MEDICO, ENFERMEIRO] {readOnly}
-----------------------------------
+ podeGerenciar(usuario: Usuario): boolean
+ registrarSolicitacao(solicitacao: Solicitacao): void
+ atenderSolicitacao(solicitacao: Solicitacao, estoque: Estoque, aceitaParcial: boolean): boolean
+ descartarBolsasVencidas(estoque: Estoque): int
+ gerarRelatorioMensal(mes: int, ano: int): RelatorioMensal
+ rastrear(termo: String): Doacao
+ cadastrarUsuario(nome: String, cpf: String, login: String, perfil: String, registroProfissional: String): Usuario
+ redefinirSenha(usuario: Usuario): String
+ desativarUsuario(usuario: Usuario): void
+ reativarUsuario(usuario: Usuario): void
```

No código, `rastrear()` interpreta o que foi digitado (nº da doação ou código da bolsa) e a busca no banco é feita pela camada de persistência, que devolve a doação com a bolsa e o destino dela.

```
Administrador
-----------------------------------
+ PERFIS_GERENCIADOS: List<String> = [RECEPCIONISTA, MEDICO, ENFERMEIRO, GESTOR] {readOnly}
+ DIAS_MAXIMOS_CONSULTA: int = 90 {readOnly}
-----------------------------------
+ podeGerenciar(usuario: Usuario): boolean
+ cadastrarUsuario(nome: String, cpf: String, login: String, perfil: String, registroProfissional: String): Usuario
+ redefinirSenha(usuario: Usuario): String
+ desativarUsuario(usuario: Usuario): void
+ reativarUsuario(usuario: Usuario): void
+ consultarLogs(de: Date, ate: Date, usuario: Usuario, acao: AcaoLog): List<RegistroLog>
```

O Administrador não herda de Gestor: os dois são Usuario, mas o administrador não tem as funções do banco de sangue (estoque, solicitações, relatório). Os métodos de gestão de contas têm o mesmo nome nas duas classes; o que muda é `PERFIS_GERENCIADOS` (RN-12). No código, `consultarLogs()` confere o período e os filtros, e a busca no banco é feita pela camada de persistência.

```
RegistroLog
-----------------------------------
- id: int
- dataHora: Date
- acao: AcaoLog
- descricao: String
- origem: String
-----------------------------------
(sem métodos de alteração: o registro não muda depois de criado, RNF-07)
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
+ IDADE_MINIMA: int = 16 {readOnly}
+ IDADE_MAXIMA: int = 69 {readOnly}
-----------------------------------
+ validarCpf(): boolean
+ calcularIdade(dataReferencia: Date): int
+ estaNaFaixaDeIdade(dataReferencia: Date): boolean
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
+ equals(outra: MedicaoClinica): boolean
+ estaDentroDosLimites(sexo: Sexo): boolean
```

```
Triagem
-----------------------------------
+ LIMITE_DIARIO: int = 3 {readOnly}
- id: int
- dataHora: Date
- apto: boolean = false
- motivos: List<String>
-----------------------------------
+ avaliar(datasDoacoes: List<Date>, inaptidoes: List<InaptidaoTemporaria>): boolean
+ estaApta(): boolean
+ ehDoDia(data: Date): boolean
+ repeteMedicaoDe(outra: Triagem): boolean
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
+ situacao(dataReferencia: Date): String
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
| 18 | Administrador | | — | | Usuario | Generalização |
| 19 | Usuario | 0..1 | realiza | 0..* | RegistroLog | Associação |

### Justificativa das classificações (árvore de decisão da Aula 6 e 7)

- **Generalização:** Recepcionista, Gestor, Administrador e ProfissionalDeSaude "são um" Usuario, pois compartilham os dados de acesso. Médico e Enfermeiro "são um" ProfissionalDeSaude, como no diagrama de casos de uso.
- **Composição (Triagem e MedicaoClinica):** a parte sobrevive sem o todo? Não. Peso, pressão e hemoglobina só fazem sentido dentro de uma triagem.
- **Agregação (Estoque e BolsaSangue):** a parte sobrevive sem o todo? Sim. A bolsa continua existindo depois de sair do estoque, quando é entregue a uma solicitação.
- **Usuario e RegistroLog (0..1):** o log também registra ações sem usuário logado (login com conta inexistente, solicitação vinda da integração, comando no terminal), por isso o lado do Usuario é 0..1.
- **Demais relacionamentos:** não há herança nem relação todo-parte, então são associações simples.

## Coerência com os outros artefatos

| Artefato | Onde aparece no diagrama de classes |
|---|---|
| RN-01 (CPF único) | `Doador.cpf` e `validarCpf()` |
| RN-02 (idade e peso) | `Doador.IDADE_MINIMA`, `Doador.IDADE_MAXIMA`, `Doador.calcularIdade()`, `consentimentoResponsavel`, `MedicaoClinica.peso` |
| RN-11 (idade no cadastro) | `Doador.estaNaFaixaDeIdade()` e `Recepcionista.cadastrarDoador()` |
| RN-03 (intervalo) | `Doador.podeDoarEm()` e `Doador.calcularProximaDataDoacao()` |
| RN-04 (validade) | `BolsaSangue.VALIDADE_DIAS`, `calcularValidade()`, `estaVencida()` |
| RN-05 (triagem obrigatória) | associação Triagem 1 → 0..1 Doacao |
| RN-07 (volume da doação) | `Doacao.VOLUME_MINIMO_ML`, `Doacao.VOLUME_MAXIMO_ML` e `MedicaoClinica.calcularVolumeMaximo()` |
| RN-06 (critérios clínicos) | `MedicaoClinica.estaDentroDosLimites()` |
| RN-09 (triagem do dia) | `Triagem.ehDoDia()` |
| RN-10 (triagem repetida e limite diário) | `Triagem.LIMITE_DIARIO`, `Triagem.repeteMedicaoDe()` e `MedicaoClinica.equals()` |
| RF-13 e RN-08 (editar doador) | `Recepcionista.editarDoador()` |
| RF-14 (gerenciar usuários) | `cadastrarUsuario()`, `redefinirSenha()`, `desativarUsuario()` e `reativarUsuario()` em Gestor e Administrador, `Usuario.ativo` e `Usuario.redefinirSenhaTemporaria()` |
| RN-12 (quem gerencia cada conta) | `Gestor.PERFIS_GERENCIADOS`, `Administrador.PERFIS_GERENCIADOS` e `podeGerenciar()` |
| RF-17 (rastrear doação ou bolsa) | `Gestor.rastrear()` e `BolsaSangue.situacao()` |
| RF-16 (log de atividades) | classe `RegistroLog`, enumeração `AcaoLog`, `Administrador.consultarLogs()` e `Administrador.DIAS_MAXIMOS_CONSULTA` |
| RNF-07 (integridade do log) | `RegistroLog` sem métodos de alteração |
| RF-15 (alterar a própria senha) | `Usuario.trocarSenha()`, `Usuario.deveTrocarSenha` e `Usuario.SENHA_MINIMA` |
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
- [ ] Administrador ligado a Usuario (não a Gestor)
- [ ] Nomes de classe no singular e sem acentos
