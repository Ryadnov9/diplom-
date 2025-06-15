// Масив назв днів тижня
const daysOfWeek = ["Понеділок", "Вівторок", "Середа", "Четвер", "П’ятниця"];
// Тривалість однієї пари в хвилинах
const PAIR_DURATION_MINUTES = 80;
// Максимальна кількість пар на день
const MAX_PAIRS_PER_DAY = 6;
// Основні масиви
let groups = [];
let importedSchedule = [];
let teacherRestrictions = [];
let isEditMode = false;
let exportType = "excel";

// Обробник для кнопки генерації розкладу
document
  .getElementById("generateButton")
  .addEventListener("click", generateSchedule);

// Обробник для кнопки повернення до форми генерації
document.getElementById("backButton").addEventListener("click", backToGenerate);

// Обробник для кнопки відкриття опцій імпорту
document.getElementById("importButton").addEventListener("click", () => {
  document.getElementById("importOptions").style.display = "block";
});

// Обробник для кнопки закриття опцій імпорту
document
  .getElementById("closeImportOptionsButton")
  .addEventListener("click", () => {
    document.getElementById("importOptions").style.display = "none";
  });

// Обробник для кнопки імпорту CSV файлу
document.getElementById("importCSVButton").addEventListener("click", () => {
  document.getElementById("importOptions").style.display = "none";
  document.getElementById("fileInput").accept = ".csv";
  document.getElementById("fileInput").click();
});

// Обробник для зміни вибраного файлу (імпорт)
document
  .getElementById("fileInput")
  .addEventListener("change", handleFileImport);

// Обробник для кнопки редагування таблиці
document
  .getElementById("editTableButton")
  .addEventListener("click", toggleEditMode);

// Обробник для кнопки перевірки конфліктів
document
  .getElementById("checkConflictsButton")
  .addEventListener("click", checkConflicts);

// Обробник для кнопки закриття результатів конфліктів
document
  .getElementById("closeConflictResultsButton")
  .addEventListener(
    "click",
    () => (document.getElementById("conflictResults").style.display = "none")
  );

// Обробник для кнопки закриття результатів пошуку
document.getElementById("closeResultsButton").addEventListener("click", () => {
  document.getElementById("searchResults").style.display = "none";
  document.getElementById("searchInput").value = "";
});

// Обробник для введення в поле пошуку
document.getElementById("searchInput").addEventListener("input", searchTable);

// Обробник для кнопки відкриття опцій експорту
document
  .getElementById("exportButton")
  .addEventListener("click", showExportOptions);

// Обробник для кнопки закриття опцій експорту
document
  .getElementById("closeExportOptionsButton")
  .addEventListener(
    "click",
    () => (document.getElementById("exportOptions").style.display = "none")
  );

// Обробник для кнопки експорту в Excel
document.getElementById("exportExcelButton").addEventListener("click", () => {
  exportType = "excel";
  document.getElementById("excelOptions").style.display = "block";
  document.getElementById("exportOptions").style.display = "none";
  document.getElementById("scheduleTitle").value = "";
  document.getElementById("approvalName").value = "";
});

// Обробник для кнопки експорту в PDF
document.getElementById("exportPDFButton").addEventListener("click", () => {
  exportType = "pdf";
  document.getElementById("excelOptions").style.display = "block";
  document.getElementById("exportOptions").style.display = "none";
  document.getElementById("scheduleTitle").value = "";
  document.getElementById("approvalName").value = "";
});

// Обробник для кнопки закриття опцій експорту Excel/PDF
document
  .getElementById("closeExcelOptionsButton")
  .addEventListener("click", () => {
    document.getElementById("excelOptions").style.display = "none";
    document.getElementById("exportOptions").style.display = "block";
  });

// Обробник для кнопки підтвердження експорту
document
  .getElementById("confirmExcelExportButton")
  .addEventListener("click", () => {
    const scheduleTitle =
      document.getElementById("scheduleTitle").value || "Розклад занять";
    const approvalName = document.getElementById("approvalName").value || "";
    document.getElementById("excelOptions").style.display = "none";

    console.log("Тип експорту:", exportType);
    if (exportType === "excel") {
      exportToExcel(scheduleTitle, approvalName);
    } else if (exportType === "pdf") {
      exportToPDF(scheduleTitle, approvalName);
    } else if (exportType === "json") {
      exportToJSON(scheduleTitle, approvalName);
    }

    document.getElementById("exportOptions").style.display = "block";
  });
// Обробник для кнопки експорту в JSON
document.getElementById("exportJSONButton").addEventListener("click", () => {
  exportType = "json";
  document.getElementById("excelOptions").style.display = "block";
  document.getElementById("exportOptions").style.display = "none";
  document.getElementById("scheduleTitle").value = "";
  document.getElementById("approvalName").value = "";
});
// Додати обробник для кнопки імпорту JSON
document.getElementById("importJSONButton").addEventListener("click", () => {
  document.getElementById("importOptions").style.display = "none";
  document.getElementById("fileInput").accept = ".json";
  document.getElementById("fileInput").click();
});
// Функція експорту в JSON
function exportToJSON(scheduleTitle, approvalName) {
  const table = document.getElementById("scheduleTable");
  if (!table || table.style.display === "none") {
    alert("Будь ласка, згенеруйте розклад перед експортом.");
    return;
  }

  const jsonData = {
    scheduleTitle: scheduleTitle || "Розклад занять",
    approvalName: approvalName || "",
    groups: groups.map((group) => ({
      name: group.name,
      subject: group.subject, // Зберігаємо предмети груп
    })),
    schedule: importedSchedule.map((entry) => ({
      group: entry.group,
      subject: entry.subject,
      teacher: entry.teacher,
      type: entry.type,
      link: entry.link,
      day: daysOfWeek[entry.day], // Зберігаємо як назву дня
      pair: entry.pair,
      weeklyCount: entry.weeklyCount,
      duration: entry.duration,
    })),
  };

  const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Розклад.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
// Функція експорту до Excel
document.getElementById("exportExcelButton").addEventListener("click", () => {
  const table = document.getElementById("scheduleTable");
  if (!table || table.style.display === "none") {
    alert("Будь ласка, згенеруйте розклад перед експортом.");
    return;
  }
  document.getElementById("excelOptions").style.display = "block";
});

function exportToExcel(scheduleTitle, approvalName) {
  const table = document.getElementById("scheduleTable");
  if (!table || table.style.display === "none") {
    alert("Будь ласка, згенеруйте розклад перед експортом.");
    return;
  }

  const clonedTable = table.cloneNode(true);

  // Обробка посилань та додавання відступу перед "посилання"
  const cells = clonedTable.getElementsByTagName("th");
  for (let cell of cells) {
    if (!cell.classList.contains("day-column")) {
      const links = cell.getElementsByTagName("a");
      for (let link of links) {
        const text = link.textContent || link.innerText;
        let parts = text.split(/(посилання)/i);
        if (parts.length > 1) {
          let subjectPart = parts[0].trim();
          let linkPart = parts[1] + (parts[2] ? parts[2].trim() : "");
          const linkElement = document.createElement("a");
          linkElement.href = link.href;
          linkElement.textContent = linkPart;
          linkElement.style.color = "#0000FF";
          linkElement.style.textDecoration = "none";
          const span = document.createElement("span");
          span.innerHTML = subjectPart + "     ";
          span.appendChild(linkElement);
          link.parentNode.replaceChild(span, link);
        }
      }
    }
  }
  const tds = clonedTable.getElementsByTagName("td");
  for (let cell of tds) {
    const links = cell.getElementsByTagName("a");
    for (let link of links) {
      const text = link.textContent || link.innerText;
      let parts = text.split(/(посилання)/i);
      if (parts.length > 1) {
        let subjectPart = parts[0].trim();
        let linkPart = parts[1] + (parts[2] ? parts[2].trim() : "");
        const linkElement = document.createElement("a");
        linkElement.href = link.href;
        linkElement.textContent = linkPart;
        linkElement.style.color = "#0000FF";
        linkElement.style.textDecoration = "none";
        const span = document.createElement("span");
        span.innerHTML = subjectPart + "     ";
        span.appendChild(linkElement);
        link.parentNode.replaceChild(span, link);
      }
    }
  }

  const style = document.createElement("style");
  style.textContent = `
    table { border-collapse: collapse; font-family: Arial, sans-serif; }
    th, td { border: 1px solid #000; padding: 8px; text-align: center; vertical-align: middle; }
    .title { font-size: 16pt; font-weight: bold; text-align: center; }
    .approval { font-size: 10pt; text-align: left; }
    .day-column { writing-mode: vertical-rl; text-orientation: upright; }
    a { color: #0000FF; text-decoration: none; } /* Синий цвет для всех ссылок */
    span { color: #000000; } /* Чёрный цвет для остального текста */
  `;

  let html = `
    <html>
      <head>
        <meta charset="UTF-8">
        ${style.outerHTML}
      </head>
      <body>
        <table>
          <tr><th colspan="${
            groups.length + 2
          }" class="title">${scheduleTitle}</th></tr>
          ${clonedTable.outerHTML}
  `;

  if (approvalName) {
    html += `
          <tr><td colspan="${groups.length + 2}"></td></tr>
          <tr>
            <td colspan="${groups.length + 2}" class="approval">
              Підтверджено: ${approvalName}
            </td>
          </tr>`;
  }

  html += `
        </table>
      </body>
    </html>`;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Розклад.xls";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Функція для експорту в PDF
function exportToPDF(scheduleTitle, approvalName) {
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

  const exportContainer = document.createElement("div");
  exportContainer.innerHTML = `
    <h2 style="text-align: center; margin-bottom: 20px;">${scheduleTitle}</h2>
    ${element.outerHTML}
    ${
      approvalName
        ? `<p style="text-align: left; margin-top: 20px;">Підтверджено: ${approvalName}</p>`
        : ""
    }
  `;

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
      windowHeight: element.scrollHeight + 100,
    },
    jsPDF: {
      unit: "px",
      format: [element.scrollWidth + 20, element.scrollHeight + 120],
      orientation: "landscape",
    },
  };

  html2pdf()
    .set(opt)
    .from(exportContainer)
    .save()
    .then(() => {
      dayHeaders.forEach((el) => {
        el.style.writingMode = "vertical-rl";
        el.style.textOrientation = "upright";
      });
    });
}

// Відображення опцій експорту
function showExportOptions() {
  const exportOptions = document.getElementById("exportOptions");
  const searchBarRect = document
    .querySelector(".search-bar")
    .getBoundingClientRect();
  exportOptions.style.top = `${searchBarRect.bottom + window.scrollY + 10}px`;
  exportOptions.style.display = "block";
}

// Перевірка вільності слота для викладача
function isTeacherSlotFree(teacher, day, pair, schedule) {
  return !schedule.some(
    (entry) =>
      entry.teacher === teacher && entry.day === day && entry.pair === pair
  );
}

// Перевірка вільності слота для групи
function isGroupSlotFree(group, day, pair, schedule) {
  return !schedule.some(
    (entry) => entry.group === group && entry.day === day && entry.pair === pair
  );
}

// Перевірка наявності достатньої кількості вільних слотів для викладача
function hasEnoughFreeSlotsForTeacher(teacher, day, count, schedule) {
  const occupied = schedule.filter(
    (entry) => entry.teacher === teacher && entry.day === day
  ).length;
  return MAX_PAIRS_PER_DAY - occupied >= count;
}

// Перевірка наявності достатньої кількості вільних слотів для групи
function hasEnoughFreeSlotsForGroup(group, day, count, schedule) {
  const occupied = schedule.filter(
    (entry) => entry.group === group && entry.day === day
  ).length;
  return MAX_PAIRS_PER_DAY - occupied >= count;
}
// Генерація розкладу
function findFreeSlot(
  teacher,
  groupsForLesson,
  allowedPairs,
  preferredDays,
  allDays,
  weeklyCount,
  schedule,
  mustBeSequential = false,
  occupiedSlots = []
) {
  let availableDays = [...preferredDays];
  let slots = [];
  let attempts = 0;
  const maxAttempts = 100;

  while (slots.length < weeklyCount && attempts < maxAttempts) {
    attempts++;
    if (availableDays.length === 0) {
      console.warn(
        `Немає доступних днів для викладача ${teacher} у preferredDays. Пошук зупинено.`
      );
      return null; // Зупиняємо пошук, якщо немає слотів у preferredDays
    }

    const dayIndex = Math.floor(Math.random() * availableDays.length);
    const day = availableDays[dayIndex];
    let availablePairs = [...allowedPairs].filter(
      (pair) =>
        !occupiedSlots.some((slot) => slot.day === day && slot.pair === pair)
    );

    if (availablePairs.length === 0) {
      availableDays.splice(dayIndex, 1);
      continue;
    }

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
      for (let startPair of availablePairs) {
        let sequentialPairs = [];
        for (let j = 0; j < weeklyCount; j++) {
          const pair = startPair + j;
          if (pair > MAX_PAIRS_PER_DAY || !allowedPairs.includes(pair)) {
            sequentialPairs = [];
            break;
          }
          if (
            !occupiedSlots.some(
              (slot) => slot.day === day && slot.pair === pair
            ) &&
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
        }
      }
      if (slots.length === 0) availableDays.splice(dayIndex, 1);
    } else {
      for (let pair of availablePairs) {
        if (
          isTeacherSlotFree(teacher, day, pair, schedule) &&
          groupsForLesson.every((group) =>
            isGroupSlotFree(group, day, pair, schedule)
          )
        ) {
          slots.push({ day, pair });
          break;
        }
      }
      if (slots.length === 0) availableDays.splice(dayIndex, 1);
    }

    if (slots.length === weeklyCount) break;
  }

  if (slots.length < weeklyCount) {
    console.warn(
      `Не знайдено достатньо слотів для викладача ${teacher}. Знайдено: ${slots.length}`
    );
    return slots.length > 0 ? slots : null;
  }
  return slots;
}
// Функція обробки імпорту файлу
function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) {
    showCustomAlert("Файл не вибрано!");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    console.log("Зчитаний вміст файлу:", text); // Дебаг
    try {
      if (file.name.endsWith(".csv")) {
        console.log("Обробка CSV-файлу...");
        const rows = text
          .split("\n")
          .map((row) => row.trim())
          .filter((row) => row);
        if (rows.length === 0) {
          showCustomAlert("CSV-файл порожній!");
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
            headers.length >= 5 // Очікуємо 5 стовпців: префікс, викладач, дозволені_пари, бажані_дні, пріоритет
          ) {
            i++;
            while (
              i < rows.length &&
              rows[i].startsWith("teacher_restrictions")
            ) {
              const fields = rows[i].split(",").map((item) => item.trim());
              if (fields.length >= 5) {
                const [, teacher, allowedPairs, preferredDays, priority] =
                  fields;
                if (teacher && allowedPairs && preferredDays && priority) {
                  let pairs = allowedPairs.includes("-")
                    ? allowedPairs
                        .split("-")
                        .map(Number)
                        .filter((p, idx, arr) => idx === 0 || p <= arr[0] + 5)
                    : allowedPairs
                        .split(" ")
                        .map(Number)
                        .filter((p) => !isNaN(p) && p >= 1 && p <= 6);
                  const priorityNum = parseInt(priority);
                  const validPreferredDays = preferredDays
                    .split(" ")
                    .map((day) => day.trim())
                    .filter((day) => daysOfWeek.includes(day))
                    .map((day) => daysOfWeek.indexOf(day));
                  if (
                    pairs.length > 0 &&
                    !isNaN(priorityNum) &&
                    priorityNum >= 1 &&
                    priorityNum <= 10
                  ) {
                    teacherRestrictions.push({
                      teacher,
                      allowedPairs: pairs,
                      preferredDays: validPreferredDays,
                      priority: priorityNum,
                    });
                  } else {
                    console.warn(
                      `Невалідний пріоритет (${priority}) або пари для викладача ${teacher}`
                    );
                  }
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
                const [groupField, subject, teacher, type, link, totalHours] =
                  fields;
                if (groupField && subject && teacher && type && totalHours) {
                  const totalHoursNum = parseInt(totalHours);
                  const weeklyCountNum = Math.floor(
                    totalHoursNum / semesterWeeks
                  );
                  const groupList = groupField.split("_").map((g) => g.trim());
                  const invalidGroups = groupList.filter(
                    (g) => !groups.some((group) => group.name === g)
                  );
                  if (
                    invalidGroups.length === 0 &&
                    ["лекція", "лабораторна", "практика"].includes(type) &&
                    !isNaN(totalHoursNum) &&
                    totalHoursNum > 0 &&
                    weeklyCountNum <= MAX_PAIRS_PER_DAY
                  ) {
                    groupList.forEach((group) => {
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

        // Сортуємо teacherRestrictions за пріоритетом (1 — найвищий)
        teacherRestrictions.sort((a, b) => a.priority - b.priority);

        // Перевірка конфліктів із урахуванням пріоритету
        const conflicts =
          checkTeacherConflictsWithPriority(teacherRestrictions);
        if (conflicts) {
          console.error(
            "Знайдено конфлікти у teacher_restrictions:",
            conflicts
          );
          let conflictMessage =
            "Помилка: виявлено конфлікти у розкладі викладачів:\n";
          conflicts.forEach((conflict) => {
            conflictMessage += `Конфлікт між ${conflict.teacher1} і ${
              conflict.teacher2
            } на парах ${conflict.conflictingPairs.join(
              ", "
            )} у ${conflict.conflictingDays.join(", ")}.\n`;
          });
          conflictMessage +=
            "\nРекомендація: спробуйте змінити дозволені пари (allowed_pairs) або бажані дні (preferred_days) для одного з викладачів,та обрати пріоритет щоб уникнути конфлікту.";
          showCustomAlert(conflictMessage);
          return;
        }

        const lessonsByKey = {};
        pendingLessons.forEach((lesson) =>
          (lessonsByKey[`${lesson.subject}|${lesson.teacher}|${lesson.type}`] =
            lessonsByKey[
              `${lesson.subject}|${lesson.teacher}|${lesson.type}`
            ] || []).push(lesson)
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

          let slots;
          if (teacherRestriction && teacherRestriction.priority === 1) {
            // Для пріоритету 1 беремо першу пару з allowedPairs і перший день з preferredDays
            const fixedDay = preferredDays[0];
            const fixedPair = allowedPairs[0];
            slots = [{ day: fixedDay, pair: fixedPair }];
            const isConflict = importedSchedule.some(
              (entry) =>
                entry.day === fixedDay &&
                entry.pair === fixedPair &&
                groupsForLesson.includes(entry.group)
            );
            if (isConflict) {
              console.error(
                `Конфлікт для ${firstLesson.teacher} на день ${daysOfWeek[fixedDay]}, пара ${fixedPair}`
              );
              showCustomAlert(
                `Конфлікт: ${firstLesson.teacher} не може бути призначений на ${daysOfWeek[fixedDay]}, пара ${fixedPair}.`
              );
              return;
            }
          } else {
            // Для нижчих пріоритетів шукаємо вільні слоти в межах preferredDays, уникаючи зайнятих пар
            const occupiedSlots = importedSchedule
              .filter(
                (entry) =>
                  preferredDays.includes(entry.day) &&
                  groupsForLesson.includes(entry.group)
              )
              .map((entry) => ({ day: entry.day, pair: entry.pair }));
            slots = findFreeSlot(
              firstLesson.teacher,
              groupsForLesson,
              allowedPairs,
              preferredDays,
              allDays,
              weeklyCountNum,
              importedSchedule,
              lessons.every((lesson) => lesson.type === "лекція"),
              occupiedSlots
            );
            if (!slots && preferredDays.length > 0) {
              console.warn(
                `Не вдалося знайти слоти для ${firstLesson.teacher} у preferredDays. Заняття не заплановано.`
              );
            }
          }
          if (slots)
            slots.forEach((slot) =>
              lessons.forEach((lesson) =>
                importedSchedule.push({
                  ...lesson,
                  day: slot.day,
                  pair: slot.pair,
                })
              )
            );
        }

        if (importedSchedule.length === 0)
          showCustomAlert("Не знайдено валідних даних про заняття у файлі.");
      } else if (file.name.endsWith(".json")) {
        console.log("Обробка JSON-файлу...");
        let importedData = JSON.parse(text);
        console.log("Розпарсені дані:", importedData); // Дебаг

        if (!importedData.scheduleTitle || !importedData.schedule) {
          throw new Error(
            "Невалідний формат JSON-файлу! Відсутні обов'язкові поля (scheduleTitle або schedule)."
          );
        }

        importedSchedule = [];
        groups = [];
        teacherRestrictions = [];

        if (importedData.groups && Array.isArray(importedData.groups)) {
          groups = importedData.groups.map((group) => ({
            name: group.name || "",
            subject: group.subject || "",
          }));
        } else {
          console.warn(
            "Групи не знайдено у JSON, використовуються унікальні групи з schedule."
          );
          const uniqueGroups = [
            ...new Set(importedData.schedule.map((entry) => entry.group)),
          ];
          groups = uniqueGroups.map((group) => ({
            name: group || "Невідома група",
            subject: "",
          }));
        }

        importedData.schedule.forEach((entry, index) => {
          console.log(`Обробка запису ${index + 1}:`, entry); // Дебаг
          const dayIndex = daysOfWeek.indexOf(entry.day);
          if (dayIndex === -1) {
            console.warn(
              `Невідомий день: ${entry.day} для запису ${index + 1}, пропущено`
            );
          } else {
            importedSchedule.push({
              group: entry.group || "",
              subject: entry.subject || "",
              teacher: entry.teacher || "",
              type: entry.type || "",
              link: entry.link || "",
              day: dayIndex,
              pair: entry.pair || 1,
              weeklyCount: entry.weeklyCount || 1,
              duration: entry.duration || PAIR_DURATION_MINUTES,
            });
          }
        });

        console.log("Імпортований розклад:", importedSchedule); // Дебаг

        if (importedSchedule.length === 0) {
          console.warn("importedSchedule порожній після обробки.");
          showCustomAlert(
            "Не знайдено валідних даних про заняття у файлі. Перевірте консоль для деталей."
          );
        } else {
          console.log(
            "Розклад успішно імпортований, кількість записів:",
            importedSchedule.length
          );
          renderTable(importedSchedule); // Оновлюємо таблицю
          document.getElementById("scheduleTable").style.display = "table";
          document.querySelector(".search-bar").style.display = "block";
          ["generateButton", "importButton"].forEach((id) => {
            const btn = document.getElementById(id);
            if (btn) btn.style.display = "none";
          });
          [
            "exportButton",
            "backButton",
            "editTableButton",
            "checkConflictsButton",
          ].forEach((id) => {
            const btn = document.getElementById(id);
            if (btn) btn.style.display = "inline-block";
          });
        }
      }
      event.target.value = "";
    } catch (error) {
      console.error("Помилка при обробці файлу:", error);
      showCustomAlert("Помилка при обробці файлу: " + error.message);
    }
  };
  reader.onerror = function (e) {
    console.error("Помилка читання файлу:", e);
    showCustomAlert("Не вдалося прочитати файл: " + e.message);
  };
  reader.readAsText(file);
}

// Функція для відображення кастомного алерту
function showCustomAlert(message) {
  const alertBox = document.getElementById("customAlert");
  const alertMessage = document.getElementById("alertMessage");
  const closeButton = document.getElementById("closeAlert");

  alertMessage.textContent = message;
  alertBox.style.display = "flex";

  closeButton.onclick = function () {
    alertBox.style.display = "none";
  };

  // Закриття алерту при натисканні поза вікном
  window.onclick = function (event) {
    if (event.target === alertBox) {
      alertBox.style.display = "none";
    }
  };
}
// Функція для перевірки конфліктів
function checkTeacherConflictsWithPriority(restrictions) {
  const conflicts = [];
  for (let i = 0; i < restrictions.length; i++) {
    for (let j = i + 1; j < restrictions.length; j++) {
      const r1 = restrictions[i];
      const r2 = restrictions[j];
      const commonPairs = r1.allowedPairs.filter((pair) =>
        r2.allowedPairs.includes(pair)
      );
      if (commonPairs.length > 0) {
        const commonDays = r1.preferredDays.filter((day) =>
          r2.preferredDays.includes(day)
        );
        if (commonDays.length > 0) {
          if (r1.priority === 1 && r2.priority > 1) {
            continue;
          } else if (r2.priority === 1 && r1.priority > 1) {
            continue;
          } else if (r1.priority === r2.priority) {
            conflicts.push({
              teacher1: r1.teacher,
              teacher2: r2.teacher,
              conflictingPairs: commonPairs,
              conflictingDays: commonDays.map((day) => daysOfWeek[day]),
            });
          }
        }
      }
    }
  }
  return conflicts.length > 0 ? conflicts : null;
}
// Функція генерації таблиці
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
// Функція повернення на головну сторінку
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
// Функція перевірки на співпадіння
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
// Функція редагування
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

        cell.setAttribute("data-day", dayIndex);
        cell.setAttribute("data-pair", pair);
        cell.setAttribute("data-group", group);

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
    for (let cell of cells) {
      const inputs = cell.getElementsByTagName("input");
      const select = cell.getElementsByTagName("select")[0];
      if (inputs.length === 3 && select) {
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
          if (scheduleIndex !== -1) {
            importedSchedule.splice(scheduleIndex, 1);
          }
          cell.innerHTML = `<div class="schedule-entry">
            <span class="schedule-item"></span>
            <span class="schedule-item"></span>
            <span class="schedule-item"></span>
          </div>`;
        } else {
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
// Фнкція зберігання післі редагування
function saveEdit(button) {
  const cell = button.parentElement;
  const inputs = cell.getElementsByTagName("input");
  const select = cell.getElementsByTagName("select")[0];

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
    if (scheduleIndex !== -1) {
      importedSchedule.splice(scheduleIndex, 1);
    }
    cell.innerHTML = `<div class="schedule-entry">
      <span class="schedule-item"></span>
      <span class="schedule-item"></span>
      <span class="schedule-item"></span>
    </div>`;
  } else {
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

    cell.innerHTML = `<div class="schedule-entry">
      <span class="schedule-item">${subject}</span>
      <span class="schedule-item">${teacher}</span>
      <span class="schedule-item">${type}</span>
      ${linkContent}
    </div>`;
  }
}
// Відображення таблиці розкладу
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
// Функція пошуку
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
