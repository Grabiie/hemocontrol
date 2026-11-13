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
- **Gestor:** consulta estoque, atende solicitações, gera relatórios, rastreia doações e bolsas e gerencia as contas de recepcionista, médico e enfermeiro.
- **Administrador (responsável técnico):** gerencia todas as contas, inclusive as de gestor, e consulta o log de atividades. Não usa as funções do banco de sangue nem vê dados de doadores.
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
- SQLite (módulo `node:sqlite`, nativo do Node.js)
- HTML/CSS/JavaScript para a interface

## Como executar

Pré-requisito: [Node.js](https://nodejs.org/) 22.13 ou mais novo (recomendado: a versão LTS mais recente). O banco usa o SQLite que já vem no Node, então o `npm install` não precisa compilar nada.

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

Todas usam a senha `hemo123`. Cada perfil só acessa as funções que o diagrama de casos de uso atribui a ele. Os perfis do banco de sangue também consultam o histórico de doações; o administrador não.

| Usuário | Perfil | Pode fazer |
|---|---|---|
| `recepcao` | Recepcionista | Cadastrar, buscar e editar doadores |
| `medico` | Médico | Realizar triagem e registrar inaptidão temporária |
| `enfermeiro` | Enfermeiro | Realizar triagem e registrar doação (inclusive coleta interrompida) |
| `gestor` | Gestor | Consultar estoque, registrar e atender solicitações, descartar bolsas vencidas, gerar relatório mensal, rastrear doação ou bolsa e gerenciar recepcionistas, médicos e enfermeiros |
| `admin` | Administrador | Gerenciar todas as contas, inclusive as de gestor, e consultar o log de atividades |

As contas também são criadas automaticamente na primeira vez que o servidor sobe.

### Contas de administrador (RN-12)

Nenhuma conta cria ou altera um administrador pela tela. Isso é feito no terminal do servidor, pelo responsável técnico, e também fica no log de atividades:

```bash
npm run admin -- criar <login> "<nome>" <cpf>   # cria um administrador com senha temporária
npm run admin -- senha <login>                  # gera senha temporária para qualquer conta
npm run admin -- desativar <login>              # desativa qualquer conta
npm run admin -- reativar <login>               # reativa qualquer conta
```

### Log de atividades (RF-16 e RNF-07)

O administrador vê, na tela, o que cada usuário fez: entradas e saídas, logins recusados, tentativas de usar funções de outro perfil, cadastros, triagens, doações, descartes, solicitações, relatórios e toda a gestão de contas e senhas. Dá para filtrar por período, usuário e ação e exportar em CSV. Os registros não podem ser alterados nem apagados: o próprio banco recusa (gatilhos no SQLite).

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
│   ├── auditoria.js   # gravação do log de atividades
│   ├── admin.js       # comandos do responsável técnico (npm run admin)
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
- [x] Busca e edição de doadores (RF-13, RN-08)
- [x] Cadastro, desativação e senha temporária de usuários pelo gestor e pelo administrador (RF-14)
- [x] Troca da própria senha, obrigatória no primeiro acesso (RF-15)
- [x] Perfil Administrador, que cuida das contas de gestor (RN-12)
- [x] Log de atividades com filtros e exportação, que não pode ser alterado (RF-16, RNF-07)
- [x] Rastreio de doação ou bolsa pelo número ou código, com o destino da bolsa (RF-17)
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
