// Global Debug Console for catching errors
window.addEventListener('error', (event) => {
  showDebugError(`Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
});
window.addEventListener('unhandledrejection', (event) => {
  showDebugError(`Promise Rejection: ${event.reason}`);
});

function showDebugError(msg) {
  console.error(msg);
  let debugDiv = document.getElementById('debugConsole');
  if (!debugDiv) {
    debugDiv = document.createElement('div');
    debugDiv.id = 'debugConsole';
    debugDiv.style.position = 'fixed';
    debugDiv.style.bottom = '10px';
    debugDiv.style.left = '10px';
    debugDiv.style.right = '10px';
    debugDiv.style.maxHeight = '150px';
    debugDiv.style.overflowY = 'auto';
    debugDiv.style.background = 'rgba(239, 68, 68, 0.95)';
    debugDiv.style.color = '#fff';
    debugDiv.style.padding = '10px';
    debugDiv.style.borderRadius = '8px';
    debugDiv.style.fontSize = '12px';
    debugDiv.style.fontFamily = 'monospace';
    debugDiv.style.zIndex = '9999';
    debugDiv.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.float = 'right';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'transparent';
    closeBtn.style.color = '#fff';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.onclick = () => debugDiv.remove();
    debugDiv.appendChild(closeBtn);
    
    document.body.appendChild(debugDiv);
  }
  const p = document.createElement('p');
  p.textContent = msg;
  p.style.margin = '3px 0';
  debugDiv.appendChild(p);
  debugDiv.scrollTop = debugDiv.scrollHeight;
}

// Application State
const state = {
  employee: {
    name: '',
    id: '',
    month: '',
    travelAdvance: 0
  },
  ai: {
    apiKey: '',
    provider: 'gemini', // 'gemini' or 'groq'
    useAi: false,
    alwaysUseAi: false,
    model: 'gemini-1.5-flash'
  },
  activeTab: 'phoneBroadband',
  phoneBroadband: [],
  travel: [],
  food: []
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Set default month to current month
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  state.employee.month = `${year}-${month}`;
  
  const claimMonthInput = document.getElementById('claimMonth');
  if (claimMonthInput) {
    claimMonthInput.value = state.employee.month;
  }

  // Load AI Settings from localStorage
  state.ai.apiKey = localStorage.getItem('gemini_api_key') || '';
  state.ai.provider = detectProvider(state.ai.apiKey);
  state.ai.alwaysUseAi = localStorage.getItem('always_use_ai') === 'true';
  
  // If alwaysUseAi is true, useAi must be enabled as well
  if (state.ai.alwaysUseAi) {
    state.ai.useAi = true;
    localStorage.setItem('use_ai_parser', 'true');
  } else {
    state.ai.useAi = localStorage.getItem('use_ai_parser') === 'true';
  }
  
  state.ai.model = localStorage.getItem('gemini_selected_model') || 'gemini-1.5-flash';

  const geminiApiKeyInput = document.getElementById('geminiApiKey');
  const useAiParserCheckbox = document.getElementById('useAiParser');
  const alwaysUseAiCheckbox = document.getElementById('alwaysUseAi');

  if (geminiApiKeyInput) {
    geminiApiKeyInput.value = state.ai.apiKey;
  }
  if (useAiParserCheckbox) {
    useAiParserCheckbox.checked = state.ai.useAi;
  }
  if (alwaysUseAiCheckbox) {
    alwaysUseAiCheckbox.checked = state.ai.alwaysUseAi;
  }

  // Update parser status badge initially
  updateParserStatusBadge();

  // Set up event listeners
  setupEventListeners();

  // Render initial tables
  renderAll();
});

// Setup Event Listeners
function setupEventListeners() {
  // Employee Info inputs
  const empName = document.getElementById('empName');
  const empId = document.getElementById('empId');
  const claimMonth = document.getElementById('claimMonth');
  const travelAdvance = document.getElementById('travelAdvance');

  if (empName) {
    empName.addEventListener('input', (e) => {
      state.employee.name = e.target.value;
      updateSummary();
    });
  }
  if (empId) {
    empId.addEventListener('input', (e) => {
      state.employee.id = e.target.value;
    });
  }
  if (claimMonth) {
    claimMonth.addEventListener('change', (e) => {
      state.employee.month = e.target.value;
    });
  }
  if (travelAdvance) {
    travelAdvance.addEventListener('input', (e) => {
      state.employee.travelAdvance = parseFloat(e.target.value) || 0;
      updateSummary();
    });
  }

  // AI Settings inputs
  const geminiApiKey = document.getElementById('geminiApiKey');
  const useAiParser = document.getElementById('useAiParser');
  const toggleApiKeyVisibility = document.getElementById('toggleApiKeyVisibility');

  if (geminiApiKey) {
    geminiApiKey.addEventListener('input', (e) => {
      state.ai.apiKey = e.target.value.trim();
      localStorage.setItem('gemini_api_key', state.ai.apiKey);
      updateParserStatusBadge();
    });
  }

  if (useAiParser) {
    useAiParser.addEventListener('change', (e) => {
      state.ai.useAi = e.target.checked;
      if (state.ai.useAi && !state.ai.apiKey) {
        showToast('Please enter a Gemini API Key to enable AI parsing.', 'error');
      }
      localStorage.setItem('use_ai_parser', state.ai.useAi);
      updateParserStatusBadge();
    });
  }

  const alwaysUseAi = document.getElementById('alwaysUseAi');
  if (alwaysUseAi) {
    alwaysUseAi.addEventListener('change', (e) => {
      state.ai.alwaysUseAi = e.target.checked;
      localStorage.setItem('always_use_ai', state.ai.alwaysUseAi);
      if (state.ai.alwaysUseAi && !state.ai.useAi) {
        // Automatically enable Gemini AI Parser if they check this box
        state.ai.useAi = true;
        localStorage.setItem('use_ai_parser', 'true');
        const useAiParserCheckbox = document.getElementById('useAiParser');
        if (useAiParserCheckbox) {
          useAiParserCheckbox.checked = true;
        }
        updateParserStatusBadge();
      }
    });
  }

  if (toggleApiKeyVisibility && geminiApiKey) {
    toggleApiKeyVisibility.addEventListener('click', () => {
      if (geminiApiKey.type === 'password') {
        geminiApiKey.type = 'text';
        toggleApiKeyVisibility.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      } else {
        geminiApiKey.type = 'password';
        toggleApiKeyVisibility.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
      }
    });
  }

  const btnTestApiKey = document.getElementById('btnTestApiKey');
  if (btnTestApiKey) {
    btnTestApiKey.addEventListener('click', async () => {
      const keys = getApiKeys();
      if (keys.length === 0) {
        showToast('Please enter an API Key to test.', 'error');
        return;
      }

      btnTestApiKey.disabled = true;
      btnTestApiKey.textContent = 'Testing...';
      btnTestApiKey.className = 'btn-test-key'; // Reset classes

      try {
        const key = keys[0];
        const provider = detectProvider(key);
        let label = '';
        if (provider === 'groq') {
          label = await testGroqApiKey(key);
        } else if (provider === 'cerebras') {
          label = await testCerebrasApiKey(key);
        } else if (provider === 'huggingface') {
          label = await testHuggingFaceApiKey(key);
        } else if (provider === 'openai') {
          label = await testOpenAIApiKey(key);
        } else if (provider === 'claude') {
          label = await testClaudeApiKey(key);
        } else {
          label = await testGeminiApiKey(key);
        }
        const providerNames = { gemini: 'Gemini', groq: 'Groq', openai: 'OpenAI', claude: 'Claude', cerebras: 'Cerebras', huggingface: 'Hugging Face' };
        if (label) {
          btnTestApiKey.textContent = `Connection OK (${label})`;
          btnTestApiKey.classList.add('success');
          showToast(`${providerNames[provider]} API Key is valid! Model: ${label}`, 'success');
          updateParserStatusBadge();
        } else {
          btnTestApiKey.textContent = 'Connection Failed';
          btnTestApiKey.classList.add('error');
          showToast('API Key validation failed.', 'error');
        }
      } catch (err) {
        btnTestApiKey.textContent = 'Connection Failed';
        btnTestApiKey.classList.add('error');
        showToast(`API Key test failed: ${err.message}`, 'error');
        showDebugError(`API test error: ${err.message}`);
      } finally {
        setTimeout(() => {
          btnTestApiKey.disabled = false;
          btnTestApiKey.textContent = 'Test Connection';
          btnTestApiKey.className = 'btn-test-key';
        }, 5000);
      }
    });
  }

  // Drag and Drop Zone setup
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');

  if (dropZone && fileInput) {
    // Click on dropzone triggers file input
    dropZone.addEventListener('click', () => {
      fileInput.click();
    });

    // Prevent defaults for drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
    });

    // Visual indicators
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('dragover');
      }, false);
    });

    // Drop handler
    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      handleFiles(files);
    });

    // File input change handler
    fileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      // Reset the file input value so that selecting the same file again triggers the change event
      fileInput.value = '';
    });
  }

  // Set up the Token Estimator logic
  setupEstimator();
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// Helper to check if file is an image
function isImageFile(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext);
}

// Helper to check if filename is generic (e.g. IMG_1234, screenshot, whatsapp image)
function isGenericFilename(filename) {
  const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;
  const genericPatterns = [
    /^img[-_]?\d+/i,
    /^screenshot/i,
    /^whatsapp\s*image/i,
    /^image/i,
    /^photo/i,
    /^\d{8,}/ // purely numbers (like timestamps)
  ];
  return genericPatterns.some(pattern => pattern.test(baseName));
}

// Helper to get formatted file modification date
function getFormattedFileDate(file) {
  let fileDate = '';
  if (file.lastModified) {
    const d = new Date(file.lastModified);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    fileDate = `${y}-${m}-${day}`;
  } else {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    fileDate = `${y}-${m}-${day}`;
  }
  return fileDate;
}

// OCR Loading Overlay togglers
function showOcrOverlay(show) {
  const overlay = document.getElementById('ocrOverlay');
  if (overlay) {
    if (show) {
      overlay.classList.add('show');
    } else {
      overlay.classList.remove('show');
    }
  }
}

function updateOcrProgress(percent, statusText) {
  const progressFill = document.getElementById('ocrProgressFill');
  const textEl = document.getElementById('ocrStatusText');
  if (progressFill) progressFill.style.width = `${percent}%`;
  if (textEl) textEl.textContent = statusText;
}

// Run Tesseract OCR on source (Image URL or Canvas)
async function runOcrOnSource(source, progressCallback) {
  if (typeof Tesseract === 'undefined') {
    throw new Error('Tesseract library is not loaded');
  }
  const progressFn = progressCallback || updateOcrProgress;
  const result = await Tesseract.recognize(
    source,
    'eng',
    {
      logger: m => {
        if (m.status === 'recognizing text') {
          const pct = Math.round(m.progress * 100);
          progressFn(pct, `Scanning image contents: ${pct}%`);
        } else {
          // Capitalize status string for clean display
          const statusStr = m.status.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          progressFn(15, `${statusStr}...`);
        }
      }
    }
  );
  return result?.data?.text || '';
}

// Run Tesseract OCR on File object and return raw text
async function runOcrOnFile(file, progressCallback) {
  if (typeof Tesseract === 'undefined') {
    showToast('Tesseract.js OCR library not loaded!', 'error');
    throw new Error('Tesseract.js library is not loaded. The CDN connection might have been blocked or interrupted.');
  }

  let imageUrl = '';
  try {
    imageUrl = URL.createObjectURL(file);
    const text = await runOcrOnSource(imageUrl, progressCallback);
    return text;
  } catch (err) {
    console.error('Tesseract recognition error:', err);
    throw err;
  } finally {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
  }
}

// Extract text from PDF (uses pdf.js for text stream, renders to canvas if scanned)
async function extractTextFromPdf(file, progressCallback) {
  if (typeof pdfjsLib === 'undefined') {
    showToast('PDF library not loaded!', 'error');
    throw new Error('pdf.js library is not loaded. The CDN connection might have been blocked or interrupted.');
  }

  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

  const progressFn = progressCallback || updateOcrProgress;
  progressFn(5, 'Loading PDF document...');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  progressFn(15, `Parsing PDF (0/${pdf.numPages} pages)...`);
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    let pageText = textContent.items.map(item => item.str).join(' ');
    
    // Check if the page is likely a scanned PDF (very low text content)
    if (pageText.trim().length < 20) {
      progressFn(30, `Scanned page detected. Rendering page ${i} of ${pdf.numPages}...`);
      
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      
      progressFn(45, `Running OCR on page ${i} of ${pdf.numPages}...`);
      const ocrText = await runOcrOnSource(canvas, progressCallback);
      pageText = ocrText;
    }
    
    fullText += pageText + '\n';
    const progressPercent = Math.round((i / pdf.numPages) * 100);
    updateOcrProgress(progressPercent, `Parsing page ${i}/${pdf.numPages}...`);
  }

  return fullText;
}

// Heuristically extract date from text
function extractDateFromText(text) {
  if (!text) return null;
  
  // Regex patterns for common date formats
  // 1. DD/MM/YYYY or DD-MM-YYYY (e.g. 18/06/2026, 18-06-2026)
  const dmyRegex = /\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})\b/;
  // 2. YYYY/MM/DD or YYYY-MM-DD (e.g. 2026/06/18, 2026-06-18)
  const ymdRegex = /\b(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})\b/;
  // 3. DD MMM YYYY (e.g. 18 Jun 2026, 18-Jun-2026, 18/Jun/2026)
  const dMmmYRegex = /\b(\d{1,2})[\/\.-\s]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\/\.-\s]+(\d{4})\b/i;

  const textLower = text.toLowerCase();

  // Try DD MMM YYYY first as it is very common on invoices and unambiguous
  let match = textLower.match(dMmmYRegex);
  if (match) {
    const day = parseInt(match[1]);
    const monthStr = match[2];
    const year = parseInt(match[3]);
    const months = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };
    const month = months[monthStr.substring(0, 3)];
    if (month && day >= 1 && day <= 31 && year > 2000 && year < 2100) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Try YYYY-MM-DD
  match = text.match(ymdRegex);
  if (match) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year > 2000 && year < 2100) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Try DD/MM/YYYY
  match = text.match(dmyRegex);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    const year = parseInt(match[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year > 2000 && year < 2100) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    // If month > 12 but day <= 12, they might be swapped
    if (day >= 1 && day <= 12 && month >= 1 && month <= 31 && year > 2000 && year < 2100) {
      return `${year}-${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`;
    }
  }

  return null;
}

// Heuristic bill text parser to extract merchant & amount
function parseOcrText(text) {
  const cleanText = text.toLowerCase();
  
  // 1. Merchant Extraction
  let description = '';
  const merchants = [
    { key: 'zomato', label: 'Zomato Food Bill' },
    { key: 'swiggy', label: 'Swiggy Food Bill' },
    { key: 'blinkit', label: 'Blinkit Delivery' },
    { key: 'blink', label: 'Blinkit' },
    { key: 'uber', label: 'Uber Ride' },
    { key: 'ola', label: 'Ola Cab Ride' },
    { key: 'kfc', label: 'KFC Restaurant' },
    { key: 'mcdonald', label: 'McDonalds Order' },
    { key: 'starbucks', label: 'Starbucks Coffee' },
    { key: 'airtel', label: 'Airtel Broadband' },
    { key: 'jio', label: 'Jio Mobile/Broadband' },
    { key: 'act fibernet', label: 'ACT Broadband' },
    { key: 'dunzo', label: 'Dunzo Delivery' },
    { key: 'pizza hut', label: 'Pizza Hut Order' },
    { key: 'domino', label: 'Dominos Pizza' }
  ];
  
  for (const m of merchants) {
    if (cleanText.includes(m.key)) {
      description = m.label;
      break;
    }
  }
  
  // Fallback for Merchant: use first readable header line
  if (!description) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2 && /[a-zA-Z]/.test(l));
    if (lines.length > 0) {
      const cleanLine = lines[0].replace(/[^a-zA-Z0-9\s]/g, '').trim();
      description = cleanLine.split(/\s+/).slice(0, 4).join(' ');
      if (description.length > 30) description = description.substring(0, 27) + '...';
    }
  }
  
  if (!description) {
    description = 'Expense Bill';
  }
  
  // 2. Amount Extraction using the Word-Boundary Scoring System
  let amount = 0.00;
  const candidates = [];
  const lines = text.split('\n');
  
  // Define regex word boundary patterns for scoring/penalizing
  const primaryTotalRegex = /\b(grand total|total amount|net payable|amount payable|total payable|net amount|amount paid|total fare paid|total to pay|total paid)\b/i;
  const secondaryTotalRegex = /\b(total|payable|paid)\b/i;
  const tertiaryTotalRegex = /\b(amount|net|charge)\b/i;
  const subtotalRegex = /\b(subtotal|sub-total)\b/i;
  const currencyRegex = /(₹|rs\.?|inr|\$)/i;
  
  const penaltyDateRegex = /\b(date|time|at)\b/i;
  const penaltyIdRegex = /\b(id|no\.?|number|invoice|order|account|txn|transaction)\b/i;
  const penaltyTaxRegex = /\b(tax|gst|cgst|sgst|vat|discount|less|promo)\b/i;
  const penaltyQtyRegex = /\b(qty|quantity|items|item|pcs|pieces|count|nos|pack|packs)\b/i;

  lines.forEach(line => {
    const lineLower = line.toLowerCase();
    
    // Find all numbers in the line (supporting commas and decimals)
    const matches = lineLower.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/g);
    if (matches) {
      matches.forEach(matchStr => {
        const val = parseFloat(matchStr.replace(/,/g, ''));
        if (isNaN(val) || val <= 0) return;
        
        // Skip common years to prevent them from scoring
        if (val === 2024 || val === 2025 || val === 2026 || val === 2027) return;

        // Skip very small values like quantities (1, 2, 7) entirely
        if (val < 10) return;

        let score = 0;

        // Condition 1: Primary Grand Total keywords (High score)
        if (primaryTotalRegex.test(lineLower)) {
          score += 100;
        } 
        // Condition 2: Secondary Total keywords
        else if (secondaryTotalRegex.test(lineLower)) {
          score += 80;
        } 
        // Condition 3: Tertiary keywords
        else if (tertiaryTotalRegex.test(lineLower)) {
          score += 50;
        } 
        // Condition 4: Subtotal keyword (Lower priority total)
        else if (subtotalRegex.test(lineLower)) {
          score += 35;
        }

        // Condition 5: Currency symbols present in the line (Confidence booster)
        if (currencyRegex.test(lineLower)) {
          score += 20;
        }

        // Condition 6: Decimals present (Confidence booster - totals usually have .00 or .xx)
        if (matchStr.includes('.')) {
          score += 15;
        }

        // Penalty 1: Date/Time patterns
        if (penaltyDateRegex.test(lineLower) || lineLower.includes('@')) {
          score -= 45;
        }

        // Penalty 2: Order IDs, invoice IDs, account details (High penalty)
        if (penaltyIdRegex.test(lineLower)) {
          score -= 65;
        }

        // Penalty 3: Taxes/discounts (we want the grand total, not the parts)
        if (penaltyTaxRegex.test(lineLower)) {
          score -= 35;
        }

        // Penalty 4: Quantity and items count (we want values, not piece counts)
        if (penaltyQtyRegex.test(lineLower)) {
          score -= 70;
        }

        // Filter: Ignore unrealistically large amounts for single expense bills
        if (val > 60000) {
          score = -100;
        }

        candidates.push({
          value: val,
          score: score,
          line: line.trim()
        });
      });
    }
  });

  // Sort candidates by score descending, then by value descending (larger total wins in case of score ties)
  if (candidates.length > 0) {
    candidates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.value - a.value;
    });

    if (candidates[0].score > -10) {
      amount = candidates[0].value;
    } else {
      // Fallback: if all candidates are highly penalized, pick the largest number < 15000
      const reasonable = candidates.filter(c => c.value < 15000);
      if (reasonable.length > 0) {
        reasonable.sort((a, b) => b.value - a.value);
        amount = reasonable[0].value;
      }
    }
  }

  // Capitalize description words
  description = description.replace(/\b\w/g, c => c.toUpperCase());
  
  return { description, amount, date: extractDateFromText(text) };
}

// Parse OCR/extracted text using Gemini AI API
// Convert file to Base64 helper
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64Str = reader.result.split(',')[1];
      resolve(base64Str);
    };
    reader.onerror = error => reject(error);
  });
}

// Map extensions to mime types
function getMimeTypeFromExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'application/octet-stream';
}

// A simple JSON repair helper for common LLM syntax issues (truncations/unescaped chars)
function repairJsonString(jsonStr) {
  let repaired = jsonStr.trim();
  
  // 1. If it's unterminated (e.g. truncated), try to close open quotes/brackets/braces
  let openQuotes = false;
  let braces = 0;
  let brackets = 0;
  
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (char === '"' && repaired[i-1] !== '\\') {
      openQuotes = !openQuotes;
    } else if (!openQuotes) {
      if (char === '{') braces++;
      else if (char === '}') braces--;
      else if (char === '[') brackets++;
      else if (char === ']') brackets--;
    }
  }
  
  if (openQuotes) {
    repaired += '"';
  }
  while (brackets > 0) {
    repaired += ']';
    brackets--;
  }
  while (braces > 0) {
    repaired += '}';
    braces--;
  }
  
  // 2. Remove unescaped control characters (newlines, tabs) inside string values
  let parsedRepaired = "";
  let insideStr = false;
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (char === '"' && repaired[i-1] !== '\\') {
      insideStr = !insideStr;
      parsedRepaired += char;
    } else if (insideStr) {
      if (char === '\n') {
        parsedRepaired += '\\n';
      } else if (char === '\r') {
        parsedRepaired += '\\r';
      } else if (char === '\t') {
        parsedRepaired += '\\t';
      } else {
        parsedRepaired += char;
      }
    } else {
      parsedRepaired += char;
    }
  }
  
  return parsedRepaired;
}

// Extract outer JSON object or array from a string, stripping markdown blocks if present
function extractJsonFromString(str) {
  if (!str) return '';
  let cleaned = str.trim();

  // 1. Remove markdown code blocks if present
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = cleaned.match(codeBlockRegex);
  if (match) {
    cleaned = match[1].trim();
  }

  // 2. Extract outer JSON object or array structure
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = cleaned.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = cleaned.lastIndexOf(']');
  }

  if (startIdx !== -1) {
    if (endIdx !== -1 && endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    } else {
      cleaned = cleaned.substring(startIdx);
    }
  }

  // 3. Repair common JSON malformations or truncations
  return repairJsonString(cleaned);
}

const BILL_PARSER_CRITICAL_INSTRUCTIONS = `CRITICAL INSTRUCTIONS FOR AMOUNT EXTRACTION (MULTIPLE TOTALS HANDLING):
1. ALWAYS extract the final, absolute grand total paid or payable by the customer. Look for terms like: "Grand Total", "Total", "Net Payable", "Amount Paid", "Total Fare", "Total Amount", "Amount Payable", "Net Amount", "Total to pay", "Paid", "Total Due".
2. If there are multiple totals mentioned in the bill:
   - Do NOT extract the itemized subtotal (which excludes taxes, packaging, delivery charges, or platform fees). Always look for the final total that INCLUDES all fees, service charges, packaging, and taxes.
   - Do NOT extract total tax values (e.g. CGST, SGST, IGST, VAT totals) or summary tax totals.
   - If a discount, coupon, or credit is applied, extract the final post-discount Net Payable amount actually charged (e.g. if "Subtotal: 500", "Discount: 100", "Total Paid: 400" -> extract 400, not 500).
   - If the bill contains cash breakdown (e.g. "Cash Paid: 1000", "Change: 200", "Total Bill: 800"), extract the actual "Total Bill" or "Net Payable" (800), not the cash paid or change returned.
   - Do NOT extract "Previous Balance", "Outstanding Balance", "Due from Last Month", or "Advance Balance". Only extract the current transaction/billing cycle amount.
3. Ignore quantities, phone numbers, invoice/receipt reference numbers, year numbers (e.g. 2026), and tax registration percentages/numbers when extracting the amount.
4. Ensure the amount is returned as a number (float/double), not a string.`;

// Parse raw file directly using Gemini AI API (multimodal)
async function parseFileWithGemini(base64Data, mimeType, apiKey) {
  const model = state.ai.model || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `You are an expert financial auditor specialized in receipt and invoice parsing.
Analyze the attached document (PDF or image) and extract:
1. "description": The merchant or service provider name (e.g. "Zomato", "Uber", "Swiggy", "Airtel Broadband", "Ola Cabs", etc. and format it as "Zomato Food Bill", "Uber Ride", "Airtel Broadband" etc. depending on the merchant). Make it title-cased. Limit to 3-4 words.
2. "amount": The final total amount paid or payable (as a floating-point number, e.g. 345.00).
3. "date": The transaction, bill, or invoice date (string, in YYYY-MM-DD format, e.g. "2026-06-18"). Search for billing date, invoice date, payment date, trip date. If no date is found or it's ambiguous, return null.

${BILL_PARSER_CRITICAL_INSTRUCTIONS}

Return ONLY a valid JSON object matching the schema below:
{
  "description": string,
  "amount": number,
  "date": string or null
}

Do not include any explanation or markdown formatting (like \`\`\`json). Just return the raw JSON object.`;

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP ${response.status}`;
    
    // Self-healing model discovery retry
    if (errMsg.includes('not found') || errMsg.includes('not supported') || errMsg.includes('Model')) {
      console.warn("Requested model not found. Attempting to discover available models...");
      try {
        const discoveredModel = await discoverBestModel(apiKey);
        state.ai.model = discoveredModel;
        localStorage.setItem('gemini_selected_model', discoveredModel);
        console.log(`Discovered best model: ${discoveredModel}. Retrying parser...`);
        return await parseFileWithGemini(base64Data, mimeType, apiKey);
      } catch (discoveryErr) {
        console.error("Model discovery during retry failed:", discoveryErr);
      }
    }
    throw new Error(errMsg);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("No response content from Gemini API");
  }

  let parsed;
  try {
    const cleanedText = extractJsonFromString(rawText);
    parsed = JSON.parse(cleanedText);
    if (Array.isArray(parsed)) {
      parsed = parsed[0];
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new Error("Result is not a valid JSON object");
    }
  } catch (parseErr) {
    console.error("Failed to parse Gemini response as JSON. Raw text was:", rawText);
    throw new Error(`Invalid JSON response from model: ${parseErr.message}`);
  }

  if (typeof parsed.amount !== 'number') {
    parsed.amount = parseFloat(parsed.amount) || 0;
  }

  // Validate date format (YYYY-MM-DD)
  let extractedDate = null;
  if (parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
    extractedDate = parsed.date;
  }

  return {
    description: parsed.description || 'Expense Bill',
    amount: parsed.amount || 0.00,
    date: extractedDate
  };
}

// Test if the Gemini API Key is working by listing available models and selecting the best one
// Detect which AI provider the key belongs to based on its prefix
function detectProvider(key) {
  if (!key) return 'gemini';
  if (key.startsWith('gsk_')) return 'groq';
  if (key.startsWith('csk-')) return 'cerebras';
  if (key.startsWith('hf_')) return 'huggingface';
  if (key.startsWith('sk-ant-')) return 'claude';
  if (key.startsWith('sk-')) return 'openai';
  return 'gemini';
}

// Test Groq API key validity
async function testGroqApiKey(apiKey) {
  const url = 'https://api.groq.com/openai/v1/models';
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP ${response.status}`;
    throw new Error(`Groq key validation failed: ${errMsg}`);
  }
  const data = await response.json();
  // Pick a preferred fast model
  const preferred = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'llama3-8b-8192', 'mixtral-8x7b-32768'];
  const found = data.data?.find(m => preferred.includes(m.id));
  const model = found ? found.id : data.data?.[0]?.id || 'groq-model';
  state.ai.provider = 'groq';
  state.ai.model = model;
  localStorage.setItem('ai_provider', 'groq');
  localStorage.setItem('gemini_selected_model', model);
  return model;
}

// Parse extracted text using Groq (text-only, no vision)
async function parseTextWithGroq(extractedText, apiKey) {
  const model = state.ai.model || 'llama-3.1-8b-instant';
  const prompt = `You are an expense bill parser. Extract the total amount, date, and vendor/description from the following bill text.
Return ONLY a valid JSON object with this exact format:
{"amount": <number>, "date": "<YYYY-MM-DD or null>", "description": "<vendor or expense name>"}

${BILL_PARSER_CRITICAL_INSTRUCTIONS}

Bill text:
${extractedText.substring(0, 4000)}`;

  const response = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 512
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Groq HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('No response from Groq');

  let parsed;
  try {
    const cleanedText = extractJsonFromString(rawText);
    parsed = JSON.parse(cleanedText);
    if (Array.isArray(parsed)) {
      parsed = parsed[0];
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new Error("Result is not a valid JSON object");
    }
  } catch (e) {
    throw new Error(`Invalid JSON from Groq: ${e.message}`);
  }

  if (typeof parsed.amount !== 'number') parsed.amount = parseFloat(parsed.amount) || 0;
  let extractedDate = null;
  if (parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) extractedDate = parsed.date;

  return {
    description: parsed.description || 'Expense Bill',
    amount: parsed.amount,
    date: extractedDate
  };
}

// ── Hugging Face ─────────────────────────────────────────────────────────────
async function testHuggingFaceApiKey(apiKey) {
  const targetUrl = 'https://router.huggingface.co/v1/chat/completions';
  const proxyUrl = `https://proxy.corsfix.com/?url=${encodeURIComponent(targetUrl)}`;
  
  // Use the OpenAI-compatible router to test with a small request
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || err.error || `Hugging Face HTTP ${response.status}`);
  }
  const model = 'Qwen/Qwen2.5-7B-Instruct';
  state.ai.provider = 'huggingface';
  state.ai.model = model;
  localStorage.setItem('ai_provider', 'huggingface');
  localStorage.setItem('gemini_selected_model', model);
  return model;
}

async function parseTextWithHuggingFace(extractedText, apiKey) {
  const model = state.ai.model || 'Qwen/Qwen2.5-7B-Instruct';
  const prompt = `You are an expense bill parser. Extract the total amount, date, and vendor/description from the following bill text.
Return ONLY a valid JSON object with this exact format:
{"amount": <number>, "date": "<YYYY-MM-DD or null>", "description": "<vendor or expense name>"}

${BILL_PARSER_CRITICAL_INSTRUCTIONS}

Bill text:
${extractedText.substring(0, 3000)}`;

  const targetUrl = 'https://router.huggingface.co/v1/chat/completions';
  const proxyUrl = `https://proxy.corsfix.com/?url=${encodeURIComponent(targetUrl)}`;

  const response = await fetchWithRetry(proxyUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 512
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || err.error || `Hugging Face HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('No response from Hugging Face');

  let parsed;
  try {
    const cleanedText = extractJsonFromString(rawText);
    parsed = JSON.parse(cleanedText);
    if (Array.isArray(parsed)) {
      parsed = parsed[0];
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new Error("Result is not a valid JSON object");
    }
  } catch (e) {
    throw new Error(`Invalid JSON from Hugging Face: ${e.message}`);
  }

  if (typeof parsed.amount !== 'number') parsed.amount = parseFloat(parsed.amount) || 0;
  let extractedDate = null;
  if (parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) extractedDate = parsed.date;

  return {
    description: parsed.description || 'Expense Bill',
    amount: parsed.amount,
    date: extractedDate
  };
}

// ── Cerebras ─────────────────────────────────────────────────────────────────
async function testCerebrasApiKey(apiKey) {
  const response = await fetch('https://api.cerebras.ai/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Cerebras HTTP ${response.status}`);
  }
  const data = await response.json();
  const preferred = ['llama-3.3-70b', 'llama3.1-70b', 'llama3.1-8b', 'llama-4-scout-17b-16e-instruct'];
  const found = data.data?.find(m => preferred.includes(m.id));
  const model = found ? found.id : data.data?.[0]?.id || 'llama-3.3-70b';
  state.ai.provider = 'cerebras';
  state.ai.model = model;
  localStorage.setItem('ai_provider', 'cerebras');
  localStorage.setItem('gemini_selected_model', model);
  return model;
}

async function parseTextWithCerebras(extractedText, apiKey) {
  const model = state.ai.model || 'llama-3.3-70b';
  const prompt = `You are an expense bill parser. Extract the total amount, date, and vendor/description from the following bill text.
Return ONLY a valid JSON object with this exact format:
{"amount": <number>, "date": "<YYYY-MM-DD or null>", "description": "<vendor or expense name>"}

${BILL_PARSER_CRITICAL_INSTRUCTIONS}

Bill text:
${extractedText.substring(0, 4000)}`;

  const response = await fetchWithRetry('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 512
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Cerebras HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('No response from Cerebras');

  let parsed;
  try {
    const cleanedText = extractJsonFromString(rawText);
    parsed = JSON.parse(cleanedText);
    if (Array.isArray(parsed)) {
      parsed = parsed[0];
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new Error("Result is not a valid JSON object");
    }
  } catch (e) {
    throw new Error(`Invalid JSON from Cerebras: ${e.message}`);
  }

  if (typeof parsed.amount !== 'number') parsed.amount = parseFloat(parsed.amount) || 0;
  let extractedDate = null;
  if (parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) extractedDate = parsed.date;

  return {
    description: parsed.description || 'Expense Bill',
    amount: parsed.amount,
    date: extractedDate
  };
}

// ── OpenAI ──────────────────────────────────────────────────────────────────
async function testOpenAIApiKey(apiKey) {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI HTTP ${response.status}`);
  }
  const data = await response.json();
  const preferred = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
  const found = data.data?.find(m => preferred.includes(m.id));
  const model = found ? found.id : data.data?.[0]?.id || 'gpt-4o';
  state.ai.provider = 'openai';
  state.ai.model = model;
  localStorage.setItem('ai_provider', 'openai');
  localStorage.setItem('gemini_selected_model', model);
  return model;
}

async function parseFileWithOpenAI(base64Data, mimeType, fileName, apiKey) {
  const model = state.ai.model || 'gpt-4o';
  const prompt = `You are an expense bill parser. Extract the total amount, date, and vendor name from this bill.
Return ONLY valid JSON: {"amount": <number>, "date": "<YYYY-MM-DD or null>", "description": "<vendor name>"}

${BILL_PARSER_CRITICAL_INSTRUCTIONS}`;

  // OpenAI vision supports images; PDFs need text extraction first
  const isImage = mimeType.startsWith('image/');
  let messages;

  if (isImage) {
    messages = [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}`, detail: 'high' } }
      ]
    }];
  } else {
    // For PDFs: we can still try sending as image if it's a single-page PDF rendered,
    // but OpenAI doesn't support PDF directly — we'll send the base64 as text context
    messages = [{
      role: 'user',
      content: `${prompt}\n\nFile: ${fileName} (base64 encoded, unable to render PDF directly — extract from filename or any visible text clues).`
    }];
  }

  const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: 512 })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('No response from OpenAI');

  let parsed;
  try {
    const cleanedText = extractJsonFromString(rawText);
    parsed = JSON.parse(cleanedText);
    if (Array.isArray(parsed)) {
      parsed = parsed[0];
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new Error("Result is not a valid JSON object");
    }
  } catch (e) {
    throw new Error(`Invalid JSON from OpenAI: ${e.message}`);
  }

  if (typeof parsed.amount !== 'number') parsed.amount = parseFloat(parsed.amount) || 0;
  let extractedDate = null;
  if (parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) extractedDate = parsed.date;

  return { description: parsed.description || 'Expense Bill', amount: parsed.amount, date: extractedDate };
}

// ── Claude ───────────────────────────────────────────────────────────────────
async function testClaudeApiKey(apiKey) {
  // Claude doesn't have a /models list endpoint without a paid plan; 
  // we do a minimal message call to verify the key
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }]
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude HTTP ${response.status}`);
  }
  const model = 'claude-3-5-haiku-20241022';
  state.ai.provider = 'claude';
  state.ai.model = model;
  localStorage.setItem('ai_provider', 'claude');
  localStorage.setItem('gemini_selected_model', model);
  return model;
}

async function parseFileWithClaude(base64Data, mimeType, fileName, apiKey) {
  const model = state.ai.model || 'claude-3-5-haiku-20241022';
  const prompt = `You are an expense bill parser. Extract the total amount, date, and vendor name from this bill.
Return ONLY valid JSON: {"amount": <number>, "date": "<YYYY-MM-DD or null>", "description": "<vendor name>"}

${BILL_PARSER_CRITICAL_INSTRUCTIONS}`;

  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  let content;

  if (isImage) {
    content = [
      { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } },
      { type: 'text', text: prompt }
    ];
  } else if (isPdf) {
    // Claude supports PDF natively via document type
    content = [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } },
      { type: 'text', text: prompt }
    ];
  } else {
    content = [{ type: 'text', text: `${prompt}\n\nFile: ${fileName}` }];
  }

  const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, max_tokens: 512, messages: [{ role: 'user', content }] })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.content?.[0]?.text;
  if (!rawText) throw new Error('No response from Claude');

  let parsed;
  try {
    const cleanedText = extractJsonFromString(rawText);
    parsed = JSON.parse(cleanedText);
    if (Array.isArray(parsed)) {
      parsed = parsed[0];
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new Error("Result is not a valid JSON object");
    }
  } catch (e) {
    throw new Error(`Invalid JSON from Claude: ${e.message}`);
  }

  if (typeof parsed.amount !== 'number') parsed.amount = parseFloat(parsed.amount) || 0;
  let extractedDate = null;
  if (parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) extractedDate = parsed.date;

  return { description: parsed.description || 'Expense Bill', amount: parsed.amount, date: extractedDate };
}

// ── Gemini ───────────────────────────────────────────────────────────────────
async function testGeminiApiKey(apiKey) {
  const bestModel = await discoverBestModel(apiKey);
  state.ai.model = bestModel;
  localStorage.setItem('gemini_selected_model', bestModel);
  return bestModel;
}

// Discover the best available text generation model for the given API Key
async function discoverBestModel(apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP ${response.status}`;
    throw new Error(`Failed to list models: ${errMsg}`);
  }
  const data = await response.json();
  if (!data.models || data.models.length === 0) {
    throw new Error("No models returned from Google API");
  }

  // Filter models that support generateContent
  const eligible = data.models.filter(m => 
    m.supportedGenerationMethods && 
    m.supportedGenerationMethods.includes('generateContent')
  );

  if (eligible.length === 0) {
    throw new Error("No models in your region/account support content generation.");
  }

  const preferences = [
    'models/gemini-2.5-flash',
    'models/gemini-2.0-flash',
    'models/gemini-1.5-flash-latest',
    'models/gemini-1.5-flash',
    'models/gemini-1.5-flash-8b',
    'models/gemini-1.5-pro',
    'models/gemini-1.0-pro'
  ];

  for (const pref of preferences) {
    const found = eligible.find(m => m.name === pref);
    if (found) {
      return found.name.replace('models/', '');
    }
  }

  // Fallback to any model containing flash
  const flashModel = eligible.find(m => m.name.toLowerCase().includes('flash'));
  if (flashModel) {
    return flashModel.name.replace('models/', '');
  }

  // Last resort
  return eligible[0].name.replace('models/', '');
}

// Dialog prompting for API key when generic files are uploaded without one
function promptForApiKey(files) {
  return new Promise((resolve) => {
    const modal = document.getElementById('apiKeyModal');
    const fileListContainer = document.getElementById('modalFileList');
    const keyInput = document.getElementById('modalGeminiApiKey');
    const saveBtn = document.getElementById('btnSaveModalKey');
    const cancelBtn = document.getElementById('btnCancelModal');
    const forceOfflineBtn = document.getElementById('btnForceOffline');
    const toggleBtn = document.getElementById('toggleModalApiKeyVisibility');
    
    if (!modal || !fileListContainer || !keyInput) {
      resolve({ action: 'offline' });
      return;
    }
    
    // Clear & Populate file list
    fileListContainer.innerHTML = '';
    files.forEach(file => {
      const div = document.createElement('div');
      div.className = 'modal-file-item';
      div.innerHTML = `
        <span class="modal-file-item-icon">📄</span>
        <span>${escapeHtml(file.name)}</span>
      `;
      fileListContainer.appendChild(div);
    });
    
    // Pre-fill key if any exists in state
    keyInput.value = state.ai.apiKey || '';
    
    // Show modal
    modal.classList.add('show');
    
    // Cleanup helper to remove modal listeners
    const cleanup = () => {
      modal.classList.remove('show');
      // Clone buttons to strip old listeners
      saveBtn.replaceWith(saveBtn.cloneNode(true));
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      forceOfflineBtn.replaceWith(forceOfflineBtn.cloneNode(true));
      toggleBtn.replaceWith(toggleBtn.cloneNode(true));
    };
    
    // Setup listeners on the fresh buttons (retrieved again because of clones)
    document.getElementById('btnSaveModalKey').addEventListener('click', () => {
      const enteredKey = document.getElementById('modalGeminiApiKey').value.trim();
      if (!enteredKey) {
        showToast('Please enter an API Key or choose another option.', 'error');
        return;
      }
      cleanup();
      resolve({ action: 'save', key: enteredKey });
    });
    
    document.getElementById('btnForceOffline').addEventListener('click', () => {
      cleanup();
      resolve({ action: 'offline' });
    });
    
    document.getElementById('btnCancelModal').addEventListener('click', () => {
      cleanup();
      resolve({ action: 'cancel' });
    });
    
    document.getElementById('toggleModalApiKeyVisibility').addEventListener('click', () => {
      const modalInput = document.getElementById('modalGeminiApiKey');
      const toggleSvgBtn = document.getElementById('toggleModalApiKeyVisibility');
      if (modalInput.type === 'password') {
        modalInput.type = 'text';
        toggleSvgBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      } else {
        modalInput.type = 'password';
        toggleSvgBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
      }
    });
  });
}

// Dialog warning about insufficient keys and prompting for more keys
function promptForMoreKeys(totalTokens, recommendedKeys, currentKeysCount) {
  return new Promise((resolve) => {
    const modal = document.getElementById('apiKeyModal');
    const titleEl = document.getElementById('apiKeyModalTitle');
    const descEl = document.getElementById('apiKeyModalDesc');
    const fileListContainer = document.getElementById('modalFileList');
    const instructionEl = document.getElementById('apiKeyModalInstruction');
    const keyInput = document.getElementById('modalGeminiApiKey');
    
    const saveBtn = document.getElementById('btnSaveModalKey');
    const cancelBtn = document.getElementById('btnCancelModal');
    const forceOfflineBtn = document.getElementById('btnForceOffline');
    const toggleBtn = document.getElementById('toggleModalApiKeyVisibility');

    if (!modal || !keyInput) {
      resolve({ action: 'continue' });
      return;
    }

    // Backup original content to restore later
    const originalTitle = titleEl ? titleEl.innerHTML : 'Gemini API Key Required';
    const originalDesc = descEl ? descEl.innerHTML : '';
    const originalInstruction = instructionEl ? instructionEl.innerHTML : '';
    const originalFileListDisplay = fileListContainer ? fileListContainer.style.display : 'block';
    const originalSaveText = saveBtn ? saveBtn.textContent : 'Save Key & Parse';
    const originalForceText = forceOfflineBtn ? forceOfflineBtn.textContent : 'Parse Offline Anyway';
    
    // Set custom content for warning
    if (titleEl) titleEl.innerHTML = '⚠️ Insufficient API Keys';
    if (descEl) {
      descEl.innerHTML = `
        Estimated batch tokens: <strong>${totalTokens.toLocaleString()}</strong>.<br/>
        We recommend <strong>${recommendedKeys}</strong> API keys to parse this batch without rate limits.<br/>
        You currently have <strong>${currentKeysCount}</strong> key(s) configured.
      `;
    }
    if (fileListContainer) fileListContainer.style.display = 'none';
    if (instructionEl) instructionEl.innerHTML = 'Please enter/add more API keys below (separated by commas, spaces, or newlines):';
    
    keyInput.value = state.ai.apiKey || '';
    keyInput.placeholder = "Paste your comma-separated keys here...";
    
    if (saveBtn) saveBtn.textContent = 'Save Keys & Parse';
    if (forceOfflineBtn) forceOfflineBtn.textContent = 'Use Current Keys Anyway';
    
    modal.classList.add('show');

    const cleanup = () => {
      modal.classList.remove('show');
      
      // Restore original content
      if (titleEl) titleEl.innerHTML = originalTitle;
      if (descEl) descEl.innerHTML = originalDesc;
      if (fileListContainer) {
        fileListContainer.style.display = originalFileListDisplay;
      }
      if (instructionEl) instructionEl.innerHTML = originalInstruction;
      if (saveBtn) saveBtn.textContent = originalSaveText;
      if (forceOfflineBtn) forceOfflineBtn.textContent = originalForceText;
      keyInput.placeholder = "AIZAy...";
      
      // Clone buttons to strip listeners
      saveBtn.replaceWith(saveBtn.cloneNode(true));
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      forceOfflineBtn.replaceWith(forceOfflineBtn.cloneNode(true));
      toggleBtn.replaceWith(toggleBtn.cloneNode(true));
    };

    document.getElementById('btnSaveModalKey').addEventListener('click', () => {
      const enteredKeys = document.getElementById('modalGeminiApiKey').value.trim();
      cleanup();
      resolve({ action: 'save', keys: enteredKeys });
    });

    document.getElementById('btnForceOffline').addEventListener('click', () => {
      cleanup();
      resolve({ action: 'continue' });
    });

    document.getElementById('btnCancelModal').addEventListener('click', () => {
      cleanup();
      resolve({ action: 'cancel' });
    });

    document.getElementById('toggleModalApiKeyVisibility').addEventListener('click', () => {
      const modalInput = document.getElementById('modalGeminiApiKey');
      const toggleSvgBtn = document.getElementById('toggleModalApiKeyVisibility');
      if (modalInput.type === 'password') {
        modalInput.type = 'text';
        toggleSvgBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      } else {
        modalInput.type = 'password';
        toggleSvgBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
      }
    });
  });
}

// Estimate remaining tokens for remaining files in the queue
function estimateRemainingTokens(remainingFiles) {
  let totalSize = 0;
  remainingFiles.forEach(f => { totalSize += f.size || 0; });
  const totalWords = Math.round(totalSize / 1024 * 150);
  return Math.round(totalWords * 1.33) + (remainingFiles.length * 856);
}

// Dialog warning about rate limit hit and prompting for more keys
function promptForKeysOnRateLimit(totalTokens, recommendedKeys, currentKeysCount, remainingCount) {
  return new Promise((resolve) => {
    const modal = document.getElementById('apiKeyModal');
    const titleEl = document.getElementById('apiKeyModalTitle');
    const descEl = document.getElementById('apiKeyModalDesc');
    const fileListContainer = document.getElementById('modalFileList');
    const instructionEl = document.getElementById('apiKeyModalInstruction');
    const keyInput = document.getElementById('modalGeminiApiKey');
    
    const saveBtn = document.getElementById('btnSaveModalKey');
    const cancelBtn = document.getElementById('btnCancelModal');
    const forceOfflineBtn = document.getElementById('btnForceOffline');
    const toggleBtn = document.getElementById('toggleModalApiKeyVisibility');

    if (!modal || !keyInput) {
      resolve({ action: 'continue' });
      return;
    }

    // Backup original content to restore later
    const originalTitle = titleEl ? titleEl.innerHTML : 'Gemini API Key Required';
    const originalDesc = descEl ? descEl.innerHTML : '';
    const originalInstruction = instructionEl ? instructionEl.innerHTML : '';
    const originalFileListDisplay = fileListContainer ? fileListContainer.style.display : 'block';
    const originalSaveText = saveBtn ? saveBtn.textContent : 'Save Key & Parse';
    const originalForceText = forceOfflineBtn ? forceOfflineBtn.textContent : 'Parse Offline Anyway';
    
    // Set custom content for rate limit warning
    if (titleEl) titleEl.innerHTML = '⚠️ Rate Limit Reached (Keys Exhausted)';
    if (descEl) {
      descEl.innerHTML = `
        Rate limit hit while parsing. Remaining files: <strong>${remainingCount}</strong>.<br/>
        Estimated remaining tokens: <strong>${totalTokens.toLocaleString()}</strong>.<br/>
        We recommend providing <strong>${recommendedKeys}</strong> API keys to continue without delay.
      `;
    }
    if (fileListContainer) fileListContainer.style.display = 'none';
    if (instructionEl) instructionEl.innerHTML = 'Please enter more API keys below (separated by commas, spaces, or newlines):';
    
    keyInput.value = state.ai.apiKey || '';
    keyInput.placeholder = "Paste your comma-separated keys here...";
    
    if (saveBtn) saveBtn.textContent = 'Save Keys & Resume';
    if (forceOfflineBtn) forceOfflineBtn.textContent = 'Skip & Use Local OCR';
    if (cancelBtn) cancelBtn.textContent = 'Cancel Remaining';
    
    modal.classList.add('show');

    const cleanup = () => {
      modal.classList.remove('show');
      
      // Restore original content
      if (titleEl) titleEl.innerHTML = originalTitle;
      if (descEl) descEl.innerHTML = originalDesc;
      if (fileListContainer) {
        fileListContainer.style.display = originalFileListDisplay;
      }
      if (instructionEl) instructionEl.innerHTML = originalInstruction;
      if (saveBtn) saveBtn.textContent = originalSaveText;
      if (forceOfflineBtn) forceOfflineBtn.textContent = originalForceText;
      if (cancelBtn) cancelBtn.textContent = 'Cancel Upload';
      keyInput.placeholder = "AIZAy...";
      
      // Clone buttons to strip listeners
      saveBtn.replaceWith(saveBtn.cloneNode(true));
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      forceOfflineBtn.replaceWith(forceOfflineBtn.cloneNode(true));
      toggleBtn.replaceWith(toggleBtn.cloneNode(true));
    };

    document.getElementById('btnSaveModalKey').addEventListener('click', () => {
      const enteredKeys = document.getElementById('modalGeminiApiKey').value.trim();
      cleanup();
      resolve({ action: 'save', keys: enteredKeys });
    });

    document.getElementById('btnForceOffline').addEventListener('click', () => {
      cleanup();
      resolve({ action: 'continue' });
    });

    document.getElementById('btnCancelModal').addEventListener('click', () => {
      cleanup();
      resolve({ action: 'cancel' });
    });

    document.getElementById('toggleModalApiKeyVisibility').addEventListener('click', () => {
      const modalInput = document.getElementById('modalGeminiApiKey');
      const toggleSvgBtn = document.getElementById('toggleModalApiKeyVisibility');
      if (modalInput.type === 'password') {
        modalInput.type = 'text';
        toggleSvgBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      } else {
        modalInput.type = 'password';
        toggleSvgBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
      }
    });
  });
}

// File Parsing & Handling
async function handleFiles(files) {
  if (!files || files.length === 0) return;

  let addedCount = 0;
  const ocrQueue = [];

  // 1. Separate fast-path files from content-scan files
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const parsed = state.ai.alwaysUseAi ? null : parseFileName(file.name);
    const fileDate = getFormattedFileDate(file);
    
    if (parsed) {
      // Fast path: Amount is in filename (e.g. blinkit_347.pdf)
      const newRow = {
        id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        date: fileDate,
        description: file.name, // Keep exact filename
        amount: parsed.amount,
        billsAvailable: 'Yes'
      };
      state[state.activeTab].push(newRow);
      addedCount++;
    } else {
      // Content-scan path: Need to go inside file
      ocrQueue.push(file);
    }
  }

  // Render fast path results first
  if (addedCount > 0) {
    renderTable(state.activeTab);
    updateSummary();
  }

  // 2. Intercept OCR queue if API Key is missing
  let skipOcr = false;
  if (ocrQueue.length > 0 && getApiKeys().length === 0) {
    const response = await promptForApiKey(ocrQueue);
    if (response.action === 'save') {
      state.ai.apiKey = response.key;
      localStorage.setItem('gemini_api_key', response.key);
      const geminiApiKeyInput = document.getElementById('geminiApiKey');
      if (geminiApiKeyInput) {
        geminiApiKeyInput.value = response.key;
      }
      
      // Auto-enable AI parser settings
      state.ai.useAi = true;
      localStorage.setItem('use_ai_parser', 'true');
      const useAiParserCheckbox = document.getElementById('useAiParser');
      if (useAiParserCheckbox) {
        useAiParserCheckbox.checked = true;
      }
      updateParserStatusBadge();
      showToast('API Key saved and Gemini AI enabled!', 'success');
    } else if (response.action === 'offline') {
      showToast('Processing files offline. Local OCR may be inaccurate.', 'warning');
    } else if (response.action === 'cancel') {
      showToast('Upload of files requiring AI parsing was cancelled.', 'normal');
      skipOcr = true;
    }
  }

  // 3. Scan queue sequentially
  if (ocrQueue.length > 0 && !skipOcr) {
    showOcrOverlay(true);

    for (let j = 0; j < ocrQueue.length; j++) {
      const file = ocrQueue[j];
      const fileDate = getFormattedFileDate(file);
      updateOcrProgress(0, `Processing file ${j + 1}/${ocrQueue.length}: ${file.name}`);

      try {
        let result = null;

        // Try AI parsing based on detected provider
        const keys = getApiKeys();
        if (state.ai.useAi && keys.length > 0) {
          const activeKey = getCurrentApiKey();
          const provider = detectProvider(activeKey);
          try {
            if (provider === 'gemini') {
              updateOcrProgress(20, `Sending file to Gemini AI...`);
              const base64Data = await fileToBase64(file);
              const mimeType = file.type || getMimeTypeFromExtension(file.name);
              updateOcrProgress(50, `Parsing with Gemini AI...`);
              result = await parseFileWithGemini(base64Data, mimeType, activeKey);

            } else if (provider === 'openai') {
              updateOcrProgress(20, `Sending file to OpenAI...`);
              const base64Data = await fileToBase64(file);
              const mimeType = file.type || getMimeTypeFromExtension(file.name);
              updateOcrProgress(50, `Parsing with OpenAI GPT-4o...`);
              result = await parseFileWithOpenAI(base64Data, mimeType, file.name, activeKey);

            } else if (provider === 'claude') {
              updateOcrProgress(20, `Sending file to Claude AI...`);
              const base64Data = await fileToBase64(file);
              const mimeType = file.type || getMimeTypeFromExtension(file.name);
              updateOcrProgress(50, `Parsing with Claude AI...`);
              result = await parseFileWithClaude(base64Data, mimeType, file.name, activeKey);

            } else if (provider === 'groq') {
              // Groq is text-only: extract text first, then send to Groq
              updateOcrProgress(20, `Extracting text for Groq...`);
              let extractedText = '';
              const ext = file.name.split('.').pop().toLowerCase();
              if (ext === 'pdf') {
                extractedText = await extractTextFromPdf(file);
              } else if (isImageFile(file.name)) {
                extractedText = await runOcrOnFile(file);
              }
              if (extractedText) {
                updateOcrProgress(50, `Parsing with Groq LLM...`);
                result = await parseTextWithGroq(extractedText, activeKey);
              }

            } else if (provider === 'cerebras') {
              // Cerebras is text-only: extract text first, then send to Cerebras
              updateOcrProgress(20, `Extracting text for Cerebras...`);
              let extractedText = '';
              const ext = file.name.split('.').pop().toLowerCase();
              if (ext === 'pdf') {
                extractedText = await extractTextFromPdf(file);
              } else if (isImageFile(file.name)) {
                extractedText = await runOcrOnFile(file);
              }
              if (extractedText) {
                updateOcrProgress(50, `Parsing with Cerebras LLM...`);
                result = await parseTextWithCerebras(extractedText, activeKey);
              }

            } else if (provider === 'huggingface') {
              // Hugging Face is text-only: extract text first, then send to HF
              updateOcrProgress(20, `Extracting text for Hugging Face...`);
              let extractedText = '';
              const ext = file.name.split('.').pop().toLowerCase();
              if (ext === 'pdf') {
                extractedText = await extractTextFromPdf(file);
              } else if (isImageFile(file.name)) {
                extractedText = await runOcrOnFile(file);
              }
              if (extractedText) {
                updateOcrProgress(50, `Parsing with Hugging Face...`);
                result = await parseTextWithHuggingFace(extractedText, activeKey);
              }
            }
          } catch (aiErr) {
            const errStr = (aiErr.message || '').toLowerCase();
            const isRateLimit = errStr.includes('ratelimitreached') || 
                                errStr.includes('rate limit') || 
                                errStr.includes('429') || 
                                errStr.includes('limit reached');

            if (isRateLimit) {
              const remainingFiles = ocrQueue.slice(j);
              const estTokens = estimateRemainingTokens(remainingFiles);
              const currentKeysCount = getApiKeys().length;
              const recommendedKeys = Math.ceil(estTokens / 12000);
              
              // Hide main loader during popup interaction
              showOcrOverlay(false);
              const modalRes = await promptForKeysOnRateLimit(estTokens, recommendedKeys, currentKeysCount, remainingFiles.length);
              showOcrOverlay(true);
              
              if (modalRes.action === 'save') {
                state.ai.apiKey = modalRes.keys;
                localStorage.setItem('gemini_api_key', modalRes.keys);
                const geminiApiKeyInput = document.getElementById('geminiApiKey');
                if (geminiApiKeyInput) {
                  geminiApiKeyInput.value = modalRes.keys;
                }
                updateParserStatusBadge();
                showToast('API Keys updated! Resuming parse...', 'success');
                j--; // Retry current file
                continue;
              } else if (modalRes.action === 'cancel') {
                showToast('Upload/parsing cancelled.', 'normal');
                break; // Exit queue processing
              }
              // If action is 'continue', let it fall through to local OCR fallback for this file
            }

            console.error(`${provider} AI parsing failed, falling back to local OCR:`, aiErr);
            showToast(`AI parsing failed for ${file.name}: ${aiErr.message}. Falling back to local OCR.`, 'error');
            showDebugError(`AI Error for ${file.name}: ${aiErr.message}`);
          }
        }

        // Add throttling delay (1 second) between files to prevent concurrent rate limit bursts
        if (j < ocrQueue.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Fallback to local OCR / PDF extraction + heuristics if Gemini was not used or failed
        if (!result) {
          let extractedText = '';
          const ext = file.name.split('.').pop().toLowerCase();

          if (ext === 'pdf') {
            extractedText = await extractTextFromPdf(file);
          } else if (isImageFile(file.name)) {
            extractedText = await runOcrOnFile(file);
          }

          if (extractedText) {
            result = parseOcrText(extractedText);
          }
        }

        if (result) {
          const newRow = {
            id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            date: result.date || fileDate,
            description: file.name, // Keep exact filename
            amount: result.amount || 0.00,
            billsAvailable: 'Yes'
          };
          state[state.activeTab].push(newRow);
          addedCount++;
        } else {
          // If extraction yielded nothing, add fallback row
          const newRow = {
            id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            date: fileDate,
            description: file.name,
            amount: 0.00,
            billsAvailable: 'Yes'
          };
          state[state.activeTab].push(newRow);
          addedCount++;
        }
      } catch (err) {
        console.error(`Error scanning file ${file.name}:`, err);
        // Add fallback row on error so we don't block queue
        const newRow = {
          id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
          date: fileDate,
          description: file.name,
          amount: 0.00,
          billsAvailable: 'Yes'
        };
        state[state.activeTab].push(newRow);
        addedCount++;
      }
    }

    showOcrOverlay(false);
    renderTable(state.activeTab);
    updateSummary();
  }

  if (addedCount > 0) {
    showToast(`Successfully added ${addedCount} bill(s) to the table!`, 'success');
  }
}

// Parse Filename Logic
// Pattern examples:
// Zomato_335.pdf -> Description: "Zomato", Amount: 335
// Blinkit_1800.png -> Description: "Blinkit", Amount: 1800
// Food_bej_187.jpg -> Description: "Food Bej", Amount: 187
// Food_Kfc_320.pdf -> Description: "Food Kfc", Amount: 320
function parseFileName(filename) {
  // Remove extension
  const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;

  // Regex to extract text prefix and the final number suffix (amount)
  // Supports formats like: Text_Amount, Text-Amount, Text Amount, Text_Amount_With_Extra_Text
  // E.g. "Food_bej_187" -> Group 1: "Food_bej", Group 2: "187"
  const regex = /^(.*?)(?:_|-|\s)+(\d+(?:\.\d+)?)$/;
  const match = baseName.match(regex);

  if (match) {
    let descRaw = match[1];
    const amount = parseFloat(match[2]);

    // Format the description: replace underscores/dashes with spaces
    let description = descRaw
      .replace(/[_-]+/g, ' ')
      .trim();

    // Capitalize words for clean display
    description = description.replace(/\b\w/g, c => c.toUpperCase());

    if (!isNaN(amount)) {
      return { description, amount };
    }
  }

  // Fallback: If it doesn't match the regex but has some numbers in it, try to find the last sequence of digits
  const fallbackRegex = /(\d+(?:\.\d+)?)\D*$/;
  const fallbackMatch = baseName.match(fallbackRegex);
  if (fallbackMatch) {
    const amount = parseFloat(fallbackMatch[1]);
    const descRaw = baseName.replace(fallbackMatch[1], '').replace(/[_-]+/g, ' ').trim();
    let description = descRaw.replace(/\b\w/g, c => c.toUpperCase()) || 'Expense Bill';
    if (!isNaN(amount)) {
      return { description, amount };
    }
  }

  return null;
}

// Tab switcher
// Tab switcher
function switchTab(tabId) {
  state.activeTab = tabId;

  // Toggle active tab buttons
  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.remove('active');
  });
  const tabBtn = document.getElementById(`tab-${tabId}`);
  if (tabBtn) tabBtn.classList.add('active');

  // Toggle active panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  const tabPanel = document.getElementById(`panel-${tabId}`);
  if (tabPanel) tabPanel.classList.add('active');

  // Sync category select dropdown
  const dropdown = document.getElementById('uploadCategorySelect');
  if (dropdown) {
    dropdown.value = tabId;
  }

  updateSummary();
}

// Add row manually
function addRow(tabId) {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  const newRow = {
    id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    date: dateStr,
    description: '',
    amount: 0.00,
    billsAvailable: 'Yes'
  };

  state[tabId].push(newRow);
  renderTable(tabId);
  updateSummary();
}

// Remove row
function removeRow(tabId, id) {
  state[tabId] = state[tabId].filter(row => row.id !== id);
  renderTable(tabId);
  updateSummary();
  showToast('Row removed', 'normal');
}

// Update row field value
function updateRowField(tabId, id, field, value) {
  const row = state[tabId].find(r => r.id === id);
  if (row) {
    if (field === 'amount') {
      row[field] = parseFloat(value) || 0;
    } else {
      row[field] = value;
    }
    updateSummary();
  }
}

// Format currency
function formatCurrency(amount) {
  return '₹' + amount.toFixed(2);
}

// Get subtotal for a tab
function getTabSubtotal(tabId) {
  return state[tabId].reduce((sum, row) => sum + (row.amount || 0), 0);
}

// Render a single table
function renderTable(tabId) {
  const tbody = document.getElementById(`body-${tabId}`);
  if (!tbody) return;

  tbody.innerHTML = '';
  const rows = state[tabId];

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          No rows added yet. Drag and drop bill files or click "Add Row" to start.
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach((row, index) => {
    const tr = document.createElement('tr');
    tr.id = row.id;

    tr.innerHTML = `
      <td class="row-slno-cell">${index + 1}</td>
      <td>
        <input type="date" value="${row.date}" onchange="updateRowField('${tabId}', '${row.id}', 'date', this.value)" />
      </td>
      <td>
        <input type="text" value="${escapeHtml(row.description)}" placeholder="e.g. Broadband, Taxi, Zomato" oninput="updateRowField('${tabId}', '${row.id}', 'description', this.value)" />
      </td>
      <td>
        <input type="number" step="0.01" min="0" value="${row.amount}" placeholder="0.00" oninput="updateRowField('${tabId}', '${row.id}', 'amount', this.value)" />
      </td>
      <td>
        <select onchange="updateRowField('${tabId}', '${row.id}', 'billsAvailable', this.value)">
          <option value="Yes" ${row.billsAvailable === 'Yes' ? 'selected' : ''}>Yes</option>
          <option value="No" ${row.billsAvailable === 'No' ? 'selected' : ''}>No</option>
        </select>
      </td>
      <td>
        <button class="btn-delete" onclick="removeRow('${tabId}', '${row.id}')" title="Delete Row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  updateTableFooter(tabId);
}

// Update table footer subtotal
function updateTableFooter(tabId) {
  const footer = document.getElementById(`footer-${tabId}`);
  if (footer) {
    const subtotal = getTabSubtotal(tabId);
    footer.innerHTML = `Total Amount: <span id="val-${tabId}">${formatCurrency(subtotal)}</span>`;
  }
}

// Render all tables & info
function renderAll() {
  renderTable('phoneBroadband');
  renderTable('travel');
  renderTable('food');
  updateSummary();
}

// Update running summaries and grand summary
function updateSummary() {
  const pbSub = getTabSubtotal('phoneBroadband');
  const trSub = getTabSubtotal('travel');
  const fdSub = getTabSubtotal('food');

  // Update tab summaries
  const tabSummary = document.getElementById('tabSummary');
  if (tabSummary) {
    const activeSub = getTabSubtotal(state.activeTab);
    let tabLabel = '';
    if (state.activeTab === 'phoneBroadband') tabLabel = '📱 Phone & Broadband';
    else if (state.activeTab === 'travel') tabLabel = '🚗 Travel';
    else if (state.activeTab === 'food') tabLabel = '🍽️ Food';
    tabSummary.textContent = `${tabLabel} Subtotal: ${formatCurrency(activeSub)}`;
  }

  // Update individual elements in the active tables footer just in case
  updateTableFooter('phoneBroadband');
  updateTableFooter('travel');
  updateTableFooter('food');

  // Grand summary updates
  const sumPb = document.getElementById('sum-phoneBroadband');
  const sumTr = document.getElementById('sum-travel');
  const sumFd = document.getElementById('sum-food');
  const sumTotal = document.getElementById('sum-total');
  const sumAdvance = document.getElementById('sum-advance');
  const sumNet = document.getElementById('sum-net');

  if (sumPb) sumPb.textContent = formatCurrency(pbSub);
  if (sumTr) sumTr.textContent = formatCurrency(trSub);
  if (sumFd) sumFd.textContent = formatCurrency(fdSub);

  const grandTotal = pbSub + trSub + fdSub;
  if (sumTotal) sumTotal.textContent = formatCurrency(grandTotal);

  if (sumAdvance) sumAdvance.textContent = `- ${formatCurrency(state.employee.travelAdvance)}`;

  const netPayable = grandTotal - state.employee.travelAdvance;
  if (sumNet) sumNet.textContent = formatCurrency(netPayable);
}

// Toast notification trigger
function showToast(message, type = 'normal') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = 'toast'; // Reset
  
  if (type === 'success') {
    toast.classList.add('success');
  } else if (type === 'error') {
    toast.classList.add('error');
  }

  toast.classList.add('show');

  // Clear previous timer
  if (window.toastTimeout) {
    clearTimeout(window.toastTimeout);
  }

  window.toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// HTML Escaper helper
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper to extract employee first name or standard name for signatures
function getEmployeeSignatureName() {
  const fullName = state.employee.name.trim();
  if (!fullName) return 'Employee';
  
  // Split the name into parts
  const parts = fullName.split(/\s+/);
  
  // Try to find a good signature name. If "Sai Teja" or similar, use first name or parts
  // Look for "Pavan" or the first name
  // E.g. "Chinni Pavan Venkata Sai Teja" -> We can find if "Pavan" is in it and use it,
  // or just use the first/second name. Let's look for "Pavan" specifically, otherwise use the second or first word.
  const pavanIndex = parts.findIndex(p => p.toLowerCase() === 'pavan');
  if (pavanIndex !== -1) {
    return parts[pavanIndex];
  }
  
  // Return the second word if it exists (in South Indian names first word is family name often), otherwise first
  return parts.length > 1 ? parts[1] : parts[0];
}

// Generate formatted Excel file
function generateExcel() {
  // Check if XLSX is loaded
  if (typeof XLSX === 'undefined') {
    showToast('Excel exporter library not loaded. Please wait.', 'error');
    return;
  }

  // Create standard spreadsheet Workbook
  const wb = XLSX.utils.book_new();

  // Categories to create sheets for
  const categories = [
    { key: 'phoneBroadband', name: 'Phone Broadband' },
    { key: 'travel', name: 'Travel' },
    { key: 'food', name: 'Food' }
  ];

  categories.forEach(cat => {
    const dataRows = state[cat.key];
    const ws_data = [];

    // Row 1: Empty
    ws_data.push([]);

    // Row 2: Header Title (A2)
    ws_data.push(['Expense Claim Statement']);

    // Row 3: Claim Statement (A3)
    ws_data.push(['Claim Statement']);

    // Row 4: Employee Name (A4: Employee Name, C4: Employee Name Value)
    ws_data.push(['Employee Name', '', state.employee.name]);

    // Row 5: Employee Id (A5: Employee Id, C5: Employee Id Value)
    ws_data.push(['Employee Id', '', state.employee.id]);

    // Row 6: Empty
    ws_data.push([]);

    // Row 7: Headers
    ws_data.push(['Sl.no', 'Date', 'Description', 'Amount in Rs', 'Bills Available Yes /No']);

    // Rows 8+: Data rows
    let currentSlNo = 1;
    dataRows.forEach(row => {
      // Format the date if it exists
      let formattedDate = row.date;
      if (formattedDate) {
        // e.g. YYYY-MM-DD -> DD-MM-YYYY or keep YYYY-MM-DD
        const dateParts = formattedDate.split('-');
        if (dateParts.length === 3) {
          formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // DD-MM-YYYY format
        }
      }
      ws_data.push([
        currentSlNo++,
        formattedDate || '',
        row.description || '',
        row.amount || 0.00,
        row.billsAvailable || 'No'
      ]);
    });

    // Subtotal calculations row index
    const totalRowIndex = ws_data.length + 1; // 1-based index in Excel terms
    const dataStartRow = 8;
    const dataEndRow = totalRowIndex - 1;

    // Total rows
    // Row Total Amount Payable
    ws_data.push(['Total Amount Payable', '', '', 0.00]); // D element will be formula

    // Row Less: Travel Advance Paid
    // In our Excel claim sheet, travel advance paid is only deducted once, but to match layout we put it here
    ws_data.push(['Less:- Travel Advance paid', '', '', state.employee.travelAdvance]);

    // Row Net Amount Payable
    ws_data.push(['Net Amount payable', '', '', 0.00]); // D element will be formula

    // Signature Headers
    ws_data.push([]); // blank row before signature
    const sigLabelRow = ws_data.length + 1;
    const sigName = getEmployeeSignatureName();
    ws_data.push([
      `${sigName} Employee Signature`,
      '',
      'Team head or Manager Signature',
      '',
      'Finance team Signature'
    ]);

    // Empty signature boxes rows (two blank rows)
    ws_data.push([]);
    ws_data.push([]);

    // Create Worksheet from array of arrays
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Apply merges
    // Note: SheetJS merges are 0-based. r = row, c = col
    ws['!merges'] = [
      // Company name merge A2:E2
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
      // Claim statement merge A3:E3
      { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
      // Employee name merge A4:B4, and C4:E4
      { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
      { s: { r: 3, c: 2 }, e: { r: 3, c: 4 } },
      // Employee id merge A5:B5, and C5:E5
      { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
      { s: { r: 4, c: 2 }, e: { r: 4, c: 4 } },
      
      // Total Amount merge A[totalRow]:C[totalRow]
      { s: { r: totalRowIndex - 1, c: 0 }, e: { r: totalRowIndex - 1, c: 2 } },
      // Less: Travel merge A[totalRow+1]:C[totalRow+1]
      { s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 2 } },
      // Net Amount merge A[totalRow+2]:C[totalRow+2]
      { s: { r: totalRowIndex + 1, c: 0 }, e: { r: totalRowIndex + 1, c: 2 } },
      
      // Signatures row merge A:B, C:D
      { s: { r: sigLabelRow - 1, c: 0 }, e: { r: sigLabelRow - 1, c: 1 } },
      { s: { r: sigLabelRow - 1, c: 2 }, e: { r: sigLabelRow - 1, c: 3 } },

      // Signature boxes merge row 1
      { s: { r: sigLabelRow, c: 0 }, e: { r: sigLabelRow + 1, c: 1 } },
      { s: { r: sigLabelRow, c: 2 }, e: { r: sigLabelRow + 1, c: 3 } },
      { s: { r: sigLabelRow, c: 4 }, e: { r: sigLabelRow + 1, c: 4 } }
    ];

    // Set Formulas
    // We target cell D[totalRowIndex] and D[totalRowIndex + 2]
    // Cell D is column index 3 (0-indexed)
    const totalCellRef = XLSX.utils.encode_cell({ r: totalRowIndex - 1, c: 3 });
    const advanceCellRef = XLSX.utils.encode_cell({ r: totalRowIndex, c: 3 });
    const netCellRef = XLSX.utils.encode_cell({ r: totalRowIndex + 1, c: 3 });

    // Sum formula: e.g. =SUM(D8:D12)
    // Note: if there is no data row, sum should be 0 or point to empty. Let's make it robust
    if (dataRows.length > 0) {
      ws[totalCellRef] = { t: 'n', f: `SUM(D8:D${dataEndRow})` };
    } else {
      ws[totalCellRef] = { t: 'n', v: 0.00 };
    }

    // Net Amount formula: =D[totalRowIndex] - D[totalRowIndex+1]
    ws[netCellRef] = { t: 'n', f: `${totalCellRef}-${advanceCellRef}` };

    // Define column widths for better legibility (in characters)
    ws['!cols'] = [
      { wch: 10 }, // Sl.No
      { wch: 15 }, // Date
      { wch: 35 }, // Description
      { wch: 15 }, // Amount in Rs
      { wch: 25 }  // Bills Available
    ];

    // Add sheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, cat.name);
  });

  // Write and download
  const dateObj = new Date();
  const dateFormatted = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
  const filename = `${state.employee.id}-ClaimStatement-${dateFormatted}.xlsx`;
  
  XLSX.writeFile(wb, filename);
  showToast('Excel claim statement downloaded successfully!', 'success');
}

// Update the parser mode badge inside the Drag & Drop area
function updateParserStatusBadge() {
  const badge = document.getElementById('parserStatusBadge');
  if (!badge) return;

  const dot = badge.querySelector('.status-dot');
  const textEl = badge.querySelector('.status-text');
  if (!dot || !textEl) return;

  badge.className = 'parser-status-badge';

  if (state.ai.useAi) {
    if (state.ai.apiKey) {
      badge.classList.add('ai-mode');
      const modelShort = state.ai.model || 'gemini-1.5-flash';
      textEl.textContent = `Mode: 🤖 Gemini AI Active (${modelShort})`;
    } else {
      badge.classList.add('warning-mode');
      textEl.textContent = 'Mode: ⚠️ AI enabled but Key missing (Heuristic Fallback)';
    }
  } else {
    badge.classList.add('offline-mode');
    textEl.textContent = 'Mode: 💻 Local Offline Heuristics';
  }
}

// Expose handlers to window object for module compatibility in Vite
window.switchTab = switchTab;
window.addRow = addRow;
window.removeRow = removeRow;
window.updateRowField = updateRowField;
window.generateExcel = generateExcel;

// Helper to extract keys array from state.ai.apiKey input
function getApiKeys() {
  const input = state.ai.apiKey || '';
  return input.split(/[,\s\n]+/).map(k => k.trim()).filter(Boolean);
}

// Retrieve the currently active API key based on currentKeyIndex
function getCurrentApiKey() {
  const keys = getApiKeys();
  if (keys.length === 0) return '';
  if (state.ai.currentKeyIndex === undefined || state.ai.currentKeyIndex >= keys.length) {
    state.ai.currentKeyIndex = 0;
  }
  return keys[state.ai.currentKeyIndex];
}

// Fetch wrapper with automatic retry on 429 and key rotation support
async function fetchWithRetry(url, options, maxRetries = 5, initialDelayMs = 2000) {
  let attempt = 0;
  let rotations = 0;
  let lastStatus = 200;
  const keys = getApiKeys();
  const maxRotations = keys.length > 1 ? keys.length : 1;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, options);
      lastStatus = response.status;
      
      if (response.ok) {
        return response;
      }
      
      if (response.status === 429) {
        if (keys.length > 1 && rotations < maxRotations) {
          // Rotate to next key
          state.ai.currentKeyIndex = (state.ai.currentKeyIndex + 1) % keys.length;
          const newKey = keys[state.ai.currentKeyIndex];
          rotations++;
          
          console.log(`Rate limit (429) hit. Rotating to key index ${state.ai.currentKeyIndex} (rotation ${rotations}/${maxRotations})...`);
          showToast(`Rate limit hit. Automatically rotating to Key #${state.ai.currentKeyIndex + 1}...`, 'warning');
          
          // Update key in request options (case-insensitive check)
          if (options && options.headers) {
            let updated = false;
            for (const hKey of Object.keys(options.headers)) {
              const lowerKey = hKey.toLowerCase();
              if (lowerKey === 'authorization') {
                options.headers[hKey] = `Bearer ${newKey}`;
                updated = true;
              } else if (lowerKey === 'authorization-key') {
                options.headers[hKey] = newKey;
                updated = true;
              } else if (lowerKey === 'x-api-key') {
                options.headers[hKey] = newKey;
                updated = true;
              }
            }
            if (!updated) {
              if (options.headers['Authorization']) {
                options.headers['Authorization'] = `Bearer ${newKey}`;
              } else if (options.headers['x-api-key']) {
                options.headers['x-api-key'] = newKey;
              }
            }
          }
          
          // Re-sign CORS proxy URL if needed
          if (url.includes('proxy.corsfix.com')) {
            const urlObj = new URL(url);
            const originalTarget = urlObj.searchParams.get('url');
            if (originalTarget) {
              url = `https://proxy.corsfix.com/?url=${encodeURIComponent(originalTarget)}`;
            }
          }
          
          // Wait 100ms and retry instantly, resetting the attempt counter for the new key
          attempt = 0;
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        } else {
          // All keys exhausted: throw RateLimitReached immediately to trigger key prompt popup
          throw new Error('RateLimitReached');
        }
      }
      return response;
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      let delay = initialDelayMs * (2 ** attempt) + Math.random() * 500;
      if (delay > 10000) delay = 10000; // Cap delay to max 10 seconds
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  if (lastStatus === 429) {
    throw new Error('RateLimitReached');
  }
  throw new Error('Max retries exceeded');
}

// Switch between Claim Statement view and Bulk Token Estimator view
function switchPage(pageId) {
  document.querySelectorAll('.app-page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  
  const pageEl = document.getElementById('page-' + pageId);
  const btnEl = document.getElementById('btn-page-' + pageId);
  
  if (pageEl) pageEl.classList.add('active');
  if (btnEl) btnEl.classList.add('active');
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.switchPage = switchPage;

// ── Bulk Token Estimator Logic ────────────────────────────────────────────────
let estimatorFilesList = [];

function setupEstimator() {
  const dropZone = document.getElementById('estimatorDropZone');
  const fileInput = document.getElementById('estimatorFileInput');
  const sendBtn = document.getElementById('btnSendToPortal');

  if (!dropZone || !fileInput) return;

  // Click triggers file dialog
  dropZone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') {
      fileInput.click();
    }
  });

  // Drag over styling
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      processEstimatorFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      processEstimatorFiles(e.target.files);
    }
  });

  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      if (estimatorFilesList.length === 0) return;

      const totalTokensText = document.getElementById('est-total-tokens').textContent.replace(/,/g, '');
      const totalTokens = parseInt(totalTokensText) || 0;
      const recommendedKeys = Math.ceil(totalTokens / 12000);
      const currentKeysCount = getApiKeys().length;

      if (state.ai.useAi && currentKeysCount < recommendedKeys) {
        const modalRes = await promptForMoreKeys(totalTokens, recommendedKeys, currentKeysCount);
        if (modalRes.action === 'cancel') {
          return; // Stay on Estimator page
        }
        if (modalRes.action === 'save') {
          state.ai.apiKey = modalRes.keys;
          localStorage.setItem('gemini_api_key', modalRes.keys);
          const geminiApiKeyInput = document.getElementById('geminiApiKey');
          if (geminiApiKeyInput) {
            geminiApiKeyInput.value = modalRes.keys;
          }
          updateParserStatusBadge();
          showToast('API Keys updated successfully!', 'success');
        }
        // If action is 'continue' or 'save', proceed to transfer files
      }
      
      // Transfer files to Claim Statement page
      handleFiles(estimatorFilesList);
      
      // Reset estimator view
      estimatorFilesList = [];
      document.getElementById('estimatorFilesCard').style.display = 'none';
      document.getElementById('btnSendToPortal').disabled = true;
      document.getElementById('est-total-files').textContent = '0';
      document.getElementById('est-total-words').textContent = '0';
      document.getElementById('est-total-tokens').textContent = '0';
      
      // Switch back to Claim Statement page
      switchPage('portal');
      showToast('Transferred files to parsing queue!', 'success');
    });
  }
}

// Extract text and estimate tokens for each file locally
async function processEstimatorFiles(files) {
  const progressCard = document.getElementById('estimatorProgressCard');
  const progressTitle = document.getElementById('estimatorProgressTitle');
  const progressRatio = document.getElementById('estimatorProgressRatio');
  const progressFill = document.getElementById('estimatorProgressFill');
  const progressStatus = document.getElementById('estimatorProgressStatus');
  const filesCard = document.getElementById('estimatorFilesCard');
  const tableBody = document.getElementById('estimatorTableBody');

  if (!progressCard || !tableBody) return;

  estimatorFilesList = Array.from(files);
  progressCard.style.display = 'block';
  filesCard.style.display = 'none';
  tableBody.innerHTML = '';

  let totalWords = 0;
  let totalTokens = 0;

  const totalFiles = estimatorFilesList.length;

  for (let i = 0; i < totalFiles; i++) {
    const file = estimatorFilesList[i];
    const indexStr = `${i + 1}/${totalFiles}`;
    progressTitle.textContent = `Analyzing file: ${file.name}`;
    progressRatio.textContent = indexStr;
    progressFill.style.width = `${Math.round(((i) / totalFiles) * 100)}%`;
    progressStatus.textContent = 'Extracting words locally...';

    let wordsCount = 0;
    let text = '';
    const ext = file.name.split('.').pop().toLowerCase();

    // Custom progress updater for estimator
    const estProgressCallback = (pct, text) => {
      progressStatus.textContent = `[File ${indexStr}] ${text}`;
    };

    try {
      if (ext === 'pdf') {
        text = await extractTextFromPdf(file, estProgressCallback);
      } else if (isImageFile(file.name)) {
        text = await runOcrOnFile(file, estProgressCallback);
      } else {
        text = file.name; // Fallback
      }
      
      // Compute local word count
      const cleanText = text.trim();
      wordsCount = cleanText ? cleanText.split(/\s+/).length : 0;
    } catch (err) {
      console.error(`Error estimating tokens for ${file.name}:`, err);
      // Rough fallback based on file size (1 KB ≈ 150 words)
      wordsCount = Math.round(file.size / 1024 * 150);
    }

    // Heuristics tokens model: tokens = (words * 1.33) + 856 (prompt + json completion max size)
    const estTokens = Math.round(wordsCount * 1.33) + 856;
    totalWords += wordsCount;
    totalTokens += estTokens;

    // Append table row
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${file.name}</strong></td>
      <td><span class="file-type-badge">${ext.toUpperCase()}</span></td>
      <td>${(file.size / 1024 / 1024).toFixed(2)} MB</td>
      <td>${wordsCount.toLocaleString()}</td>
      <td><span class="token-value">${estTokens.toLocaleString()}</span></td>
      <td><span class="status-pill success">Ready</span></td>
    `;
    tableBody.appendChild(row);
  }

  // Update progress completion
  progressFill.style.width = '100%';
  setTimeout(() => {
    progressCard.style.display = 'none';
    filesCard.style.display = 'block';
  }, 500);

  // Update Summary values
  document.getElementById('est-total-files').textContent = totalFiles;
  document.getElementById('est-total-words').textContent = totalWords.toLocaleString();
  document.getElementById('est-total-tokens').textContent = totalTokens.toLocaleString();

  // Recommendations logic (Groq Limits)
  const l8bStatus = document.getElementById('groq-llama-8b-pill');
  const l70bStatus = document.getElementById('groq-llama-70b-pill');
  const recommendedKeysCount = document.getElementById('recommendedKeysCount');

  // Llama-3.1-8B-Instant limits: ~30,000 tokens/min
  const l8bSafe = totalTokens < 30000;
  l8bStatus.className = `recommendation-pill ${l8bSafe ? 'success' : 'warning'}`;
  l8bStatus.querySelector('.pill-status').textContent = l8bSafe ? 'Safe' : 'Exceeds 30K TPM';

  // Llama-3.3-70B limits: ~12,000 tokens/min
  const l70bSafe = totalTokens < 12000;
  l70bStatus.className = `recommendation-pill ${l70bSafe ? 'success' : 'warning'}`;
  l70bStatus.querySelector('.pill-status').textContent = l70bSafe ? 'Safe' : 'Exceeds 12K TPM';

  // Calculate recommended keys needed to process within a 1-minute window
  const recommendedKeys = Math.ceil(totalTokens / 12000);
  recommendedKeysCount.textContent = recommendedKeys;

  // Update button state
  document.getElementById('btnSendToPortal').disabled = false;
}
