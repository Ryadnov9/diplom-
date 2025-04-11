const daysOfWeek = ["Понеділок", "Вівторок", "Середа", "Четвер", "П’ятниця"];
const groups = [
  { name: "12-411", subject: "014 Середня освіта (Фізика)" },
  { name: "12-412", subject: "104 Фізика та астрономія" },
  { name: "12-421", subject: "014 Середня освіта (Математика)" },
  { name: "12-431", subject: "122 Комп'ютерні науки" },
  { name: "12-432", subject: "014 Середня освіта (Інформатика)" },
  { name: "12-441", subject: "121 Інженерія програмного забезпечення" },
  { name: "12-242", subject: "121 Інженерія ПЗ (скорочений термін)" },
  { name: "12-461", subject: "126 Інформаційні системи та технології" },
];

// Глобальний масив для збереження імпортованих і розподілених даних
let importedSchedule = [];

document
  .getElementById("generateButton")
  .addEventListener("click", generateSchedule);

document
  .getElementById("clearTableButton")
  .addEventListener("click", clearTable);

document.getElementById("backButton").addEventListener("click", backToGenerate);

document.getElementById("importButton").addEventListener("click", () => {
  document.getElementById("fileInput").click();
});

document
  .getElementById("fileInput")
  .addEventListener("change", handleFileImport);

function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    try {
      // Парсимо CSV
      const rows = text
        .split("\n")
        .map((row) => row.trim())
        .filter((row) => row);
      importedSchedule = [];

      // Перевіряємо заголовок
      const headers = rows[0].split(",").map((header) => header.trim());
      if (
        headers[0] !== "group" ||
        headers[1] !== "subject" ||
        headers[2] !== "teacher" ||
        headers[3] !== "type" ||
        headers[4] !== "link" ||
        headers[5] !== "weeklyCount"
      ) {
        alert(
          "Неправильний формат CSV. Очікується: group,subject,teacher,type,link,weeklyCount"
        );
        return;
      }

      // Обробляємо рядки даних
      for (let i = 1; i < rows.length; i++) {
        const [group, subject, teacher, type, link, weeklyCount] = rows[i]
          .split(",")
          .map((item) => item.trim());
        if (group && subject && teacher && type && link && weeklyCount) {
          const weeklyCountNum = parseInt(weeklyCount);
          const validTypes = ["лекція", "лабораторія", "практика"];
          if (
            groups.some((g) => g.name === group) &&
            validTypes.includes(type) &&
            !isNaN(weeklyCountNum) &&
            weeklyCountNum > 0 &&
            weeklyCountNum <= 5 // Обмежуємо до 5 днів
          ) {
            // Рандомно розподіляємо заняття
            const assignedSlots = [];
            const availableDays = [0, 1, 2, 3, 4]; // 5 днів тижня
            for (let j = 0; j < weeklyCountNum; j++) {
              const randomDayIndex = Math.floor(
                Math.random() * availableDays.length
              );
              const day = availableDays.splice(randomDayIndex, 1)[0]; // Вибираємо і видаляємо день
              const pair = Math.floor(Math.random() * 6) + 1; // Рандомна пара 1–6
              assignedSlots.push({
                group,
                subject,
                teacher,
                type,
                link,
                day,
                pair,
              });
            }
            importedSchedule.push(...assignedSlots);
          }
        }
      }

      if (importedSchedule.length === 0) {
        alert("Не знайдено валідних даних у файлі.");
        return;
      }

      // Автоматично генеруємо таблицю
      generateSchedule();

      // Очищуємо input
      event.target.value = "";
    } catch (error) {
      alert("Помилка при обробці файлу: " + error.message);
    }
  };
  reader.readAsText(file);
}

function generateSchedule() {
  const table = document.getElementById("scheduleTable");
  table.style.display = "table";
  document.getElementById("generateButton").style.display = "none";
  document.getElementById("importButton").style.display = "none";
  document.getElementById("clearTableButton").style.display = "inline-block";
  document.getElementById("exportButton").style.display = "inline-block";
  document.getElementById("backButton").style.display = "inline-block";
  renderTable(importedSchedule);
}

function clearTable() {
  const table = document.getElementById("scheduleTable");
  table.style.display = "none";
  table.innerHTML = "";
  document.getElementById("clearTableButton").style.display = "inline-block";
  document.getElementById("exportButton").style.display = "none";
  document.getElementById("backButton").style.display = "inline-block";
}

function backToGenerate() {
  const table = document.getElementById("scheduleTable");
  table.style.display = "none";
  table.innerHTML = "";
  document.getElementById("generateButton").style.display = "inline-block";
  document.getElementById("importButton").style.display = "inline-block";
  document.getElementById("clearTableButton").style.display = "none";
  document.getElementById("exportButton").style.display = "none";
  document.getElementById("backButton").style.display = "none";
}

function renderTable(generatedSchedule) {
  const table = document.getElementById("scheduleTable");
  table.innerHTML = "";

  // Рядок із заголовками спеціальностей
  const subjectRow = document.createElement("tr");
  subjectRow.innerHTML = `
    <th rowspan="2" class="day-column">Дні тижня</th>
    <th rowspan="2">№ пари</th>
    ${groups.map((group) => `<th>${group.subject}</th>`).join("")}
  `;
  table.appendChild(subjectRow);

  // Рядок із номерами груп
  const groupRow = document.createElement("tr");
  groupRow.innerHTML = groups.map((group) => `<th>${group.name}</th>`).join("");
  table.appendChild(groupRow);

  // Заповнення таблиці
  daysOfWeek.forEach((day, dayIndex) => {
    for (let pair = 1; pair <= 6; pair++) {
      const row = document.createElement("tr");

      if (pair === 1) {
        row.innerHTML += `<td class="day-column" rowspan="6">${day}</td>`;
      }

      row.innerHTML += `<td>${pair}</td>`;

      row.innerHTML += groups
        .map((group) => {
          const entry = generatedSchedule.find(
            (e) =>
              e.group === group.name && e.day === dayIndex && e.pair === pair
          );
          if (entry) {
            return `<td>${entry.subject}\n${entry.teacher}\n${entry.type}\n<a href="${entry.link}" target="_blank">Посилання</a></td>`;
          }
          return `<td></td>`;
        })
        .join("");

      table.appendChild(row);
    }
  });
}
