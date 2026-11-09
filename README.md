# HemoControl — Sistema de Gestão de Banco de Sangue

Projeto da disciplina **Análise e Projeto de Sistemas**, com documentação de análise e projeto e implementação inicial versionada com Git.

## Integrante

- Gabriel José

## Descrição

O HemoControl é um sistema para gerenciar o ciclo de doação de sangue: cadastro de doadores, triagem, registro de doações, controle de estoque por tipo sanguíneo e atendimento de solicitações de hospitais.

O objetivo é substituir controles manuais (papel e planilhas), reduzindo perdas de bolsas por validade e dando visibilidade ao estoque crítico.

### Perfis de usuário

- **Recepcionista:** cadastra doadores.
- **Profissional de saúde (médico e enfermeiro):** realiza triagem e registra doações.
- **Gestor:** consulta estoque e gera relatórios.
- **Hospital solicitante (sistema externo):** solicita bolsas.

### Funcionalidades planejadas

- Autenticação por perfil
- Cadastro de doadores
- Triagem (apto/inapto)
- Registro de doações e geração de bolsas
- Consulta de estoque e alerta de estoque crítico
- Registro e atendimento de solicitações de bolsas
- Descarte de bolsas vencidas
- Relatório mensal

> O escopo implementado até o momento está descrito na seção [Status do projeto](#status-do-projeto).

## Tecnologias

- Node.js (ES Modules)
- Express
- SQLite
- HTML/CSS/JavaScript para a interface

## Como executar

Pré-requisito: [Node.js](https://nodejs.org/) instalado.

```bash
git clone https://github.com/Grabiie/hemocontrol
cd hemocontrol
npm install
npm start
```

O servidor sobe em `http://localhost:3000`.

Para criar as contas de demonstração e popular o estoque com bolsas de exemplo:

```bash
npm run seed
```

### Contas de demonstração

Todas usam a senha `hemo123`. Cada perfil só acessa as funções que o diagrama de casos de uso atribui a ele, e todos podem consultar o histórico de doações.

| Usuário | Perfil | Pode fazer |
|---|---|---|
| `recepcao` | Recepcionista | Cadastrar doador |
| `medico` | Médico | Realizar triagem e registrar inaptidão temporária |
| `enfermeiro` | Enfermeiro | Realizar triagem e registrar doação (inclusive coleta interrompida) |
| `gestor` | Gestor | Consultar estoque, registrar e atender solicitações, descartar bolsas vencidas e gerar relatório mensal |

As contas também são criadas automaticamente na primeira vez que o servidor sobe.

### Integração com hospitais (RF-07 e RNF-05)

O sistema do hospital envia solicitações para `POST /api/integracao/solicitacoes`, autenticando-se com a chave de acesso no cabeçalho `X-Chave-Acesso`. O sistema do hospital é simulado; os hospitais de demonstração são:

| Hospital | Chave de acesso |
|---|---|
| Hospital Santa Clara | `hsc-demo-7f3a9c` |
| Hospital São Lucas | `hsl-demo-2b8e4d` |

Exemplo (com o servidor rodando):

```bash
curl -X POST http://localhost:3000/api/integracao/solicitacoes \
  -H "Content-Type: application/json" \
  -H "X-Chave-Acesso: hsl-demo-2b8e4d" \
  -d '{"tipoSanguineo": "A_POSITIVO", "quantidade": 3}'
```

Sem a chave, a resposta é `401`; com uma chave inválida, `403`.

Para rodar os testes das regras de negócio:

```bash
npm test
```

## Estrutura do repositório

```
hemocontrol/
├── docs/              # documentação (requisitos, casos de uso, diagrama de classes)
├── public/            # interface web (HTML, CSS e JavaScript)
├── src/
│   ├── models/        # classes de domínio do diagrama de classes
│   ├── database.js    # criação das tabelas SQLite
│   ├── repositorios.js# leitura e gravação no banco
│   ├── sessoes.js     # login, sessões e permissões por perfil
│   ├── seed.js        # dados de exemplo
│   └── server.js      # API REST com Express
├── test/              # testes das regras de negócio
├── package.json
├── README.md
├── LICENSE
└── .gitignore
```

## Documentação

Os artefatos de análise e projeto ficam na pasta [`docs/`](docs/):

- Requisitos (RF, RNF e RN)
- Diagrama de casos de uso e descrições textuais
- Diagrama de classes de projeto

## Status do projeto

Em desenvolvimento. Implementação inicial focada no fluxo principal do banco de sangue.

- [x] Requisitos
- [x] Diagrama de casos de uso
- [x] Diagrama de classes
- [x] Autenticação por perfil com senha em hash (RF-01, RNF-02)
- [x] Tema claro e escuro, salvo por usuário e por navegador (RNF-06)
- [x] Cadastro de doadores (RF-02, RN-01)
- [x] Triagem com critérios de aptidão (RF-03, RN-02, RN-03, RN-06)
- [x] Registro de doação e geração de bolsa, com limite de volume por peso (RF-04, RN-04, RN-05, RN-07)
- [x] Consulta de estoque com gráfico, alerta de estoque crítico e de bolsas perto de vencer (RF-05, RF-06)
- [x] Solicitações de hospitais, manuais e por integração com chave de acesso (RF-07, RNF-05)
- [x] Atendimento de solicitações priorizando a validade mais próxima, com atendimento parcial (RF-08)
- [x] Listagem e descarte de bolsas vencidas (RF-09)
- [x] Relatório mensal com destino das bolsas e exportação em PDF e CSV (RF-10)
- [x] Registro de inaptidão temporária (RF-11)
- [x] Histórico de doações por doador, com a próxima data em que ele pode doar (RF-12)
- [x] Doação cancelada por coleta interrompida (fluxo alternativo de RF-04)

## Convenção de commits

O projeto segue [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

```
feat: adiciona cadastro de doador
fix: corrige validação de CPF duplicado
docs: adiciona diagrama de classes
refactor: separa regras de triagem em classe própria
```

## Licença

Distribuído sob a licença MIT. Veja o arquivo [LICENSE](LICENSE).
