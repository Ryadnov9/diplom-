import tkinter as tk
from tkinter import filedialog
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas

# Пример данных — можно заменить на загрузку из JSON/CSV
schedule_data = [
    {"group": "ІТ-12", "day": "Понеділок", "pair": 1, "subject": "Математика", "teacher": "Іваненко", "room": "301"},
    {"group": "ІТ-13", "day": "Вівторок", "pair": 2, "subject": "Програмування", "teacher": "Петренко", "room": "202"},
]

# Скрываем главное окно
root = tk.Tk()
root.withdraw()

# Открываем диалог сохранения
file_path = filedialog.asksaveasfilename(
    defaultextension=".pdf",
    filetypes=[("PDF файли", "*.pdf")],
    title="Зберегти розклад як PDF",
    initialfile="розклад.pdf"
)

# Генерация PDF
if file_path:
    c = canvas.Canvas(file_path, pagesize=landscape(A4))
    width, height = landscape(A4)

    # Заголовок
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "Розклад занять")

    # Шапка таблицы
    y = height - 100
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "Група")
    c.drawString(150, y, "День")
    c.drawString(250, y, "Пара")
    c.drawString(300, y, "Предмет")
    c.drawString(450, y, "Викладач")
    c.drawString(600, y, "Аудиторія")

    # Данные
    c.setFont("Helvetica", 10)
    y -= 20
    for entry in schedule_data:
        c.drawString(50, y, entry["group"])
        c.drawString(150, y, entry["day"])
        c.drawString(250, y, str(entry["pair"]))
        c.drawString(300, y, entry["subject"])
        c.drawString(450, y, entry["teacher"])
        c.drawString(600, y, entry["room"])
        y -= 20

    c.save()
    print(f"✅ PDF збережено: {file_path}")
else:
    print("⚠️ Збереження скасовано.")
