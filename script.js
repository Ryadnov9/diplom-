// Константи
const daysOfWeek = ["Понеділок", "Вівторок", "Середа", "Четвер", "П’ятниця"];
const PAIR_DURATION_MINUTES = 80;
const MAX_PAIRS_PER_DAY = 6;

// Глобальні змінні
let groups = [];
let importedSchedule = [];
let teacherRestrictions = [];
let isEditMode = false;

// Додавання обробників подій
document
  .getElementById("generateButton")
  .addEventListener("click", generateSchedule);
// Видаляємо обробник для clearTableButton
// document.getElementById("clearTableButton").addEventListener("click", clearTable);
document.getElementById("backButton").addEventListener("click", backToGenerate);
document
  .getElementById("importButton")
  .addEventListener("click", () =>
    document.getElementById("fileInput").click()
  );
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

// Функція перевірки вільного слота для викладача
function isTeacherSlotFree(teacher, day, pair, schedule) {
  return !schedule.some(
    (entry) =>
      entry.teacher === teacher && entry.day === day && entry.pair === pair
  );
}

// Функція перевірки вільного слота для групи
function isGroupSlotFree(group, day, pair, schedule) {
  return !schedule.some(
    (entry) => entry.group === group && entry.day === day && entry.pair === pair
  );
}

// Функція перевірки достатньої кількості вільних слотів для викладача
function hasEnoughFreeSlotsForTeacher(teacher, day, weeklyCount, schedule) {
  let occupiedSlots = 0;
  for (let pair = 1; pair <= MAX_PAIRS_PER_DAY; pair++) {
    if (!isTeacherSlotFree(teacher, day, pair, schedule)) occupiedSlots++;
  }
  return occupiedSlots + weeklyCount <= MAX_PAIRS_PER_DAY;
}

// Функція перевірки достатньої кількості вільних слотів для групи
function hasEnoughFreeSlotsForGroup(group, day, weeklyCount, schedule) {
  let occupiedSlots = 0;
  for (let pair = 1; pair <= MAX_PAIRS_PER_DAY; pair++) {
    if (!isGroupSlotFree(group, day, pair, schedule)) occupiedSlots++;
  }
  return occupiedSlots + weeklyCount <= MAX_PAIRS_PER_DAY;
}

// Функція пошуку вільного слота
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

// Обробка імпорту CSV
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
                      .reduce(
                        (acc, curr, idx, arr) =>
                          idx === 0 ? [curr] : [...acc, curr],
                        []
                      )
                      .filter(
                        (_, idx, arr) =>
                          idx === 0 || arr[idx] <= arr[idx - 1] + 1
                      )
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

// Генерація розкладу
function generateSchedule() {
  console.log("Generating schedule with:", importedSchedule); // Діагностика
  const table = document.getElementById("scheduleTable");
  const searchBar = document.querySelector(".search-bar");
  table.style.display = "table"; // Переконаємося, що таблиця видима
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
      id === "exportButton" ||
      id === "backButton" ||
      id === "editTableButton" ||
      id === "checkConflictsButton"
        ? "inline-block"
        : "none";
  });
  renderTable(importedSchedule);
}

// Повернення до генерації
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
    "clearTableButton",
    "exportButton",
    "backButton",
    "editTableButton",
    "checkConflictsButton",
  ].forEach((id) => (document.getElementById(id).style.display = "none"));
  ["searchResults", "conflictResults"].forEach(
    (id) => (document.getElementById(id).style.display = "none")
  );
}

// Перевірка накладок
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
    const buttonGroupRect = document
      .querySelector(".button-group")
      .getBoundingClientRect();
    conflictResults.style.top = `${
      buttonGroupRect.bottom + window.scrollY + 10
    }px`;
    conflictResults.style.display = "block";
  } else {
    conflictResultsContent.innerHTML = "<p>Накладок не знайдено.</p>";
    const buttonGroupRect = document
      .querySelector(".button-group")
      .getBoundingClientRect();
    conflictResults.style.top = `${
      buttonGroupRect.bottom + window.scrollY + 10
    }px`;
    conflictResults.style.display = "block";
  }
}

// Редагування таблиці
function toggleEditMode() {
  const table = document.getElementById("scheduleTable");
  const cells = table.getElementsByTagName("td");

  if (!isEditMode) {
    for (let i = 2; i < table.rows.length; i++) {
      const row = table.rows[i];
      const dayIndex = Math.floor((i - 2) / 6);
      const pair = ((i - 2) % 6) + 1;
      for (let j = 2; j < row.cells.length; j++) {
        const cell = row.cells[j];
        const group = groups[j - 2].name;
        let subject = "",
          teacher = "",
          type = "",
          link = "";
        const spans = cell.getElementsByTagName("span");
        if (spans.length >= 3) {
          subject = spans[0].textContent || "";
          teacher = spans[1].textContent || "";
          type = spans[2].textContent || "";
          const linkElement = cell.querySelector("a");
          if (linkElement) link = linkElement.href || "";
          else
            for (let span of cell.getElementsByTagName("span"))
              if (span.textContent.startsWith("Код:"))
                link += span.textContent.replace("Код: ", "") + " ";
              else if (span.textContent.startsWith("Пароль:"))
                link += "Пароль: " + span.textContent.replace("Пароль: ", "");
        }
        cell.setAttribute("data-day", dayIndex);
        cell.setAttribute("data-pair", pair);
        cell.setAttribute("data-group", group);
        cell.innerHTML = `<input type="text" value="${subject}" placeholder="Предмет"><br><input type="text" value="${teacher}" placeholder="Викладач"><br><input type="text" value="${type}" placeholder="Тип"><br><input type="text" value="${link}" placeholder="Посилання/Код"><br><button class="save-btn" onclick="saveEdit(this)">Зберегти</button>`;
      }
    }
    document.getElementById("editTableButton").textContent =
      "Завершити редагування";
    isEditMode = true;
  } else {
    for (let cell of cells) {
      const inputs = cell.getElementsByTagName("input");
      if (inputs.length === 4) {
        const [subject, teacher, type, link] = [
          inputs[0].value.trim(),
          inputs[1].value.trim(),
          inputs[2].value.trim(),
          inputs[3].value.trim(),
        ];
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
          if (scheduleIndex !== -1) importedSchedule.splice(scheduleIndex, 1);
          cell.innerHTML = `<div class="schedule-entry"></div>`;
        } else {
          const linkContent =
            (link && link.startsWith("http://")) || link.startsWith("https://")
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
          if (scheduleIndex !== -1)
            importedSchedule[scheduleIndex] = {
              ...importedSchedule[scheduleIndex],
              subject: subject || "Немає предмета",
              teacher: teacher || "Немає викладача",
              type: type || "Немає типу",
              link,
            };
          else
            importedSchedule.push({
              group,
              subject: subject || "Немає предмета",
              teacher: teacher || "Немає викладача",
              type: type || "Немає типу",
              link,
              day,
              pair,
              weeklyCount: 1,
              duration: PAIR_DURATION_MINUTES,
            });
          cell.innerHTML = `<div class="schedule-entry"><span class="schedule-item">${
            subject || "Немає предмета"
          }</span><span class="schedule-item">${
            teacher || "Немає викладача"
          }</span><span class="schedule-item">${
            type || "Немає типу"
          }</span>${linkContent}</div>`;
        }
      }
    }
    document.getElementById("editTableButton").textContent =
      "Редагувати таблицю";
    isEditMode = false;
  }
}

// Збереження змін у клітинці
function saveEdit(button) {
  const cell = button.parentElement;
  const [subject, teacher, type, link] = [
    ...cell.getElementsByTagName("input"),
  ].map(
    (input) =>
      input.value.trim() ||
      ["Немає предмета", "Немає викладача", "Немає типу"][
        [...cell.getElementsByTagName("input")].indexOf(input)
      ] ||
      ""
  );
  const [day, pair, group] = [
    parseInt(cell.getAttribute("data-day")),
    parseInt(cell.getAttribute("data-pair")),
    cell.getAttribute("data-group"),
  ];
  const scheduleIndex = importedSchedule.findIndex(
    (entry) => entry.group === group && entry.day === day && entry.pair === pair
  );
  if (scheduleIndex !== -1)
    importedSchedule[scheduleIndex] = {
      ...importedSchedule[scheduleIndex],
      subject,
      teacher,
      type,
      link,
    };
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
  cell.innerHTML = `<div class="schedule-entry"><span class="schedule-item">${subject}</span><span class="schedule-item">${teacher}</span><span class="schedule-item">${type}</span>${linkContent}</div>`;
}

// Рендер таблиці
function renderTable(generatedSchedule) {
  console.log("Rendering table with:", generatedSchedule); // Діагностика
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
          }
          return td.outerHTML;
        })
        .join("")}`;
      table.appendChild(row);
    }
  });
}

// Пошук у таблиці
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
            const linkContent =
              entry.link &&
              (entry.link.startsWith("http://") ||
                entry.link.startsWith("https://"))
                ? `<a href="${entry.link}" target="_blank">Посилання</a>`
                : entry.link
                ? entry.link.match(/код:\s*(\S+)/i) &&
                  entry.link.match(/пароль:\s*(\S+)/i)
                  ? `<span>Код: ${entry.link
                      .match(/код:\s*(\S+)/i)[1]
                      .trim()}</span><br><span>Пароль: ${entry.link
                      .match(/пароль:\s*(\S+)/i)[1]
                      .trim()}</span>`
                  : entry.link.match(/код:\s*(\S+)/i)
                  ? `<span>Код: ${entry.link
                      .match(/код:\s*(\S+)/i)[1]
                      .trim()}</span>`
                  : `<span>${entry.link}</span>`
                : "";
            const resultItem = document.createElement("p");
            resultItem.innerHTML = `<strong>Пара:</strong> ${
              entry.pair
            }, <span>${entry.subject}</span>, <span>${
              entry.teacher
            }</span>, <span>${entry.type}</span>${
              linkContent ? `, ${linkContent}` : ""
            }`;
            searchResultsContent.appendChild(resultItem);
          });
        }
      });
    }
  } else {
    const displayedResults = new Set();
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.getElementsByTagName("td");
      const dayIndex = Math.floor((i - 2) / 6);
      const pair = ((i - 2) % 6) + 1;
      const day = daysOfWeek[dayIndex];
      for (let j = 2; j < cells.length; j++) {
        const cell = cells[j];
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
              /проф\.\s*|доц\.\s*|ст\.викл\.\s*|викл\.\s*|\s*[а-я]\.[а-я]\./g,
              ""
            )
            .trim();
          if (
            [
              `${subjectText} ${normalizedTeacherText} ${typeText}`,
              `${subjectText} ${teacherText} ${typeText}`,
            ].some((text) => text.includes(searchText))
          ) {
            matchesFound = true;
            const resultKey = `${i}|${j}|${subjectText} ${teacherText} ${typeText}`;
            if (!displayedResults.has(resultKey)) {
              displayedResults.add(resultKey);
              const groupName = groups[j - 2].name;
              const resultItem = document.createElement("p");
              resultItem.innerHTML = `<strong>День:</strong> ${day}, <strong>Пара:</strong> ${pair}, <strong>Група:</strong> ${groupName}, <span>${
                spans[0].textContent
              }</span>, <span>${spans[1].textContent}</span>, <span>${
                spans[2].textContent
              }</span>${
                cell.querySelector("a")
                  ? `, <a href="${
                      cell.querySelector("a").href
                    }" target="_blank">Посилання</a>`
                  : cell
                      .querySelector(".schedule-item")
                      ?.textContent.includes("Код:")
                  ? `, <span>${
                      cell.querySelector(".schedule-item").textContent
                    }</span>`
                  : ""
              }`;
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
