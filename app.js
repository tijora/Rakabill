// ==========================================
// RAKABILL - PHARMACY BILLING ENGINE (app.js)
// ==========================================

// Global Application State Variables
let globalCurrency = 'PKR';
let currentInvoiceNum = 101;
let savedInvoicesHistory = [];

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    bindEventListeners();
});

/**
 * Initial Application Setup
 */
function initApp() {
    // 1. Set Automatic Today's Date
    const today = new Date().toISOString().split('T')[0];
    const invDateInput = document.getElementById('invDate');
    const dispInvDate = document.getElementById('dispInvDate');
    
    if (invDateInput) invDateInput.value = today;
    if (dispInvDate) dispInvDate.innerText = today;

    // 2. Set Initial Automatic Invoice Number
    updateInvoiceNumberDisplay();

    // 3. Load 1 Clean Default Product Row
    addItemRow();

    // 4. Update Header Preview Initially
    updateInvoiceHeader();
}

/**
 * Event Listeners Binding
 */
function bindEventListeners() {
    // Profile Inputs Realtime Sync
    const profileInputs = ['bizName', 'bizCategory', 'bizAddress', 'bizPhone', 'bizLicense', 'custName', 'custPhone'];
    profileInputs.forEach(id => {
        const inputElem = document.getElementById(id);
        if (inputElem) {
            inputElem.addEventListener('input', updateInvoiceHeader);
        }
    });

    // Country & Currency Selection Listener
    const countrySelect = document.getElementById('bizCountry');
    if (countrySelect) {
        countrySelect.addEventListener('change', updateCountryCurrency);
    }

    // Logo Upload Listener
    const logoInput = document.getElementById('bizLogo');
    if (logoInput) {
        logoInput.addEventListener('change', previewLogo);
    }

    // Discount & Tax Inputs Listener
    const discountInput = document.getElementById('discountInput');
    const taxInput = document.getElementById('taxInput');
    if (discountInput) discountInput.addEventListener('input', calculateTotals);
    if (taxInput) taxInput.addEventListener('input', calculateTotals);

    // Live Search Bar Listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', searchInvoices);
}

/**
 * Toggle Profile Modal Open/Close
 */
function toggleProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.classList.toggle('hidden');
        modal.classList.toggle('flex');
    }
}

/**
 * Update Currency Symbol according to selected Country
 */
function updateCountryCurrency() {
    const countrySelect = document.getElementById('bizCountry');
    if (!countrySelect) return;

    const country = countrySelect.value;
    const currencyMap = {
        'Pakistan': 'PKR',
        'UAE': 'AED',
        'USA': '$',
        'UK': '£',
        'Saudi Arabia': 'SAR'
    };

    globalCurrency = currencyMap[country] || 'PKR';

    // Update currency labels in UI
    document.querySelectorAll('.currencySymbol').forEach(el => {
        el.innerText = globalCurrency;
    });

    calculateTotals();
}

/**
 * Logo Image Preview
 */
function previewLogo(event) {
    const reader = new FileReader();
    reader.onload = function () {
        const dispLogo = document.getElementById('dispLogo');
        if (dispLogo) dispLogo.src = reader.result;
    };
    if (event.target.files && event.target.files[0]) {
        reader.readAsDataURL(event.target.files[0]);
    }
}

/**
 * Sync Business & Patient Details to Realtime Invoice Sheet
 */
function updateInvoiceHeader() {
    const getValue = (id, fallback) => {
        const elem = document.getElementById(id);
        return elem && elem.value.trim() !== '' ? elem.value : fallback;
    };

    document.getElementById('dispBizName').innerText = getValue('bizName', 'SHIFA PHARMACY');
    document.getElementById('dispBizCat').innerText = getValue('bizCategory', 'Pharmacy & Medical Store');
    document.getElementById('dispBizAddress').innerText = getValue('bizAddress', 'Main Bazar, Peshawar, Pakistan');
    document.getElementById('dispBizPhone').innerText = getValue('bizPhone', '+92 300 1234567');
    document.getElementById('dispBizLic').innerText = getValue('bizLicense', 'PHARM-8890');

    document.getElementById('dispCustName').innerText = getValue('custName', 'Patient Name');
    document.getElementById('dispCustPhone').innerText = getValue('custPhone', '-');
}

/**
 * Add New Pharmacy Item Row (Name, Mg/Strength, Qty, Price)
 */
function addItemRow() {
    const tbody = document.getElementById('itemsTableBody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.className = "border-b border-slate-800 transition hover:bg-slate-900/50";
    tr.innerHTML = `
        <td class="p-1.5"><input type="text" placeholder="Panadol / Injection" class="item-name w-full p-1.5 input-3d rounded-lg text-xs font-semibold" oninput="calculateTotals()"></td>
        <td class="p-1.5"><input type="text" placeholder="500mg" class="item-mg w-full p-1.5 input-3d rounded-lg text-xs text-center font-semibold" oninput="calculateTotals()"></td>
        <td class="p-1.5"><input type="number" value="1" min="1" class="item-qty w-full p-1.5 input-3d rounded-lg text-xs text-center font-semibold" oninput="calculateTotals()"></td>
        <td class="p-1.5"><input type="number" value="0" min="0" step="0.01" class="item-price w-full p-1.5 input-3d rounded-lg text-xs text-right font-semibold" oninput="calculateTotals()"></td>
        <td class="p-1.5 text-center"><button onclick="removeItemRow(this)" class="text-red-400 hover:text-red-300 font-bold transition px-1">✕</button></td>
    `;
    tbody.appendChild(tr);
    calculateTotals();
}

/**
 * Remove Row
 */
function removeItemRow(btn) {
    const row = btn.closest('tr');
    if (row) {
        row.remove();
        calculateTotals();
    }
}

/**
 * Master Calculation Function for Invoice & Live Preview Injection
 */
function calculateTotals() {
    updateInvoiceHeader();

    const inputRows = document.querySelectorAll('#itemsTableBody tr');
    const previewTbody = document.getElementById('invoiceTableBody');
    if (!previewTbody) return;

    previewTbody.innerHTML = '';

    let totalQty = 0;
    let subTotal = 0;

    inputRows.forEach((row, index) => {
        const name = row.querySelector('.item-name')?.value || '-';
        const mg = row.querySelector('.item-mg')?.value || '-';
        const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
        const amount = qty * price;

        totalQty += qty;
        subTotal += amount;

        // Render line item on printable invoice preview
        const prevTr = document.createElement('tr');
        prevTr.className = "border-b border-slate-100";
        prevTr.innerHTML = `
            <td class="p-2 font-bold text-slate-400">${index + 1}</td>
            <td class="p-2 font-bold text-slate-800">${name}</td>
            <td class="p-2 text-center text-slate-600 font-medium">${mg}</td>
            <td class="p-2 text-center font-semibold">${qty}</td>
            <td class="p-2 text-right">${globalCurrency} ${price.toFixed(2)}</td>
            <td class="p-2 text-right font-bold text-slate-800">${globalCurrency} ${amount.toFixed(2)}</td>
        `;
        previewTbody.appendChild(prevTr);
    });

    // Discount and Tax Calculations
    const discount = parseFloat(document.getElementById('discountInput')?.value) || 0;
    const taxPercent = parseFloat(document.getElementById('taxInput')?.value) || 0;

    const taxableBase = Math.max(0, subTotal - discount);
    const taxAmount = (taxableBase * taxPercent) / 100;
    const grandTotal = taxableBase + taxAmount;

    // Display Totals
    document.getElementById('dispTotalQty').innerText = totalQty;
    document.getElementById('dispSubTotal').innerText = subTotal.toFixed(2);
    document.getElementById('dispDiscount').innerText = discount.toFixed(2);
    document.getElementById('dispTax').innerText = taxAmount.toFixed(2);
    document.getElementById('dispGrandTotal').innerText = grandTotal.toFixed(2);
}

/**
 * Save Current Invoice Record in Memory for History & Search
 */
function saveInvoiceToHistory() {
    const patientName = document.getElementById('custName')?.value.trim() || 'Patient';
    const grandTotal = document.getElementById('dispGrandTotal')?.innerText || '0.00';

    const invoiceData = {
        invNum: currentInvoiceNum,
        patientName: patientName,
        totalAmount: grandTotal,
        currency: globalCurrency,
        date: new Date().toLocaleDateString()
    };

    savedInvoicesHistory.push(invoiceData);
}

/**
 * Action: Download Invoice as PDF
 */
function downloadPDF() {
    saveInvoiceToHistory();
    const element = document.getElementById('invoicePreview');

    const opt = {
        margin: 0.3,
        filename: `RakaBill_Invoice_${currentInvoiceNum}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save().then(() => {
            incrementInvoiceNumber();
        });
    } else {
        window.print();
        incrementInvoiceNumber();
    }
}

/**
 * Action: Print Invoice
 */
function printInvoice() {
    saveInvoiceToHistory();
    window.print();
    incrementInvoiceNumber();
}

/**
 * Action: Web Share Invoice
 */
function shareInvoice() {
    const total = document.getElementById('dispGrandTotal')?.innerText || '0.00';
    const patientName = document.getElementById('custName')?.value || 'Patient';
    const textMessage = `RakaBill Invoice #${currentInvoiceNum} for ${patientName}\nTotal Amount: ${globalCurrency} ${total}`;

    if (navigator.share) {
        navigator.share({
            title: `RakaBill Invoice #${currentInvoiceNum}`,
            text: textMessage,
            url: window.location.href
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(textMessage);
        alert(`Invoice detail copied to clipboard:\n\n${textMessage}`);
    }
}

/**
 * Increment Serial Invoice Number Automatically
 */
function incrementInvoiceNumber() {
    currentInvoiceNum++;
    updateInvoiceNumberDisplay();
}

function updateInvoiceNumberDisplay() {
    const invNumInput = document.getElementById('invNumber');
    const dispInvNum = document.getElementById('dispInvNumber');
    if (invNumInput) invNumInput.value = currentInvoiceNum;
    if (dispInvNum) dispInvNum.innerText = currentInvoiceNum;
}

/**
 * Search Invoice by Invoice # or Patient Name
 */
function searchInvoices() {
    const query = document.getElementById('searchInput')?.value.toLowerCase().trim();
    if (!query) return;

    const match = savedInvoicesHistory.find(inv => 
        inv.invNum.toString().includes(query) || 
        inv.patientName.toLowerCase().includes(query)
    );

    if (match) {
        alert(` Record Found!\n\nInvoice #: ${match.invNum}\nPatient: ${match.patientName}\nAmount: ${match.currency} ${match.totalAmount}\nDate: ${match.date}`);
    }
}

