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
git clone <URL-DO-REPOSITORIO>
cd hemocontrol
npm install
npm start
```

O servidor sobe em `http://localhost:3000`.

Para popular o estoque com bolsas de exemplo (útil para demonstração):

```bash
npm run seed
```

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
- [x] Cadastro de doadores (RF-02, RN-01)
- [x] Triagem com critérios de aptidão (RF-03, RN-02, RN-03, RN-06)
- [x] Registro de doação e geração de bolsa (RF-04, RN-04, RN-05)
- [x] Consulta de estoque com alerta de estoque crítico (RF-05, RF-06)
- [ ] Autenticação por perfil (RF-01)
- [ ] Solicitações de hospitais (RF-07, RF-08)
- [ ] Descarte de bolsas vencidas e relatório mensal (RF-09, RF-10)
- [ ] Registro de inaptidão temporária (RF-11)

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
