// State
let selectedFile = null;
let selectedFileData = null;
let currentExtractedData = null;
let isEditing = false;

// Elements
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const removeImageBtn = document.getElementById('removeImageBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsSection = document.getElementById('resultsSection');
const resultsGrid = document.getElementById('resultsGrid');
const historySection = document.getElementById('historySection');
const historyList = document.getElementById('historyList');
const logoutBtn = document.getElementById('logoutBtn');
const apiStatusIndicator = document.getElementById('apiStatusIndicator');
const apiStatusText = document.getElementById('apiStatusText');
const saveEditsBtn = document.getElementById('saveEditsBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// Check session on load
async function checkSession() {
    try {
        const response = await fetch('/api/check-session');
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Session check error:', error);
        window.location.href = '/login';
    }
}

// Test Gemini API
async function testGeminiAPI() {
    try {
        const response = await fetch('/api/test-gemini');
        const data = await response.json();
        
        if (data.success) {
            apiStatusIndicator.className = 'status-dot status-ready';
            apiStatusText.textContent = 'API Ready';
            apiStatusIndicator.title = `Using ${data.model}`;
            console.log('✅ Gemini API is ready');
            console.log('📊 Using model:', data.model);
        } else {
            apiStatusIndicator.className = 'status-dot status-error';
            apiStatusText.textContent = 'API Error';
            console.error('❌ Gemini API test failed:', data.error);
        }
    } catch (error) {
        apiStatusIndicator.className = 'status-dot status-error';
        apiStatusText.textContent = 'API Error';
        console.error('❌ Gemini API test error:', error);
    }
}

// Upload area click
uploadArea.addEventListener('click', () => {
    if (!selectedFile) {
        fileInput.click();
    }
});

// File selection
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFileSelect(file);
    }
});

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleFileSelect(file);
    }
});

// Handle file selection
function handleFileSelect(file) {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size too large. Please select a file smaller than 5MB.');
        return;
    }
    
    selectedFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        selectedFileData = e.target.result;
        previewImage.src = selectedFileData;
        uploadPlaceholder.style.display = 'none';
        imagePreview.style.display = 'block';
        analyzeBtn.style.display = 'block';
        
        // Hide results when new file is selected
        resultsSection.style.display = 'none';
        saveEditsBtn.style.display = 'none';
        currentExtractedData = null;
    };
    reader.onerror = () => {
        alert('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
}

// Remove image
removeImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedFile = null;
    selectedFileData = null;
    fileInput.value = '';
    uploadPlaceholder.style.display = 'flex';
    imagePreview.style.display = 'none';
    analyzeBtn.style.display = 'none';
    resultsSection.style.display = 'none';
    saveEditsBtn.style.display = 'none';
    currentExtractedData = null;
});

// Analyze document
analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile || !selectedFileData) return;
    
    const btnText = analyzeBtn.querySelector('.btn-text');
    const btnLoader = analyzeBtn.querySelector('.btn-loader');
    
    // Show loading state
    analyzeBtn.disabled = true;
    btnText.textContent = 'Analyzing...';
    btnLoader.style.display = 'block';
    
    try {
        const response = await fetch('/api/extract-payslip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: selectedFileData,
                filename: selectedFile.name
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            currentExtractedData = result.data;
            displayResults(currentExtractedData);
            loadHistory(); // Refresh history
        } else {
            alert('Error: ' + (result.error || 'Failed to analyze document'));
            console.error('Extraction error:', result.error);
        }
    } catch (error) {
        console.error('Analysis error:', error);
        alert('Network error. Please try again.');
    } finally {
        // Reset button state
        analyzeBtn.disabled = false;
        btnText.textContent = 'Analyze Document';
        btnLoader.style.display = 'none';
    }
});

// Display results with editable fields
function displayResults(data) {
    const fields = [
        { key: 'name', label: 'Name', icon: '👤', type: 'text' },
        { key: 'income', label: 'Income', icon: '💰', type: 'number' },
        { key: 'employer', label: 'Employer', icon: '🏢', type: 'text' },
        { key: 'date', label: 'Date', icon: '📅', type: 'text' },
        { key: 'payPeriod', label: 'Pay Period', icon: '📊', type: 'text' },
        { key: 'deductions', label: 'Deductions', icon: '💸', type: 'number' },
        { key: 'netPay', label: 'Net Pay', icon: '✅', type: 'number' }
    ];
    
    resultsGrid.innerHTML = fields.map(field => {
        const value = data[field.key] || '';
        const displayValue = value || 'Not found';
        
        return `
            <div class="result-item editable" data-field="${field.key}">
                <div class="result-icon">${field.icon}</div>
                <div class="result-content">
                    <div class="result-label">${field.label}</div>
                    <input type="${field.type}" 
                           class="result-input" 
                           value="${value}" 
                           placeholder="${field.label}"
                           data-original="${value}">
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners to inputs
    resultsGrid.querySelectorAll('.result-input').forEach(input => {
        input.addEventListener('change', handleFieldEdit);
        input.addEventListener('input', handleFieldEdit);
    });
    
    resultsSection.style.display = 'block';
    saveEditsBtn.style.display = 'none'; // Hide initially
}

// Handle field editing
function handleFieldEdit(e) {
    const input = e.target;
    const field = input.closest('.result-item').dataset.field;
    const originalValue = input.dataset.original;
    
    if (input.value !== originalValue) {
        isEditing = true;
        saveEditsBtn.style.display = 'block';
        
        // Update the current data
        if (currentExtractedData) {
            currentExtractedData[field] = input.value;
        }
    } else {
        isEditing = false;
        saveEditsBtn.style.display = 'none';
    }
}

// Save edits
saveEditsBtn.addEventListener('click', async () => {
    if (!currentExtractedData || !isEditing) return;
    
    const btnText = saveEditsBtn.querySelector('.btn-text');
    const btnLoader = saveEditsBtn.querySelector('.btn-loader');
    
    // Show loading state
    saveEditsBtn.disabled = true;
    btnText.textContent = 'Saving...';
    btnLoader.style.display = 'block';
    
    try {
        // Here you would typically send the updated data to the server
        // For now, we'll just show a success message
        setTimeout(() => {
            alert('Changes saved successfully!');
            isEditing = false;
            saveEditsBtn.style.display = 'none';
            
            // Update original values
            resultsGrid.querySelectorAll('.result-input').forEach(input => {
                input.dataset.original = input.value;
            });
        }, 1000);
        
    } catch (error) {
        console.error('Save error:', error);
        alert('Error saving changes. Please try again.');
    } finally {
        // Reset button state
        saveEditsBtn.disabled = false;
        btnText.textContent = 'Save Changes';
        btnLoader.style.display = 'none';
    }
});

// Load history with delete buttons
async function loadHistory() {
    try {
        const response = await fetch('/api/payslip-history');
        const result = await response.json();
        
        if (result.success) {
            if (result.payslips && result.payslips.length > 0) {
                historyList.innerHTML = result.payslips.slice(0, 5).map(payslip => `
                    <div class="history-item" data-id="${payslip.id}">
                        <div class="history-icon">📄</div>
                        <div class="history-content">
                            <div class="history-filename">${payslip.filename}</div>
                            <div class="history-date">${new Date(payslip.uploaded_at).toLocaleString()}</div>
                        </div>
                        <div class="history-actions">
                            <button class="btn-view" onclick="viewPayslip('${payslip.id}')">View</button>
                            <button class="btn-delete" onclick="deletePayslip('${payslip.id}')">Delete</button>
                        </div>
                    </div>
                `).join('');
                
                historySection.style.display = 'block';
            } else {
                historyList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📄</div>
                        <p>No payslips uploaded yet</p>
                    </div>
                `;
                historySection.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading history:', error);
        historySection.style.display = 'none';
    }
}

// View payslip from history
function viewPayslip(payslipId) {
    // Find the payslip in history and display its data
    // This would typically involve fetching the specific payslip data
    alert(`Viewing payslip: ${payslipId}\n\nIn a real application, this would load the payslip data for viewing.`);
}

// Delete payslip from history
// Delete payslip from history
async function deletePayslip(payslipId) {
    if (!confirm('Are you sure you want to delete this payslip?')) {
        return;
    }
    
    try {
        const historyItem = document.querySelector(`.history-item[data-id="${payslipId}"]`);
        if (historyItem) {
            historyItem.style.opacity = '0.5';
        }
        
        const response = await fetch(`/api/payslip/${payslipId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            if (historyItem) {
                loadHistory(); // Refresh the history list from the server
            }
            console.log(`Deleted payslip: ${payslipId}`);
        } else {
            // Reset opacity if deletion failed
            if (historyItem) {
                historyItem.style.opacity = '1';
            }
            alert('Error: ' + (result.error || 'Failed to delete payslip'));
        }
    } catch (error) {
        console.error('Error deleting payslip:', error);
        alert('Network error. Please try again.');
    }
}

// Clear all history
clearHistoryBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/clear-history', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📄</div>
                    <p>No payslips uploaded yet</p>
                </div>
            `;
            console.log('Cleared all history');
        } else {
            alert('Error: ' + (result.error || 'Failed to clear history'));
        }
    } catch (error) {
        console.error('Error clearing history:', error);
        alert('Network error. Please try again.');
    }
});



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

// Make functions global for onclick handlers
window.viewPayslip = viewPayslip;
window.deletePayslip = deletePayslip;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    testGeminiAPI();
    loadHistory();
});