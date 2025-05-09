const daysOfWeek = ["Понеділок", "Вівторок", "Середа", "Четвер", "П’ятниця"];

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

// Функція для пошуку вільного слота для викладача
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
      return null; // Немає доступних днів
    }

    const dayIndex = Math.floor(Math.random() * availableDays.length);
    const day = availableDays[dayIndex];
    let availablePairs = [...allowedPairs];

    if (availablePairs.length === 0) {
      availableDays.splice(dayIndex, 1); // Видаляємо день, якщо немає доступних пар
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
        if (pair > 6 || !allowedPairs.includes(pair)) {
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
        // Якщо не вдалося знайти послідовні слоти, видаляємо день і пробуємо інший
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
        availablePairs.splice(pairIndex, 1); // Видаляємо пару і пробуємо іншу
        if (availablePairs.length === 0) {
          availableDays.splice(dayIndex, 1); // Якщо пар немає, видаляємо день
        }
        continue;
      }
    }

    // Якщо зібрали достатньо слотів, виходимо
    if (slots.length === weeklyCount) break;

    // Якщо не вдалося знайти слот у цьому дні, видаляємо день і пробуємо інший
    availableDays.splice(dayIndex, 1);
  }

  if (slots.length < weeklyCount) {
    return null; // Не вдалося знайти достатньо слотів
  }

  return slots;
}

function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    try {
      const rows = text
        .split("\n")
        .map((row) => row.trim())
        .filter((row) => row);
      importedSchedule = [];
      groups = [];
      teacherRestrictions = []; // Очищаємо масив обмежень викладачів

      // Зчитуємо перший рядок, щоб перевірити формат
      const headers = rows[0].split(",").map((header) => header.trim());
      let isGroupSection = headers[0] === "group_info" && headers.length === 3;
      let isLessonSection = headers[0] === "group" && headers.length === 6;
      let isTeacherRestrictionSection =
        headers[0] === "teacher_restrictions" && headers.length >= 4;

      if (!isGroupSection && !isLessonSection && !isTeacherRestrictionSection) {
        alert(
          "Неправильний формат CSV. Очікується: group_info,group,subject для груп, group,subject,teacher,type,link,weeklyCount для занять або teacher_restrictions,teacher,allowed_pairs,preferred_days для обмежень викладачів"
        );
        return;
      }

      let i = 1;

      // Зчитуємо обмеження викладачів
      while (i < rows.length && rows[i].startsWith("teacher_restrictions")) {
        const fields = rows[i].split(",").map((item) => item.trim());
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
          // Парсимо дозволені пари
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

          // Перевіряємо, чи є бажані дні валідними, і об'єднуємо їх у масив
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

      // Зчитуємо групи з CSV
      while (i < rows.length && rows[i].startsWith("group_info")) {
        const fields = rows[i].split(",").map((item) => item.trim());
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

      // Перевіряємо, чи перейшли до секції занять
      if (i < rows.length) {
        const lessonHeaders = rows[i].split(",").map((header) => header.trim());
        isLessonSection =
          lessonHeaders[0] === "group" && lessonHeaders.length === 6;
        if (!isLessonSection) {
          alert(
            "Неправильний формат CSV для занять. Очікується: group,subject,teacher,type,link,weeklyCount"
          );
          return;
        }
        i++;
      }

      // Групуємо заняття за предметом, викладачем і типом
      const lessonsByKey = {};
      for (; i < rows.length; i++) {
        const fields = rows[i].split(",").map((item) => item.trim());
        if (fields.length !== 6) {
          console.error(
            `Рядок ${i + 1} має неправильну кількість полів (${
              fields.length
            } замість 6):`,
            rows[i]
          );
          continue;
        }
        const [group, subject, teacher, type, link, weeklyCount] = fields;
        if (group && subject && teacher && type && link && weeklyCount) {
          const weeklyCountNum = parseInt(weeklyCount);
          const validTypes = ["лекція", "лабораторна", "практика"];
          if (
            groups.some((g) => g.name === group) &&
            validTypes.includes(type) &&
            !isNaN(weeklyCountNum) &&
            weeklyCountNum > 0 &&
            weeklyCountNum <= 5
          ) {
            const key = `${subject}|${teacher}|${type}`; // Унікальний ключ для групування
            if (!lessonsByKey[key]) {
              lessonsByKey[key] = [];
            }
            lessonsByKey[key].push({
              group,
              subject,
              teacher,
              type,
              link,
              weeklyCount: weeklyCountNum,
            });
          }
        }
      }

      // Розподіляємо заняття
      for (const key in lessonsByKey) {
        const lessons = lessonsByKey[key];
        const firstLesson = lessons[0];
        const weeklyCountNum = firstLesson.weeklyCount;

        // Отримуємо обмеження для викладача
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

        // Якщо кілька груп мають однаковий предмет, викладача і тип
        if (lessons.length > 1) {
          const assignedSlots = [];

          // Знаходимо вільні слоти для викладача
          const slots = findFreeSlot(
            firstLesson.teacher,
            allowedPairs,
            preferredDays,
            allDays,
            weeklyCountNum,
            importedSchedule,
            lessons.every((lesson) => lesson.type === "лекція") // Лекції розміщуємо послідовно
          );

          if (!slots) {
            console.warn(
              `Не вдалося знайти вільні слоти для викладача ${firstLesson.teacher}`
            );
            continue;
          }

          // Розміщуємо заняття для всіх груп у знайдені слоти
          slots.forEach((slot, index) => {
            lessons.forEach((lesson) => {
              assignedSlots.push({
                group: lesson.group,
                subject: lesson.subject,
                teacher: lesson.teacher,
                type: lesson.type,
                link: lesson.link,
                day: slot.day,
                pair: slot.pair,
              });
            });
          });

          importedSchedule.push(...assignedSlots);
        } else {
          // Якщо предмет унікальний для однієї групи
          const assignedSlots = [];

          // Знаходимо вільні слоти для викладача
          const slots = findFreeSlot(
            firstLesson.teacher,
            allowedPairs,
            preferredDays,
            allDays,
            weeklyCountNum,
            importedSchedule,
            firstLesson.type === "лекція" // Лекції розміщуємо послідовно
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
              day: slot.day,
              pair: slot.pair,
            });
          });

          importedSchedule.push(...assignedSlots);
        }
      }

      if (importedSchedule.length === 0) {
        alert("Не знайдено валідних даних про заняття у файлі.");
        return;
      }

      event.target.value = "";
    } catch (error) {
      alert("Помилка при обробці файлу: " + error.message);
    }
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
  searchBar.style.display = "block"; // Показуємо рядок пошуку
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
  table.style.display = "table"; // Залишаємо таблицю видимою
  searchBar.style.display = "none"; // Приховуємо рядок пошуку

  // Очищаємо лише вміст розкладу, зберігаючи структуру
  const subjectRow = table.children[0]; // Перший рядок із заголовками спеціальностей
  const groupRow = table.children[1]; // Другий рядок із номерами груп
  table.innerHTML = "";
  table.appendChild(subjectRow);
  table.appendChild(groupRow);

  // Відновлюємо структуру таблиці (дні тижня і пари)
  daysOfWeek.forEach((day, dayIndex) => {
    for (let pair = 1; pair <= 6; pair++) {
      const row = document.createElement("tr");

      if (pair === 1) {
        row.innerHTML += `<td class="day-column" rowspan="6">${day}</td>`;
      }

      row.innerHTML += `<td>${pair}</td>`;

      // Додаємо порожні клітинки для кожної групи
      row.innerHTML += groups.map(() => `<td></td>`).join("");

      table.appendChild(row);
    }
  });

  // Залишаємо кнопки видимими
  document.getElementById("clearTableButton").style.display = "inline-block";
  document.getElementById("exportButton").style.display = "inline-block";
  document.getElementById("backButton").style.display = "inline-block";
  document.getElementById("editTableButton").style.display = "none";

  // Приховуємо спливаючий блок із результатами пошуку
  document.getElementById("searchResults").style.display = "none";
}

function backToGenerate() {
  const table = document.getElementById("scheduleTable");
  const searchBar = document.querySelector(".search-bar");
  table.style.display = "none";
  table.innerHTML = "";
  searchBar.style.display = "none"; // Приховуємо рядок пошуку
  document.getElementById("generateButton").style.display = "inline-block";
  document.getElementById("importButton").style.display = "inline-block";
  document.getElementById("clearTableButton").style.display = "none";
  document.getElementById("exportButton").style.display = "none";
  document.getElementById("backButton").style.display = "none";
  document.getElementById("editTableButton").style.display = "none";
  // Приховуємо спливаючий блок із результатами пошуку
  document.getElementById("searchResults").style.display = "none";
}

function toggleEditMode() {
  const table = document.getElementById("scheduleTable");
  const cells = table.getElementsByTagName("td");

  if (!isEditMode) {
    // Вмикаємо режим редагування
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
    // Вимикаємо режим редагування
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

    // Отримуємо координати клітинки
    const day = parseInt(cell.getAttribute("data-day"));
    const pair = parseInt(cell.getAttribute("data-pair"));
    const group = cell.getAttribute("data-group");

    // Оновлюємо importedSchedule
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

    // Оновлюємо відображення клітинки з правильною структурою
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
  document.getElementById("searchInput").value = ""; // Очищаємо поле пошуку
});
