# Requisitos — HemoControl

Documentação no padrão de linguagem estruturada apresentado na Aula 2: identificador, nome e descrição. Os requisitos são numerados e testáveis.

## Requisitos Funcionais (RF)

### RF-01
**Nome:** Autenticar usuário
**Descrição:** O sistema deve permitir que recepcionistas, enfermeiros, médicos, gestores e administradores acessem o sistema por meio de login e senha, liberando apenas as funcionalidades do perfil de cada um.

### RF-02
**Nome:** Cadastrar doador
**Descrição:** O sistema deve cadastrar doadores com nome, CPF, data de nascimento, sexo, tipo sanguíneo (ABO/Rh) e telefone.

### RF-03
**Nome:** Realizar triagem
**Descrição:** O sistema deve registrar peso, pressão arterial e hemoglobina do doador e classificá-lo como apto ou inapto para doar, conforme as regras de negócio.

### RF-04
**Nome:** Registrar doação
**Descrição:** O sistema deve registrar a doação de um doador apto, gerando uma bolsa de sangue com código, volume, tipo sanguíneo e data de validade.

### RF-05
**Nome:** Consultar estoque
**Descrição:** O sistema deve listar as bolsas disponíveis, agrupadas por tipo sanguíneo (ABO/Rh), com a quantidade de cada grupo em cartões e em gráfico, e destacar as bolsas que vencem nos próximos 7 dias.

### RF-06
**Nome:** Emitir alerta de estoque crítico
**Descrição:** O sistema deve emitir um alerta quando um tipo sanguíneo tiver menos de 10 bolsas disponíveis.

### RF-07
**Nome:** Registrar solicitação de bolsas
**Descrição:** O sistema deve registrar solicitações de bolsas contendo identificação do hospital, tipo sanguíneo e quantidade desejada, recebidas por integração com o sistema do hospital solicitante ou informadas manualmente pelo gestor.

### RF-08
**Nome:** Atender solicitação
**Descrição:** O sistema deve baixar do estoque as bolsas destinadas a uma solicitação, priorizando as de validade mais próxima.

### RF-09
**Nome:** Descartar bolsas vencidas
**Descrição:** O sistema deve listar as bolsas cuja validade tenha expirado e permitir que o gestor registre o descarte delas, retirando-as do estoque disponível.

### RF-10
**Nome:** Gerar relatório mensal
**Descrição:** O sistema deve permitir que o gestor gere, para um mês escolhido, um relatório com o total de doações, bolsas descartadas e solicitações atendidas, detalhando o destino de cada bolsa (em estoque, entregue ou descartada), com exportação em PDF e em planilha.

### RF-11
**Nome:** Registrar inaptidão temporária
**Descrição:** O sistema deve permitir que o médico registre o motivo e o prazo da inaptidão temporária de um doador reprovado na triagem.

### RF-12
**Nome:** Consultar histórico de doações
**Descrição:** O sistema deve permitir que recepcionistas, médicos, enfermeiros e gestores consultem, pelo CPF, o histórico de doações de um doador, com data, volume, código da bolsa e situação de cada doação, além da data a partir da qual o doador pode doar novamente.

### RF-13
**Nome:** Buscar e editar doador
**Descrição:** O sistema deve permitir que o recepcionista busque doadores por parte do nome ou do CPF e corrija os dados cadastrais (nome, data de nascimento, sexo, tipo sanguíneo, telefone e consentimento do responsável). O CPF não pode ser alterado.

### RF-14
**Nome:** Gerenciar usuários
**Descrição:** O sistema deve permitir que o gestor e o administrador cadastrem usuários (nome, CPF, login e perfil, além do CRM para médicos e do COREN para enfermeiros), gerem uma senha temporária para outro usuário e desativem ou reativem contas, respeitando os perfis que cada um gerencia (RN-12). Login e CPF não se repetem, e o CPF é conferido antes do restante do cadastro. Quem cadastra nunca escolhe nem conhece a senha definitiva: no cadastro e na redefinição o sistema gera uma senha temporária, que é exibida uma única vez, e o usuário é obrigado a trocá-la no próximo acesso (RF-15). Fica registrado quem gerou a senha temporária e quando. Contas não são excluídas, apenas desativadas, para que os registros feitos por elas (triagens, inaptidões, doações) continuem ligados a quem os fez; uma conta desativada não entra no sistema e perde as sessões abertas. Ninguém pode desativar a própria conta nem gerar senha temporária para si.

### RF-15
**Nome:** Alterar a própria senha
**Descrição:** O sistema deve permitir que qualquer usuário autenticado troque a própria senha, informando a senha atual e a nova (mínimo de 6 caracteres, diferente da atual). Enquanto estiver com uma senha temporária, o usuário só consegue acessar a troca de senha. Ao trocar, as outras sessões abertas desse usuário são encerradas.

### RF-16
**Nome:** Registrar e consultar o log de atividades
**Descrição:** O sistema deve registrar em um log as ações relevantes, com data e hora, usuário, ação, descrição e origem (endereço IP, integração ou terminal): entradas e saídas, logins recusados, tentativas de acesso a funções de outro perfil, cadastro e alteração de doadores (só quais campos mudaram, sem os valores), triagens, inaptidões, doações, descartes, solicitações, atendimentos, relatórios e todas as ações de gestão de contas e senhas. O administrador consulta o log filtrando por período (até 90 dias por vez), usuário e ação, com paginação e exportação em planilha (CSV).

## Requisitos Não Funcionais (RNF)

### RNF-01
**Nome:** Desempenho na busca de doador
**Descrição:** O sistema deve responder à busca de doador por CPF em até 2 segundos.

### RNF-02
**Nome:** Segurança de acesso
**Descrição:** Apenas usuários autenticados podem acessar o sistema, e as senhas devem ser armazenadas com hash, nunca em texto puro.

### RNF-03
**Nome:** Proteção de dados pessoais
**Descrição:** O sistema deve seguir a Lei Geral de Proteção de Dados (LGPD) para os dados dos doadores, restringindo o acesso a eles conforme o perfil do usuário.

### RNF-04
**Nome:** Usabilidade do cadastro
**Descrição:** Um recepcionista deve conseguir cadastrar um doador em até 3 minutos, após 1 hora de treinamento no sistema.

### RNF-05
**Nome:** Autenticação de sistemas externos
**Descrição:** O sistema deve aceitar solicitações de sistemas externos somente com chave de acesso válida, rejeitando as demais requisições com mensagem de erro.

### RNF-06
**Nome:** Tema claro e escuro
**Descrição:** O sistema deve oferecer tema claro e escuro. Na primeira visita, deve seguir o tema do sistema operacional; a escolha feita pelo usuário deve ficar salva no navegador e na conta do usuário, valendo em qualquer navegador em que ele entrar.

### RNF-07
**Nome:** Integridade do log
**Descrição:** Os registros do log de atividades não podem ser alterados nem apagados por nenhum perfil, inclusive o administrador. O próprio banco de dados recusa qualquer alteração ou exclusão na tabela de log.

## Regras de Negócio (RN)

### RN-01
**Nome:** Cadastro único de doadores
**Descrição:** O sistema não deve permitir o cadastro de dois doadores com o mesmo CPF.

### RN-02
**Nome:** Idade e peso mínimos
**Descrição:** Só podem ser classificados como aptos candidatos de 16 a 69 anos (de 16 a 17 anos, com consentimento formal do responsável legal) e com peso mínimo de 50 kg. Quem nunca doou só pode fazer a primeira doação até 60 anos, 11 meses e 29 dias.

### RN-03
**Nome:** Intervalo entre doações
**Descrição:** O sistema deve exigir intervalo mínimo de 60 dias entre doações de homens e de 90 dias entre doações de mulheres, com limite de 4 doações por ano para homens e 3 para mulheres.

### RN-04
**Nome:** Validade da bolsa
**Descrição:** Cada bolsa vence 35 dias após a coleta (valor adotado pelo projeto), e bolsa vencida não pode ser destinada a nenhuma solicitação.

### RN-05
**Nome:** Triagem obrigatória
**Descrição:** O sistema não deve permitir o registro de uma doação sem uma triagem prévia com resultado "apto".

### RN-06
**Nome:** Critérios clínicos da triagem
**Descrição:** O doador só pode ser classificado como apto se a hemoglobina estiver entre 13,0 e 18,5 g/dL (homens) ou entre 12,5 e 16,5 g/dL (mulheres). A pressão arterial deve estar entre 90 e 180 mmHg (sistólica) e entre 60 e 100 mmHg (diastólica); fora dessa faixa, o doador só é aceito após avaliação do médico. Valores de pressão adotados como referência do projeto.

### RN-07
**Nome:** Volume da doação
**Descrição:** O volume coletado deve estar entre 300 mL e 495 mL (450 mL ± 45 mL; bolsas abaixo de 300 mL são desprezadas) e não pode ultrapassar 8 mL por quilo de peso para mulheres ou 9 mL por quilo de peso para homens, considerando o peso medido na triagem.

### RN-08
**Nome:** Correção de sexo e tipo sanguíneo
**Descrição:** O sexo e o tipo sanguíneo de um doador só podem ser corrigidos enquanto ele não tiver doações registradas, porque definem o intervalo entre doações (RN-03) e o tipo das bolsas já geradas.

### RN-09
**Nome:** Validade da triagem
**Descrição:** Uma triagem apta só libera a coleta no mesmo dia em que foi realizada. Em outro dia, o doador precisa passar por uma nova triagem.

### RN-10
**Nome:** Triagens repetidas
**Descrição:** O sistema não deve registrar uma nova triagem do mesmo doador, no mesmo dia, com exatamente a mesma medição (peso, pressão e hemoglobina) da triagem anterior. Com valores diferentes a nova triagem é aceita, até o limite de 3 triagens por doador por dia.

### RN-11
**Nome:** Idade no cadastro
**Descrição:** O cadastro de doador só aceita datas de nascimento que resultem em idade de 16 a 69 anos na data do cadastro, a faixa em que se pode doar (RN-02); datas no futuro são recusadas. Na edição, a regra vale apenas quando a data de nascimento é corrigida, para que um doador que já passou dos 69 anos continue podendo ter os outros dados atualizados.

### RN-12
**Nome:** Quem gerencia cada conta
**Descrição:** O gestor gerencia apenas contas de recepcionista, médico e enfermeiro. Contas de gestor são gerenciadas pelo administrador, para que um gestor não consiga desativar ou assumir a conta de outro. O administrador gerencia todos os perfis, menos outros administradores; contas de administrador são criadas e recuperadas apenas pelo terminal do servidor (`npm run admin`), pelo responsável técnico, e essas ações também ficam no log (RF-16). O administrador não usa as funções do banco de sangue nem consulta dados de doadores (cadastro, histórico, triagem, doação, estoque, solicitações e relatório).
