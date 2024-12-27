const daysOfWeek = ["Понеділок", "Вівторок", "Середа", "Четверг", "П`ятниця"]; // Дни недели
const groups = [
  { name: "12-411", subject: "014 Середня освіта (Фізика) 014.08 Фізика" },
  { name: "12-412", subject: "104 Фізика та астрономія" },
  {
    name: "12-421",
    subject: "014 Середня освіта (Математика) 014.04 Математика",
  },
  { name: "12-431", subject: "122 Комп'ютерні науки" },
  { name: "12-432", subject: "014 Середня освіта (Інформатика)" },
  { name: "12-441", subject: "121 Інженерія програмного забезпечення" },
  {
    name: "12-242",
    subject:
      "121 Інженерія програмного забезпечення (скорочений термін 1 р. 10 м.)",
  },
  { name: "12-461", subject: "126 Інформаційні системи та технології" },
];

document
  .getElementById("generateButton")
  .addEventListener("click", generateTable);

function generateTable() {
  const teacherName = document.getElementById("teacherName").value.trim(); // Получаем фамилию
  const table = document.getElementById("scheduleTable");
  table.innerHTML = ""; // Очистка таблицы перед генерацией

  if (!teacherName) {
    alert("Введіть прізвище!"); // Проверка на пустую фамилию
    return;
  }

  const subjectRow = document.createElement("tr");
  subjectRow.innerHTML = `
    <th rowspan="2" class="day-column">Дні тиждня</th>
    <th rowspan="2">№ пар</th>
    ${groups.map((group) => `<th>${group.subject}</th>`).join("")}
  `;
  table.appendChild(subjectRow);

  const groupRow = document.createElement("tr");
  groupRow.innerHTML = groups.map((group) => `<th>${group.name}</th>`).join("");
  table.appendChild(groupRow);

  daysOfWeek.forEach((day) => {
    for (let pair = 1; pair <= 6; pair++) {
      const row = document.createElement("tr");

      if (pair === 1) {
        row.innerHTML += `<td class="day-column" rowspan="6">${day}</td>`;
      }

      row.innerHTML += `<td>${pair}</td>`;

      row.innerHTML += groups.map(() => `<td></td>`).join("");

      table.appendChild(row);
    }
  });
}
