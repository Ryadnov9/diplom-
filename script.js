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
      let isGroupSection = headers[0] === "group_info" && headers.length === 3;
      let isLessonSection = headers[0] === "group" && headers.length === 6;

      if (!isGroupSection && !isLessonSection) {
        alert(
          "Неправильний формат CSV. Очікується: group_info,group,subject для груп або group,subject,teacher,type,link,weeklyCount для занять"
        );
        return;
      }

      // Зчитуємо групи з CSV
      let i = 1;
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

      // Дебагінг: перевіряємо, чи є записи для групи 12-411 у importedSchedule
      console.log("Розклад (importedSchedule):", importedSchedule);
      const hasGroup411Schedule = importedSchedule.some(
        (entry) => entry.group === "12-411"
      );
      console.log(
        "Чи є записи для групи 12-411 у розкладі:",
        hasGroup411Schedule
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
        .map((group, groupIndex) => {
          const entry = generatedSchedule.find(
            (e) =>
              e.group === group.name && e.day === dayIndex && e.pair === pair
          );

          // Дебагінг: перевіряємо, чи є запис для першої групи
          if (groupIndex === 0 && entry) {
            console.log(
              `Знайдено запис для першої групи (${group.name}): День ${day}, Пара ${pair}, Дані:`,
              entry
            );
          } else if (groupIndex === 0 && !entry) {
            console.log(
              `Запис для першої групи (${group.name}) не знайдено: День ${day}, Пара ${pair}`
            );
          }

          const td = document.createElement("td");
          if (entry) {
            const subjectSpan = document.createElement("span");
            subjectSpan.textContent = entry.subject || "Немає предмета";
            td.appendChild(subjectSpan);

            const teacherSpan = document.createElement("span");
            teacherSpan.textContent = entry.teacher || "Немає викладача";
            td.appendChild(document.createElement("br"));
            td.appendChild(teacherSpan);

            const typeSpan = document.createElement("span");
            typeSpan.textContent = entry.type || "Немає типу";
            td.appendChild(document.createElement("br"));
            td.appendChild(typeSpan);

            // Перевіряємо, чи link є валідним URL
            const isValidUrl =
              entry.link &&
              (entry.link.startsWith("http://") ||
                entry.link.startsWith("https://"));
            if (isValidUrl) {
              const linkElement = document.createElement("a");
              linkElement.href = entry.link || "#";
              linkElement.target = "_blank";
              linkElement.textContent = "Посилання";
              td.appendChild(document.createElement("br"));
              td.appendChild(linkElement);
            } else if (entry.link) {
              // Витягуємо код і пароль із формату "код: [код] пароль: [пароль]"
              const codeMatch = entry.link.match(/код:\s*(\S+)/i);
              const passwordMatch = entry.link.match(/пароль:\s*(\S+)/i);
              if (codeMatch && passwordMatch) {
                const code = codeMatch[1].trim();
                const password = passwordMatch[1].trim();
                const codeSpan = document.createElement("span");
                codeSpan.textContent = `Код: ${code}`;
                td.appendChild(document.createElement("br"));
                td.appendChild(codeSpan);
                const passwordSpan = document.createElement("span");
                passwordSpan.textContent = `Пароль: ${password}`;
                td.appendChild(document.createElement("br"));
                td.appendChild(passwordSpan);
              } else if (codeMatch) {
                const code = codeMatch[1].trim();
                const codeSpan = document.createElement("span");
                codeSpan.textContent = `Код: ${code}`;
                td.appendChild(document.createElement("br"));
                td.appendChild(codeSpan);
              }
            }

            // Дебагінг: перевіряємо вміст клітинки
            console.log(
              `Клітинка для групи ${group.name}, День ${day}, Пара ${pair}:`,
              td.innerHTML
            );
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
    .replace(/\s+/g, " "); // Нормалізуємо пробіли
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

  // Перевіряємо, чи введений текст є номером групи
  const isGroupSearch = groups.some(
    (group) => group.name.toLowerCase() === searchText
  );
  let matchesFound = false;

  if (isGroupSearch) {
    // Якщо це пошук за групою, знаходимо всі заняття для цієї групи
    const groupSchedule = importedSchedule.filter(
      (entry) => entry.group.toLowerCase() === searchText
    );

    if (groupSchedule.length > 0) {
      matchesFound = true;
      // Сортуємо за днями і парами для зручності
      groupSchedule.sort((a, b) => {
        if (a.day === b.day) {
          return a.pair - b.pair;
        }
        return a.day - b.day;
      });

      // Групуємо заняття за днями
      const scheduleByDay = {};
      daysOfWeek.forEach((day, dayIndex) => {
        scheduleByDay[dayIndex] = groupSchedule.filter(
          (entry) => entry.day === dayIndex
        );
      });

      // Відображаємо розклад для групи
      daysOfWeek.forEach((day, dayIndex) => {
        const dayEntries = scheduleByDay[dayIndex];
        if (dayEntries.length > 0) {
          const dayHeader = document.createElement("p");
          dayHeader.className = "group-day-header"; // Використовуємо клас для червоного кольору
          dayHeader.innerHTML = `<strong>${day}</strong>`;
          searchResultsContent.appendChild(dayHeader);

          dayEntries.forEach((entry) => {
            const resultItem = document.createElement("p");
            resultItem.innerHTML = `<strong>Пара:</strong> ${entry.pair}, <strong>Предмет:</strong> ${entry.subject}, <strong>Викладач:</strong> ${entry.teacher}, <strong>Тип:</strong> ${entry.type}`;
            // Перевіряємо, чи link є валідним URL
            const isValidUrl =
              entry.link &&
              (entry.link.startsWith("http://") ||
                entry.link.startsWith("https://"));
            if (isValidUrl) {
              resultItem.innerHTML += `, <a href="${entry.link}" target="_blank">Посилання</a>`;
            } else if (entry.link) {
              // Витягуємо код і пароль із формату "код: [код] пароль: [пароль]"
              const codeMatch = entry.link.match(/код:\s*(\S+)/i);
              const passwordMatch = entry.link.match(/пароль:\s*(\S+)/i);
              if (codeMatch && passwordMatch) {
                const code = codeMatch[1].trim();
                const password = passwordMatch[1].trim();
                resultItem.innerHTML += `, Код: ${code}, Пароль: ${password}`;
              } else if (codeMatch) {
                const code = codeMatch[1].trim();
                resultItem.innerHTML += `, Код: ${code}`;
              }
            }
            searchResultsContent.appendChild(resultItem);
          });
        }
      });
    }
  } else {
    // Якщо це не номер групи, використовуємо попередню логіку пошуку
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
          console.log(
            `Клітинка порожня: Група ${
              groups[j - 2].name
            }, День ${day}, Пара ${pair}`
          );
          continue; // Якщо немає span-елементів, пропускаємо клітинку
        }

        // Перевіряємо, чи є хоча б 3 span-елементи (предмет, викладач, тип)
        if (spans.length >= 3) {
          const subjectText = (spans[0].textContent || "")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " "); // Нормалізуємо пробіли
          const teacherText = (spans[1].textContent || "")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " "); // Нормалізуємо пробіли
          const typeText = (spans[2].textContent || "")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " "); // Нормалізуємо пробіли

          // Нормалізуємо прізвище викладача: видаляємо "проф.", "доц.", ініціали тощо
          const normalizedTeacherText = teacherText
            .replace(/проф\.\s*/g, "") // Видаляємо "проф."
            .replace(/доц\.\s*/g, "") // Видаляємо "доц."
            .replace(/ст\.викл\.\s*/g, "") // Видаляємо "ст.викл."
            .replace(/викл\.\s*/g, "") // Видаляємо "викл."
            .replace(/\s*[а-я]\.[а-я]\./g, "") // Видаляємо ініціали (наприклад, "С.А.")
            .trim();

          // Об'єднуємо всі поля для пошуку
          const combinedText = `${subjectText} ${teacherText} ${typeText}`;
          const combinedTextForSearch = `${subjectText} ${normalizedTeacherText} ${typeText}`;

          // Дебагінг: виводимо, що ми порівнюємо
          console.log(
            `Перевіряємо: Група ${
              groups[j - 2].name
            }, День ${day}, Пара ${pair}, Текст: "${combinedText}", Нормалізований текст: "${combinedTextForSearch}", Пошук: "${searchText}"`
          );

          // Перевіряємо, чи є збіг із введеним текстом
          if (combinedTextForSearch.includes(searchText)) {
            matchesFound = true;

            // Унікальний ключ для результату: додаємо індекс клітинки, щоб уникнути дублювання
            const resultKey = `${i}|${j}|${combinedText}`;

            if (!displayedResults.has(resultKey)) {
              displayedResults.add(resultKey);

              // Додаємо результат у спливаючий блок
              const groupName = groups[j - 2].name; // Отримуємо назву групи
              const resultItem = document.createElement("p");
              resultItem.innerHTML = `<strong>День:</strong> ${day}, <strong>Пара:</strong> ${pair}, <strong>Група:</strong> ${groupName}, <strong>Предмет:</strong> ${spans[0].textContent}, <strong>Викладач:</strong> ${spans[1].textContent}, <strong>Тип:</strong> ${spans[2].textContent}<br>`;
              // Перевіряємо, чи link є валідним URL
              const linkText = cell.querySelector("a")?.textContent || "";
              if (linkText && linkText.includes("Посилання")) {
                const linkHref = cell.querySelector("a")?.href || "#";
                resultItem.innerHTML += `<a href="${linkHref}" target="_blank">Посилання</a><br>`;
              } else {
                const spans = cell.getElementsByTagName("span");
                let code = "";
                let password = "";
                for (let span of spans) {
                  if (span.textContent.startsWith("Код:")) {
                    code = span.textContent.replace("Код: ", "");
                  } else if (span.textContent.startsWith("Пароль:")) {
                    password = span.textContent.replace("Пароль: ", "");
                  }
                }
                if (code && password) {
                  resultItem.innerHTML += `Код: ${code}, Пароль: ${password}<br>`;
                } else if (code) {
                  resultItem.innerHTML += `Код: ${code}<br>`;
                }
              }
              searchResultsContent.appendChild(resultItem);
            }
          }
        } else {
          // Дебагінг: якщо span-елементів менше 3
          console.log(
            `Клітинка має лише ${spans.length} span-елементів: Група ${
              groups[j - 2].name
            }, День ${day}, Пара ${pair}, Вміст:`,
            cell.innerHTML
          );
        }
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
