const daysOfWeek = ["Понеділок", "Вівторок", "Середа", "Четвер", "П’ятниця"];
const PAIR_DURATION_MINUTES = 80; // Тривалість пари за замовчуванням: 1 година 20 хвилин (80 хвилин)
const MAX_PAIRS_PER_DAY = 6; // Максимальна кількість пар у день

// Глобальні масиви для збереження груп, розкладу та обмежень викладачів
let groups = [];
let importedSchedule = [];
let teacherRestrictions = [];
let isEditMode = false; // Для відстеження режиму редагування

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

document
  .getElementById("editTableButton")
  .addEventListener("click", toggleEditMode);

// Функція для перевірки, чи слот (день + пара) вільний для викладача
function isTeacherSlotFree(teacher, day, pair, schedule) {
  return !schedule.some(
    (entry) =>
      entry.teacher === teacher && entry.day === day && entry.pair === pair
  );
}

// Функція для перевірки, чи день має достатньо вільних слотів для занять
function hasEnoughFreeSlots(teacher, day, weeklyCount, schedule) {
  let occupiedSlots = 0;
  for (let pair = 1; pair <= MAX_PAIRS_PER_DAY; pair++) {
    if (!isTeacherSlotFree(teacher, day, pair, schedule)) {
      occupiedSlots++;
    }
  }
  return occupiedSlots + weeklyCount <= MAX_PAIRS_PER_DAY;
}

// Функція для пошуку вільного слота для викладача з урахуванням тривалості
function findFreeSlot(
  teacher,
  allowedPairs,
  preferredDays,
  allDays,
  weeklyCount,
  schedule,
  mustBeSequential = false
) {
  let availableDays = [...preferredDays];
  if (availableDays.length === 0) {
    availableDays = [...allDays];
  }

  let slots = [];
  let attempts = 0;
  const maxAttempts = 100; // Щоб уникнути нескінченного циклу

  while (slots.length < weeklyCount && attempts < maxAttempts) {
    attempts++;

    if (availableDays.length === 0) {
      console.warn(`Немає доступних днів для викладача ${teacher}`);
      return null; // Немає доступних днів
    }

    const dayIndex = Math.floor(Math.random() * availableDays.length);
    const day = availableDays[dayIndex];
    let availablePairs = [...allowedPairs];

    if (
      availablePairs.length === 0 ||
      !hasEnoughFreeSlots(teacher, day, weeklyCount, schedule)
    ) {
      availableDays.splice(dayIndex, 1); // Видаляємо день, якщо немає достатньо слотів
      continue;
    }

    if (mustBeSequential && weeklyCount > 1) {
      // Для лекцій: шукаємо послідовні пари
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
        if (isTeacherSlotFree(teacher, day, pair, schedule)) {
          sequentialPairs.push({ day, pair });
        } else {
          sequentialPairs = [];
          break;
        }
      }
      if (sequentialPairs.length === weeklyCount) {
        slots.push(...sequentialPairs);
        break; // Знайшли послідовні слоти
      } else {
        availableDays.splice(dayIndex, 1);
        continue;
      }
    } else {
      // Для практик/лабораторних або weeklyCount === 1: шукаємо один слот
      const pairIndex = Math.floor(Math.random() * availablePairs.length);
      const pair = availablePairs[pairIndex];
      if (isTeacherSlotFree(teacher, day, pair, schedule)) {
        slots.push({ day, pair });
        availablePairs.splice(pairIndex, 1); // Видаляємо пару, щоб не використовувати її повторно
      } else {
        availablePairs.splice(pairIndex, 1);
        if (availablePairs.length === 0) {
          availableDays.splice(dayIndex, 1); // Якщо пар немає, видаляємо день
        }
        continue;
      }
    }

    if (slots.length === weeklyCount) break;
    availableDays.splice(dayIndex, 1);
  }

  if (slots.length < weeklyCount) {
    console.warn(`Не знайдено достатньо слотів для викладача ${teacher}`);
    return null; // Не вдалося знайти достатньо слотів
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
    console.log("Зчитаний текст із CSV:", text); // Додаємо логування для перевірки
    try {
      const rows = text
        .split("\n")
        .map((row) => row.trim())
        .filter((row) => row);
      console.log("Рядки після обробки:", rows); // Логування рядків
      if (rows.length === 0) {
        alert("CSV-файл порожній!");
        return;
      }

      importedSchedule = [];
      groups = [];
      teacherRestrictions = [];
      let pendingLessons = []; // Тимчасове сховище для занять
      let semesterWeeks = 16; // Значення за замовчуванням

      // Зчитуємо всі секції
      let i = 0;
      while (i < rows.length) {
        const headers = rows[i].split(",").map((header) => header.trim());
        console.log(`Заголовки, рядок ${i + 1}:`, headers); // Логування заголовків

        if (headers[0] === "semester_info" && headers.length === 2) {
          i++;
          while (i < rows.length && rows[i].startsWith("semester_info")) {
            const fields = rows[i].split(",").map((item) => item.trim());
            console.log(`Обробка semester_info, рядок ${i + 1}:`, fields); // Логування
            if (fields.length !== 2) {
              console.error(
                `Рядок ${i + 1} має неправильну кількість полів (${
                  fields.length
                } замість 2):`,
                rows[i]
              );
              i++;
              continue;
            }
            const [, weeks] = fields;
            const weeksNum = parseInt(weeks);
            if (!isNaN(weeksNum) && weeksNum >= 1 && weeksNum <= 20) {
              semesterWeeks = weeksNum;
            } else {
              console.warn(
                `Неправильне значення тижнів у рядку ${
                  i + 1
                }: ${weeks}. Використано значення за замовчуванням (16).`
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
            console.log(
              `Обробка teacher_restrictions, рядок ${i + 1}:`,
              fields
            ); // Логування
            if (fields.length < 4) {
              console.error(
                `Рядок ${i + 1} має неправильну кількість полів (${
                  fields.length
                } замість 4 або більше):`,
                rows[i]
              );
              i++;
              continue;
            }
            const [, teacher, allowedPairs, ...preferredDays] = fields;
            if (teacher && allowedPairs) {
              let pairs = [];
              if (allowedPairs.includes("-")) {
                const [start, end] = allowedPairs.split("-").map(Number);
                for (let p = start; p <= end; p++) {
                  pairs.push(p);
                }
              } else {
                pairs = allowedPairs
                  .split(" ")
                  .map(Number)
                  .filter((p) => !isNaN(p) && p >= 1 && p <= 6);
              }

              const validPreferredDays = preferredDays
                .join(",")
                .split(",")
                .map((day) => day.trim())
                .filter((day) => daysOfWeek.includes(day))
                .map((day) => daysOfWeek.indexOf(day));

              if (pairs.length > 0) {
                teacherRestrictions.push({
                  teacher,
                  allowedPairs: pairs,
                  preferredDays: validPreferredDays,
                });
              } else {
                console.warn(`Немає валідних пар для викладача ${teacher}`);
              }
            } else {
              console.warn(
                `Неправильний формат для викладача у рядку ${i + 1}: ${rows[i]}`
              );
            }
            i++;
          }
        } else if (headers[0] === "group_info" && headers.length === 3) {
          i++;
          while (i < rows.length && rows[i].startsWith("group_info")) {
            const fields = rows[i].split(",").map((item) => item.trim());
            console.log(`Обробка group_info, рядок ${i + 1}:`, fields); // Логування
            if (fields.length !== 3) {
              console.error(
                `Рядок ${i + 1} має неправильну кількість полів (${
                  fields.length
                } замість 3):`,
                rows[i]
              );
              i++;
              continue;
            }
            const [, group, subject] = fields;
            if (group && subject) {
              groups.push({ name: group, subject });
            }
            i++;
          }
        } else if (headers[0] === "group" && headers.length === 6) {
          i++;
          while (
            i < rows.length &&
            !rows[i].startsWith("semester_info") &&
            !rows[i].startsWith("teacher_restrictions") &&
            !rows[i].startsWith("group_info")
          ) {
            const fields = rows[i].split(",").map((item) => item.trim());
            console.log(`Обробка заняття, рядок ${i + 1}:`, fields); // Логування
            if (fields.length !== 6) {
              console.error(
                `Рядок ${i + 1} має неправильну кількість полів (${
                  fields.length
                } замість 6):`,
                rows[i]
              );
              i++;
              continue;
            }
            const [group, subject, teacher, type, link, totalHours] = fields;
            if (group && subject && teacher && type && totalHours) {
              const totalHoursNum = parseInt(totalHours);
              const weeklyCountNum = Math.floor(totalHoursNum / semesterWeeks);
              const validTypes = ["лекція", "лабораторна", "практика"];
              if (
                groups.some((g) => g.name === group) &&
                validTypes.includes(type) &&
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
                  `Невалідні дані в рядку ${
                    i + 1
                  }: group=${group}, type=${type}, totalHours=${totalHours}, weeklyCount=${weeklyCountNum}`
                );
              }
            } else {
              console.warn(
                `Порожні або відсутні поля в рядку ${i + 1}:`,
                fields
              );
            }
            i++;
          }
        } else {
          i++;
        }
      }

      // Групуємо заняття за предметом, викладачем і типом
      const lessonsByKey = {};
      pendingLessons.forEach((lesson) => {
        const key = `${lesson.subject}|${lesson.teacher}|${lesson.type}`;
        if (!lessonsByKey[key]) {
          lessonsByKey[key] = [];
        }
        lessonsByKey[key].push(lesson);
      });

      console.log("Згруповані заняття (lessonsByKey):", lessonsByKey);

      // Розподіляємо заняття
      for (const key in lessonsByKey) {
        const lessons = lessonsByKey[key];
        const firstLesson = lessons[0];
        const weeklyCountNum = firstLesson.weeklyCount;

        const teacherRestriction = teacherRestrictions.find(
          (tr) => tr.teacher === firstLesson.teacher
        );
        let allowedPairs = teacherRestriction
          ? teacherRestriction.allowedPairs
          : [1, 2, 3, 4, 5, 6];
        let preferredDays = teacherRestriction
          ? teacherRestriction.preferredDays
          : [0, 1, 2, 3, 4];
        const allDays = [0, 1, 2, 3, 4];

        if (lessons.length > 1) {
          const assignedSlots = [];

          const slots = findFreeSlot(
            firstLesson.teacher,
            allowedPairs,
            preferredDays,
            allDays,
            weeklyCountNum,
            importedSchedule,
            lessons.every((lesson) => lesson.type === "лекція")
          );

          if (!slots) {
            console.warn(
              `Не вдалося знайти вільні слоти для викладача ${firstLesson.teacher}`
            );
            continue;
          }

          slots.forEach((slot, index) => {
            lessons.forEach((lesson) => {
              assignedSlots.push({
                group: lesson.group,
                subject: lesson.subject,
                teacher: lesson.teacher,
                type: lesson.type,
                link: lesson.link,
                totalHours: lesson.totalHours,
                weeklyCount: lesson.weeklyCount,
                duration: lesson.duration,
                day: slot.day,
                pair: slot.pair,
              });
            });
          });

          importedSchedule.push(...assignedSlots);
        } else {
          const assignedSlots = [];

          const slots = findFreeSlot(
            firstLesson.teacher,
            allowedPairs,
            preferredDays,
            allDays,
            weeklyCountNum,
            importedSchedule,
            firstLesson.type === "лекція"
          );

          if (!slots) {
            console.warn(
              `Не вдалося знайти вільні слоти для викладача ${firstLesson.teacher}`
            );
            continue;
          }

          slots.forEach((slot) => {
            assignedSlots.push({
              group: firstLesson.group,
              subject: firstLesson.subject,
              teacher: firstLesson.teacher,
              type: firstLesson.type,
              link: firstLesson.link,
              totalHours: firstLesson.totalHours,
              weeklyCount: firstLesson.weeklyCount,
              duration: firstLesson.duration,
              day: slot.day,
              pair: slot.pair,
            });
          });

          importedSchedule.push(...assignedSlots);
        }
      }

      console.log("Згенерований розклад (importedSchedule):", importedSchedule); // Логування розкладу

      if (importedSchedule.length === 0) {
        alert("Не знайдено валідних даних про заняття у файлі.");
        return;
      }

      event.target.value = "";
    } catch (error) {
      console.error("Помилка при обробці CSV:", error); // Детальніше логування помилки
      alert("Помилка при обробці файлу: " + error.message);
    }
  };
  reader.onerror = function (e) {
    console.error("Помилка читання файлу:", e); // Логування помилки читання
    alert("Не вдалося прочитати файл: " + e.message);
  };
  reader.readAsText(file);
}

function generateSchedule() {
  if (importedSchedule.length === 0) {
    return;
  }

  const table = document.getElementById("scheduleTable");
  const searchBar = document.querySelector(".search-bar");
  table.style.display = "table";
  searchBar.style.display = "block";
  document.getElementById("generateButton").style.display = "none";
  document.getElementById("importButton").style.display = "none";
  document.getElementById("clearTableButton").style.display = "inline-block";
  document.getElementById("exportButton").style.display = "inline-block";
  document.getElementById("backButton").style.display = "inline-block";
  document.getElementById("editTableButton").style.display = "inline-block";
  renderTable(importedSchedule);
}

function clearTable() {
  const table = document.getElementById("scheduleTable");
  const searchBar = document.querySelector(".search-bar");
  table.style.display = "table";
  searchBar.style.display = "none";

  const subjectRow = table.children[0];
  const groupRow = table.children[1];
  table.innerHTML = "";
  table.appendChild(subjectRow);
  table.appendChild(groupRow);

  daysOfWeek.forEach((day, dayIndex) => {
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

  document.getElementById("clearTableButton").style.display = "inline-block";
  document.getElementById("exportButton").style.display = "inline-block";
  document.getElementById("backButton").style.display = "inline-block";
  document.getElementById("editTableButton").style.display = "none";

  document.getElementById("searchResults").style.display = "none";
}

function backToGenerate() {
  const table = document.getElementById("scheduleTable");
  const searchBar = document.querySelector(".search-bar");
  table.style.display = "none";
  table.innerHTML = "";
  searchBar.style.display = "none";
  document.getElementById("generateButton").style.display = "inline-block";
  document.getElementById("importButton").style.display = "inline-block";
  document.getElementById("clearTableButton").style.display = "none";
  document.getElementById("exportButton").style.display = "none";
  document.getElementById("backButton").style.display = "none";
  document.getElementById("editTableButton").style.display = "none";
  document.getElementById("searchResults").style.display = "none";
}

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
        const groupIndex = j - 2;
        const group = groups[groupIndex].name;
        const spans = cell.getElementsByTagName("span");

        if (spans.length >= 3) {
          const subject = spans[0].textContent || "";
          const teacher = spans[1].textContent || "";
          const type = spans[2].textContent || "";
          let link = "";
          const linkElement = cell.querySelector("a");
          if (linkElement) {
            link = linkElement.href || "";
          } else {
            const codeSpans = cell.getElementsByTagName("span");
            for (let span of codeSpans) {
              if (span.textContent.startsWith("Код:")) {
                link += span.textContent.replace("Код: ", "") + " ";
              } else if (span.textContent.startsWith("Пароль:")) {
                link += "Пароль: " + span.textContent.replace("Пароль: ", "");
              }
            }
          }

          cell.setAttribute("data-day", dayIndex);
          cell.setAttribute("data-pair", pair);
          cell.setAttribute("data-group", group);

          cell.innerHTML = `
            <input type="text" value="${subject}" placeholder="Предмет">
            <br><input type="text" value="${teacher}" placeholder="Викладач">
            <br><input type="text" value="${type}" placeholder="Тип">
            <br><input type="text" value="${link}" placeholder="Посилання/Код">
            <br><button class="save-btn" onclick="saveEdit(this)">Зберегти</button>
          `;
        }
      }
    }
    document.getElementById("editTableButton").textContent =
      "Завершити редагування";
    isEditMode = true;
  } else {
    for (let cell of cells) {
      const inputs = cell.getElementsByTagName("input");
      if (inputs.length === 4) {
        const subject = inputs[0].value || "Немає предмета";
        const teacher = inputs[1].value || "Немає викладача";
        const type = inputs[2].value || "Немає типу";
        let link = inputs[3].value || "";

        let linkContent = "";
        if (
          link &&
          (link.startsWith("http://") || link.startsWith("https://"))
        ) {
          linkContent = `<a href="${link}" target="_blank" class="schedule-item">Посилання</a>`;
        } else if (link) {
          const codeMatch = link.match(/код:\s*(\S+)/i);
          const passwordMatch = link.match(/пароль:\s*(\S+)/i);
          if (codeMatch && passwordMatch) {
            const code = codeMatch[1].trim();
            const password = passwordMatch[1].trim();
            linkContent = `<span class="schedule-item">Код: ${code}</span><br><span class="schedule-item">Пароль: ${password}</span>`;
          } else if (codeMatch) {
            const code = codeMatch[1].trim();
            linkContent = `<span class="schedule-item">Код: ${code}</span>`;
          } else {
            linkContent = `<span class="schedule-item">${link}</span>`;
          }
        }

        cell.innerHTML = `
          <div class="schedule-entry">
            <span class="schedule-item">${subject}</span>
            <span class="schedule-item">${teacher}</span>
            <span class="schedule-item">${type}</span>
            ${linkContent ? linkContent : ""}
          </div>
        `;
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
  if (inputs.length === 4) {
    const subject = inputs[0].value || "Немає предмета";
    const teacher = inputs[1].value || "Немає викладача";
    const type = inputs[2].value || "Немає типу";
    let link = inputs[3].value || "";

    const day = parseInt(cell.getAttribute("data-day"));
    const pair = parseInt(cell.getAttribute("data-pair"));
    const group = cell.getAttribute("data-group");

    const scheduleIndex = importedSchedule.findIndex(
      (entry) =>
        entry.group === group && entry.day === day && entry.pair === pair
    );
    if (scheduleIndex !== -1) {
      importedSchedule[scheduleIndex] = {
        ...importedSchedule[scheduleIndex],
        subject,
        teacher,
        type,
        link,
      };
    }

    let linkContent = "";
    if (link && (link.startsWith("http://") || link.startsWith("https://"))) {
      linkContent = `<a href="${link}" target="_blank" class="schedule-item">Посилання</a>`;
    } else if (link) {
      const codeMatch = link.match(/код:\s*(\S+)/i);
      const passwordMatch = link.match(/пароль:\s*(\S+)/i);
      if (codeMatch && passwordMatch) {
        const code = codeMatch[1].trim();
        const password = passwordMatch[1].trim();
        linkContent = `<span class="schedule-item">Код: ${code}</span><br><span class="schedule-item">Пароль: ${password}</span>`;
      } else if (codeMatch) {
        const code = codeMatch[1].trim();
        linkContent = `<span class="schedule-item">Код: ${code}</span>`;
      } else {
        linkContent = `<span class="schedule-item">${link}</span>`;
      }
    }

    cell.innerHTML = `
      <div class="schedule-entry">
        <span class="schedule-item">${subject}</span>
        <span class="schedule-item">${teacher}</span>
        <span class="schedule-item">${type}</span>
        ${linkContent ? linkContent : ""}
      </div>
    `;
  }
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
        .map((group, groupIndex) => {
          const entry = generatedSchedule.find(
            (e) =>
              e.group === group.name && e.day === dayIndex && e.pair === pair
          );

          const td = document.createElement("td");
          if (entry) {
            let linkContent = "";
            if (
              entry.link &&
              (entry.link.startsWith("http://") ||
                entry.link.startsWith("https://"))
            ) {
              linkContent = `<a href="${entry.link}" target="_blank" class="schedule-item">Посилання</a>`;
            } else if (entry.link) {
              const codeMatch = entry.link.match(/код:\s*(\S+)/i);
              const passwordMatch = entry.link.match(/пароль:\s*(\S+)/i);
              if (codeMatch && passwordMatch) {
                const code = codeMatch[1].trim();
                const password = passwordMatch[1].trim();
                linkContent = `<span class="schedule-item">Код: ${code}</span><br><span class="schedule-item">Пароль: ${password}</span>`;
              } else if (codeMatch) {
                const code = codeMatch[1].trim();
                linkContent = `<span class="schedule-item">Код: ${code}</span>`;
              } else {
                linkContent = `<span class="schedule-item">${entry.link}</span>`;
              }
            }

            td.innerHTML = `
              <div class="schedule-entry">
                <span class="schedule-item">${
                  entry.subject || "Немає предмета"
                }</span>
                <span class="schedule-item">${
                  entry.teacher || "Немає викладача"
                }</span>
                <span class="schedule-item">${entry.type || "Немає типу"}</span>
                ${linkContent ? linkContent : ""}
              </div>
            `;
          }
          return td.outerHTML;
        })
        .join("");

      table.appendChild(row);
    }
  });
}

// Логіка пошуку
document.getElementById("searchInput").addEventListener("input", () => {
  const searchText = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  const table = document.getElementById("scheduleTable");
  const rows = table.getElementsByTagName("tr");
  const searchResults = document.getElementById("searchResults");
  const searchResultsContent = document.getElementById("searchResultsContent");
  const searchBar = document.querySelector(".search-bar");

  searchResultsContent.innerHTML = "";

  if (!searchText) {
    searchResults.style.display = "none";
    for (let i = 2; i < rows.length; i++) {
      rows[i].style.display = "";
    }
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
      groupSchedule.sort((a, b) => {
        if (a.day === b.day) {
          return a.pair - b.pair;
        }
        return a.day - b.day;
      });

      const scheduleByDay = {};
      daysOfWeek.forEach((day, dayIndex) => {
        scheduleByDay[dayIndex] = groupSchedule.filter(
          (entry) => entry.day === dayIndex
        );
      });

      daysOfWeek.forEach((day, dayIndex) => {
        const dayEntries = scheduleByDay[dayIndex];
        if (dayEntries.length > 0) {
          const dayHeader = document.createElement("p");
          dayHeader.className = "group-day-header";
          dayHeader.innerHTML = `<strong>${day}</strong>`;
          searchResultsContent.appendChild(dayHeader);

          dayEntries.forEach((entry) => {
            let linkContent = "";
            if (
              entry.link &&
              (entry.link.startsWith("http://") ||
                entry.link.startsWith("https://"))
            ) {
              linkContent = `<a href="${entry.link}" target="_blank">Посилання</a>`;
            } else if (entry.link) {
              const codeMatch = entry.link.match(/код:\s*(\S+)/i);
              const passwordMatch = entry.link.match(/пароль:\s*(\S+)/i);
              if (codeMatch && passwordMatch) {
                const code = codeMatch[1].trim();
                const password = passwordMatch[1].trim();
                linkContent = `<span>Код: ${code}</span><br><span>Пароль: ${password}</span>`;
              } else if (codeMatch) {
                const code = codeMatch[1].trim();
                linkContent = `<span>Код: ${code}</span>`;
              } else {
                linkContent = `<span>${entry.link}</span>`;
              }
            }

            const resultItem = document.createElement("p");
            resultItem.innerHTML = `
              <strong>Пара:</strong> ${entry.pair}, 
              <span>${entry.subject}</span>, 
              <span>${entry.teacher}</span>, 
              <span>${entry.type}</span>
              ${linkContent ? `, ${linkContent}` : ""}
            `;
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
          const subjectText = (spans[0].textContent || "")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ");
          const teacherText = (spans[1].textContent || "")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ");
          const typeText = (spans[2].textContent || "")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ");

          const normalizedTeacherText = teacherText
            .replace(/проф\.\s*/g, "")
            .replace(/доц\.\s*/g, "")
            .replace(/ст\.викл\.\s*/g, "")
            .replace(/викл\.\s*/g, "")
            .replace(/\s*[а-я]\.[а-я]\./g, "")
            .trim();

          const combinedText = `${subjectText} ${teacherText} ${typeText}`;
          const combinedTextForSearch = `${subjectText} ${normalizedTeacherText} ${typeText}`;

          if (combinedTextForSearch.includes(searchText)) {
            matchesFound = true;

            const resultKey = `${i}|${j}|${combinedText}`;
            if (!displayedResults.has(resultKey)) {
              displayedResults.add(resultKey);

              const groupName = groups[j - 2].name;
              const resultItem = document.createElement("p");
              resultItem.innerHTML = `
                <strong>День:</strong> ${day}, 
                <strong>Пара:</strong> ${pair}, 
                <strong>Група:</strong> ${groupName}, 
                <span>${spans[0].textContent}</span>, 
                <span>${spans[1].textContent}</span>, 
                <span>${spans[2].textContent}</span>
                ${
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
                }
              `;
              searchResultsContent.appendChild(resultItem);
            }
          }
        }
      }
    }
  }

  if (matchesFound) {
    const searchBarRect = searchBar.getBoundingClientRect();
    searchResults.style.top = `${searchBarRect.bottom + window.scrollY + 10}px`;
    searchResults.style.display = "block";
  } else {
    searchResultsContent.innerHTML = "<p>Нічого не знайдено.</p>";
    const searchBarRect = searchBar.getBoundingClientRect();
    searchResults.style.top = `${searchBarRect.bottom + window.scrollY + 10}px`;
    searchResults.style.display = "block";
  }

  for (let i = 2; i < rows.length; i++) {
    rows[i].style.display = "";
  }
});

// Обробник для кнопки закриття спливаючого блоку
document.getElementById("closeResultsButton").addEventListener("click", () => {
  document.getElementById("searchResults").style.display = "none";
  document.getElementById("searchInput").value = "";
});
