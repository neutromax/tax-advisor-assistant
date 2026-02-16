// Tax Bot State
let currentDocumentType = null;
let selectedDocFile = null;
let selectedDocFileData = null;
let taxProfile = null;

// Elements
const chatMessages = document.getElementById('chatMessages');
const quickActions = document.getElementById('quickActions');
const documentUpload = document.getElementById('documentUpload');
const docUploadArea = document.getElementById('docUploadArea');
const docFileInput = document.getElementById('docFileInput');
const docUploadPlaceholder = document.getElementById('docUploadPlaceholder');
const docImagePreview = document.getElementById('docImagePreview');
const docPreviewImage = document.getElementById('docPreviewImage');
const removeDocImageBtn = document.getElementById('removeDocImageBtn');
const verifyDocBtn = document.getElementById('verifyDocBtn');
const taxSummary = document.getElementById('taxSummary');
const deductionsBreakdown = document.getElementById('deductionsBreakdown');
const deductionsList = document.getElementById('deductionsList');
const documentsSection = document.getElementById('documentsSection');
const documentsList = document.getElementById('documentsList');
const logoutBtn = document.getElementById('logoutBtn');

// Tax knowledge base
const taxKnowledge = {
    "80C": {
        name: "Section 80C",
        limit: 150000,
        description: "Investments in PPF, ELSS, NSC, Tax-saving FDs, Life Insurance, EPF, etc.",
        examples: ["PPF statement", "ELSS investment proof", "Life insurance premium receipt", "NSC certificate"]
    },
    "80D": {
        name: "Section 80D", 
        limit: 25000,
        description: "Health insurance premium for self, spouse, and dependent children",
        examples: ["Health insurance premium receipt", "Medical insurance policy document"]
    },
    "HRA": {
        name: "House Rent Allowance",
        limit: 0, // Actual limit depends on salary structure
        description: "Rent paid for accommodation if HRA is part of salary",
        examples: ["Rent receipts", "Rental agreement", "Landlord PAN card"]
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadTaxProfile();
    setupEventListeners();
    // Load existing payslip data when page loads
    loadExistingPayslipData();
});

// Setup event listeners
function setupEventListeners() {
    // Quick actions
    quickActions.addEventListener('click', (e) => {
        if (e.target.classList.contains('quick-action-btn')) {
            const action = e.target.dataset.action;
            handleQuickAction(action);
        }
    });

    // Document upload
    docUploadArea.addEventListener('click', () => {
        if (!selectedDocFile) {
            docFileInput.click();
        }
    });

    docFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleDocFileSelect(file);
        }
    });

    // Remove document image
    removeDocImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetDocUpload();
    });

    // Verify document
    verifyDocBtn.addEventListener('click', verifyDocument);

    // Logout
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/login';
        }
    });
}

// Load existing payslip data
async function loadExistingPayslipData() {
    try {
        const response = await fetch('/api/payslip-history');
        const result = await response.json();
        
        if (result.success && result.payslips.length > 0) {
            // Calculate total income from all payslips
            let totalIncome = 0;
            let payslipCount = 0;
            
            result.payslips.forEach(payslip => {
                const income = parseFloat(payslip.extracted_data.income) || 0;
                totalIncome += income;
                payslipCount++;
            });
            
            if (totalIncome > 0) {
                // Update tax profile with total income
                const updateResponse = await fetch('/api/tax/update-income', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ income: totalIncome })
                });
                
                const updateResult = await updateResponse.json();
                
                if (updateResult.success) {
                    taxProfile = updateResult.tax_profile;
                    updateTaxSummary();
                    
                    // Add message about loaded data
                    addMessage('bot', `I found ${payslipCount} payslip(s) with total income of ₹${totalIncome.toLocaleString('en-IN')}.`);
                    addMessage('bot', `Your tax profile has been updated. Let's work on maximizing your deductions!`);
                }
            }
        } else {
            addMessage('bot', "I don't see any analyzed payslips yet. Please upload and analyze your payslips in the dashboard first.");
        }
    } catch (error) {
        console.error('Error loading existing payslip data:', error);
        addMessage('bot', "I encountered an error while loading your existing data. Please try analyzing your income again.");
    }
}

// Load tax profile
async function loadTaxProfile() {
    try {
        const response = await fetch('/api/tax/profile');
        const result = await response.json();
        
        if (result.success) {
            taxProfile = result.tax_profile;
            updateTaxSummary();
            loadTaxDocuments();
        }
    } catch (error) {
        console.error('Error loading tax profile:', error);
    }
}

// Handle quick actions
function handleQuickAction(action) {
    switch (action) {
        case 'analyze_income':
            analyzeIncome();
            break;
        case 'section_80c':
            startSection80C();
            break;
        case 'calculate_tax':
            calculateFinalTax();
            break;
    }
}

// Analyze income from payslips
async function analyzeIncome() {
    addMessage('user', 'Analyze my income from uploaded payslips');
    
    try {
        // Get payslip history
        const response = await fetch('/api/payslip-history');
        const result = await response.json();
        
        if (result.success && result.payslips.length > 0) {
            // Calculate total income from all payslips
            let totalIncome = 0;
            let payslipCount = 0;
            
            result.payslips.forEach(payslip => {
                const income = parseFloat(payslip.extracted_data.income) || 0;
                totalIncome += income;
                payslipCount++;
            });
            
            // Update tax profile with total income
            const updateResponse = await fetch('/api/tax/update-income', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ income: totalIncome })
            });
            
            const updateResult = await updateResponse.json();
            
            if (updateResult.success) {
                taxProfile = updateResult.tax_profile;
                updateTaxSummary();
                
                addMessage('bot', `I've analyzed your ${payslipCount} uploaded payslip(s). Your total annual income is ₹${totalIncome.toLocaleString('en-IN')}.`);
                addMessage('bot', `Now let's work on maximizing your tax deductions. Would you like to explore Section 80C deductions?`);
            }
        } else {
            addMessage('bot', "I couldn't find any uploaded payslips. Please upload your payslips first in the dashboard to analyze your income.");
        }
    } catch (error) {
        console.error('Error analyzing income:', error);
        addMessage('bot', "Sorry, I encountered an error while analyzing your income. Please try again.");
    }
}

// Start Section 80C deduction process
function startSection80C() {
    addMessage('user', 'I want to claim Section 80C deductions');
    
    const knowledge = taxKnowledge['80C'];
    let message = `**Section 80C Deductions**\n\n`;
    message += `You can claim up to ₹${knowledge.limit.toLocaleString('en-IN')} under Section 80C.\n\n`;
    message += `**Eligible Investments:**\n`;
    message += `• Public Provident Fund (PPF)\n`;
    message += `• Equity Linked Savings Scheme (ELSS)\n`;
    message += `• National Savings Certificate (NSC)\n`;
    message += `• Tax-saving Fixed Deposits\n`;
    message += `• Life Insurance Premium\n`;
    message += `• Employee Provident Fund (EPF)\n`;
    message += `• Sukanya Samriddhi Account\n\n`;
    message += `Please upload your investment documents for verification.`;
    
    addMessage('bot', message);
    
    // Show document upload for 80C
    currentDocumentType = '80C';
    documentUpload.style.display = 'block';
}

// Verify uploaded document
async function verifyDocument() {
    if (!selectedDocFile || !selectedDocFileData || !currentDocumentType) return;
    
    const btnText = verifyDocBtn.querySelector('.btn-text');
    const btnLoader = verifyDocBtn.querySelector('.btn-loader');
    
    // Show loading state
    verifyDocBtn.disabled = true;
    btnText.textContent = 'Verifying...';
    btnLoader.style.display = 'block';
    
    try {
        const response = await fetch('/api/tax/verify-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: selectedDocFileData,
                filename: selectedDocFile.name,
                document_type: currentDocumentType
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            const verification = result.verification_result;
            
            let message = `**Document Verification Result:**\n\n`;
            message += `• Document Type: ${verification.document_type}\n`;
            message += `• Amount: ₹${verification.amount?.toLocaleString('en-IN') || '0'}\n`;
            message += `• Valid for ${currentDocumentType}: ${verification.valid_for_80C || verification.valid_for_80D || verification.valid_for_HRA ? '✅ Yes' : '❌ No'}\n`;
            message += `• Confidence: ${verification.verification_confidence}\n\n`;
            
            const isValid = verification.valid_for_80C || verification.valid_for_80D || verification.valid_for_HRA;
            if (isValid) {
                message += `Great! This document is eligible for tax deduction. The amount has been added to your ${currentDocumentType} deductions.`;
                
                // Update tax profile with the verified amount
                await updateTaxDeduction(currentDocumentType, verification.amount || verification.rent_amount || 0);
            } else {
                message += `This document doesn't appear to be eligible for ${currentDocumentType} deductions. Please upload a valid document.`;
            }
            
            addMessage('bot', message);
            
            // Reset upload and reload data
            resetDocUpload();
            loadTaxProfile();
            loadTaxDocuments();
            
        } else {
            addMessage('bot', 'Sorry, I encountered an error while verifying your document. Please try again with a clearer image.');
        }
    } catch (error) {
        console.error('Error verifying document:', error);
        addMessage('bot', 'Network error while verifying document. Please try again.');
    } finally {
        // Reset button state
        verifyDocBtn.disabled = false;
        btnText.textContent = 'Verify Document';
        btnLoader.style.display = 'none';
    }
}

// Update tax deduction in profile
async function updateTaxDeduction(section, amount) {
    try {
        // Get current tax profile
        const profileResponse = await fetch('/api/tax/profile');
        const profileResult = await profileResponse.json();
        
        if (profileResult.success) {
            const currentProfile = profileResult.tax_profile;
            const currentAmount = currentProfile.deductions[section] || 0;
            const newAmount = currentAmount + parseFloat(amount);
            
            // Update the deduction
            const updateResponse = await fetch('/api/tax/update-deduction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    section: section,
                    amount: newAmount
                })
            });
            
            return await updateResponse.json();
        }
    } catch (error) {
        console.error('Error updating tax deduction:', error);
    }
}

// Calculate final tax
async function calculateFinalTax() {
    addMessage('user', 'Calculate my final tax liability');
    
    try {
        const response = await fetch('/api/tax/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const calc = result.tax_calculation;
            taxProfile = result.tax_profile;
            
            let message = `**Your Tax Calculation**\n\n`;
            message += `• Total Income: ₹${calc.total_income.toLocaleString('en-IN')}\n`;
            message += `• Total Deductions: ₹${calc.total_deductions.toLocaleString('en-IN')}\n`;
            message += `• Taxable Income: ₹${calc.taxable_income.toLocaleString('en-IN')}\n`;
            message += `• **Tax Payable: ₹${calc.tax_payable.toLocaleString('en-IN')}**\n`;
            message += `• Effective Tax Rate: ${calc.effective_tax_rate.toFixed(1)}%\n\n`;
            
            if (calc.tax_payable === 0) {
                message += `🎉 Excellent! You don't have any tax liability.`;
            } else if (calc.effective_tax_rate < 5) {
                message += `Good job! Your tax liability is relatively low.`;
            } else {
                message += `Consider exploring more deductions to reduce your tax liability further.`;
            }
            
            addMessage('bot', message);
            updateTaxSummary();
            
        } else {
            addMessage('bot', 'Sorry, I encountered an error while calculating your tax. Please try again.');
        }
    } catch (error) {
        console.error('Error calculating tax:', error);
        addMessage('bot', 'Network error while calculating tax. Please try again.');
    }
}

// Handle document file selection
function handleDocFileSelect(file) {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size too large. Please select a file smaller than 5MB.');
        return;
    }
    
    selectedDocFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        selectedDocFileData = e.target.result;
        docPreviewImage.src = selectedDocFileData;
        docUploadPlaceholder.style.display = 'none';
        docImagePreview.style.display = 'block';
        verifyDocBtn.style.display = 'block';
    };
    reader.onerror = () => {
        alert('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
}

// Reset document upload
function resetDocUpload() {
    selectedDocFile = null;
    selectedDocFileData = null;
    docFileInput.value = '';
    docUploadPlaceholder.style.display = 'flex';
    docImagePreview.style.display = 'none';
    verifyDocBtn.style.display = 'none';
}

// Update tax summary display
function updateTaxSummary() {
    if (!taxProfile) return;
    
    const income = taxProfile.total_income || 0;
    const deductions = taxProfile.total_deductions || 0;
    const taxable = taxProfile.taxable_income || 0;
    const taxPayable = taxProfile.final_tax_payable || 0;
    
    taxSummary.innerHTML = `
        <div class="tax-summary-item">
            <div class="tax-summary-label">Total Income</div>
            <div class="tax-summary-value">₹${income.toLocaleString('en-IN')}</div>
        </div>
        <div class="tax-summary-item">
            <div class="tax-summary-label">Total Deductions</div>
            <div class="tax-summary-value">₹${deductions.toLocaleString('en-IN')}</div>
        </div>
        <div class="tax-summary-item">
            <div class="tax-summary-label">Taxable Income</div>
            <div class="tax-summary-value">₹${taxable.toLocaleString('en-IN')}</div>
        </div>
        <div class="tax-summary-item">
            <div class="tax-summary-label">Tax Payable</div>
            <div class="tax-summary-value highlight">₹${taxPayable.toLocaleString('en-IN')}</div>
        </div>
    `;
    
    // Update deductions breakdown
    updateDeductionsBreakdown();
}

// Update deductions breakdown
function updateDeductionsBreakdown() {
    if (!taxProfile || !taxProfile.deductions) return;
    
    const deductions = taxProfile.deductions;
    let hasDeductions = false;
    
    deductionsList.innerHTML = '';
    
    Object.keys(taxKnowledge).forEach(section => {
        const amount = deductions[section] || 0;
        if (amount > 0) {
            hasDeductions = true;
            const knowledge = taxKnowledge[section];
            const percentage = knowledge.limit > 0 ? (amount / knowledge.limit * 100) : 0;
            
            deductionsList.innerHTML += `
                <div class="deduction-item">
                    <div class="deduction-info">
                        <div class="deduction-name">${knowledge.name}</div>
                        <div class="deduction-limit">Limit: ₹${knowledge.limit.toLocaleString('en-IN')}</div>
                    </div>
                    <div class="deduction-amount">₹${amount.toLocaleString('en-IN')}</div>
                </div>
                ${knowledge.limit > 0 ? `
                <div class="progress-container">
                    <div class="progress-label">Utilization: ${Math.min(percentage, 100).toFixed(1)}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%"></div>
                    </div>
                </div>
                ` : ''}
            `;
        }
    });
    
    if (hasDeductions) {
        deductionsBreakdown.style.display = 'block';
    }
}

// Load tax documents
async function loadTaxDocuments() {
    try {
        const response = await fetch('/api/tax/documents');
        const result = await response.json();
        
        if (result.success && result.documents.length > 0) {
            documentsList.innerHTML = result.documents.map(doc => `
                <div class="document-item">
                    <div class="document-header">
                        <div class="document-type">${taxKnowledge[doc.document_type]?.name || doc.document_type}</div>
                        <div class="document-status status-verified">
                            Verified
                        </div>
                    </div>
                    <div class="document-filename">${doc.filename}</div>
                    <div class="document-amount">₹${(doc.amount || 0).toLocaleString('en-IN')}</div>
                </div>
            `).join('');
            
            documentsSection.style.display = 'block';
        } else {
            documentsSection.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading tax documents:', error);
    }
}

// Add message to chat
function addMessage(sender, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${sender === 'user' ? '👤' : '🤖'}</div>
        <div class="message-content">
            ${content.split('\n').map(line => `<p>${line}</p>`).join('')}
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Make functions global for onclick handlers
window.handleQuickAction = handleQuickAction;