from typing import Optional, List, Tuple
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from app.database.db_config import get_connection
from app.routers.auth import get_current_user, get_optional_token_user
from fpdf import FPDF
import io
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from datetime import datetime
from collections import Counter

router = APIRouter()


def get_interval(period: str):
    if period == "7d": return "7 days"
    elif period == "30d": return "30 days"
    elif period == "all": return "100 years"
    return "24 hours"


def format_date_br():
    """Formato padrão de data/hora usado nos cabeçalhos/rodapés."""
    return datetime.now().strftime("%d/%m/%Y %H:%M:%S")


# ======================================================================
# Classe PDFReport — layout corporativo de segurança
# ======================================================================

class PDFReport(FPDF):
    """Relatório analítico de segurança — layout corporativo."""

    def __init__(self, period_label=""):
        super().__init__(orientation='P', unit='mm', format='A4')
        self.period_label = period_label
        self.set_auto_page_break(auto=True, margin=20)
        self.alias_nb_pages()          # habilita {nb} no footer
        self.set_margins(15, 15, 15)   # 15mm em todos os lados

    # ------------------------------------------------------------------
    # SEÇÃO 1 — CABEÇALHO (Altura fixa: 90px ~ 31.75mm)
    # ------------------------------------------------------------------
    def header(self):
        header_h = 31.75  # 90px in mm (90 * 25.4 / 72)

        # Fundo: #1B2A4A sólido (sem gradiente)
        self.set_fill_color(27, 42, 74)
        self.rect(0, 0, self.w, header_h, 'F')

        # Separador inferior: linha de 3px sólida na cor #E53935
        self.set_draw_color(229, 57, 53)   # #E53935
        self.set_line_width(3 * 25.4 / 72)  # 3px ~ 1.058 mm
        self.line(0, header_h, self.w, header_h)

        # Layout interno: coluna única centralizada
        # TEXTO PRINCIPAL (centralizado horizontalmente e verticalmente)
        # Altura do bloco de texto: 20pt (~7mm) + 4px margin (~1.41mm) + 11pt (~3.88mm) = ~12.3mm
        # Y inicial para centralização vertical em 31.75mm: (31.75 - 12.3) / 2 = 9.72mm
        title_y = 9.72

        # Linha 1: "RELATÓRIO ANALÍTICO DE SEGURANÇA"
        # Fonte: 20px, peso 500 (B), cor #FFFFFF, letter-spacing 0.5px (0.5 pt)
        self.set_font('Helvetica', 'B', 20)
        self.set_text_color(255, 255, 255)
        self.set_xy(0, title_y)
        self._out("0.5 Tc")  # letter-spacing 0.5px (points)
        self.cell(self.w, 7, 'RELATÓRIO ANALÍTICO DE SEGURANÇA', 0, 0, 'C')
        self._out("0 Tc")   # reset letter-spacing

        # Linha 2: "Sistema de Monitoramento com Inteligência Artificial"
        # Fonte: 11px, peso 400, cor #A8C0E0, margin-top 4px (~1.41mm)
        self.set_font('Helvetica', '', 11)
        self.set_text_color(168, 192, 224)  # #A8C0E0
        self.set_xy(0, title_y + 7 + 1.41)
        self.cell(self.w, 4, 'Sistema de Monitoramento com Inteligência Artificial', 0, 0, 'C')

        # Avançar cursor para após o cabeçalho
        self.set_y(header_h + 2)

    # ------------------------------------------------------------------
    # SEÇÃO 6 — RODAPÉ
    # ------------------------------------------------------------------
    def footer(self):
        footer_h = 25 * 25.4 / 72  # 25px total height (8px top/bottom padding + 9px font) ~ 8.82 mm
        self.set_y(-footer_h)

        # Separador superior: 0.5px solid #DDE3ED
        self.set_draw_color(221, 227, 237)  # #DDE3ED
        self.set_line_width(0.5 * 25.4 / 72)  # 0.5px ~ 0.176 mm
        self.line(0, self.get_y(), self.w, self.get_y())

        # Fundo: #F4F6F9
        self.set_fill_color(244, 246, 249)  # #F4F6F9
        self.rect(0, self.get_y(), self.w, footer_h, 'F')

        # Texto: Fonte 9px (9pt), cor #888888, texto centralizado
        self.set_font('Helvetica', '', 9)
        self.set_text_color(136, 136, 136)  # #888888

        # Conteúdo: "Página X de Y  |  Gerado em {{DATA_HORA}}  |  Real-Intelligence v1.0"
        page_text = 'Página ' + str(self.page_no()) + ' de {nb}  |  Gerado em ' + format_date_br() + '  |  Real-Intelligence v1.0'
        self.cell(0, footer_h, page_text, 0, 0, 'C')


# ======================================================================
# Funções auxiliares — gráficos (matplotlib)
# ======================================================================

def _chart_incidents_by_sector(data: List[Tuple[str, int]]) -> io.BytesIO:
    """Gráfico de barras verticais — Incidentes por Setor."""
    if not data:
        return _empty_chart('Incidentes por Setor')
    setores, valores = zip(*data)
    fig, ax = plt.subplots(figsize=(6, 4))
    fig.patch.set_facecolor('white')
    ax.set_facecolor('white')

    bars = ax.bar(setores, valores, color='#2E5FA3', width=0.6, edgecolor='none')

    # Valor numérico acima de cada barra
    for bar in bars:
        h = bar.get_height()
        ax.annotate(str(int(h)),
                    xy=(bar.get_x() + bar.get_width() / 2, h),
                    xytext=(0, 4), textcoords='offset points',
                    ha='center', va='bottom', fontsize=10,
                    fontweight='bold', color='#1B2A4A')

    ax.set_title('Incidentes por Setor', fontsize=11, fontweight='bold',
                 color='#1B2A4A', pad=12)
    ax.set_xlabel('')
    ax.set_ylabel('')
    ax.tick_params(axis='x', colors='#5F7FA8', labelsize=9)
    ax.tick_params(axis='y', colors='#5F7FA8', labelsize=9)
    ax.yaxis.set_major_locator(plt.MaxNLocator(integer=True))
    ax.grid(axis='y', linestyle=':', linewidth=0.5, color='#DDE3ED')
    ax.set_axisbelow(True)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.spines['bottom'].set_visible(True)
    ax.spines['bottom'].set_color('#DDE3ED')

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, facecolor='white', bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return buf


def _chart_violation_type_donut(data: List[Tuple[str, int]], total: int) -> io.BytesIO:
    """Gráfico donut — Tipos de Violação EPI."""
    if not data:
        return _empty_chart('Tipos de Violacao EPI')
    labels, sizes = zip(*data)

    palette = ['#1B2A4A', '#2E5FA3', '#5B8BC9', '#A8C0E0', '#E53935']
    while len(palette) < len(labels):
        palette.append('#DDE3ED')

    fig, ax = plt.subplots(figsize=(6, 4))
    fig.patch.set_facecolor('white')
    ax.set_facecolor('white')

    wedges, _ = ax.pie(sizes, colors=palette[:len(labels)],
                       startangle=90,
                       wedgeprops=dict(width=0.35, edgecolor='white', linewidth=0))

    # Texto central da rosca
    ax.text(0, 0.06, 'TOTAL', ha='center', va='center',
            fontsize=8, color='#5F7FA8')
    ax.text(0, -0.10, str(total), ha='center', va='center',
            fontsize=14, fontweight='bold', color='#1B2A4A')

    ax.set_aspect('equal')
    ax.set_title('Tipos de Violacao EPI', fontsize=11, fontweight='bold',
                 color='#1B2A4A', pad=12)

    # Legenda à direita
    total_sum = sum(sizes)
    legend_labels = []
    for l, s in zip(labels, sizes):
        pct = s / total_sum * 100 if total_sum else 0
        legend_labels.append(f'{l} - {pct:.1f}%')
    ax.legend(wedges, legend_labels, loc='center left', bbox_to_anchor=(1, 0.5),
              frameon=False, fontsize=10, labelcolor='#1B2A4A')

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, facecolor='white', bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return buf


def _empty_chart(title: str) -> io.BytesIO:
    """Gráfico vazio como fallback quando não há dados."""
    fig, ax = plt.subplots(figsize=(6, 4))
    fig.patch.set_facecolor('white')
    ax.set_facecolor('white')
    ax.text(0.5, 0.5, 'Sem dados', ha='center', va='center',
            fontsize=14, color='#888888', transform=ax.transAxes)
    ax.set_title(title, fontsize=11, fontweight='bold', color='#1B2A4A', pad=12)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.set_xticks([])
    ax.set_yticks([])
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, facecolor='white', bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return buf


# ======================================================================
# Helper — desenha cabeçalho da tabela (reutilizado em páginas seguintes)
# ======================================================================

def _draw_table_header(pdf, col_mm):
    """Desenha a linha de cabeçalho da tabela resumo."""
    headers = ['#', 'Colaborador', 'Ocorrência', 'Câmera', 'Setor', 'Registros', '% do Total']
    pdf.set_fill_color(27, 42, 74)      # #1B2A4A
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_draw_color(221, 227, 237)    # #DDE3ED
    pdf.set_line_width(0.5 * 25.4 / 72)  # 0.5px ~ 0.176 mm
    for i, h in enumerate(headers):
        pdf.cell(col_mm[i], 9.88, h, 1, 0, 'C', True)  # Height: 28px (9.88mm) matches 9px 12px padding
    pdf.ln()


# ======================================================================
# Rota — Exportar PDF
# ======================================================================

@router.get("/export/pdf")
async def exportar_pdf(
    period: str = Query("all", enum=["24h", "7d", "30d", "all", "custom"]),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    camera_id: Optional[str] = Query(None),
    setor_id: Optional[str] = Query(None),
    user_id: str = Depends(get_optional_token_user)
):
    # -----------------------------------------------------------------
    # Preparar etiqueta de período
    # -----------------------------------------------------------------
    if period == "custom" and start_date and end_date:
        try:
            d_start = datetime.strptime(start_date, "%Y-%m-%d").strftime("%d/%m/%Y")
            d_end = datetime.strptime(end_date, "%Y-%m-%d").strftime("%d/%m/%Y")
            period_label = f"{d_start} a {d_end}"
        except Exception:
            period_label = f"{start_date} a {end_date}"
    elif period == "24h":
        period_label = "Últimas 24 horas"
    elif period == "7d":
        period_label = "Últimos 7 dias"
    elif period == "30d":
        period_label = "Últimos 30 dias"
    else:
        period_label = "Todo o período"

    conn = get_connection()
    try:
        cur = conn.cursor()

        where_clauses = []
        params = []

        # Filtro de período
        if period == "custom" and start_date and end_date:
            start_str = f"{start_date} 00:00:00"
            end_str = f"{end_date} 23:59:59"
            where_clauses.append("e.ocorrido_em BETWEEN %s::timestamp AND %s::timestamp")
            params.extend([start_str, end_str])
        elif period != "all":
            interval = get_interval(period)
            where_clauses.append("e.ocorrido_em > NOW() - INTERVAL %s")
            params.append(interval)

        if camera_id and camera_id != "all":
            where_clauses.append("e.camera_id = %s")
            params.append(camera_id)

        if setor_id and setor_id != "all":
            where_clauses.append("e.setor_id = %s")
            params.append(setor_id)

        where_stmt = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        query = f"""
            SELECT
                e.id, c.nome, s.nome as setor, tv.nome as violacao, e.ocorrido_em,
                col.nome_completo as colaborador, col.cargo, e.status
            FROM eventos e
            LEFT JOIN cameras c ON e.camera_id = c.id
            LEFT JOIN setores s ON e.setor_id = s.id
            LEFT JOIN tipos_violacao tv ON e.tipo_violacao_id = tv.id
            LEFT JOIN colaboradores col ON e.colaborador_id = col.id
            {where_stmt}
            ORDER BY e.ocorrido_em DESC
            LIMIT 2000
        """

        cur.execute(query, params)
        rows = cur.fetchall()

        # =============================================================
        # Agregar dados para KPIs, gráficos e tabela
        # =============================================================
        total_violacoes = len(rows)

        # Faces reconhecidas (colaboradores distintos não-nulos)
        faces_set = set()
        for r in rows:
            if r[5] and str(r[5]).upper() != "DESCONHECIDO":
                faces_set.add(r[5])
        faces_reconhecidas = len(faces_set)

        # Câmera crítica (mais ocorrências)
        cam_counter = Counter()
        for r in rows:
            cam_counter[r[1] if r[1] else "---"] += 1
        camera_critica = cam_counter.most_common(1)[0][0] if cam_counter else "---"

        # Zona/Setor crítico
        setor_counter = Counter()
        for r in rows:
            setor_counter[r[2] if r[2] else "---"] += 1
        zona_critica = setor_counter.most_common(1)[0][0] if setor_counter else "---"

        # Dados para gráficos
        incidents_by_sector = setor_counter.most_common()
        violation_counter = Counter()
        for r in rows:
            violation_counter[r[3] if r[3] else "SEGURO"] += 1
        violation_types = violation_counter.most_common()

        # Agrupamento para tabela
        groups = Counter()
        for r in rows:
            colabor = r[5] if r[5] else "DESCONHECIDO"
            viol = r[3] if r[3] else "SEGURO"
            cam = r[1] if r[1] else "---"
            setr = r[2] if r[2] else "---"
            groups[(colabor, viol, cam, setr)] += 1
        total_regs = sum(groups.values())
        top_groups = groups.most_common(10)
        others_count = total_regs - sum(cnt for _, cnt in top_groups)

        # =============================================================
        # GERAR PDF
        # =============================================================
        pdf = PDFReport(period_label=period_label)
        pdf.add_page()

        usable_w = pdf.w - pdf.l_margin - pdf.r_margin  # ~180mm

        # ------------------------------------------------------------------
        # SEÇÃO 2 — BARRA DE METADADOS
        # ------------------------------------------------------------------
        meta_h = 24 * 25.4 / 72  # 24px (7px top/bottom padding + 10px font) ~ 8.47 mm
        pdf.set_fill_color(232, 238, 247)   # #E8EEF7
        pdf.set_font('Helvetica', '', 10)
        pdf.set_text_color(27, 42, 74)      # #1B2A4A
        meta_text = 'Período: ' + period_label + '  |  Gerado em: ' + format_date_br()
        pdf.cell(usable_w, meta_h, meta_text, 0, 1, 'C', True)
        # Borda inferior: 0.5px solid #DDE3ED
        pdf.set_draw_color(221, 227, 237)   # #DDE3ED
        pdf.set_line_width(0.5 * 25.4 / 72)  # 0.5px ~ 0.176 mm
        pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
        pdf.ln(5.6)  # ~16px espaçamento entre seções

        # ------------------------------------------------------------------
        # SEÇÃO 3 — KPIs (4 cartões na mesma linha)
        # ------------------------------------------------------------------
        card_w = usable_w / 4
        card_h = 30  # mm
        y_kpi = pdf.get_y()

        kpi_data = [
            ('Violacoes de EPI', str(total_violacoes), 28, True),
            ('Faces Reconhecidas', str(faces_reconhecidas), 28, False),
            ('Camera Critica', str(camera_critica), 18, False),
            ('Zona Critica', str(zona_critica), 18, False),
        ]

        for idx, (label, value, font_size, show_badge) in enumerate(kpi_data):
            x = pdf.l_margin + idx * card_w

            # Fundo branco do cartão
            pdf.set_fill_color(255, 255, 255)
            pdf.rect(x, y_kpi, card_w, card_h, 'F')

            # Separador vertical entre cartões
            if idx > 0:
                pdf.set_draw_color(221, 227, 237)
                pdf.set_line_width(0.18)
                pdf.line(x, y_kpi, x, y_kpi + card_h)

            # Valor numérico em destaque
            pdf.set_font('Helvetica', 'B', font_size)
            pdf.set_text_color(27, 42, 74)  # #1B2A4A
            val_y = y_kpi + 5.6   # padding-top ~16px
            pdf.set_xy(x, val_y)
            pdf.cell(card_w, font_size * 0.35, value, 0, 0, 'C')

            # Rótulo
            label_y = val_y + font_size * 0.35 + 1.4  # margin-top ~4px
            pdf.set_font('Helvetica', '', 11)
            pdf.set_text_color(95, 127, 168)  # #5F7FA8
            pdf.set_xy(x, label_y)
            pdf.cell(card_w, 4, label, 0, 0, 'C')

            # Badge "CRITICO" (somente no cartão de violações)
            if show_badge:
                badge_w = 24
                badge_h = 5
                badge_x = x + (card_w - badge_w) / 2
                badge_y = label_y + 6   # margin-top ~6px
                pdf.set_fill_color(229, 57, 53)  # #E53935
                pdf.rect(badge_x, badge_y, badge_w, badge_h, 'F')
                pdf.set_font('Helvetica', 'B', 9)
                pdf.set_text_color(255, 255, 255)
                pdf.set_xy(badge_x, badge_y + 0.5)
                pdf.cell(badge_w, badge_h - 1, 'CRITICO', 0, 0, 'C')

        # Borda inferior do bloco KPI
        pdf.set_draw_color(221, 227, 237)
        pdf.set_line_width(0.18)
        pdf.line(pdf.l_margin, y_kpi + card_h, pdf.w - pdf.r_margin, y_kpi + card_h)
        pdf.set_y(y_kpi + card_h + 5.6)

        # ------------------------------------------------------------------
        # SEÇÃO 4 — GRÁFICOS (lado a lado, 50% cada)
        # ------------------------------------------------------------------
        chart_w = usable_w / 2
        chart_h = 70   # ~200px
        y_charts = pdf.get_y()

        chart1_buf = _chart_incidents_by_sector(incidents_by_sector)
        chart2_buf = _chart_violation_type_donut(violation_types, total_violacoes)

        # Fundo branco para cada gráfico
        pdf.set_fill_color(255, 255, 255)
        pdf.rect(pdf.l_margin, y_charts, chart_w, chart_h, 'F')
        pdf.rect(pdf.l_margin + chart_w, y_charts, chart_w, chart_h, 'F')

        # Separador vertical entre gráficos
        pdf.set_draw_color(221, 227, 237)
        pdf.set_line_width(0.18)
        pdf.line(pdf.l_margin + chart_w, y_charts,
                 pdf.l_margin + chart_w, y_charts + chart_h)

        # Inserir imagens dos gráficos com padding interno
        pad = 5.6   # ~16px
        pdf.image(chart1_buf, x=pdf.l_margin + pad, y=y_charts + pad,
                  w=chart_w - pad * 2, h=chart_h - pad * 2)
        pdf.image(chart2_buf, x=pdf.l_margin + chart_w + pad, y=y_charts + pad,
                  w=chart_w - pad * 2, h=chart_h - pad * 2)

        # Borda inferior do bloco de gráficos
        pdf.line(pdf.l_margin, y_charts + chart_h,
                 pdf.w - pdf.r_margin, y_charts + chart_h)
        pdf.set_y(y_charts + chart_h + 5.6)

        # ------------------------------------------------------------------
        # SEÇÃO 5 — TABELA RESUMO DE OCORRÊNCIAS (agrupada, top 10)
        # ------------------------------------------------------------------
        # Larguras ajustadas para garantir espaço para "Registros" (9%) e "% do Total" (10%)
        # reduzindo levemente "Ocorrência" (de 25% para 22%) e "Câmera" (de 18% para 17%)
        col_pct = [5, 22, 22, 17, 15, 9, 10]
        col_mm = [usable_w * p / 100 for p in col_pct]
        row_h = 26 * 25.4 / 72  # Padding: 8px 12px (altura total = 26px ~ 9.17mm)

        # Cabeçalho da tabela
        _draw_table_header(pdf, col_mm)

        # Função auxiliar para verificar espaço e repetir cabeçalho
        def _check_page_break():
            if pdf.get_y() + row_h > pdf.h - 20:
                pdf.add_page()
                _draw_table_header(pdf, col_mm)

        # Linhas da tabela
        for idx, ((colab, viol, cam, setr), cnt) in enumerate(top_groups, start=1):
            _check_page_break()
            percent = cnt / total_regs * 100 if total_regs else 0

            # Zebra (ímpares: fundo #FFFFFF, pares: fundo #F4F6F9)
            if idx % 2 != 0:
                bg = (255, 255, 255)
            else:
                bg = (244, 246, 249)
            pdf.set_fill_color(*bg)

            # Borda de cada célula: 0.5px solid #DDE3ED
            pdf.set_draw_color(221, 227, 237)
            pdf.set_line_width(0.5 * 25.4 / 72)

            # Truncamento inteligente para que o texto nunca sobreponha ou desconfigure a grid
            colab_text = colab[:22] + "..." if len(colab) > 22 else colab
            viol_text = viol[:20] + "..." if len(viol) > 20 else viol
            cam_text = cam[:16] + "..." if len(cam) > 16 else cam
            setr_text = setr[:12] + "..." if len(setr) > 12 else setr

            # Coluna # — Número ordinal simples: 1º, 2º...
            pdf.set_text_color(27, 42, 74)
            pdf.set_font('Helvetica', '', 10)
            pdf.cell(col_mm[0], row_h, f"{idx}º", 1, 0, 'C', True)

            # Coluna Colaborador
            if colab.upper() == 'DESCONHECIDO':
                pdf.set_text_color(136, 136, 136)   # #888888
                pdf.set_font('Helvetica', 'I', 10)
            else:
                pdf.set_text_color(27, 42, 74)
                pdf.set_font('Helvetica', 'B', 10)  # peso 500 (B)
            pdf.cell(col_mm[1], row_h, colab_text, 1, 0, 'L', True)

            # Coluna Ocorrência
            pdf.set_text_color(27, 42, 74)
            pdf.set_font('Helvetica', '', 10)
            pdf.cell(col_mm[2], row_h, viol_text, 1, 0, 'L', True)

            # Coluna Câmera
            pdf.set_text_color(27, 42, 74)
            pdf.set_font('Helvetica', '', 10)
            pdf.cell(col_mm[3], row_h, cam_text, 1, 0, 'L', True)

            # Coluna Setor
            pdf.set_text_color(27, 42, 74)
            pdf.set_font('Helvetica', '', 10)
            pdf.cell(col_mm[4], row_h, setr_text, 1, 0, 'L', True)

            # Coluna Registros
            if cnt > 10:
                pdf.set_font('Helvetica', 'B', 10)  # peso 500 (B)
                pdf.set_text_color(229, 57, 53)     # #E53935
            else:
                pdf.set_font('Helvetica', '', 10)
                pdf.set_text_color(27, 42, 74)
            pdf.cell(col_mm[5], row_h, str(cnt), 1, 0, 'C', True)

            # Coluna % do Total (Sempre com uma casa decimal)
            pdf.set_text_color(27, 42, 74)
            pdf.set_font('Helvetica', '', 10)
            pdf.cell(col_mm[6], row_h, f'{percent:.1f}%', 1, 1, 'C', True)

        # Linha "Demais ocorrências"
        if others_count > 0:
            _check_page_break()
            idx = len(top_groups) + 1
            percent = others_count / total_regs * 100 if total_regs else 0

            # Zebra
            if idx % 2 != 0:
                bg = (255, 255, 255)
            else:
                bg = (244, 246, 249)
            pdf.set_fill_color(*bg)

            # Borda
            pdf.set_draw_color(221, 227, 237)
            pdf.set_line_width(0.5 * 25.4 / 72)

            # #
            pdf.set_text_color(27, 42, 74)
            pdf.set_font('Helvetica', '', 10)
            pdf.cell(col_mm[0], row_h, f"{idx}º", 1, 0, 'C', True)

            # Colaborador (estilo itálico, cor #888888)
            pdf.set_text_color(136, 136, 136)
            pdf.set_font('Helvetica', 'I', 10)
            pdf.cell(col_mm[1], row_h, '-', 1, 0, 'C', True)

            # Ocorrência
            pdf.set_text_color(27, 42, 74)
            pdf.set_font('Helvetica', '', 10)
            pdf.cell(col_mm[2], row_h, 'Demais ocorrencias', 1, 0, 'L', True)

            # Câmera
            pdf.cell(col_mm[3], row_h, '-', 1, 0, 'C', True)

            # Setor
            pdf.cell(col_mm[4], row_h, '-', 1, 0, 'C', True)

            # Registros
            if others_count > 10:
                pdf.set_font('Helvetica', 'B', 10)
                pdf.set_text_color(229, 57, 53)
            else:
                pdf.set_font('Helvetica', '', 10)
                pdf.set_text_color(27, 42, 74)
            pdf.cell(col_mm[5], row_h, str(others_count), 1, 0, 'C', True)

            # % do Total
            pdf.set_text_color(27, 42, 74)
            pdf.set_font('Helvetica', '', 10)
            pdf.cell(col_mm[6], row_h, f'{percent:.1f}%', 1, 1, 'C', True)

        # =============================================================
        # Gerar PDF em memória
        # =============================================================
        pdf_output = pdf.output(dest='S')
        if isinstance(pdf_output, str):
            pdf_bytes = pdf_output.encode('latin1')
        else:
            pdf_bytes = bytes(pdf_output)
        output = io.BytesIO(pdf_bytes)
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=relatorio_seguranca.pdf"}
        )
    finally:
        cur.close()
        conn.close()


# ======================================================================
# Rota — Listar Eventos (API JSON)
# ======================================================================

@router.get("/")
async def listar_eventos(
    limit: int = 10,
    period: str = Query(None, enum=["24h", "7d", "30d", "all", "custom"]),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user)
):
    conn = get_connection()
    try:
        cur = conn.cursor()

        # Lógica de Filtro para Sincronizar com Dashboard
        where_clause = ""
        params = []

        if period:
            if period == "custom" and start_date and end_date:
                where_clause = "WHERE e.ocorrido_em BETWEEN %s AND %s"
                params = [start_date, end_date]
            elif period != "all":
                interval = get_interval(period)
                where_clause = "WHERE e.ocorrido_em > NOW() - INTERVAL %s"
                params = [interval]

        # Adicionar limit aos parâmetros
        params.append(limit)

        query = f"""
            SELECT
                e.id, c.nome, s.nome as setor, tv.nome as violacao, e.ocorrido_em,
                e.miniatura_url, e.screenshot_url, col.nome_completo as colaborador, col.cargo,
                col.id as colab_db_id, e.status
            FROM eventos e
            LEFT JOIN cameras c ON e.camera_id = c.id
            LEFT JOIN setores s ON e.setor_id = s.id
            LEFT JOIN tipos_violacao tv ON e.tipo_violacao_id = tv.id
            LEFT JOIN colaboradores col ON e.colaborador_id = col.id
            {where_clause}
            ORDER BY e.ocorrido_em DESC
            LIMIT %s
        """

        cur.execute(query, params)
        rows = cur.fetchall()
        return [
            {
                "id": str(r[0]), "camera": r[1], "setor": r[2], "violacao": r[3],
                "timestamp": r[4].strftime("%H:%M:%S") if r[4] else "",
                "data": r[4].strftime("%d/%m/%Y") if r[4] else "Hoje",
                "miniatura": r[5], "screenshot": f"/event_images/{r[6]}" if r[6] else None,
                "colaborador": r[7], "cargo": r[8],
                "foto_referencia": f"/faces/{str(r[9])}/photo" if r[9] else None,
                "status": r[10]
            } for r in rows
        ]
    finally:
        cur.close()
        conn.close()
