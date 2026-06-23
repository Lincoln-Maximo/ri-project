# Real Intelligence

O **Real Intelligence** é uma solução de visão computacional de alto desempenho projetada para elevar os padrões de segurança do trabalho e eficiência operacional em ambientes industriais. Utilizando algoritmos de última geração para detecção em tempo real, o sistema processa fluxos de vídeo para monitorar o uso de Equipamentos de Proteção Individual (EPI) e realizar autenticação biométrica, transformando vigilância passiva em inteligência preventiva.

---

## Proposta de Valor

*   **Inteligência em Tempo Real**: Monitoramento constante que dispensa a supervisão manual ininterrupta.
*   **Segurança Preventiva**: Detecção automática de não conformidades, reduzindo o risco de incidentes.
*   **Alta Precisão**: Motor de visão computacional otimizado para cenários críticos.

---

## Roadmap de Evolução Comercial

*   **Core IA**: Módulo avançado de detecção de EPIs (Capacetes).
*   **Identificação Biométrica**: Motor de reconhecimento facial biométrico para controle de acesso.
*   **Análise Preditiva**: Módulo de *Machine Learning* para análise histórica e predição de cenários de risco de acidentes.

---

## Procedimento de Execução

O projeto utiliza um orquestrador na raiz para simplificar o gerenciamento de múltiplos ambientes. Certifique-se de possuir **Python 3.11+**, **PostgreSQL 16** e **Node.js/npm** instalados.

### 1. Configuração do Banco de Dados
Crie um banco de dados PostgreSQL e aplique o schema inicial disponível em `backend/migrations/001_initial_schema.sql`.

### 2. Configuração do Ambiente
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
DB_NAME=seu_banco
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_HOST=localhost
DB_PORT=5432
SECRET_KEY=sua_chave_secreta_jwt
MAIL_USERNAME=seu_email
MAIL_PASSWORD=sua_senha_de_app
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_TLS=True
```

### 3. Instalação e Execução
O projeto gerencia backend e frontend de forma centralizada:

```bash
# 1. Instalar dependências globais e do orquestrador
npm install

# 2. Instalar dependências de todos os módulos (Front e Back)
npm run install:all

# 3. Iniciar todo o ecossistema (Frontend + Backend)
npm run dev
```

---

## Nota de Responsabilidade
O Real Intelligence é uma ferramenta de suporte à supervisão de segurança. A eficácia da detecção por visão computacional está condicionada à qualidade da infraestrutura de vídeo e calibração dos modelos. Este sistema **não substitui** o papel de supervisores humanos, nem isenta a organização do cumprimento de normas técnicas e regulamentadoras de segurança do trabalho (NRs). A ferramenta deve ser utilizada como suporte preventivo e camada adicional de controle.

---

**Lincoln Maximo**
Desenvolvedor

