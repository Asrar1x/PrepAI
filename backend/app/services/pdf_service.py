"""ReportLab-based PDF rendering for interview feedback reports.

Public surface:
  - :func:`render_interview_pdf` writes a complete report to disk and
    returns the path.
"""
from __future__ import annotations

import os
from typing import Any, Dict, List, Sequence

from reportlab.graphics.charts.barcharts import HorizontalBarChart
from reportlab.graphics.shapes import Drawing, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


REPORTS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "reports")
)


def _ensure_dir() -> None:
    os.makedirs(REPORTS_DIR, exist_ok=True)


def _score_bar(dims: Dict[str, Dict[str, Any]]) -> Drawing:
    """Render a horizontal bar chart of dimension scores (0-100)."""
    items = list(dims.items())
    drawing = Drawing(480, 24 * len(items) + 20)
    chart = HorizontalBarChart()
    chart.x = 130
    chart.y = 0
    chart.height = 24 * len(items)
    chart.width = 320
    chart.data = [[v["score"] for _, v in items]]
    chart.categoryAxis.categoryNames = [k.replace("_", " ").title() for k, _ in items]
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = 100
    chart.bars[0].fillColor = colors.HexColor("#0d9488")
    chart.bars[0].strokeColor = colors.HexColor("#0f766e")
    drawing.add(chart)
    return drawing


def render_interview_pdf(
    session_id: str,
    interview_meta: Dict[str, Any],
    scoring: Dict[str, Any],
    narrative: Dict[str, Any],
    transcript: Sequence[Dict[str, Any]],
) -> str:
    """Render the full PDF report.  Returns the absolute path."""
    _ensure_dir()
    out_path = os.path.join(REPORTS_DIR, f"report_{session_id}.pdf")

    styles = getSampleStyleSheet()
    h1 = styles["Heading1"]
    h2 = styles["Heading2"]
    body = styles["BodyText"]
    body.fontSize = 10
    body.leading = 14

    story: List[Any] = []
    story.append(Paragraph("PrepAI Mock Interview Report", h1))
    story.append(Spacer(1, 0.1 * inch))

    meta_table = Table(
        [
            ["Session", str(session_id)],
            ["Role", str(interview_meta.get("job_role", "—"))],
            ["Company", str(interview_meta.get("company_target") or "—")],
            ["Type", str(interview_meta.get("interview_type", "—"))],
            ["Persona", str(interview_meta.get("persona", "—"))],
            ["Overall score", f"{scoring['overall_score']} / 100"],
        ],
        colWidths=[1.5 * inch, 4.5 * inch],
    )
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("Score breakdown", h2))
    story.append(_score_bar(scoring["dimensions"]))
    story.append(Spacer(1, 0.2 * inch))

    # Per-dimension details
    rows = [["Dimension", "Score", "Notes"]]
    for k, v in scoring["dimensions"].items():
        rows.append([k.replace("_", " ").title(), f"{v['score']}", v.get("notes", "")])
    table = Table(rows, colWidths=[1.5 * inch, 0.6 * inch, 4 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0d9488")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("Strengths", h2))
    for s in narrative.get("strengths", []):
        story.append(Paragraph(f"• {s}", body))
    story.append(Spacer(1, 0.1 * inch))

    story.append(Paragraph("Areas to improve", h2))
    for s in narrative.get("improvements", []):
        story.append(Paragraph(f"• {s}", body))
    story.append(Spacer(1, 0.1 * inch))

    story.append(Paragraph("Next steps", h2))
    for s in narrative.get("next_steps", []):
        story.append(Paragraph(f"• {s}", body))
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("Transcript", h2))
    for turn in transcript or []:
        speaker = turn.get("speaker", "?")
        text = turn.get("text") or turn.get("content") or ""
        story.append(Paragraph(f"<b>{speaker}:</b> {text}", body))
        story.append(Spacer(1, 0.05 * inch))

    doc = SimpleDocTemplate(out_path, pagesize=letter, title="PrepAI Report")
    doc.build(story)
    return out_path


__all__ = ["render_interview_pdf", "REPORTS_DIR"]
