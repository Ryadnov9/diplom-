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

let scheduleData = [];

document
  .getElementById("scheduleForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    const subject = document.getElementById("subject").value;
    const teacher = document.getElementById("teacher").value;
    const group = document.getElementById("group").value;
    const type = document.getElementById("type").value;
    const link = document.getElementById("link").value || "";

    scheduleData.push({ subject, teacher, group, type, link });

    document.getElementById("scheduleForm").reset();
  });

document
  .getElementById("generateButton")
  .addEventListener("click", generateSchedule);

document.getElementById("backButton").addEventListener("click", function () {
  document
    .querySelectorAll(".hide-on-generate")
    .forEach((el) => el.classList.remove("hidden"));
  document.body.classList.remove("table-only");
  document.getElementById("backButton").style.display = "none";
  document.getElementById("clearTableButton").style.display = "none";
  document.getElementById("scheduleTable").innerHTML = ""; // Очищуємо таблицю при поверненні
});

document
  .getElementById("clearTableButton")
  .addEventListener("click", function () {
    document.getElementById("scheduleTable").innerHTML = ""; // Очищуємо таблицю
  });

function generateSchedule() {
  const lessonsPerWeek = parseInt(
    document.getElementById("lessonsPerWeek").value
  );
  let generatedSchedule = [];

  groups.forEach((group) => {
    let groupSubjects = scheduleData.filter(
      (entry) => entry.group === group.name
    );

    groupSubjects.forEach((subjectEntry) => {
      let lessonsAdded = 0;

      while (lessonsAdded < lessonsPerWeek) {
        let dayIndex = Math.floor(Math.random() * daysOfWeek.length);
        let pair = Math.floor(Math.random() * 6) + 1;

        if (
          !hasTeacherConflict(
            subjectEntry.teacher,
            dayIndex,
            pair,
            generatedSchedule
          )
        ) {
          generatedSchedule.push({
            subject: `${subjectEntry.subject} (${subjectEntry.type})`,
            group: group.name,
            teacher: subjectEntry.teacher,
            day: dayIndex,
            pair: pair,
            link: subjectEntry.link,
          });
          lessonsAdded++;
        }
      }
    });
  });

  document
    .querySelectorAll(".hide-on-generate")
    .forEach((el) => el.classList.add("hidden"));
  document.body.classList.add("table-only");
  document.getElementById("backButton").style.display = "block";
  document.getElementById("clearTableButton").style.display = "block"; // Показуємо кнопку очищення

  renderTable(generatedSchedule);
}

function hasTeacherConflict(teacher, day, pair, schedule) {
  return schedule.some(
    (entry) =>
      entry.teacher === teacher && entry.day === day && entry.pair === pair
  );
}

function renderTable(generatedSchedule) {
  const table = document.getElementById("scheduleTable");
  table.innerHTML = "";

  const subjectRow = document.createElement("tr");
  subjectRow.innerHTML = `
    <th rowspan="2" class="day-column">Дні тижня</th>
    <th rowspan="2">№ пари</th>
    ${groups.map((group) => `<th>${group.subject}</th>`).join("")}
  `;
  table.appendChild(subjectRow);

  const groupRow = document.createElement("tr");
  groupRow.innerHTML = groups.map((group) => `<th>${group.name}</th>`).join("");
  table.appendChild(groupRow);

  daysOfWeek.forEach((day, dayIndex) => {
    for (let pair = 1; pair <= 6; pair++) {
      const row = document.createElement("tr");

      if (pair === 1) {
        row.innerHTML += `<td class="day-column" rowspan="6">${day}</td>`;
      }

      row.innerHTML += `<td>${pair}</td>`;

      row.innerHTML += groups
        .map((group) => {
          const subjectEntry = generatedSchedule.find(
            (entry) =>
              entry.group === group.name &&
              entry.day === dayIndex &&
              entry.pair === pair
          );
          return `<td>${
            subjectEntry
              ? `${subjectEntry.subject}<br>${subjectEntry.teacher}${
                  subjectEntry.link
                    ? `<br><a href="${subjectEntry.link}" target="_blank">Посилання</a>`
                    : ""
                }`
              : ""
          }</td>`;
        })
        .join("");

      table.appendChild(row);
    }
  });
}
