# Real Intelligence

Sistema de visão computacional para segurança do trabalho em ambientes industriais. Monitora fluxos de vídeo (RTSP/RTMP/webcam) em tempo real para detectar o uso de Equipamentos de Proteção Individual (EPI) e identificar colaboradores por reconhecimento facial, registrando automaticamente eventos de não conformidade em um dashboard administrativo.

---

## Sumário

- [Visão geral da arquitetura](#visão-geral-da-arquitetura)
- [Stack tecnológica](#stack-tecnológica)
- [Funcionalidades](#funcionalidades)
- [Pré-requisitos](#pré-requisitos)
- [Estrutura do projeto](#estrutura-do-projeto)
- [1. Configuração do banco de dados (PostgreSQL)](#1-configuração-do-banco-de-dados-postgresql)
- [2. Modelo de detecção (YOLO)](#2-modelo-de-detecção-yolo)
- [3. Variáveis de ambiente](#3-variáveis-de-ambiente)
- [4. Instalação e execução](#4-instalação-e-execução)
- [Acessando o sistema](#acessando-o-sistema)
- [Documentação da API](#documentação-da-api)
- [Scripts utilitários do backend](#scripts-utilitários-do-backend)
- [Solução de problemas](#solução-de-problemas)
- [Nota de responsabilidade](#nota-de-responsabilidade)

---

## Visão geral da arquitetura

O projeto é dividido em dois módulos independentes, orquestrados a partir da raiz:

```
┌──────────────────────┐        REST / JWT        ┌───────────────────────────┐
│   Frontend (React)   │ ───────────────────────► │     Backend (FastAPI)     │
│   Vite + Tailwind     │ ◄─────────────────────── │  OpenCV + YOLO + Insight  │
│   localhost:5173      │      MJPEG (stream)      │  Face — localhost:8080    │
└──────────────────────┘                          └─────────────┬─────────────┘
                                                                  │
                                                    ┌─────────────▼─────────────┐
                                                    │   PostgreSQL 14+          │
                                                    │   (eventos, colaboradores,│
                                                    │    câmeras, usuários...)  │
                                                    └────────────────────────────┘
```

Resumo do fluxo de detecção:

1. O backend abre a fonte de vídeo (RTSP, RTMP ou webcam) com **OpenCV**.
2. Cada frame é processado por um modelo **YOLO (Ultralytics)** treinado para identificar uso/ausência de capacete.
3. Quando uma pessoa é detectada, o rosto é recortado e comparado com a base de colaboradores cadastrados usando **InsightFace (buffalo_l)**.
4. Em caso de violação (ex.: sem capacete), o evento é gravado na tabela `eventos`, com miniatura/screenshot salvos em disco e o nível de risco herdado do tipo de violação.
5. O frontend consome a API REST para exibir dashboard, stream em tempo real (MJPEG), histórico de eventos e relatórios em PDF.

---

## Stack tecnológica

**Backend**
- Python 3.11+, FastAPI, Uvicorn
- PostgreSQL via `psycopg2`
- Visão computacional: OpenCV, Ultralytics YOLO, InsightFace, PyTorch/Torchvision, dlib / face-recognition
- Autenticação: JWT (`PyJWT`) + `bcrypt`
- E-mail: `fastapi-mail` / `smtplib` (recuperação de senha e alertas de segurança)
- Geração de relatórios: `fpdf2` + `matplotlib`

**Frontend**
- React 19 + Vite 8
- React Router DOM 7
- Tailwind CSS 4
- Axios, Recharts, React Toastify, date-fns

**Banco de dados**
- PostgreSQL 14 ou superior

---

## Funcionalidades

- Login com JWT, controle de acesso por papel (`admin` / `operador`), recuperação de senha por e-mail e notificação de alteração de senha.
- Cadastro, edição e teste de câmeras (RTSP/RTMP/webcam), com modo contínuo ou por agendamento.
- Visualização de stream ao vivo (MJPEG) com bounding boxes e identificação sobreposta em tempo real.
- Cadastro de colaboradores com foto para reconhecimento facial (biometria).
- Detecção automática de uso de capacete (extensível a outros EPIs, conforme o modelo treinado).
- Geração automática de eventos de violação, com miniatura, screenshot da ocorrência, setor, nível de risco e colaborador identificado (quando aplicável).
- Dashboard com indicadores (câmeras ativas, total de detecções, violações, taxa de reconhecimento) e gráficos por setor/tipo de violação/comparativo diário.
- Exportação de relatórios analíticos em PDF.
- Gestão de setores e perfil de usuário (foto, dados pessoais, preferências de alerta).
- Log de auditoria de ações sensíveis (login, alteração de senha, criação/edição/exclusão).

---

## Pré-requisitos

| Ferramenta | Versão recomendada |
|---|---|
| Python | 3.11 ou superior |
| Node.js | 18 ou superior (recomendado 20+) |
| npm | 9 ou superior |
| PostgreSQL | 14 ou superior |
| Git | qualquer versão recente |

**Importante (Windows):** as bibliotecas `dlib` e `face-recognition` exigem o **Microsoft C++ Build Tools** (ou Visual Studio com suporte a C++) e o **CMake** instalados antes do `pip install`.

> O ambiente de visão computacional (PyTorch, OpenCV, InsightFace, dlib) é pesado, a primeira instalação pode levar vários minutos, dependendo da conexão e do hardware.

---

## 1. Configuração do banco de dados (PostgreSQL)

1. Crie o banco de dados:

```sql
CREATE DATABASE real_intelligence_db;
```

2. Execute o schema inicial, que cria todas as tabelas (`setores`, `tipos_violacao`, `usuarios`, `colaboradores`, `cameras`, `eventos`, `avisos`, `logs_atividade`) e popula os dados iniciais (usuário administrador e tipos de violação padrão):

```bash
psql -U seu_usuario_postgres -d real_intelligence_db -f backend/migrations/001_initial_schema.sql
```

> Alternativa: abra o arquivo `backend/migrations/001_initial_schema.sql` no DBeaver, pgAdmin ou outro cliente SQL e execute-o diretamente sobre o banco criado.

3. **Aplique a migração complementar** (obrigatória — sem ela a listagem de eventos falha, pois o código consulta uma coluna que não existe no schema inicial):

```sql
ALTER TABLE eventos ADD COLUMN screenshot_url TEXT;
```

   Ou, com o backend já configurado (veja a seção 4), execute o script já incluso no projeto:

```bash
cd backend
python scripts/add_screenshot_column.py
```

4. **Credenciais do usuário administrador padrão** (criado pelo seed do schema):

   - **E-mail:** `admin@realintelligence.com.br`
   - **Senha:** `admin123!`

   > Altere essa senha imediatamente após o primeiro acesso em produção.

---

## 2. Variáveis de ambiente

### Backend — `backend/.env`

Copie o exemplo e preencha com seus dados:

```bash
cp backend/.env.example backend/.env
```

```env
# Conexão com o PostgreSQL
DB_NAME=real_intelligence_db
DB_USER=seu_usuario_postgres
DB_PASSWORD=sua_senha
DB_HOST=localhost
DB_PORT=5432

# CORS — origens do frontend autorizadas a consumir a API
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Chave secreta usada para assinar os tokens JWT
SECRET_KEY=gerar_uma_chave_segura_aqui

# Envio de e-mails (recuperação de senha e alertas de segurança)
MAIL_USERNAME=seu_email@exemplo.com
MAIL_PASSWORD=sua_senha_de_aplicativo
MAIL_FROM=seu_email@exemplo.com
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
MAIL_TLS=True
MAIL_SSL=False
```

> **Gerando uma `SECRET_KEY` segura:**
> ```bash
> openssl rand -hex 32
> ```
> Se estiver usando Gmail, `MAIL_PASSWORD` deve ser uma **senha de aplicativo** (App Password), não a senha normal da conta — é necessário ter a verificação em duas etapas ativada no Google para gerá-la.

### Frontend — `frontend/.env`

```bash
cp frontend/.env.example frontend/.env
```

```env
VITE_API_URL=http://localhost:8080
```

---

## 3. Instalação e execução

O projeto usa um orquestrador na raiz para simplificar o gerenciamento dos dois módulos.

### Passo a passo completo

```bash
# 1. Clonar o repositório e entrar na pasta
git clone https://github.com/Lincoln-Maximo/ri-project.git
cd ri-project-main

# 2. Instalar dependências do orquestrador (raiz)
npm install

# 3. Instalar dependências do frontend + backend de uma só vez
npm run install:all
```

> O comando acima executa `npm install` no frontend e `pip install -r backend/requirements.txt` no backend. Caso prefira isolar o ambiente Python (recomendado), crie um virtualenv **antes** de rodar `npm run install:all`:
> ```bash
> cd backend
> python -m venv venv
> venv\Scripts\activate        
> cd ..
> npm run install:all
> ```

```bash
# 4. Subir o backend e o frontend simultaneamente
npm run dev
```

### Executando os módulos separadamente (alternativa)

```bash
# Apenas o backend (FastAPI na porta 8080, com reload automático)
npm run dev:back

# Apenas o frontend (Vite na porta 5173)
npm run dev:front
```

Ou, manualmente, sem o orquestrador:

```bash
# Backend
cd backend
pip install -r requirements.txt 
python -m app.main

# Frontend (em outro terminal)
cd frontend
npm install
npm run dev
```

---

## Acessando o sistema

| Serviço | URL |
|---|---|
| Frontend (interface web) | http://localhost:5173 |


Use as credenciais do administrador padrão (seção 1) para o primeiro acesso.

## Nota de responsabilidade

O Real Intelligence é uma ferramenta de suporte à supervisão de segurança. A eficácia da detecção por visão computacional está condicionada à qualidade da infraestrutura de vídeo e à calibração dos modelos utilizados. Este sistema **não substitui** o papel de supervisores humanos, nem isenta a organização do cumprimento das normas técnicas e regulamentadoras de segurança do trabalho (NRs). A ferramenta deve ser utilizada como suporte preventivo e camada adicional de controle.

---

**Lincoln Maximo**
Desenvolvedor