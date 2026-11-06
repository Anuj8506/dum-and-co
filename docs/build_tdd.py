from pathlib import Path
from xml.sax.saxutils import escape
import re
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from pypdf import PdfReader
import pypdfium2 as pdfium

root = Path(__file__).resolve().parents[1]
source = (root / 'docs/TECHNICAL_DESIGN.md').read_text(encoding='utf-8')
output = root / 'docs/Technical-Design.pdf'
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='DocTitle', fontName='Helvetica-Bold', fontSize=24, leading=29, textColor=colors.HexColor('#1f3428'), spaceAfter=18))
styles.add(ParagraphStyle(name='SectionTitle', fontName='Helvetica-Bold', fontSize=13, leading=17, spaceBefore=14, spaceAfter=9, textColor=colors.HexColor('#214d39'), keepWithNext=True))
styles.add(ParagraphStyle(name='Copy', fontName='Helvetica', fontSize=9.6, leading=14.1, spaceAfter=10))
styles.add(ParagraphStyle(name='CellCopy', fontName='Helvetica', fontSize=8.2, leading=11, spaceAfter=0))
styles.add(ParagraphStyle(name='CellHead', fontName='Helvetica-Bold', fontSize=8.4, leading=11, textColor=colors.white))
story = []
for line in source.splitlines():
    line = line.strip()
    if not line:
        continue
    if line == '---':
        story.append(PageBreak())
    elif line.startswith('# '):
        story.append(Paragraph(escape(line[2:]), styles['DocTitle']))
    elif line.startswith('## '):
        story.append(Paragraph(escape(line[3:]), styles['SectionTitle']))
    elif line.startswith('|'):
        if re.match(r'^\|\s*-', line):
            continue
        cells = [c.strip() for c in line.strip('|').split('|')]
        if story and isinstance(story[-1], Table):
            # Collect tables separately below rather than mutate existing ReportLab flowables.
            raise RuntimeError('Unexpected table grouping')
        story.append(('row', cells))
    else:
        story.append(Paragraph(escape(line.replace('`', '')), styles['Copy']))

grouped = []
i = 0
while i < len(story):
    item = story[i]
    if isinstance(item, tuple):
        rows = []
        while i < len(story) and isinstance(story[i], tuple):
            rows.append(story[i][1]); i += 1
        table_rows = [[Paragraph(escape(cell), styles['CellHead'] if r == 0 else styles['CellCopy']) for cell in row] for r, row in enumerate(rows)]
        t = Table(table_rows, colWidths=[112, 383], repeatRows=1, hAlign='LEFT')
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#214d39')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f4f5f0')]),
            ('GRID', (0, 0), (-1, -1), .4, colors.HexColor('#d9ded3')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 9), ('RIGHTPADDING', (0, 0), (-1, -1), 9),
            ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        grouped.extend([t, Spacer(1, 10)])
    else:
        grouped.append(item); i += 1

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor('#6c756b'))
    canvas.drawString(50, 30, 'Dum & Co.  |  ISOCODE restaurant project  |  Technical design')
    canvas.drawRightString(A4[0] - 50, 30, str(doc.page))
    canvas.restoreState()

SimpleDocTemplate(str(output), pagesize=A4, rightMargin=50, leftMargin=50, topMargin=43, bottomMargin=48, title='Restaurant Ordering Technical Design', author='Anuj Kumar Singh').build(grouped, onFirstPage=footer, onLaterPages=footer)
pdf = PdfReader(output)
print(f'Created {output} ({len(pdf.pages)} pages)')
qa = root / 'work/tdd-qa'
qa.mkdir(parents=True, exist_ok=True)
doc = pdfium.PdfDocument(str(output))
for index in range(len(doc)):
    page = doc[index]
    image = page.render(scale=1.6).to_pil()
    image.save(qa / f'page-{index + 1}.png')
    page.close()
doc.close()
assert all(len(page.extract_text().strip()) > 100 for page in pdf.pages), 'Unexpected empty PDF page'
print('Rendered all PDF pages for inspection')
