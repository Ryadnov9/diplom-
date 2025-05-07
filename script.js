const daysOfWeek = ["Понеділок", "Вівторок", "Середа", "Четвер", "П’ятниця"];

// Глобальні масиви для збереження груп і розкладу
let groups = [];
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
      const rows = text
        .split("\n")
        .map((row) => row.trim())
        .filter((row) => row);
      importedSchedule = [];
      groups = []; // Очищаємо масив груп

      // Зчитуємо перший рядок, щоб перевірити формат
      const headers = rows[0].split(",").map((header) => header.trim());

      // Перевіряємо формат для груп
      if (
        headers[0] !== "group_info" ||
        headers[1] !== "group" ||
        headers[2] !== "subject"
      ) {
        alert(
          "Неправильний формат CSV. Очікується: group_info,group,subject для груп, а потім group,subject,teacher,type,link,weeklyCount для занять"
        );
        return;
      }

      // Зчитуємо групи з CSV
      let i = 1;
      while (i < rows.length && rows[i].startsWith("group_info")) {
        const [, group, subject] = rows[i]
          .split(",")
          .map((item) => item.trim());
        if (group && subject) {
          groups.push({ name: group, subject });
        }
        i++;
      }

      // Дебагінг: перевіряємо, чи є група 12-411 у масиві groups
      console.log("Список груп:", groups);

      if (groups.length === 0) {
        alert("Не знайдено інформації про групи у файлі.");
        return;
      }

      // Перевіряємо формат для занять
      if (i >= rows.length) {
        alert("Не знайдено даних про заняття у файлі.");
        return;
      }

      const lessonHeaders = rows[i].split(",").map((header) => header.trim());
      if (
        lessonHeaders[0] !== "group" ||
        lessonHeaders[1] !== "subject" ||
        lessonHeaders[2] !== "teacher" ||
        lessonHeaders[3] !== "type" ||
        lessonHeaders[4] !== "link" ||
        lessonHeaders[5] !== "weeklyCount"
      ) {
        alert(
          "Неправильний формат CSV для занять. Очікується: group,subject,teacher,type,link,weeklyCount"
        );
        return;
      }

      // Групуємо заняття за предметом, викладачем і типом
      const lessonsByKey = {};
      for (let j = i + 1; j < rows.length; j++) {
        const [group, subject, teacher, type, link, weeklyCount] = rows[j]
          .split(",")
          .map((item) => item.trim());
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

            // Дебагінг: перевіряємо, чи є "Волошинов" серед викладачів
            if (teacher.toLowerCase().includes("волошинов")) {
              console.log(`Знайдено викладача "Волошинов" у рядку:`, {
                group,
                subject,
                teacher,
                type,
                link,
                weeklyCount,
              });
            }
          }
        }
      }

      // Розподіляємо заняття
      for (const key in lessonsByKey) {
        const lessons = lessonsByKey[key];
        const firstLesson = lessons[0];
        const weeklyCountNum = firstLesson.weeklyCount;

        // Якщо кілька груп мають однаковий предмет, викладача і тип
        if (lessons.length > 1) {
          const assignedSlots = [];

          // Якщо weeklyCount > 1
          if (weeklyCountNum > 1) {
            const availableDays = [0, 1, 2, 3, 4];
            const day =
              availableDays[Math.floor(Math.random() * availableDays.length)]; // Вибираємо один день

            // Якщо це лекція і предмет/викладач однакові, розміщуємо послідовно
            if (lessons.every((lesson) => lesson.type === "лекція")) {
              const availablePairs = [1, 2, 3, 4, 5, 6];
              const startPair =
                availablePairs[
                  Math.floor(
                    Math.random() * (availablePairs.length - weeklyCountNum + 1)
                  )
                ]; // Вибираємо початкову пару
              for (let j = 0; j < weeklyCountNum; j++) {
                const pair = startPair + j; // Послідовні пари
                if (pair > 6) break; // Якщо пари закінчилися, припиняємо
                lessons.forEach((lesson) => {
                  assignedSlots.push({
                    group: lesson.group,
                    subject: lesson.subject,
                    teacher: lesson.teacher,
                    type: lesson.type,
                    link: lesson.link,
                    day,
                    pair,
                  });
                });
              }
            } else {
              // Для інших типів (лабораторна, практика) розміщуємо в один день, але компактно
              const availablePairs = [1, 2, 3, 4, 5, 6];
              const startPair =
                availablePairs[
                  Math.floor(
                    Math.random() * (availablePairs.length - weeklyCountNum + 1)
                  )
                ]; // Вибираємо початкову пару
              const compactPairs = [];
              for (let j = 0; j < weeklyCountNum; j++) {
                compactPairs.push(startPair + j); // Компактні пари
              }
              for (let j = 0; j < weeklyCountNum; j++) {
                const pair = compactPairs[j];
                if (pair > 6) break; // Якщо пари закінчилися, припиняємо
                lessons.forEach((lesson) => {
                  assignedSlots.push({
                    group: lesson.group,
                    subject: lesson.subject,
                    teacher: lesson.teacher,
                    type: lesson.type,
                    link: lesson.link,
                    day,
                    pair,
                  });
                });
              }
            }
          } else {
            // Якщо weeklyCount === 1, розміщуємо в один день на одній парі
            const availableDays = [0, 1, 2, 3, 4];
            const day =
              availableDays[Math.floor(Math.random() * availableDays.length)];
            const pair = Math.floor(Math.random() * 6) + 1;
            lessons.forEach((lesson) => {
              assignedSlots.push({
                group: lesson.group,
                subject: lesson.subject,
                teacher: lesson.teacher,
                type: lesson.type,
                link: lesson.link,
                day,
                pair,
              });
            });
          }
          importedSchedule.push(...assignedSlots);
        } else {
          // Якщо предмет унікальний для однієї групи
          const assignedSlots = [];
          const availableDays = [0, 1, 2, 3, 4];
          for (let j = 0; j < weeklyCountNum; j++) {
            const randomDayIndex = Math.floor(
              Math.random() * availableDays.length
            );
            const day = availableDays.splice(randomDayIndex, 1)[0];
            const pair = Math.floor(Math.random() * 6) + 1;
            assignedSlots.push({
              group: firstLesson.group,
              subject: firstLesson.subject,
              teacher: firstLesson.teacher,
              type: firstLesson.type,
              link: firstLesson.link,
              day,
              pair,
            });
          }
          importedSchedule.push(...assignedSlots);
        }
      }

      // Дебагінг: перевіряємо, чи є записи з "Волошинов" у importedSchedule
      console.log("Розклад (importedSchedule):", importedSchedule);
      const hasVoloshinov = importedSchedule.some((entry) =>
        entry.teacher.toLowerCase().includes("волошинов")
      );
      console.log(
        "Чи є записи з викладачем Волошинов у розкладі:",
        hasVoloshinov
      );

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
  // Приховуємо спливаючий блок із результатами пошуку
  document.getElementById("searchResults").style.display = "none";
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

          const td = document.createElement("td");
          if (entry) {
            const subjectSpan = document.createElement("span");
            subjectSpan.textContent = entry.subject;
            td.appendChild(subjectSpan);

            const teacherSpan = document.createElement("span");
            teacherSpan.textContent = entry.teacher;
            td.appendChild(document.createElement("br"));
            td.appendChild(teacherSpan);

            const typeSpan = document.createElement("span");
            typeSpan.textContent = entry.type;
            td.appendChild(document.createElement("br"));
            td.appendChild(typeSpan);

            const linkElement = document.createElement("a");
            linkElement.href = entry.link;
            linkElement.target = "_blank";
            linkElement.textContent = "Посилання";
            td.appendChild(document.createElement("br"));
            td.appendChild(linkElement);

            // Дебагінг: перевіряємо, чи є "Волошинов" у викладачі
            if (entry.teacher.toLowerCase().includes("волошинов")) {
              console.log(
                `Знайдено "Волошинов" у таблиці: Група ${group.name}, День ${day}, Пара ${pair}, Дані:`,
                entry
              );
            }
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
    .trim();
  const table = document.getElementById("scheduleTable");
  const rows = table.getElementsByTagName("tr");
  const searchResults = document.getElementById("searchResults");
  const searchResultsContent = document.getElementById("searchResultsContent");
  const searchBar = document.querySelector(".search-bar");

  // Очищаємо вміст спливаючого блоку
  searchResultsContent.innerHTML = "";

  // Якщо текст пошуку порожній, приховуємо спливаючий блок і показуємо всю таблицю
  if (!searchText) {
    searchResults.style.display = "none";
    for (let i = 2; i < rows.length; i++) {
      rows[i].style.display = "";
    }
    return;
  }

  // Збираємо результати пошуку
  let matchesFound = false;
  const displayedResults = new Set(); // Для уникнення дублювання результатів

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.getElementsByTagName("td");

    // Визначаємо день і пару для поточного рядка
    const dayIndex = Math.floor((i - 2) / 6);
    const pair = ((i - 2) % 6) + 1;
    const day = daysOfWeek[dayIndex];

    // Починаємо з 2, щоб пропустити стовпці "Дні тижня" і "№ пари"
    for (let j = 2; j < cells.length; j++) {
      const cell = cells[j];
      const spans = cell.getElementsByTagName("span");

      // Дебагінг: перевіряємо, чи є span-елементи
      if (spans.length === 0) {
        continue; // Якщо немає span-елементів, пропускаємо клітинку
      }

      // Перевіряємо, чи є хоча б 3 span-елементи (предмет, викладач, тип)
      if (spans.length >= 3) {
        const subjectText = spans[0].textContent.toLowerCase(); // Предмет
        const teacherText = spans[1].textContent.toLowerCase(); // Викладач
        const typeText = spans[2].textContent.toLowerCase(); // Тип заняття

        // Об'єднуємо всі поля для пошуку
        const combinedText = `${subjectText} ${teacherText} ${typeText}`;

        // Дебагінг: виводимо, що ми порівнюємо
        console.log(`Порівнюємо: "${combinedText}" з "${searchText}"`);

        // Перевіряємо, чи є збіг із введеним текстом
        if (combinedText.includes(searchText)) {
          matchesFound = true;

          // Унікальний ключ для результату, щоб уникнути дублювання
          const resultKey = `${day}|${pair}|${
            groups[j - 2].name
          }|${subjectText}|${teacherText}|${typeText}`;

          if (!displayedResults.has(resultKey)) {
            displayedResults.add(resultKey);

            // Додаємо результат у спливаючий блок
            const groupName = groups[j - 2].name; // Отримуємо назву групи
            const resultItem = document.createElement("p");
            resultItem.innerHTML = `<strong>День:</strong> ${day}, <strong>Пара:</strong> ${pair}, <strong>Група:</strong> ${groupName}, <strong>Предмет:</strong> ${spans[0].textContent}, <strong>Викладач:</strong> ${spans[1].textContent}, <strong>Тип:</strong> ${spans[2].textContent}<br>`;
            Array.from(cell.childNodes).forEach((node) => {
              if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                resultItem.innerHTML += node.textContent.trim() + "<br>";
              } else if (node.nodeName === "A") {
                resultItem.innerHTML += node.outerHTML + "<br>";
              } else if (node.nodeName === "BR") {
                resultItem.innerHTML += "<br>";
              }
            });
            searchResultsContent.appendChild(resultItem);
          }
        }
      } else {
        // Дебагінг: якщо span-елементів менше 3
        console.log(
          `Клітинка має лише ${spans.length} span-елементів:`,
          cell.innerHTML
        );
      }
    }
  }

  // Показуємо або приховуємо спливаючий блок залежно від наявності результатів
  if (matchesFound) {
    // Динамічно налаштовуємо позицію спливаючого вікна
    const searchBarRect = searchBar.getBoundingClientRect();
    searchResults.style.top = `${searchBarRect.bottom + window.scrollY + 10}px`; // Розташовуємо під рядком пошуку
    searchResults.style.display = "block";
  } else {
    searchResultsContent.innerHTML = "<p>Нічого не знайдено.</p>";
    const searchBarRect = searchBar.getBoundingClientRect();
    searchResults.style.top = `${searchBarRect.bottom + window.scrollY + 10}px`; // Розташовуємо під рядком пошуку
    searchResults.style.display = "block";
  }

  // Завжди показуємо всі рядки основної таблиці
  for (let i = 2; i < rows.length; i++) {
    rows[i].style.display = "";
  }
});

// Обробник для кнопки закриття спливаючого блоку
document.getElementById("closeResultsButton").addEventListener("click", () => {
  document.getElementById("searchResults").style.display = "none";
  document.getElementById("searchInput").value = ""; // Очищаємо поле пошуку
});
