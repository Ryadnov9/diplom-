from reportlab.lib import colors
from reportlab.lib.pagesizes import A3
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet

def export_schedule_pdf(schedule_data, output_file="schedule.pdf", approval_name="", signature="________"):
    doc = SimpleDocTemplate(output_file, pagesize=A3)
    elements = []

    headers = ["День", "Пара"] + [g["name"] for g in group]
    data = [headers]
    daysOfWeek = ["Понеділок", "Вівторок", "Середа", "Четвер", "П’ятниця"]
    for day_index, day in enumerate(daysOfWeek):
        for pair in range(1, 7):
            row = [day if pair == 1 else "", str(pair)]
            for group in group:
                entry = next(
                    (e for e in schedule_data if e["group"] == group["name"] and e["day"] == day_index and e["pair"] == pair),
                    None,
                )
                if entry:
                    link_text = (
                        f'<a href="{entry["link"]}">Посилання</a>'
                        if entry["link"].startswith(("http://", "https://"))
                        else entry["link"]
                    )
                    cell_content = f"{entry['subject']}<br/>{entry['teacher']}<br/>{entry['type']}<br/>{link_text}"
                else:
                    cell_content = ""
                row.append(cell_content)
            data.append(row)

    col_widths = [50*mm, 30*mm] + [100*mm] * len(group)
    table = Table(data, colWidths=col_widths)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4F81BD')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#D9E1F2')),
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('SPAN', (0, 1), (0, 6)),
        ('SPAN', (0, 7), (0, 12)),
        ('SPAN', (0, 13), (0, 18)),
        ('SPAN', (0, 19), (0, 24)),
        ('SPAN', (0, 25), (0, 30)),
    ]))
    elements.append(table)

    elements.append(Spacer(1, 15 * mm))

    if approval_name:
        styles = getSampleStyleSheet()
        approval_style = styles['Normal']
        approval_style.fontName = 'Helvetica-Bold'
        approval_style.fontSize = 12
        approval_style.leading = 16
        approval_style.textColor = colors.HexColor('#333333')
        approval_style.spaceBefore = 5
        approval_style.spaceAfter = 5
        approval_text = f"Утверждено: {approval_name}<br/>Подпись: {signature}"
        approval_paragraph = Paragraph(approval_text, approval_style)
        elements.append(approval_paragraph)

    doc.build(elements)