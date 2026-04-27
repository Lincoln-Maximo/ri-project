-- ============================================================
-- Real Intelligence — Script de criação do banco de dados
-- Banco: PostgreSQL 14+
-- Executar no DBeaver: Abrir este arquivo > F5 ou Ctrl+Enter
-- ============================================================

-- Extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELAS BASE (sem dependências)
-- ============================================================

CREATE TABLE setores (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome          VARCHAR(100) NOT NULL UNIQUE,
    descricao     TEXT,
    criado_em     TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE tipos_violacao (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            VARCHAR(100) NOT NULL UNIQUE,
    descricao       TEXT,
    nivel_perigo VARCHAR(20) NOT NULL CHECK (nivel_perigo IN ('baixo', 'medio', 'alto', 'critico')),
    cor_badge       VARCHAR(30),
    criado_em       TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USUÁRIOS DO SISTEMA
-- ============================================================

CREATE TABLE usuarios (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo          VARCHAR(150) NOT NULL,
    email                  VARCHAR(150) NOT NULL UNIQUE,
    senha_hash             TEXT        NOT NULL,
    telefone               VARCHAR(30),
    id_funcionario         VARCHAR(50) UNIQUE,
    departamento           VARCHAR(100),
    cargo                  VARCHAR(100),
    foto_url               TEXT,
    alerta_email           BOOLEAN     NOT NULL DEFAULT TRUE,
    alerta_sms             BOOLEAN     NOT NULL DEFAULT FALSE,
    notificacao_sistema    BOOLEAN     NOT NULL DEFAULT TRUE,
    ultimo_login           TIMESTAMP,
    criado_em              TIMESTAMP   NOT NULL DEFAULT NOW(),
    atualizado_em          TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COLABORADORES (cadastro de faces)
-- ============================================================

CREATE TABLE colaboradores (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo           VARCHAR(150) NOT NULL,
    matricula               VARCHAR(50)  NOT NULL UNIQUE,
    cargo                   VARCHAR(100),
    setor_id                UUID        NOT NULL REFERENCES setores(id) ON DELETE RESTRICT,
    foto_url                TEXT,
    status_bio              VARCHAR(20)  NOT NULL DEFAULT 'pendente'
                                CHECK (status_bio IN ('ativo', 'pendente', 'inativo')),
    ultima_deteccao         TIMESTAMP,
    local_ultima_deteccao   VARCHAR(150),
    criado_em               TIMESTAMP   NOT NULL DEFAULT NOW(),
    atualizado_em           TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CÂMERAS
-- ============================================================

CREATE TABLE cameras (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome             VARCHAR(100) NOT NULL UNIQUE,
    modelo           VARCHAR(100),
    fabricante       VARCHAR(100),
    localizacao      VARCHAR(150),
    setor_id         UUID        NOT NULL REFERENCES setores(id) ON DELETE RESTRICT,
    link_rtsp        TEXT,
    modo_operacao    VARCHAR(20)  NOT NULL DEFAULT 'continuo'
                        CHECK (modo_operacao IN ('continuo', 'agendamento')),
    inicio_operacao  TIME,
    fim_operacao     TIME,
    status           VARCHAR(20)  NOT NULL DEFAULT 'inativa'
                        CHECK (status IN ('ativa', 'offline', 'inativa')),
    sinal_percentual SMALLINT     CHECK (sinal_percentual BETWEEN 0 AND 100),
    status_ip        VARCHAR(30),
    criado_em        TIMESTAMP   NOT NULL DEFAULT NOW(),
    atualizado_em    TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EVENTOS (detecções de violação)
-- ============================================================

CREATE TABLE eventos (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    camera_id        UUID        NOT NULL REFERENCES cameras(id) ON DELETE RESTRICT,
    colaborador_id   UUID        REFERENCES colaboradores(id) ON DELETE SET NULL, -- nullable: pessoa não identificada
    setor_id         UUID        NOT NULL REFERENCES setores(id) ON DELETE RESTRICT,
    tipo_violacao_id UUID        NOT NULL REFERENCES tipos_violacao(id) ON DELETE RESTRICT,
    miniatura_url    TEXT,
    status           VARCHAR(30)  NOT NULL DEFAULT 'identificado'
                        CHECK (status IN ('identificado', 'id_pendente', 'desconhecido')),
    nivel_risco      VARCHAR(20)  NOT NULL DEFAULT 'medio'
                        CHECK (nivel_risco IN ('baixo', 'medio', 'alto', 'critico')),
    local            VARCHAR(150),
    ocorrido_em      TIMESTAMP   NOT NULL DEFAULT NOW(),
    criado_em        TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AVISOS (alertas emitidos a partir de eventos)
-- ============================================================

CREATE TABLE avisos (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id    UUID        NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    emitido_por  UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
    mensagem     TEXT,
    canal        VARCHAR(20)  NOT NULL DEFAULT 'sistema'
                    CHECK (canal IN ('email', 'sms', 'sistema')),
    status       VARCHAR(20)  NOT NULL DEFAULT 'enviado'
                    CHECK (status IN ('enviado', 'pendente', 'falhou')),
    emitido_em   TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LOGS DE ATIVIDADE (auditoria)
-- ============================================================

CREATE TABLE logs_atividade (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
    acao            VARCHAR(50)  NOT NULL,  -- ex: 'criar', 'editar', 'excluir', 'login'
    entidade        VARCHAR(50)  NOT NULL,  -- ex: 'colaborador', 'camera', 'evento'
    entidade_id     UUID,
    dados_anteriores JSONB,
    dados_novos      JSONB,
    ip              VARCHAR(45),
    criado_em       TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES (performance em consultas frequentes)
-- ============================================================

-- Eventos: filtros mais usados na tela de relatórios
CREATE INDEX idx_eventos_camera_id        ON eventos(camera_id);
CREATE INDEX idx_eventos_colaborador_id   ON eventos(colaborador_id);
CREATE INDEX idx_eventos_setor_id         ON eventos(setor_id);
CREATE INDEX idx_eventos_tipo_violacao_id ON eventos(tipo_violacao_id);
CREATE INDEX idx_eventos_ocorrido_em      ON eventos(ocorrido_em DESC);

-- Colaboradores: busca por nome e matrícula
CREATE INDEX idx_colaboradores_setor_id   ON colaboradores(setor_id);
CREATE INDEX idx_colaboradores_matricula  ON colaboradores(matricula);

-- Câmeras: filtro por setor e status
CREATE INDEX idx_cameras_setor_id         ON cameras(setor_id);
CREATE INDEX idx_cameras_status           ON cameras(status);

-- Logs: auditoria por usuário e data
CREATE INDEX idx_logs_usuario_id          ON logs_atividade(usuario_id);
CREATE INDEX idx_logs_criado_em           ON logs_atividade(criado_em DESC);

-- Avisos: rastreamento por evento
CREATE INDEX idx_avisos_evento_id         ON avisos(evento_id);

-- ============================================================
-- DADOS INICIAIS (seed)
-- ============================================================

INSERT INTO setores (nome, descricao) VALUES
    ('Logística A',      'Área de logística e movimentação de cargas'),
    ('Manutenção',       'Setor de manutenção industrial'),
    ('Produção',         'Linha de produção principal'),
    ('Área de Descarga', 'Pátio e docas de descarga'),
    ('Laboratório',      'Laboratório de testes e qualidade'),
    ('Portaria Norte',   'Entrada principal - Portaria Norte'),
    ('Portaria Sul',     'Entrada secundária - Portaria Sul');

INSERT INTO tipos_violacao (nome, descricao, nivel_severidade, cor_badge) VALUES
    ('Ausência de Capacete',    'Colaborador sem capacete de proteção',     'critico', 'red'),
    ('Falta de Colete Refletivo','Colaborador sem colete de segurança',     'alto',    'orange'),
    ('Ausência de Luvas',       'Colaborador sem luvas de proteção',        'medio',   'yellow'),
    ('Sem Óculos de Proteção',  'Colaborador sem óculos de segurança',      'medio',   'yellow'),
    ('Sem Protetor Auricular',  'Colaborador sem proteção auditiva',        'baixo',   'blue'),
    ('Sem Máscara',             'Colaborador sem máscara de proteção',      'alto',    'orange');

-- Usuário administrador padrão
-- Senha padrão: Admin@123456 (trocar imediatamente após o primeiro acesso)
INSERT INTO usuarios (nome_completo, email, senha_hash, id_funcionario, departamento, cargo) VALUES
    (
        'Lincoln Maximo',
        'l.maximo@realai.com',
        -- hash gerado com: SELECT crypt('Admin@123456', gen_salt('bf', 12));
        crypt('Admin@123456', gen_salt('bf', 12)),
        'INC-992-00',
        'Segurança Industrial',
        'Diretor de Segurança Industrial'
    );

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================