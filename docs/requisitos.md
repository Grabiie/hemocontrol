# Requisitos — HemoControl

Documentação no padrão de linguagem estruturada apresentado na Aula 2: identificador, nome e descrição. Os requisitos são numerados e testáveis.

## Requisitos Funcionais (RF)

### RF-01
**Nome:** Autenticar usuário
**Descrição:** O sistema deve permitir que recepcionistas, enfermeiros, médicos e gestores acessem o sistema por meio de login e senha, liberando apenas as funcionalidades do perfil de cada um.

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
**Descrição:** O sistema deve listar as bolsas disponíveis, agrupadas por tipo sanguíneo (ABO/Rh), com a quantidade de cada grupo.

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
**Descrição:** O sistema deve permitir que o gestor registre o descarte das bolsas cuja validade tenha expirado, retirando-as do estoque disponível.

### RF-10
**Nome:** Gerar relatório mensal
**Descrição:** O sistema deve gerar, ao final de cada mês, um relatório com o total de doações, bolsas descartadas e solicitações atendidas.

### RF-11
**Nome:** Registrar inaptidão temporária
**Descrição:** O sistema deve permitir que o médico registre o motivo e o prazo da inaptidão temporária de um doador reprovado na triagem.

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

## Regras de Negócio (RN)

### RN-01
**Nome:** Cadastro único de doadores
**Descrição:** O sistema não deve permitir o cadastro de dois doadores com o mesmo CPF.

### RN-02
**Nome:** Idade e peso mínimos
**Descrição:** Só podem ser classificados como aptos candidatos com idade mínima de 16 anos (de 16 a 17 anos, com consentimento formal do responsável legal) e peso mínimo de 50 kg. Quem nunca doou só pode fazer a primeira doação até 60 anos, 11 meses e 29 dias.

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
