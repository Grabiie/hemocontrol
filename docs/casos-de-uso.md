# Casos de Uso — HemoControl

Descrição textual dos três casos de uso principais, no modelo apresentado na Aula 3 e 4. O diagrama correspondente está em `casos-de-uso.png`.

## UC — Registrar Doação

| Campo | Conteúdo |
|---|---|
| **Nome** | Registrar Doação |
| **Ator(es)** | Enfermeiro (principal) |
| **Descrição** | O enfermeiro registra a doação de um doador apto, e o sistema gera a bolsa de sangue com código, volume, tipo sanguíneo e data de validade. |
| **Pré-condições** | O enfermeiro está autenticado (Autenticar Usuário).<br>O doador está cadastrado.<br>O doador possui triagem prévia com resultado "apto" (RN-05). |
| **Fluxo principal** | 1. O enfermeiro busca o doador pelo CPF.<br>2. O sistema exibe os dados do doador e o resultado da triagem.<br>3. O enfermeiro informa o volume coletado, em mililitros.<br>4. O enfermeiro confirma o registro da doação.<br>5. O sistema gera uma bolsa com código único, o tipo sanguíneo do doador, status "disponível" e validade de 35 dias após a coleta (RN-04).<br>6. O sistema registra a doação no histórico do doador, atualiza a data da última doação e inclui a bolsa no estoque. |
| **Fluxos alternativos** | 3a. Se a coleta for interrompida, o enfermeiro registra a doação como cancelada e o sistema não gera bolsa. |
| **Exceções** | 1a. Se o CPF não for encontrado, o sistema informa que o doador não está cadastrado e encerra o caso de uso. O cadastro é feito pelo recepcionista.<br>2a. Se o doador não tiver triagem com resultado "apto", o sistema bloqueia o registro e informa o motivo (RN-05). |
| **Pós-condições** | A doação consta no histórico do doador, e uma nova bolsa disponível passa a constar no estoque do tipo sanguíneo correspondente. |

## UC — Realizar Triagem

| Campo | Conteúdo |
|---|---|
| **Nome** | Realizar Triagem |
| **Ator(es)** | Profissional de Saúde, ou seja, Médico ou Enfermeiro (principal) |
| **Descrição** | O profissional registra peso, pressão arterial e hemoglobina do doador, e o sistema o classifica como apto ou inapto para doar. |
| **Pré-condições** | O profissional está autenticado (Autenticar Usuário).<br>O doador está cadastrado. |
| **Fluxo principal** | 1. O profissional busca o doador pelo CPF.<br>2. O sistema exibe os dados do doador e a data da última doação.<br>3. O profissional informa peso, pressão arterial e hemoglobina.<br>4. O sistema verifica idade e peso mínimos (RN-02), o intervalo desde a última doação (RN-03) e os valores de pressão e hemoglobina (RN-06).<br>5. O sistema classifica o doador como "apto" e registra a triagem.<br>6. O sistema informa o resultado ao profissional. |
| **Fluxos alternativos** | 5a. Se algum critério não for atendido, o sistema classifica o doador como "inapto" e o médico registra o motivo e o prazo da inaptidão (Registrar Inaptidão Temporária). |
| **Exceções** | 1a. Se o CPF não for encontrado, o sistema informa que o doador não está cadastrado e encerra o caso de uso. O cadastro é feito pelo recepcionista.<br>3a. Se algum valor informado estiver vazio ou fora de uma faixa plausível, o sistema solicita a correção antes de continuar. |
| **Pós-condições** | A triagem fica registrada no histórico do doador com o resultado apto ou inapto. Se apto, o doador fica liberado para Registrar Doação. |

## UC — Atender Solicitação

| Campo | Conteúdo |
|---|---|
| **Nome** | Atender Solicitação |
| **Ator(es)** | Gestor (principal) |
| **Descrição** | O gestor atende uma solicitação de bolsas de um hospital, e o sistema baixa do estoque as bolsas compatíveis, priorizando as de validade mais próxima. |
| **Pré-condições** | O gestor está autenticado (Autenticar Usuário).<br>Existe uma solicitação registrada com status "pendente". |
| **Fluxo principal** | 1. O gestor seleciona uma solicitação pendente.<br>2. O sistema executa Consultar Estoque para o tipo sanguíneo solicitado e exibe as bolsas disponíveis.<br>3. O sistema separa as bolsas de validade mais próxima, na quantidade pedida, desconsiderando as vencidas (RN-04).<br>4. O gestor confirma o atendimento.<br>5. O sistema baixa as bolsas do estoque e as vincula à solicitação.<br>6. O sistema altera o status da solicitação para "atendida". |
| **Fluxos alternativos** | 2a. Se o tipo sanguíneo tiver menos de 10 bolsas disponíveis, o sistema emite o alerta de estoque crítico (Emitir Alerta de Estoque Crítico) e o fluxo segue normalmente.<br>3a. Se houver menos bolsas do que a quantidade pedida, o sistema oferece o atendimento parcial. Se o gestor aceitar, as bolsas disponíveis são baixadas e a solicitação passa a "atendida parcialmente". |
| **Exceções** | 3b. Se não houver nenhuma bolsa disponível do tipo solicitado, o sistema informa a indisponibilidade e mantém a solicitação como "pendente".<br>4a. Se o gestor cancelar a confirmação, nenhuma bolsa é baixada e a solicitação permanece "pendente". |
| **Pós-condições** | As bolsas atendidas ficam baixadas do estoque e vinculadas à solicitação, e o status da solicitação é atualizado. |
