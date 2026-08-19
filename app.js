// STATE VARIABLES
let currentTable = {};
let slots = { "1": null, "2": null, "3": null, "4": null, "5": null, "6": null };
let selectedNumbers = new Set();
let cuttingActiveNumbers = new Set();

// UI DOM ELEMENTS
let tableStatusBadge, tableRawInput, tableProvidedTotal, valCalcTotal, valProvTotal, verificationResultText, gridContainer, outputText, consoleOutput;
let dropZone, fileInput, previewContainer, imagePreview, btnRemoveImage, ocrLoader, ocrProgress, btnPasteClipboard, calculatedThresholdDisplay, manualBasesInput, statCalcTotal, statThreshold;

const slotCards = {};
const slotValues = {};
const slotInputs = {};
const slotClears = {};
const slotSets = {};

// Initialization Routine
function init() {
  // Bind standard elements
  tableStatusBadge = document.getElementById("table-status-badge");
  tableRawInput = document.getElementById("table-raw-input");
  tableProvidedTotal = document.getElementById("table-provided-total");
  valCalcTotal = document.getElementById("val-calc-total");
  valProvTotal = document.getElementById("val-prov-total");
  verificationResultText = document.getElementById("verification-result-text");
  gridContainer = document.getElementById("grid-container");
  outputText = document.getElementById("output-text");
  consoleOutput = document.getElementById("console-output");

  dropZone = document.getElementById("drop-zone");
  fileInput = document.getElementById("file-input");
  previewContainer = document.getElementById("preview-container");
  imagePreview = document.getElementById("image-preview");
  btnRemoveImage = document.getElementById("btn-remove-image");
  ocrLoader = document.getElementById("ocr-loader");
  ocrProgress = document.getElementById("ocr-progress");
  btnPasteClipboard = document.getElementById("btn-paste-clipboard");
  calculatedThresholdDisplay = document.getElementById("calculated-threshold-display");
  manualBasesInput = document.getElementById("manual-bases");
  statCalcTotal = document.getElementById("stat-calc-total");
  statThreshold = document.getElementById("stat-threshold");

  // Bind Slot Elements
  for (let i = 1; i <= 6; i++) {
    slotCards[i] = document.getElementById(`slot-card-${i}`);
    slotValues[i] = document.getElementById(`slot-val-${i}`);
    slotInputs[i] = document.getElementById(`slot-input-${i}`);
    slotClears[i] = document.getElementById(`slot-clear-${i}`);
    slotSets[i] = document.getElementById(`slot-set-${i}`);
  }

  // Load slots from localStorage
  const savedSlots = localStorage.getItem("cutter_slots");
  if (savedSlots) {
    try {
      slots = JSON.parse(savedSlots);
    } catch (e) {
      console.error("Error loading slots:", e);
    }
  }
  updateSlotsUI();

  // Reset to an absolute clean state (No default presets loaded!)
  currentTable = {};
  tableRawInput.value = "";
  tableProvidedTotal.value = "";
  if (manualBasesInput) {
    manualBasesInput.value = "";
  }
  
  // Generate 10x10 grid representation
  generateGrid();

  // Set event listeners
  setupEventListeners();

  // Calculate clean state totals (Calculated Total = 0, Threshold = 0)
  handleTableRawInput();
  
  logConsole("System Ready. Paste table text or upload image to begin.", true);
}

// Safely execute init when page is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Set Event Listeners
function setupEventListeners() {
  // Table inputs listeners
  tableRawInput.addEventListener("input", handleTableRawInput);
  tableProvidedTotal.addEventListener("input", handleTableRawInput);

  // Paste Clipboard Table Text Button
  if (btnPasteClipboard) {
    btnPasteClipboard.addEventListener("click", () => {
      navigator.clipboard.readText()
        .then(text => {
          if (text && text.trim()) {
            tableRawInput.value = text.trim();
            handleTableRawInput();
            logConsole("Table text successfully pasted from clipboard!");
          } else {
            logConsole("Clipboard is empty.");
          }
        })
        .catch(err => {
          console.error("Clipboard read error:", err);
          logConsole("Could not read clipboard. Please paste manually into the text box.");
        });
    });
  }

  // Analysis / Cutting triggers
  document.getElementById("btn-run-analysis").addEventListener("click", runAnalysis);

  // Trigger analysis update when manual bases are typed
  if (manualBasesInput) {
    manualBasesInput.addEventListener("input", runAnalysis);
  }

  // Clear selections (Grid & Slots)
  document.getElementById("btn-clear-selection").addEventListener("click", () => {
    selectedNumbers.clear();
    cuttingActiveNumbers.clear();
    clearAllSlots();
    if (manualBasesInput) {
      manualBasesInput.value = "";
    }
    updateGridSelectionUI();
    updateGridCuttingUI();
    runAnalysis();
    logConsole("Grid selections, slots, and base numbers cleared.");
  });

  // Copy result
  document.getElementById("btn-copy-output").addEventListener("click", copyOutputToClipboard);

  // Slot set & clear triggers
  for (let i = 1; i <= 6; i++) {
    // Pressing Enter inside slot input
    slotInputs[i].addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = slotInputs[i].value.trim();
        if (val) {
          setSlot(i, val);
          slotInputs[i].value = "";
        }
      }
    });

    // Clicking "Set" button inside slot card
    slotSets[i].addEventListener("click", () => {
      const val = slotInputs[i].value.trim();
      if (val) {
        setSlot(i, val);
        slotInputs[i].value = "";
      } else {
        logConsole(`Please enter a number to set in Slot ${i}`);
      }
    });

    // Clearing slot
    slotClears[i].addEventListener("click", () => {
      clearSlot(i);
    });
  }

  document.getElementById("btn-slots-clear-all").addEventListener("click", () => {
    clearAllSlots();
  });

  // Explicit Upload File Trigger Button
  const btnSelectFile = document.getElementById("btn-select-file");
  if (btnSelectFile) {
    btnSelectFile.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  // Dropzone click triggers input
  dropZone.addEventListener("click", (e) => {
    if (e.target !== btnRemoveImage && !btnRemoveImage.contains(e.target) && e.target !== btnSelectFile) {
      fileInput.click();
    }
  });

  // Drag over dropzone styling
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--accent)";
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "var(--border)";
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--border)";
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageUpload(e.target.files[0]);
    }
  });

  btnRemoveImage.addEventListener("click", (e) => {
    e.stopPropagation();
    removeUploadedImage();
  });
}

// Helper to format values with leading zero
function formatNumber(num) {
  const val = parseInt(num, 10);
  if (isNaN(val)) return "00";
  if (val === 100) return "100";
  if (val === 0) return "00";
  return val < 10 ? `0${val}` : `${val}`;
}

// 10x10 Table Grid builder
function generateGrid() {
  if (!gridContainer) return;
  gridContainer.innerHTML = "";
  for (let i = 1; i <= 100; i++) {
    const numStr = formatNumber(i);
    const cell = document.createElement("div");
    cell.className = "grid-cell";
    cell.id = `cell-${numStr}`;
    cell.dataset.num = numStr;

    const numSpan = document.createElement("span");
    numSpan.className = "grid-cell-num";
    numSpan.textContent = numStr === "100" ? "100" : numStr;

    const valSpan = document.createElement("span");
    valSpan.className = "grid-cell-val";
    valSpan.id = `cell-val-${numStr}`;
    valSpan.textContent = "0";

    cell.appendChild(numSpan);
    cell.appendChild(valSpan);

    cell.addEventListener("click", () => {
      toggleGridNumber(numStr);
    });

    gridContainer.appendChild(cell);
  }
  updateGridValues();
}

// Update grid labels with table values
function updateGridValues() {
  for (let i = 1; i <= 100; i++) {
    const numStr = formatNumber(i);
    const valSpan = document.getElementById(`cell-val-${numStr}`);
    if (!valSpan) continue;

    let val = currentTable[numStr];
    if (val === undefined && numStr === "100") {
      val = currentTable["00"];
    }

    if (val !== undefined && val !== null) {
      valSpan.textContent = val;
    } else {
      valSpan.textContent = "0"; // Default to 0 when table is clean
    }
  }
}

// Toggle grid item selection
function toggleGridNumber(numStr) {
  if (selectedNumbers.has(numStr)) {
    selectedNumbers.delete(numStr);
  } else {
    selectedNumbers.add(numStr);
  }
  updateGridSelectionUI();
  runAnalysis();
}

// Highlight selected items on grid (General selections in teal)
function updateGridSelectionUI() {
  for (let i = 1; i <= 100; i++) {
    const numStr = formatNumber(i);
    const cell = document.getElementById(`cell-${numStr}`);
    if (!cell) continue;

    if (selectedNumbers.has(numStr)) {
      cell.classList.add("selected");
    } else {
      cell.classList.remove("selected");
    }
  }
}

// Highlight exact numbers in the output cutting (in emerald green)
function updateGridCuttingUI() {
  for (let i = 1; i <= 100; i++) {
    const numStr = formatNumber(i);
    const cell = document.getElementById(`cell-${numStr}`);
    if (!cell) continue;

    if (cuttingActiveNumbers.has(numStr)) {
      cell.classList.add("cutting-active");
    } else {
      cell.classList.remove("cutting-active");
    }
  }
}

// Parse Raw Text Table & Verify Sum
function handleTableRawInput() {
  const text = tableRawInput.value;
  const parsed = {};
  
  // Parse line by line using a robust regex search
  const lines = text.split("\n");
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    // Matches first integer and second number (decimal supported)
    const match = line.match(/^\s*(\d+)\s*[=:\-\s\t]+\s*(\d+(?:\.\d+)?)/);
    if (match) {
      const numStr = match[1].trim();
      const valStr = match[2].trim();
      
      const num = parseInt(numStr, 10);
      const val = parseFloat(valStr);
      
      if (!isNaN(num) && !isNaN(val)) {
        let key = formatNumber(num);
        if (numStr === "00") {
          key = "00";
        }
        parsed[key] = val;
      }
    }
  }

  currentTable = parsed;
  updateGridValues();

  // Calculated total sum
  const calculatedTotal = Object.values(currentTable).reduce((a, b) => a + b, 0);
  valCalcTotal.textContent = calculatedTotal.toFixed(0);
  if (statCalcTotal) {
    statCalcTotal.textContent = calculatedTotal.toLocaleString("en-IN");
  }

  // Auto-calculated threshold limit (Total / 100)
  const threshold = calculatedTotal / 100;
  if (calculatedThresholdDisplay) {
    calculatedThresholdDisplay.textContent = threshold.toFixed(1);
  }
  if (statThreshold) {
    statThreshold.textContent = threshold.toFixed(1);
  }

  const providedText = tableProvidedTotal.value.trim();
  if (providedText !== "") {
    const providedTotal = parseFloat(providedText);
    valProvTotal.textContent = providedTotal.toFixed(0);

    if (Math.abs(calculatedTotal - providedTotal) < 0.01) {
      tableStatusBadge.className = "status-badge verified";
      tableStatusBadge.innerHTML = "<span>●</span> TOTAL VERIFIED";
      
      verificationResultText.innerHTML = "TOTAL VERIFIED";
      verificationResultText.style.color = "var(--success)";
    } else {
      tableStatusBadge.className = "status-badge mismatch";
      tableStatusBadge.innerHTML = "<span>●</span> TOTAL MISMATCH";
      
      verificationResultText.innerHTML = `TOTAL MISMATCH<br>CALCULATED TOTAL = ${calculatedTotal.toFixed(0)}<br>PROVIDED TOTAL = ${providedTotal.toFixed(0)}`;
      verificationResultText.style.color = "var(--error)";
    }
  } else {
    tableStatusBadge.className = "status-badge empty";
    tableStatusBadge.innerHTML = "<span>●</span> NO TABLE COMPARED";
    
    valProvTotal.textContent = "None";
    verificationResultText.innerHTML = `CALCULATED TOTAL = ${calculatedTotal.toFixed(0)}<br>PROVIDED TOTAL = None`;
    verificationResultText.style.color = "var(--text-secondary)";
  }

  // Recalculate cutting automatically if active table changed
  runAnalysis();
}

// Update slot display states
function updateSlotsUI() {
  for (let i = 1; i <= 6; i++) {
    const val = slots[i];
    if (!slotCards[i]) continue;

    if (val !== null && val !== undefined) {
      slotCards[i].classList.add("has-value");
      slotValues[i].className = "slot-value";
      slotValues[i].textContent = val;
    } else {
      slotCards[i].classList.remove("has-value");
      slotValues[i].className = "slot-value empty";
      slotValues[i].textContent = "EMPTY";
    }
  }
  localStorage.setItem("cutter_slots", JSON.stringify(slots));
}

// Save slot value
function setSlot(slotNum, value) {
  const formattedVal = formatNumber(value);
  slots[slotNum] = formattedVal;
  updateSlotsUI();
  logConsole(`SLOT ${slotNum} SAVED = ${formattedVal}`);
  runAnalysis();
}

// Clear slot value
function clearSlot(slotNum) {
  slots[slotNum] = null;
  updateSlotsUI();
  logConsole(`SLOT ${slotNum} CLEARED`);
  runAnalysis();
}

// Clear all slots
function clearAllSlots() {
  for (let i = 1; i <= 6; i++) {
    slots[i] = null;
  }
  updateSlotsUI();
  logConsole("ALL SLOTS CLEARED");
}

// Round figure logic: last digits 0-4 round down, 5-9 round up
function roundFigure(val) {
  const roundedInt = Math.round(val);
  const remainder = roundedInt % 10;
  if (remainder >= 5) {
    return roundedInt + (10 - remainder);
  } else if (remainder <= -5) {
    return roundedInt - (10 + remainder);
  } else {
    return roundedInt - remainder;
  }
}

// Candidate Number Generator (Generates palti, seeds +/- 10, seeds +/- 1, inside/outside digits)
function generateCandidates(baseNumbers) {
  const candidates = new Set();
  const add = value => {
    if (Number.isInteger(value) && value >= 0 && value <= 100) {
      candidates.add(formatNumber(value));
    }
  };
  
  const uniqueBases = [...new Set(baseNumbers.map(n => formatNumber(n)).filter(Boolean))];
  
  for (const baseKey of uniqueBases) {
    const base = Number(baseKey);
    // Reverse/Palti
    const reversedStr = baseKey.split('').reverse().join('');
    const reverse = Number(reversedStr);
    
    // Seeds: base, base - 10, base + 10, reverse, reverse - 10, reverse + 10
    const seeds = [base, base - 10, base + 10, reverse, reverse - 10, reverse + 10];
    seeds.forEach(seed => {
      add(seed);
      add(seed - 1);
      add(seed + 1);
    });
    
    if (baseKey.length === 2) {
      const d1 = Number(baseKey[0]);
      const d2 = Number(baseKey[1]);
      
      // Inside: digit * 10 + unit (1 to 9)
      for (let unit = 1; unit <= 9; unit++) {
        add(d1 * 10 + unit);
        add(d2 * 10 + unit);
      }
      
      // Outside: tens * 10 + digit (0 to 9)
      for (let tens = 0; tens <= 9; tens++) {
        add(tens * 10 + d1);
        add(tens * 10 + d2);
      }
    }
  }
  return [...candidates].filter(Boolean);
}

// Runs threshold cutting calculation dynamically
function runAnalysis() {
  if (!outputText) return;

  // 1. Calculate table total and threshold automatically as Total / 100
  const calculatedTotal = Object.values(currentTable).reduce((a, b) => a + b, 0);
  const threshold = calculatedTotal / 100;
  
  if (calculatedThresholdDisplay) {
    calculatedThresholdDisplay.textContent = threshold.toFixed(1);
  }
  if (statCalcTotal) {
    statCalcTotal.textContent = calculatedTotal.toLocaleString("en-IN");
  }
  if (statThreshold) {
    statThreshold.textContent = threshold.toFixed(1);
  }

  // 2. Identify manual bases and slot numbers to check
  const manualBasesText = manualBasesInput ? manualBasesInput.value : "";
  const manualBases = manualBasesText.match(/\d{1,3}/g) || [];

  const baseNumbers = [];
  
  // Slots
  for (let i = 1; i <= 6; i++) {
    if (slots[i] !== null && slots[i] !== undefined) {
      baseNumbers.push(slots[i]);
    }
  }

  // Grid selections
  selectedNumbers.forEach(n => baseNumbers.push(n));

  // Manual inputs
  manualBases.forEach(n => baseNumbers.push(n));

  // If no base/slot numbers are provided, return early with message
  if (baseNumbers.length === 0) {
    outputText.textContent = "Saved Slots में number save करें, फिर Cutting निकालें।";
    cuttingActiveNumbers.clear();
    updateGridCuttingUI();
    return;
  }

  // 3. Generate candidate numbers from bases
  const candidates = generateCandidates(baseNumbers);

  // 4. Process threshold cutting (Amount - Threshold) and round it
  const results = [];
  const notFound = [];
  cuttingActiveNumbers.clear();
  
  candidates.forEach(numStr => {
    let originalAmount = currentTable[numStr];
    if (originalAmount === undefined && numStr === "100") {
      originalAmount = currentTable["00"];
    } else if (originalAmount === undefined && numStr === "00") {
      originalAmount = currentTable["100"];
    }

    if (originalAmount === undefined || originalAmount === null) {
      notFound.push(numStr);
      return;
    }

    // Numbers that exceed the risk threshold limit
    if (originalAmount > threshold) {
      const cuttingAmount = originalAmount - threshold;
      const roundedAmount = roundFigure(cuttingAmount);
      
      if (roundedAmount > 0) {
        results.push({
          number: numStr,
          roundedAmount: roundedAmount
        });
        cuttingActiveNumbers.add(numStr);
      }
    }
  });

  // Visually highlight all cutting-active cells in green on the 10x10 grid
  updateGridCuttingUI();

  // 5. Sort results by rounded cutting amount descending, then by number ascending
  results.sort((a, b) => b.roundedAmount - a.roundedAmount || Number(a.number) - Number(b.number));

  // 6. Format outputs
  const outputLines = [];
  let grandTotal = 0;

  for (const item of results) {
    outputLines.push(`${item.number} = ${item.roundedAmount}`);
    grandTotal += item.roundedAmount;
  }

  outputLines.push("", `GRAND TOTAL = ${grandTotal}`);

  if (notFound.length > 0) {
    outputLines.push("", `NOT FOUND = ${notFound.sort().join(", ")}`);
  }

  // 7. Display results
  outputText.textContent = outputLines.join("\n");
  logConsole(`Cutting completed using automatic Limit = ${threshold.toFixed(1)}. Found ${results.length} active candidate numbers.`);
}

// Copy results to clipboard
function copyOutputToClipboard() {
  const text = outputText.textContent;
  if (!text || text.startsWith("Saved Slots")) {
    logConsole("Nothing to copy!");
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => {
      logConsole("RESULTS COPIED TO CLIPBOARD!");
      const copyBtn = document.getElementById("btn-copy-output");
      const originalText = copyBtn.innerHTML;
      copyBtn.textContent = "✓ Results Copied!";
      copyBtn.style.backgroundColor = "var(--success)";
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.style.backgroundColor = "";
      }, 1500);
    })
    .catch(err => {
      console.error("Copy error: ", err);
      logConsole("Failed to copy results.");
    });
}

// Handle image upload and trigger OCR scan automatically
function handleImageUpload(file) {
  if (!file.type.startsWith("image/")) {
    logConsole("Error: Uploaded file is not an image.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.src = e.target.result;
    previewContainer.style.display = "block";
    
    logConsole("Image loaded. Automatically scanning with OCR...");
    runImageOCR();
  };
  reader.readAsDataURL(file);
}

// Reset image uploads
function removeUploadedImage() {
  imagePreview.src = "";
  previewContainer.style.display = "none";
  fileInput.value = "";
  logConsole("Image removed.");
}

// OCR scanning implementation
function runImageOCR() {
  const imageSrc = imagePreview.src;
  if (!imageSrc) return;

  ocrLoader.style.display = "flex";
  ocrProgress.textContent = "Starting auto-scan engine...";

  Tesseract.recognize(
    imageSrc,
    'eng',
    {
      logger: m => {
        if (m.status === 'recognizing') {
          ocrProgress.textContent = `Scanning: ${(m.progress * 100).toFixed(0)}%`;
        }
      }
    }
  )
  .then(({ data: { text } }) => {
    ocrLoader.style.display = "none";
    logConsole("Scan finished. Parsing numbers...");
    parseOCRText(text);
  })
  .catch(err => {
    ocrLoader.style.display = "none";
    console.error("OCR Failed:", err);
    logConsole("OCR Scan failed. Please paste text table manually.");
  });
}

// OCR text parser
function parseOCRText(text) {
  const lines = text.split("\n");
  const parsed = [];
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const match = line.match(/\b(0\d|\d{1,3})\b[\s=:\-\|]+(\d{2,5})\b/);
    if (match) {
      const numVal = parseInt(match[1], 10);
      const amtVal = parseFloat(match[2]);
      
      if (numVal >= 0 && numVal <= 100 && !isNaN(amtVal)) {
        parsed.push({ num: numVal, amt: amtVal });
      }
    }
  }

  const finalParsed = {};
  parsed.forEach(item => {
    const formattedNum = formatNumber(item.num);
    finalParsed[formattedNum] = item.amt;
  });

  const count = Object.keys(finalParsed).length;
  if (count > 0) {
    let rawText = "";
    for (let i = 1; i <= 100; i++) {
      const key = formatNumber(i);
      if (finalParsed[key] !== undefined) {
        rawText += `${key}=${finalParsed[key]}\n`;
      }
    }
    tableRawInput.value = rawText.trim();
    handleTableRawInput();
    logConsole(`SUCCESS: Auto-scanned ${count} numbers from image.`);
  } else {
    logConsole("OCR Scan warning: No clear cell numbers found. Try pasting table text instead.");
  }
}

// Log status console messages
function logConsole(msg, isInfo = false) {
  if (!consoleOutput) return;
  consoleOutput.className = isInfo ? "console-box info" : "console-box";
  consoleOutput.innerHTML = `<span>⚙️</span> ${msg}`;
}
