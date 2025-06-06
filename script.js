const daysOfWeek = ["Понеділок", "Вівторок", "Середа", "Четвер", "П’ятниця"];
const PAIR_DURATION_MINUTES = 80;
const MAX_PAIRS_PER_DAY = 6;

let groups = [];
let importedSchedule = [];
let teacherRestrictions = [];
let isEditMode = false;

document
  .getElementById("generateButton")
  .addEventListener("click", generateSchedule);
document.getElementById("backButton").addEventListener("click", backToGenerate);
document.getElementById("importButton").addEventListener("click", () => {
  document.getElementById("importOptions").style.display = "block";
});
document
  .getElementById("closeImportOptionsButton")
  .addEventListener("click", () => {
    document.getElementById("importOptions").style.display = "none";
  });
document.getElementById("importCSVButton").addEventListener("click", () => {
  document.getElementById("importOptions").style.display = "none";
  document.getElementById("fileInput").accept = ".csv";
  document.getElementById("fileInput").click();
});
document
  .getElementById("importSavedFileButton")
  .addEventListener("click", () => {
    document.getElementById("importOptions").style.display = "none";
    document.getElementById("fileInput").accept = ".json,.txt";
    document.getElementById("fileInput").click();
  });
document
  .getElementById("fileInput")
  .addEventListener("change", handleFileImport);
document
  .getElementById("editTableButton")
  .addEventListener("click", toggleEditMode);
document
  .getElementById("checkConflictsButton")
  .addEventListener("click", checkConflicts);
document
  .getElementById("closeConflictResultsButton")
  .addEventListener(
    "click",
    () => (document.getElementById("conflictResults").style.display = "none")
  );
document.getElementById("closeResultsButton").addEventListener("click", () => {
  document.getElementById("searchResults").style.display = "none";
  document.getElementById("searchInput").value = "";
});
document.getElementById("searchInput").addEventListener("input", searchTable);
document
  .getElementById("exportButton")
  .addEventListener("click", showExportOptions);
document
  .getElementById("closeExportOptionsButton")
  .addEventListener(
    "click",
    () => (document.getElementById("exportOptions").style.display = "none")
  );

//   // Excel export via Python server
// document.getElementById("exportExcelButton").addEventListener("click", () => {
//   const table = document.getElementById("scheduleTable");

//   if (!table || table.style.display === "none") {
//     alert("Будь ласка, згенеруйте розклад перед експортом.");
//     return;
//   }

//   const rows = Array.from(table.rows).map((row) =>
//     Array.from(row.cells).map((cell) => cell.innerText)
//   );

//   fetch("http://localhost:5000/export_excel", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ table: rows }),
//   })
//     .then((response) => response.blob())
//     .then((blob) => {
//       const link = document.createElement("a");
//       link.href = URL.createObjectURL(blob);
//       link.download = "Розклад.xlsx";
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//     })
//     .catch((error) => console.error("Помилка експорту в Excel:", error));
// });

// exel export
document.getElementById("exportExcelButton").addEventListener("click", () => {
  const table = document.getElementById("scheduleTable");
  if (!table || table.style.display === "none") {
    alert("Будь ласка, згенеруйте розклад перед експортом.");
    return;
  }

  const html = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          table {
            border-collapse: collapse;
            font-family: sans-serif;
            font-size: 14px;
          }
          th, td {
            border: 1px solid #333;
            padding: 6px 10px;
            text-align: center;
            vertical-align: middle;
          }
          th {
            background-color: #4F81BD;
            color: white;
          }
          .day-column {
            background-color: #D9E1F2;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        ${table.outerHTML}
      </body>
    </html>
  `;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Розклад.xls";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// PDF export using html2pdf.js (Unicode-compatible and full layout)
document.getElementById("exportPDFButton").addEventListener("click", () => {
  const element = document.getElementById("scheduleTable");

  if (!element || element.style.display === "none") {
    alert("Будь ласка, згенеруйте розклад перед експортом.");
    return;
  }

  const dayHeaders = element.querySelectorAll(".day-column");
  dayHeaders.forEach((el) => {
    el.style.writingMode = "horizontal-tb";
    el.style.textOrientation = "initial";
  });

  const opt = {
    margin: 10,
    filename: "Розклад.pdf",
    image: { type: "jpeg", quality: 1 },
    html2canvas: {
      scale: 3,
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    },
    jsPDF: {
      unit: "px",
      format: [element.scrollWidth + 20, element.scrollHeight + 20],
      orientation: "landscape",
    },
  };

  html2pdf()
    .set(opt)
    .from(element)
    .save()
    .then(() => {
      dayHeaders.forEach((el) => {
        el.style.writingMode = "vertical-rl";
        el.style.textOrientation = "upright";
      });
    });
});

function showExportOptions() {
  const exportOptions = document.getElementById("exportOptions");
  const searchBarRect = document
    .querySelector(".search-bar")
    .getBoundingClientRect();
  exportOptions.style.top = `${searchBarRect.bottom + window.scrollY + 10}px`;
  exportOptions.style.display = "block";
}

function isTeacherSlotFree(teacher, day, pair, schedule) {
  return !schedule.some(
    (entry) =>
      entry.teacher === teacher && entry.day === day && entry.pair === pair
  );
}

function isGroupSlotFree(group, day, pair, schedule) {
  return !schedule.some(
    (entry) => entry.group === group && entry.day === day && entry.pair === pair
  );
}

function hasEnoughFreeSlotsForTeacher(teacher, day, weeklyCount, schedule) {
  let occupiedSlots = 0;
  for (let pair = 1; pair <= MAX_PAIRS_PER_DAY; pair++) {
    if (!isTeacherSlotFree(teacher, day, pair, schedule)) occupiedSlots++;
  }
  return occupiedSlots + weeklyCount <= MAX_PAIRS_PER_DAY;
}

function hasEnoughFreeSlotsForGroup(group, day, weeklyCount, schedule) {
  let occupiedSlots = 0;
  for (let pair = 1; pair <= MAX_PAIRS_PER_DAY; pair++) {
    if (!isGroupSlotFree(group, day, pair, schedule)) occupiedSlots++;
  }
  return occupiedSlots + weeklyCount <= MAX_PAIRS_PER_DAY;
}

function findFreeSlot(
  teacher,
  groupsForLesson,
  allowedPairs,
  preferredDays,
  allDays,
  weeklyCount,
  schedule,
  mustBeSequential = false
) {
  let availableDays = [...preferredDays];
  if (availableDays.length === 0) availableDays = [...allDays];
  let slots = [];
  let attempts = 0;
  const maxAttempts = 100;

  while (slots.length < weeklyCount && attempts < maxAttempts) {
    attempts++;
    if (availableDays.length === 0) {
      console.warn(`Немає доступних днів для викладача ${teacher}`);
      return null;
    }

    const dayIndex = Math.floor(Math.random() * availableDays.length);
    const day = availableDays[dayIndex];
    let availablePairs = [...allowedPairs];

    if (
      !hasEnoughFreeSlotsForTeacher(teacher, day, weeklyCount, schedule) ||
      !groupsForLesson.every((group) =>
        hasEnoughFreeSlotsForGroup(group, day, weeklyCount, schedule)
      )
    ) {
      availableDays.splice(dayIndex, 1);
      continue;
    }

    if (mustBeSequential && weeklyCount > 1) {
      let startPairIndex = Math.floor(
        Math.random() * (availablePairs.length - weeklyCount + 1)
      );
      let startPair = availablePairs[startPairIndex];
      let sequentialPairs = [];
      for (let j = 0; j < weeklyCount; j++) {
        const pair = startPair + j;
        if (pair > MAX_PAIRS_PER_DAY || !allowedPairs.includes(pair)) {
          sequentialPairs = [];
          break;
        }
        if (
          isTeacherSlotFree(teacher, day, pair, schedule) &&
          groupsForLesson.every((group) =>
            isGroupSlotFree(group, day, pair, schedule)
          )
        ) {
          sequentialPairs.push({ day, pair });
        } else {
          sequentialPairs = [];
          break;
        }
      }
      if (sequentialPairs.length === weeklyCount) {
        slots.push(...sequentialPairs);
        break;
      } else {
        availableDays.splice(dayIndex, 1);
        continue;
      }
    } else {
      const pairIndex = Math.floor(Math.random() * availablePairs.length);
      const pair = availablePairs[pairIndex];
      if (
        isTeacherSlotFree(teacher, day, pair, schedule) &&
        groupsForLesson.every((group) =>
          isGroupSlotFree(group, day, pair, schedule)
        )
      ) {
        slots.push({ day, pair });
        availablePairs.splice(pairIndex, 1);
      } else {
        availablePairs.splice(pairIndex, 1);
        if (availablePairs.length === 0) availableDays.splice(dayIndex, 1);
        continue;
      }
    }
    if (slots.length === weeklyCount) break;
    availableDays.splice(dayIndex, 1);
  }

  if (slots.length < weeklyCount) {
    console.warn(`Не знайдено достатньо слотів для викладача ${teacher}`);
    return null;
  }
  return slots;
}

function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) {
    alert("Файл не вибрано!");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    console.log("Зчитаний текст із CSV:", text);
    try {
      const rows = text
        .split("\n")
        .map((row) => row.trim())
        .filter((row) => row);
      if (rows.length === 0) {
        alert("CSV-файл порожній!");
        return;
      }

      importedSchedule = [];
      groups = [];
      teacherRestrictions = [];
      let pendingLessons = [];
      let semesterWeeks = 16;

      let i = 0;
      while (i < rows.length) {
        const headers = rows[i].split(",").map((header) => header.trim());
        if (headers[0] === "semester_info" && headers.length === 2) {
          i++;
          while (i < rows.length && rows[i].startsWith("semester_info")) {
            const fields = rows[i].split(",").map((item) => item.trim());
            if (fields.length === 2) {
              const [, weeks] = fields;
              const weeksNum = parseInt(weeks);
              if (!isNaN(weeksNum) && weeksNum >= 1 && weeksNum <= 20)
                semesterWeeks = weeksNum;
              else
                console.warn(
                  `Неправильне значення тижнів у рядку ${
                    i + 1
                  }: ${weeks}. Використано 16.`
                );
            }
            i++;
          }
        } else if (
          headers[0] === "teacher_restrictions" &&
          headers.length >= 4
        ) {
          i++;
          while (
            i < rows.length &&
            rows[i].startsWith("teacher_restrictions")
          ) {
            const fields = rows[i].split(",").map((item) => item.trim());
            if (fields.length >= 4) {
              const [, teacher, allowedPairs, ...preferredDays] = fields;
              if (teacher && allowedPairs) {
                let pairs = allowedPairs.includes("-")
                  ? allowedPairs
                      .split("-")
                      .map(Number)
                      .filter((p, idx, arr) => idx === 0 || p <= arr[0] + 5)
                  : allowedPairs
                      .split(" ")
                      .map(Number)
                      .filter((p) => !isNaN(p) && p >= 1 && p <= 6);
                const validPreferredDays = preferredDays
                  .join(",")
                  .split(",")
                  .map((day) => day.trim())
                  .filter((day) => daysOfWeek.includes(day))
                  .map((day) => daysOfWeek.indexOf(day));
                if (pairs.length > 0)
                  teacherRestrictions.push({
                    teacher,
                    allowedPairs: pairs,
                    preferredDays: validPreferredDays,
                  });
                else
                  console.warn(`Немає валідних пар для викладача ${teacher}`);
              }
            }
            i++;
          }
        } else if (headers[0] === "group_info" && headers.length === 3) {
          i++;
          while (i < rows.length && rows[i].startsWith("group_info")) {
            const fields = rows[i].split(",").map((item) => item.trim());
            if (fields.length === 3) {
              const [, group, subject] = fields;
              if (group && subject) groups.push({ name: group, subject });
            }
            i++;
          }
        } else if (headers[0] === "group" && headers.length === 6) {
          i++;
          while (
            i < rows.length &&
            !["semester_info", "teacher_restrictions", "group_info"].some(
              (prefix) => rows[i].startsWith(prefix)
            )
          ) {
            const fields = rows[i].split(",").map((item) => item.trim());
            if (fields.length === 6) {
              const [group, subject, teacher, type, link, totalHours] = fields;
              if (group && subject && teacher && type && totalHours) {
                const totalHoursNum = parseInt(totalHours);
                const weeklyCountNum = Math.floor(
                  totalHoursNum / semesterWeeks
                );
                if (
                  groups.some((g) => g.name === group) &&
                  ["лекція", "лабораторна", "практика"].includes(type) &&
                  !isNaN(totalHoursNum) &&
                  totalHoursNum > 0 &&
                  weeklyCountNum <= MAX_PAIRS_PER_DAY
                ) {
                  pendingLessons.push({
                    group,
                    subject,
                    teacher,
                    type,
                    link,
                    totalHours: totalHoursNum,
                    weeklyCount: weeklyCountNum,
                    duration: PAIR_DURATION_MINUTES,
                  });
                } else {
                  console.warn(
                    `Невалідні дані в рядку ${i + 1}: ${fields.join(", ")}`
                  );
                }
              }
            }
            i++;
          }
        } else i++;
      }

      const lessonsByKey = {};
      pendingLessons.forEach((lesson) =>
        (lessonsByKey[`${lesson.subject}|${lesson.teacher}|${lesson.type}`] =
          lessonsByKey[`${lesson.subject}|${lesson.teacher}|${lesson.type}`] ||
          []).push(lesson)
      );
      for (const key in lessonsByKey) {
        const lessons = lessonsByKey[key];
        const firstLesson = lessons[0];
        const weeklyCountNum = firstLesson.weeklyCount;
        const teacherRestriction = teacherRestrictions.find(
          (tr) => tr.teacher === firstLesson.teacher
        );
        const allowedPairs = teacherRestriction
          ? teacherRestriction.allowedPairs
          : [1, 2, 3, 4, 5, 6];
        const preferredDays = teacherRestriction
          ? teacherRestriction.preferredDays
          : [0, 1, 2, 3, 4];
        const allDays = [0, 1, 2, 3, 4];
        const groupsForLesson = lessons.map((lesson) => lesson.group);

        if (lessons.length > 1) {
          const slots = findFreeSlot(
            firstLesson.teacher,
            groupsForLesson,
            allowedPairs,
            preferredDays,
            allDays,
            weeklyCountNum,
            importedSchedule,
            lessons.every((lesson) => lesson.type === "лекція")
          );
          if (slots)
            slots.forEach((slot, index) =>
              lessons.forEach((lesson) =>
                importedSchedule.push({
                  ...lesson,
                  day: slot.day,
                  pair: slot.pair,
                })
              )
            );
        } else {
          const slots = findFreeSlot(
            firstLesson.teacher,
            groupsForLesson,
            allowedPairs,
            preferredDays,
            allDays,
            weeklyCountNum,
            importedSchedule,
            firstLesson.type === "лекція"
          );
          if (slots)
            slots.forEach((slot) =>
              importedSchedule.push({
                ...firstLesson,
                day: slot.day,
                pair: slot.pair,
              })
            );
        }
      }

      if (importedSchedule.length === 0)
        alert("Не знайдено валідних даних про заняття у файлі.");
      event.target.value = "";
    } catch (error) {
      console.error("Помилка при обробці CSV:", error);
      alert("Помилка при обробці файлу: " + error.message);
    }
  };
  reader.onerror = function (e) {
    console.error("Помилка читання файлу:", e);
    alert("Не вдалося прочитати файл: " + e.message);
  };
  reader.readAsText(file);
}

function generateSchedule() {
  console.log("Generating schedule with:", importedSchedule);
  const table = document.getElementById("scheduleTable");
  const searchBar = document.querySelector(".search-bar");
  table.style.display = "table";
  searchBar.style.display = "block";
  [
    "generateButton",
    "importButton",
    "exportButton",
    "backButton",
    "editTableButton",
    "checkConflictsButton",
  ].forEach((id) => {
    document.getElementById(id).style.display =
      id === "generateButton" || id === "importButton"
        ? "none"
        : "inline-block";
  });
  renderTable(importedSchedule);
}

function backToGenerate() {
  const table = document.getElementById("scheduleTable");
  const searchBar = document.querySelector(".search-bar");
  table.style.display = "none";
  table.innerHTML = "";
  searchBar.style.display = "none";
  ["generateButton", "importButton"].forEach(
    (id) => (document.getElementById(id).style.display = "inline-block")
  );
  [
    "exportButton",
    "backButton",
    "editTableButton",
    "checkConflictsButton",
    "exportOptions",
  ].forEach((id) => (document.getElementById(id).style.display = "none"));
  ["searchResults", "conflictResults"].forEach(
    (id) => (document.getElementById(id).style.display = "none")
  );
}

function checkConflicts() {
  const conflictResults = document.getElementById("conflictResults");
  const conflictResultsContent = document.getElementById(
    "conflictResultsContent"
  );
  conflictResultsContent.innerHTML = "";

  const groupSchedule = {};
  const teacherSchedule = {};
  importedSchedule.forEach((entry) => {
    const { group, teacher, day, pair } = entry;
    const slotKey = `${day}-${pair}`;
    groupSchedule[group] = groupSchedule[group] || {};
    groupSchedule[group][slotKey] = (
      groupSchedule[group][slotKey] || []
    ).concat(entry);
    teacherSchedule[teacher] = teacherSchedule[teacher] || {};
    teacherSchedule[teacher][slotKey] = (
      teacherSchedule[teacher][slotKey] || []
    ).concat(entry);
  });

  let conflictsFound = false;
  for (const group in groupSchedule)
    for (const slotKey in groupSchedule[group])
      if (groupSchedule[group][slotKey].length > 1) {
        conflictsFound = true;
        const [day, pair] = slotKey.split("-").map(Number);
        const conflictItem = document.createElement("p");
        conflictItem.innerHTML = `<strong>Конфлікт для групи ${group}:</strong> День: ${
          daysOfWeek[day]
        }, Пара: ${pair}<br>${groupSchedule[group][slotKey]
          .map(
            (entry) =>
              `Предмет: ${entry.subject}, Викладач: ${entry.teacher}, Тип: ${entry.type}`
          )
          .join("<br>")}`;
        conflictResultsContent.appendChild(conflictItem);
      }
  for (const teacher in teacherSchedule)
    for (const slotKey in teacherSchedule[teacher])
      if (teacherSchedule[teacher][slotKey].length > 1) {
        conflictsFound = true;
        const [day, pair] = slotKey.split("-").map(Number);
        const conflictItem = document.createElement("p");
        conflictItem.innerHTML = `<strong>Конфлікт для викладача ${teacher}:</strong> День: ${
          daysOfWeek[day]
        }, Пара: ${pair}<br>${teacherSchedule[teacher][slotKey]
          .map(
            (entry) =>
              `Група: ${entry.group}, Предмет: ${entry.subject}, Тип: ${entry.type}`
          )
          .join("<br>")}`;
        conflictResultsContent.appendChild(conflictItem);
      }

  if (conflictsFound) {
    const searchBarRect = document
      .querySelector(".search-bar")
      .getBoundingClientRect();
    conflictResults.style.top = `${
      searchBarRect.bottom + window.scrollY + 10
    }px`;
    conflictResults.style.display = "block";
  } else {
    conflictResultsContent.innerHTML = "<p>Накладок не знайдено.</p>";
    const searchBarRect = document
      .querySelector(".search-bar")
      .getBoundingClientRect();
    conflictResults.style.top = `${
      searchBarRect.bottom + window.scrollY + 10
    }px`;
    conflictResults.style.display = "block";
  }
}

function toggleEditMode() {
  const table = document.getElementById("scheduleTable");
  const cells = table.getElementsByTagName("td");

  if (!isEditMode) {
    // Вход в режим редактирования
    for (let i = 2; i < table.rows.length; i++) {
      const row = table.rows[i];
      const dayIndex = Math.floor((i - 2) / 6);
      const pair = ((i - 2) % 6) + 1;
      const hasDayCell = pair === 1;
      const shift = hasDayCell ? 0 : 1;

      for (let j = 2; j < groups.length + 2; j++) {
        const cell = row.cells[j - shift];
        if (!cell) continue;

        const group = groups[j - 2].name;
        let subject = "",
          teacher = "",
          type = "",
          link = "";

        // Извлечение текущих данных из ячейки
        if (cell.querySelector(".schedule-entry")) {
          const spans = cell.getElementsByTagName("span");
          if (spans.length >= 3) {
            subject = spans[0].textContent.trim() || "";
            teacher = spans[1].textContent.trim() || "";
            type = spans[2].textContent.trim() || "";
          }
          const linkElement = cell.querySelector("a");
          if (linkElement) {
            link = linkElement.href || "";
          } else {
            for (let span of spans) {
              if (span.textContent.startsWith("Код:"))
                link += span.textContent.replace("Код: ", "") + " ";
              else if (span.textContent.startsWith("Пароль:"))
                link += "Пароль: " + span.textContent.replace("Пароль: ", "");
            }
            link = link.trim();
          }
        }

        // Сохранение атрибутов ячейки
        cell.setAttribute("data-day", dayIndex);
        cell.setAttribute("data-pair", pair);
        cell.setAttribute("data-group", group);

        // Создание HTML для редактирования с выпадающим списком
        cell.innerHTML = `
          <div class="schedule-entry">
            <input type="text" value="${subject}" placeholder="Предмет"><br>
            <input type="text" value="${teacher}" placeholder="Викладач"><br>
            <select class="type-select">
              <option value="" ${type === "" ? "selected" : ""}></option>
              <option value="лекція" ${
                type === "лекція" ? "selected" : ""
              }>Лекція</option>
              <option value="лабораторна" ${
                type === "лабораторна" ? "selected" : ""
              }>Лабораторна</option>
              <option value="практика" ${
                type === "практика" ? "selected" : ""
              }>Практика</option>
            </select><br>
            <input type="text" value="${link}" placeholder="Посилання/Код"><br>
            <button class="save-btn" onclick="saveEdit(this)">Зберегти</button>
          </div>
        `;
      }
    }
    document.getElementById("editTableButton").textContent =
      "Завершити редагування";
    isEditMode = true;
  } else {
    // Выход из режима редактирования
    for (let cell of cells) {
      const inputs = cell.getElementsByTagName("input");
      const select = cell.getElementsByTagName("select")[0];
      if (inputs.length === 3 && select) {
        // Получение значений из полей
        const [subject, teacher, link] = Array.from(inputs).map(
          (input) => input.value.trim() || ""
        );
        const type = select.value || "";
        const [day, pair, group] = [
          parseInt(cell.getAttribute("data-day")),
          parseInt(cell.getAttribute("data-pair")),
          cell.getAttribute("data-group"),
        ];
        const isEmpty = !subject && !teacher && !type && !link;
        const scheduleIndex = importedSchedule.findIndex(
          (entry) =>
            entry.group === group && entry.day === day && entry.pair === pair
        );

        if (isEmpty) {
          // Удаление записи и очистка ячейки, если все поля пустые
          if (scheduleIndex !== -1) {
            importedSchedule.splice(scheduleIndex, 1);
          }
          cell.innerHTML = `<div class="schedule-entry">
            <span class="schedule-item"></span>
            <span class="schedule-item"></span>
            <span class="schedule-item"></span>
          </div>`;
        } else {
          // Формирование содержимого ссылки
          const linkContent =
            link && (link.startsWith("http://") || link.startsWith("https://"))
              ? `<a href="${link}" target="_blank" class="schedule-item">Посилання</a>`
              : link
              ? link.match(/код:\s*(\S+)/i) && link.match(/пароль:\s*(\S+)/i)
                ? `<span class="schedule-item">Код: ${link
                    .match(/код:\s*(\S+)/i)[1]
                    .trim()}</span><br><span class="schedule-item">Пароль: ${link
                    .match(/пароль:\s*(\S+)/i)[1]
                    .trim()}</span>`
                : link.match(/код:\s*(\S+)/i)
                ? `<span class="schedule-item">Код: ${link
                    .match(/код:\s*(\S+)/i)[1]
                    .trim()}</span>`
                : `<span class="schedule-item">${link}</span>`
              : "";

          // Обновление или добавление записи в расписание
          const entry = {
            group,
            subject,
            teacher,
            type,
            link,
            day,
            pair,
            weeklyCount: 1,
            duration: PAIR_DURATION_MINUTES,
          };

          if (scheduleIndex !== -1) {
            importedSchedule[scheduleIndex] = entry;
          } else {
            importedSchedule.push(entry);
          }

          // Обновление содержимого ячейки
          cell.innerHTML = `<div class="schedule-entry">
            <span class="schedule-item">${subject}</span>
            <span class="schedule-item">${teacher}</span>
            <span class="schedule-item">${type}</span>
            ${linkContent}
          </div>`;
        }
      }
    }
    document.getElementById("editTableButton").textContent =
      "Редагувати таблицю";
    isEditMode = false;
  }
}

function saveEdit(button) {
  const cell = button.parentElement;
  const inputs = cell.getElementsByTagName("input");
  const select = cell.getElementsByTagName("select")[0];

  // Получение значений из полей
  const [subject, teacher, link] = Array.from(inputs).map(
    (input) => input.value.trim() || ""
  );
  const type = select.value || "";
  const [day, pair, group] = [
    parseInt(cell.getAttribute("data-day")),
    parseInt(cell.getAttribute("data-pair")),
    cell.getAttribute("data-group"),
  ];
  const scheduleIndex = importedSchedule.findIndex(
    (entry) => entry.group === group && entry.day === day && entry.pair === pair
  );
  const isEmpty = !subject && !teacher && !type && !link;

  if (isEmpty) {
    // Удаление записи и очистка ячейки, если все поля пустые
    if (scheduleIndex !== -1) {
      importedSchedule.splice(scheduleIndex, 1);
    }
    cell.innerHTML = `<div class="schedule-entry">
      <span class="schedule-item"></span>
      <span class="schedule-item"></span>
      <span class="schedule-item"></span>
    </div>`;
  } else {
    // Формирование содержимого ссылки
    const linkContent =
      link && (link.startsWith("http://") || link.startsWith("https://"))
        ? `<a href="${link}" target="_blank" class="schedule-item">Посилання</a>`
        : link
        ? link.match(/код:\s*(\S+)/i) && link.match(/пароль:\s*(\S+)/i)
          ? `<span class="schedule-item">Код: ${link
              .match(/код:\s*(\S+)/i)[1]
              .trim()}</span><br><span class="schedule-item">Пароль: ${link
              .match(/пароль:\s*(\S+)/i)[1]
              .trim()}</span>`
          : link.match(/код:\s*(\S+)/i)
          ? `<span class="schedule-item">Код: ${link
              .match(/код:\s*(\S+)/i)[1]
              .trim()}</span>`
          : `<span class="schedule-item">${link}</span>`
        : "";

    // Обновление или добавление записи в расписание
    const entry = {
      group,
      subject,
      teacher,
      type,
      link,
      day,
      pair,
      weeklyCount: 1,
      duration: PAIR_DURATION_MINUTES,
    };

    if (scheduleIndex !== -1) {
      importedSchedule[scheduleIndex] = entry;
    } else {
      importedSchedule.push(entry);
    }

    // Обновление содержимого ячейки
    cell.innerHTML = `<div class="schedule-entry">
      <span class="schedule-item">${subject}</span>
      <span class="schedule-item">${teacher}</span>
      <span class="schedule-item">${type}</span>
      ${linkContent}
    </div>`;
  }
}
function renderTable(generatedSchedule) {
  console.log("Groups:", groups);
  console.log("Imported schedule:", generatedSchedule);
  const table = document.getElementById("scheduleTable");
  table.innerHTML = `<tr><th rowspan="2" class="day-column">Дні тижня</th><th rowspan="2">№ пари</th>${groups
    .map((group) => `<th>${group.subject}</th>`)
    .join("")}</tr><tr>${groups
    .map((group) => `<th>${group.name}</th>`)
    .join("")}</tr>`;
  daysOfWeek.forEach((day, dayIndex) => {
    const dayClass = `day-${dayIndex + 1}`;
    for (let pair = 1; pair <= 6; pair++) {
      const row = document.createElement("tr");
      if (pair === 1)
        row.innerHTML += `<td class="day-column ${dayClass}" rowspan="6">${day}</td>`;
      row.innerHTML += `<td>${pair}</td>${groups
        .map((group, groupIndex) => {
          const entry = generatedSchedule.find(
            (e) =>
              e.group === group.name && e.day === dayIndex && e.pair === pair
          );
          const td = document.createElement("td");
          if (entry) {
            const linkContent =
              entry.link &&
              (entry.link.startsWith("http://") ||
                entry.link.startsWith("https://"))
                ? `<a href="${entry.link}" target="_blank" class="schedule-item">Посилання</a>`
                : entry.link
                ? entry.link.match(/код:\s*(\S+)/i) &&
                  entry.link.match(/пароль:\s*(\S+)/i)
                  ? `<span class="schedule-item">Код: ${entry.link
                      .match(/код:\s*(\S+)/i)[1]
                      .trim()}</span><br><span class="schedule-item">Пароль: ${entry.link
                      .match(/пароль:\s*(\S+)/i)[1]
                      .trim()}</span>`
                  : entry.link.match(/код:\s*(\S+)/i)
                  ? `<span class="schedule-item">Код: ${entry.link
                      .match(/код:\s*(\S+)/i)[1]
                      .trim()}</span>`
                  : `<span class="schedule-item">${entry.link}</span>`
                : "";
            td.innerHTML = `<div class="schedule-entry"><span class="schedule-item">${
              entry.subject || "Немає предмета"
            }</span><span class="schedule-item">${
              entry.teacher || "Немає викладача"
            }</span><span class="schedule-item">${
              entry.type || "Немає типу"
            }</span>${linkContent}</div>`;
          } else {
            td.innerHTML = `<div class="schedule-entry">
                        <span class="schedule-item"></span>
                        <span class="schedule-item"></span>
                        <span class="schedule-item"></span>
                        </div>`;
          }
          return td.outerHTML;
        })
        .join("")}`;
      table.appendChild(row);
    }
  });
}

function exportToExcelViaPython() {
  const table = document.getElementById("scheduleTable");
  const rows = Array.from(table.rows).map((row) =>
    Array.from(row.cells).map((cell) => cell.innerText)
  );

  fetch("http://localhost:5000/export_excel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ table: rows }),
  })
    .then((response) => response.blob())
    .then((blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Розклад.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    })
    .catch((error) => console.error("Error exporting Excel:", error));
}

function searchTable() {
  const searchText = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  const table = document.getElementById("scheduleTable");
  const rows = table.getElementsByTagName("tr");
  const searchResults = document.getElementById("searchResults");
  const searchResultsContent = document.getElementById("searchResultsContent");
  searchResultsContent.innerHTML = "";

  if (!searchText) {
    searchResults.style.display = "none";
    for (let i = 2; i < rows.length; i++) rows[i].style.display = "";
    return;
  }

  const isGroupSearch = groups.some(
    (group) => group.name.toLowerCase() === searchText
  );
  let matchesFound = false;

  if (isGroupSearch) {
    const groupSchedule = importedSchedule.filter(
      (entry) => entry.group.toLowerCase() === searchText
    );
    if (groupSchedule.length > 0) {
      matchesFound = true;
      groupSchedule.sort((a, b) =>
        a.day === b.day ? a.pair - b.pair : a.day - b.day
      );
      const scheduleByDay = daysOfWeek.reduce(
        (acc, day, dayIndex) => (
          (acc[dayIndex] = groupSchedule.filter(
            (entry) => entry.day === dayIndex
          )),
          acc
        ),
        {}
      );
      daysOfWeek.forEach((day, dayIndex) => {
        const dayEntries = scheduleByDay[dayIndex];
        if (dayEntries.length > 0) {
          const dayHeader = document.createElement("p");
          dayHeader.className = "group-day-header";
          dayHeader.innerHTML = `<strong>${day}</strong>`;
          searchResultsContent.appendChild(dayHeader);
          dayEntries.forEach((entry) => {
            const resultItem = document.createElement("p");
            resultItem.innerHTML = `<strong>Пара:</strong> ${entry.pair}, <span>${entry.subject}</span>, <span>${entry.teacher}</span>, <span>${entry.type}</span>`;
            searchResultsContent.appendChild(resultItem);
          });
        }
      });
    }
  } else {
    const displayedResults = new Set();
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      const hasDayCell = row.querySelector(".day-column") !== null;
      const shift = hasDayCell ? 0 : 1;
      const cells = row.getElementsByTagName("td");
      const dayIndex = Math.floor((i - 2) / 6);
      const pair = ((i - 2) % 6) + 1;
      const day = daysOfWeek[dayIndex];

      for (let j = 2; j < groups.length + 2; j++) {
        const cell = cells[j - shift];
        if (!cell) continue;

        const spans = cell.getElementsByTagName("span");
        if (spans.length >= 3) {
          const [subjectText, teacherText, typeText] = [
            spans[0].textContent,
            spans[1].textContent,
            spans[2].textContent,
          ].map((text) =>
            (text || "").toLowerCase().trim().replace(/\s+/g, " ")
          );

          const normalizedTeacherText = teacherText
            .replace(
              /проф\.|доц\.|ст\.викл\.|викл\.|[а-яґєіїʼ'’]\.[а-яґєіїʼ'’]\.*/gi,
              ""
            )
            .trim();

          if (
            subjectText.includes(searchText) ||
            teacherText.includes(searchText) ||
            normalizedTeacherText.includes(searchText) ||
            typeText.includes(searchText)
          ) {
            matchesFound = true;
            const groupName = groups[j - 2].name;
            const resultKey = `${i}|${j}|${subjectText} ${teacherText} ${typeText}`;
            if (!displayedResults.has(resultKey)) {
              displayedResults.add(resultKey);
              const resultItem = document.createElement("p");
              resultItem.innerHTML = `<strong>День:</strong> ${day}, <strong>Пара:</strong> ${pair}, <strong>Група:</strong> ${groupName}, <span>${spans[0].textContent}</span>, <span>${spans[1].textContent}</span>, <span>${spans[2].textContent}</span>`;
              searchResultsContent.appendChild(resultItem);
            }
          }
        }
      }
    }
  }

  if (matchesFound) {
    const searchBarRect = document
      .querySelector(".search-bar")
      .getBoundingClientRect();
    searchResults.style.top = `${searchBarRect.bottom + window.scrollY + 10}px`;
    searchResults.style.display = "block";
  } else {
    searchResultsContent.innerHTML = "<p>Нічого не знайдено.</p>";
    const searchBarRect = document
      .querySelector(".search-bar")
      .getBoundingClientRect();
    searchResults.style.top = `${searchBarRect.bottom + window.scrollY + 10}px`;
    searchResults.style.display = "block";
  }
  for (let i = 2; i < rows.length; i++) rows[i].style.display = "";
}
