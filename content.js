// Remove News Elements
// Hide the right sidebar
const sidebar = document.querySelector(".feed-right-sidebar");
if (sidebar) {
  sidebar.style.display = "none";
}

// Hide the feed container for 'for-you' topic
const feedContainer = document.querySelector(
  "feed-container[data-active-topic='for-you']"
);
if (feedContainer) {
  feedContainer.style.display = "none";
}

// Hide Footer container
const footer = document.querySelector("footer");
if (footer) {
  footer.style.display = "none";
}

// Hilfsfunktion zur Generierung einer eindeutigen ID
async function generateUniqueID(baseName) {
  return `${baseName}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

let buttonCounter = 1; // Startwert für auto_increment
let existingToolbars = new Set(); // Set zur Verfolgung bereits verarbeiteter Toolbars

setInterval(() => {
  // Always in use; That's why on top
  const path = window.location.pathname;

  // Only hide if the user is on the Home Feed
  if (path.startsWith("/copilot/c/")) {
    let toolbars = document.querySelectorAll(
      '[role="toolbar"][aria-label="Message tools"]'
    );

    toolbars.forEach((toolbar, index) => {
      // Überprüfen, ob die Toolbar bereits verarbeitet wurde
      if (!existingToolbars.has(toolbar)) {
        let buttonExists = Array.from(toolbar.querySelectorAll("button")).some(
          (btn) => btn.className.match(/\bsave-prompt-button-\d+\b/)
        );

        // Falls es sich um die erste Toolbar handelt und kein Button existiert → Reset!
        if (index === 0 && !buttonExists) {
          console.log(
            "Erste Toolbar hat keinen Button – Counter wird zurückgesetzt."
          );
          buttonCounter = 1;
        }

        // Nur bei jedem zweiten Element (index 1, 3, 5, ...) einen Button hinzufügen
        if (index % 2 === 1 && !buttonExists) {
          const button = document.createElement("button");
          button.textContent = `Save Prompt`;
          button.classList.add(
            "save-prompt-button",
            `save-prompt-button-${buttonCounter}`
          );

          // Button-Styling
          button.style.padding = "5px 10px";
          button.style.marginLeft = "5px";
          button.style.cursor = "pointer";
          button.style.border = "1px solid #ccc";
          button.style.borderRadius = "5px";
          button.style.color = "black";
          button.style.background = "#f0f0f0";
          button.title =
            "If you liked the answer, save the prompt that generated it directly to your memory.";

          // Hover-Effekte
          button.addEventListener("mouseover", () => {
            button.style.backgroundColor = "#e0e0e0";
            button.style.borderColor = "#bbb";
          });

          button.addEventListener("mouseout", () => {
            button.style.backgroundColor = "#f0f0f0";
            button.style.borderColor = "#ccc";
          });

          // Klick-Event
          button.addEventListener("click", (event) => {
            let clickedButton = event.target;
            let match = clickedButton.className.match(
              /save-prompt-button-(\d+)/
            );
            if (match) {
              let buttonNumber = parseInt(match[1], 10);
              console.log(`Button ${buttonNumber} wurde geklickt.`);

              // Text auf "✔ Prompt Saved" setzen
              clickedButton.textContent = "✔ Prompt Saved";

              // Funktion promptGrabber aufrufen
              promptGrabber(buttonNumber);

              // Nach 5 Sekunden zurück auf "Save Prompt" setzen
              setTimeout(() => {
                clickedButton.textContent = "Save Prompt";
              }, 5000); // 5000 Millisekunden = 5 Sekunden
            }
          });

          toolbar.appendChild(button);
          console.log(`Button ${buttonCounter} hinzugefügt.`);
          buttonCounter++; // Zähler erhöhen
        }

        // Toolbar als verarbeitet markieren
        existingToolbars.add(toolbar);
      }
    });

    console.log("Der Zähler läuft");
  }
}, 3000); // Alle 3 Sekunden prüfen

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📩 Message received in content.js:", request);

  if (request.action === "usePrompt") {
    console.log("✅ usePrompt action received!");

    const textarea = document.querySelector("textarea#copilot-chat-textarea");
    if (textarea) {
      textarea.value = request.text; // Insert the stored text

      // Trigger an input event (important for some web apps)
      textarea.dispatchEvent(new Event("input", { bubbles: true }));

      console.log("✍️ Text inserted:", request.text);
      sendResponse({
        status: "success",
        message: "Prompt inserted successfully",
      });
    } else {
      console.warn("⚠️ No textarea found.");
      sendResponse({ status: "error", message: "Textarea not found" });
    }
  } else {
    sendResponse({
      status: "unknown_action",
      message: "Action not recognized",
    });
  }

  return true; // Required for asynchronous sendResponse
});

// Funktion zum Abrufen des passenden Chat-Elements
function promptGrabber(index) {
  // Überprüfen, ob der Index eine positive Zahl ist
  if (index <= 0) {
    console.error("Index muss eine positive Zahl sein.");
    return;
  }

  // Berechnung des nth-child-Wertes
  const nthChild = index;

  console.log("Nth-child: " + nthChild);

  const elements = document.querySelectorAll(
    ".UserMessage-module__container--cAvvK.ChatMessage-module__userMessage--xvIFp"
  );
  let message;
  // Stelle sicher, dass nthChild innerhalb des gültigen Bereichs liegt
  if (nthChild > 0 && nthChild <= elements.length) {
    message = elements[nthChild - 1]; // nth-child ist 1-basiert, NodeList ist 0-basiert
    console.log(message.textContent.trim());
  } else {
    console.log("Ungültiger nthChild-Wert: " + nthChild);
  }

  if (message) {
    message = message.textContent.trim(); // Trim entfernt überflüssige Leerzeichen
    console.log(`Prompt ${index}:`, message);

    let baseTopicName = "ExampleName"; // Dynamischer Name möglich
    let topicName = baseTopicName;

    // Prüfe, ob ein Doppelpunkt im Text vorhanden ist
    let processedMessage = message;
    const colonIndex = message.indexOf(":");
    if (colonIndex !== -1) {
      // Wenn ein ":" gefunden wird, nimm nur den Teil links davon inklusive ":"
      processedMessage = message.substring(0, colonIndex + 1).trim();
    }

    // Hole bestehende Daten
    chrome.storage.sync.get(null, async function (data) {
      let topics = data || {}; // Sicherstellen, dass ein Objekt existiert

      // Eindeutige ID generieren
      const uniqueID = await generateUniqueID(topicName);

      // Falls der Name bereits existiert, generiere einen neuen
      while (topics.hasOwnProperty(topicName)) {
        topicName = `${baseTopicName}_${Math.floor(Math.random() * 10000)}`;
      }

      // Neues Topic-Objekt erstellen mit der verarbeiteten Nachricht
      topics[uniqueID] = {
        name: topicName,
        prompts: [processedMessage],
      };

      // Speichern und UI sofort aktualisieren
      chrome.storage.sync.set(topics, function () {
        console.log(
          `Gespeichert in ${topicName} (ID: ${uniqueID}):`,
          processedMessage
        );
        inputField.value = ""; // Eingabefeld leeren

        document.querySelector(".dropdown-content p").style.display = "none";

        // Direkt das neue Element in die UI einfügen
        addDropdownItem(uniqueID, topicName);
      });
    });
  } else {
    console.log(`Kein Element für Prompt ${index} gefunden.`);
  }
}
