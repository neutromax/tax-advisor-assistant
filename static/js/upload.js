// Upload functionality for Phase 3
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Upload module loaded');
    
    // Elements - declare with let so they can be reassigned
    let uploadArea = document.getElementById('uploadArea');
    let fileInput = document.getElementById('fileInput');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');
    const pdfIcon = document.getElementById('pdfIcon');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileType = document.getElementById('fileType');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    
    // Buttons - will be reassigned after reset
    let viewImageBtn = document.getElementById('viewImageBtn');
    let viewPdfBtn = document.getElementById('viewPdfBtn');
    let removeImageBtn = document.getElementById('removeImageBtn');
    let removePdfBtn = document.getElementById('removePdfBtn');
    
    let selectedFile = null;
    let selectedFileData = null;
    let isResetting = false;
    let currentExtractedData = null; // Store the last extracted data
    
    // Check if all elements exist
    if (!uploadArea) {
        console.error('Upload area not found!');
        return;
    }
    
    // Initialize button listeners
    function initButtonListeners() {
        // Re-get button references
        viewImageBtn = document.getElementById('viewImageBtn');
        viewPdfBtn = document.getElementById('viewPdfBtn');
        removeImageBtn = document.getElementById('removeImageBtn');
        removePdfBtn = document.getElementById('removePdfBtn');
        
        // View/Download file buttons
        if (viewImageBtn) {
            viewImageBtn.removeEventListener('click', handleViewClick);
            viewImageBtn.addEventListener('click', handleViewClick);
        }
        
        if (viewPdfBtn) {
            viewPdfBtn.removeEventListener('click', handleViewClick);
            viewPdfBtn.addEventListener('click', handleViewClick);
        }
        
        // Remove buttons
        if (removeImageBtn) {
            removeImageBtn.removeEventListener('click', handleRemoveClick);
            removeImageBtn.addEventListener('click', handleRemoveClick);
        }
        
        if (removePdfBtn) {
            removePdfBtn.removeEventListener('click', handleRemoveClick);
            removePdfBtn.addEventListener('click', handleRemoveClick);
        }
    }
    
    // Handle view button click
    function handleViewClick(e) {
        e.stopPropagation();
        e.preventDefault();
        viewFile();
    }
    
    // Handle remove button click
    function handleRemoveClick(e) {
        e.stopPropagation();
        e.preventDefault();
        resetUpload();
    }
    
    // Click on upload area
    uploadArea.addEventListener('click', (e) => {
        // Don't trigger if clicking on buttons
        if (e.target.classList.contains('btn-view') || 
            e.target.classList.contains('btn-remove') ||
            e.target.closest('.btn-view') || 
            e.target.closest('.btn-remove')) {
            return;
        }
        
        if (!selectedFile && !isResetting) {
            fileInput.click();
        }
    });
    
    // File selection via input
    fileInput.addEventListener('change', (e) => {
        if (isResetting) return;
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
        
        if (isResetting) return;
        
        const file = e.dataTransfer.files[0];
        if (file) {
            const allowedTypes = ['image/', 'application/pdf'];
            const isValid = allowedTypes.some(type => file.type.startsWith(type));
            
            if (isValid) {
                handleFileSelect(file);
            } else {
                alert('Please upload an image (JPG, PNG) or PDF file');
            }
        }
    });
    
    // Handle file selection
    function handleFileSelect(file) {
        if (isResetting) return;
        
        console.log('File selected:', file.name);
        
        const allowedTypes = ['image/', 'application/pdf'];
        const isValid = allowedTypes.some(type => file.type.startsWith(type));
        
        if (!isValid) {
            alert('Please upload an image (JPG, PNG) or PDF file');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('File size too large. Please select a file smaller than 5MB.');
            return;
        }
        
        selectedFile = file;
        
        fileName.textContent = truncateFileName(file.name, 30);
        fileSize.textContent = formatFileSize(file.size);
        
        if (file.type.startsWith('image/')) {
            fileType.textContent = '📷 Image';
        } else if (file.type === 'application/pdf') {
            fileType.textContent = '📄 PDF';
        }
        
        fileInfo.style.display = 'block';
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            if (isResetting) return;
            
            console.log('File loaded successfully');
            selectedFileData = e.target.result;
            
            if (file.type.startsWith('image/')) {
                previewImage.src = selectedFileData;
                previewContainer.style.display = 'block';
                pdfIcon.style.display = 'none';
                uploadPlaceholder.style.display = 'none';
                
                previewImage.onload = () => {
                    if (!isResetting) {
                        console.log('Image preview loaded');
                        initButtonListeners();
                    }
                };
                
                previewImage.onerror = () => {
                    if (!isResetting) {
                        console.error('Failed to load image preview');
                        alert('Failed to load image preview. Please try again.');
                        resetUpload();
                    }
                };
                
            } else if (file.type === 'application/pdf') {
                previewContainer.style.display = 'none';
                pdfIcon.style.display = 'block';
                uploadPlaceholder.style.display = 'none';
                initButtonListeners();
            }
            
            analyzeBtn.style.display = 'block';
        };
        
        reader.onerror = () => {
            if (!isResetting) {
                console.error('FileReader error');
                alert('Error reading file. Please try again.');
                resetUpload();
            }
        };
        
        reader.readAsDataURL(file);
    }
    
    function truncateFileName(name, maxLength) {
        if (name.length <= maxLength) return name;
        const ext = name.split('.').pop();
        const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
        const truncated = nameWithoutExt.substring(0, maxLength - 3 - ext.length);
        return truncated + '...' + ext;
    }
    
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    
    // View file in modal
    function viewFile() {
        if (!selectedFile || !selectedFileData) {
            alert('No file to view');
            return;
        }
        
        const modal = document.getElementById('imageModal');
        const modalImage = document.getElementById('modalImage');
        const modalPdf = document.getElementById('modalPdf');
        const pdfViewer = document.getElementById('pdfViewer');
        const downloadBtn = document.getElementById('downloadBtn');
        
        if (!modal) {
            alert('Modal not found. Please refresh the page.');
            return;
        }
        
        // Set download link
        downloadBtn.href = selectedFileData;
        downloadBtn.download = selectedFile.name;
        
        if (selectedFile.type.startsWith('image/')) {
            modalImage.src = selectedFileData;
            modalImage.style.display = 'block';
            modalPdf.style.display = 'none';
        } else if (selectedFile.type === 'application/pdf') {
            pdfViewer.src = selectedFileData;
            modalPdf.style.display = 'block';
            modalImage.style.display = 'none';
        }
        
        modal.style.display = 'flex';
        
        const closeBtn = document.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.onclick = function() {
                modal.style.display = 'none';
                if (selectedFile.type.startsWith('image/')) {
                    modalImage.src = '';
                } else {
                    pdfViewer.src = '';
                }
            };
        }
        
        window.onclick = function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
                if (selectedFile.type.startsWith('image/')) {
                    modalImage.src = '';
                } else {
                    pdfViewer.src = '';
                }
            }
        };
    }
    
    function resetUpload() {
        if (isResetting) return;
        isResetting = true;
        
        console.log('Resetting upload');
        
        selectedFile = null;
        selectedFileData = null;
        currentExtractedData = null;
        
        // Reset file input
        const oldFileInput = fileInput;
        const newFileInput = document.createElement('input');
        newFileInput.type = 'file';
        newFileInput.id = 'fileInput';
        newFileInput.accept = 'image/*,.pdf';
        newFileInput.style.display = 'none';
        
        newFileInput.addEventListener('change', (e) => {
            if (isResetting) return;
            const file = e.target.files[0];
            if (file) {
                handleFileSelect(file);
            }
        });
        
        if (oldFileInput && oldFileInput.parentNode) {
            oldFileInput.parentNode.replaceChild(newFileInput, oldFileInput);
            fileInput = newFileInput;
        }
        
        // Reset UI
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
        if (previewContainer) previewContainer.style.display = 'none';
        if (pdfIcon) pdfIcon.style.display = 'none';
        if (analyzeBtn) analyzeBtn.style.display = 'none';
        if (fileInfo) fileInfo.style.display = 'none';
        if (progressBar) progressBar.style.display = 'none';
        
        if (uploadArea) uploadArea.classList.remove('drag-over');
        
        if (previewImage) {
            previewImage.src = '';
            previewImage.removeAttribute('src');
        }
        
        console.log('✅ Upload area reset complete');
        
        setTimeout(() => {
            isResetting = false;
        }, 100);
    }
    
    analyzeBtn.addEventListener('click', async () => {
        if (!selectedFile || !selectedFileData) return;
        
        const btnText = analyzeBtn.querySelector('.btn-text');
        const btnLoader = analyzeBtn.querySelector('.btn-loader');
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
        analyzeBtn.disabled = true;
        
        progressBar.style.display = 'block';
        progressFill.style.width = '0%';
        
        try {
            const response = await fetch('/analyze-payslip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: selectedFileData })
            });
            
            const result = await response.json();
            
            progressFill.style.width = '100%';
            
            if (result.success) {
                currentExtractedData = result.data;
                showResults(result.data);
            } else {
                alert('Analysis failed: ' + (result.error || 'Unknown error'));
            }
            
        } catch (error) {
            console.error('Error:', error);
            alert('Network error. Please try again.');
        } finally {
            setTimeout(() => {
                btnText.style.display = 'block';
                btnLoader.style.display = 'none';
                analyzeBtn.disabled = false;
                progressBar.style.display = 'none';
                progressFill.style.width = '0%';
            }, 500);
        }
    });

    function showResults(data) {
        const sections = document.querySelectorAll('.section');
        const resultsSection = sections[1];
        
        if (!resultsSection) {
            console.error('Results section not found');
            return;
        }
        
        const formatCurrency = (value) => {
            if (!value) return '';
            const num = parseFloat(value);
            if (isNaN(num)) return '';
            return '₹' + num.toLocaleString('en-IN');
        };
        
        const safeValue = (val) => val !== null && val !== undefined ? val : '';
        
        const resultsHTML = `
            <h2 class="section-title">📊 Analysis Results</h2>
            <p class="section-desc">AI-extracted information from your documents</p>
            <div class="results-grid">
                <div class="result-card">
                    <div class="result-label"><span>👤</span> EMPLOYEE NAME</div>
                    <input type="text" id="editName" class="result-input" value="${safeValue(data.name)}" placeholder="Enter full name">
                    ${data.name ? `<div class="extracted-value">${data.name}</div>` : ''}
                </div>
                <div class="result-card">
                    <div class="result-label"><span>💰</span> MONTHLY INCOME</div>
                    <input type="number" id="editIncome" class="result-input" value="${safeValue(data.income)}" placeholder="Enter amount in ₹">
                    ${data.income ? `<div class="extracted-value">${formatCurrency(data.income)}</div>` : ''}
                </div>
                <div class="result-card">
                    <div class="result-label"><span>🏢</span> EMPLOYER</div>
                    <input type="text" id="editEmployer" class="result-input" value="${safeValue(data.employer)}" placeholder="Enter company name">
                    ${data.employer ? `<div class="extracted-value">${data.employer}</div>` : ''}
                </div>
                <div class="result-card">
                    <div class="result-label"><span>📅</span> PAY DATE</div>
                    <input type="text" id="editDate" class="result-input" value="${safeValue(data.date)}" placeholder="DD-MM-YYYY">
                    ${data.date ? `<div class="extracted-value">${data.date}</div>` : ''}
                </div>
                <div class="result-card">
                    <div class="result-label"><span>💸</span> TOTAL DEDUCTIONS</div>
                    <input type="number" id="editDeductions" class="result-input" value="${safeValue(data.deductions)}" placeholder="Enter deductions in ₹">
                    ${data.deductions ? `<div class="extracted-value">${formatCurrency(data.deductions)}</div>` : ''}
                </div>
                <div class="result-card">
                    <div class="result-label"><span>✅</span> NET PAY (TAKE HOME)</div>
                    <input type="number" id="editNetPay" class="result-input" value="${safeValue(data.net_pay)}" placeholder="Enter net amount in ₹">
                    ${data.net_pay ? `<div class="extracted-value">${formatCurrency(data.net_pay)}</div>` : ''}
                </div>
            </div>
            <div class="results-actions">
                <button id="confirmResults" class="primary-btn"><span>✓</span> Confirm & Save</button>
                <button id="reanalyzeBtn" class="secondary-btn"><span>⟲</span> Re-analyze</button>
                <button id="manualEntryBtn" class="secondary-btn"><span>✎</span> Enter Manually</button>
            </div>
        `;
        
        resultsSection.innerHTML = resultsHTML;
        
        // Confirm button
        document.getElementById('confirmResults')?.addEventListener('click', function() {
            const confirmedData = {
                name: document.getElementById('editName')?.value,
                income: document.getElementById('editIncome')?.value,
                employer: document.getElementById('editEmployer')?.value,
                date: document.getElementById('editDate')?.value,
                deductions: document.getElementById('editDeductions')?.value,
                net_pay: document.getElementById('editNetPay')?.value
            };
            console.log('✅ Data confirmed:', confirmedData);
            alert('✅ Information saved successfully!');
        });
        
        // Re-analyze button - FIXED VERSION
        document.getElementById('reanalyzeBtn')?.addEventListener('click', async function() {
            if (!selectedFile || !selectedFileData) {
                alert('No file to re-analyze. Please upload first.');
                return;
            }
            
            // Show loading on the button
            const reanalyzeBtn = document.getElementById('reanalyzeBtn');
            const originalText = reanalyzeBtn.innerHTML;
            reanalyzeBtn.innerHTML = '<span>⟳</span> Analyzing...';
            reanalyzeBtn.disabled = true;
            
            // Show progress in results section
            resultsSection.innerHTML = `
                <h2 class="section-title">📊 Analysis Results</h2>
                <p class="section-desc">Re-analyzing your document...</p>
                <div class="results-placeholder">
                    <div class="loading-spinner"></div>
                    <p>Processing image again</p>
                </div>
            `;
            
            try {
                // Re-send the SAME image to backend
                const response = await fetch('/analyze-payslip', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: selectedFileData })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    currentExtractedData = result.data;
                    showResults(result.data);
                } else {
                    alert('Re-analysis failed: ' + (result.error || 'Unknown error'));
                    // Restore previous results
                    if (currentExtractedData) {
                        showResults(currentExtractedData);
                    } else {
                        resultsSection.innerHTML = `
                            <h2 class="section-title">📊 Analysis Results</h2>
                            <p class="section-desc">AI-extracted information from your documents</p>
                            <div class="results-placeholder">
                                <span>📄</span>
                                <p>Upload a payslip to see results</p>
                            </div>
                        `;
                    }
                }
                
            } catch (error) {
                console.error('Error:', error);
                alert('Network error. Please try again.');
                if (currentExtractedData) {
                    showResults(currentExtractedData);
                }
            } finally {
                reanalyzeBtn.innerHTML = originalText;
                reanalyzeBtn.disabled = false;
            }
        });
        
        // Manual Entry button
        document.getElementById('manualEntryBtn')?.addEventListener('click', function() {
            resultsSection.innerHTML = `
                <h2 class="section-title">✎ Manual Entry</h2>
                <p class="section-desc">Enter your salary details manually</p>
                <div class="manual-form">
                    <div class="form-group">
                        <label style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-weight: 500; color: #c0c4cc;">👤 Employee Name</label>
                        <input type="text" id="manualName" class="result-input" placeholder="Enter full name" 
                               style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px;">
                    </div>
                    <div class="form-group">
                        <label style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-weight: 500; color: #c0c4cc;">💰 Monthly Income (₹)</label>
                        <input type="number" id="manualIncome" class="result-input" placeholder="Enter amount" 
                               style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px;">
                    </div>
                    <div class="form-group">
                        <label style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-weight: 500; color: #c0c4cc;">🏢 Employer</label>
                        <input type="text" id="manualEmployer" class="result-input" placeholder="Enter company name" 
                               style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px;">
                    </div>
                    <div class="form-group">
                        <label style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-weight: 500; color: #c0c4cc;">📅 Pay Date</label>
                        <input type="text" id="manualDate" class="result-input" placeholder="DD-MM-YYYY" 
                               style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px;">
                    </div>
                    <div class="form-group">
                        <label style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-weight: 500; color: #c0c4cc;">💸 Total Deductions (₹)</label>
                        <input type="number" id="manualDeductions" class="result-input" placeholder="Enter amount" 
                               style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px;">
                    </div>
                    <div class="form-group">
                        <label style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-weight: 500; color: #c0c4cc;">✅ Net Pay (₹)</label>
                        <input type="number" id="manualNetPay" class="result-input" placeholder="Enter amount" 
                               style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px;">
                    </div>
                    <div class="results-actions">
                        <button id="saveManualBtn" class="primary-btn"><span>✓</span> Save Manual Entry</button>
                        <button id="backToResultsBtn" class="secondary-btn"><span>←</span> Back to Results</button>
                    </div>
                </div>
            `;
            
            document.getElementById('saveManualBtn')?.addEventListener('click', function() {
                const manualData = {
                    name: document.getElementById('manualName')?.value,
                    income: document.getElementById('manualIncome')?.value,
                    employer: document.getElementById('manualEmployer')?.value,
                    date: document.getElementById('manualDate')?.value,
                    deductions: document.getElementById('manualDeductions')?.value,
                    net_pay: document.getElementById('manualNetPay')?.value
                };
                
                if (!manualData.name || !manualData.income || !manualData.employer) {
                    alert('❌ Please fill in all required fields (Name, Income, Employer)');
                    return;
                }
                
                console.log('📝 Manual data saved:', manualData);
                alert('✅ Manual entry saved successfully!');
                currentExtractedData = manualData;
                showResults(manualData);
            });
            
            document.getElementById('backToResultsBtn')?.addEventListener('click', function() {
                if (currentExtractedData) {
                    showResults(currentExtractedData);
                } else {
                    resultsSection.innerHTML = `
                        <h2 class="section-title">📊 Analysis Results</h2>
                        <p class="section-desc">AI-extracted information from your documents</p>
                        <div class="results-placeholder">
                            <span>📄</span>
                            <p>Upload a payslip to see results</p>
                        </div>
                    `;
                }
            });
        });
    }
    
    window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
    });
});