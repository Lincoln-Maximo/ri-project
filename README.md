
# REAL INTELLIGENCE: MAIS QUE UMA IA


O **REAL INTELLIGENCE** é um ecossistema de monitoramento preventivo que utiliza Inteligência Artificial para garantir a segurança em ambientes industriais. Através de Visão Computacional de alta precisão, o sistema automatiza a fiscalização do uso de Equipamentos de Proteção Individual (EPIs) e identifica colaboradores em tempo real.

---

## Funcionalidades Principais

*   **Detecção de EPI (YOLOv8):** Identificação instantânea de conformidade (uso de capacete) com filtros de confiança para redução de falsos positivos.
*   **Biometria Avançada (InsightFace):** Utilização do modelo **Buffalo_L** (SOTA) para reconhecimento facial robusto, mesmo em condições de iluminação variável.
*   **Monitoramento em Tempo Real:** Processamento de vídeo via webcam ou câmeras IP com feedback visual imediato.
*   **Gestão de Dados:** Estrutura pronta para PostgreSQL, permitindo o registro de eventos, setores, câmeras e histórico de infrações.

---

## Stack Tecnológica

### Backend (IA & Processamento)
- **Linguagem:** Python 3.10+
- **Detector:** YOLOv8 (Ultralytics)
- **Reconhecimento Facial:** InsightFace (Modelo: `buffalo_l`)
- **Motor de Execução:** ONNX Runtime (Otimizado para CPU)
- **Visão Computacional:** OpenCV

### Frontend (Dashboard)
- **Framework:** React + Vite
- **Estilização:** Tailwind CSS
- **Componentes:** Lucide React (Ícones)

### Banco de Dados
- **Relacional:** PostgreSQL 14+

---

## Como Instalar e Rodar

### 1. Clonar o Repositório
```bash
git clone https://github.com/seu-usuario/real-intelligence.git
cd real-intelligence
```

### 2. Configurar o Backend
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Instalação das dependências
pip install ultralytics onnxruntime insightface opencv-python
```

### 3. Configurar o Banco de Dados
*   Utilize o arquivo `create_db.sql` localizado na raiz do projeto para criar a estrutura de tabelas no seu PostgreSQL.

### 4. Executar o Sistema
```bash
python main_process.py
```
*Nota: Na primeira execução, o sistema baixará automaticamente os modelos do InsightFace (~300MB).*

---

## Roadmap de Desenvolvimento

- [x] Integração com YOLOv8 para detecção de capacetes.
- [x] Implementação do InsightFace Buffalo_L para biometria.
- [ ] Conexão direta com o banco de dados para log de eventos.
- [ ] Desenvolvimento de API REST para comunicação com o Frontend.
- [ ] Dashboard de estatísticas e relatórios de segurança.

---

## Autor

**Lincoln Maximo**
*Desenvolvedor Full Stack*
