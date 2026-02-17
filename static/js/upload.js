// Upload functionality for Phase 3
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Upload module loaded');
    
    // Elements
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');
    const pdfIcon = document.getElementById('pdfIcon');
    const viewImageBtn = document.getElementById('viewImageBtn');
    const viewPdfBtn = document.getElementById('viewPdfBtn');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const removePdfBtn = document.getElementById('removePdfBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileType = document.getElementById('fileType');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    
    let selectedFile = null;
    let selectedFileData = null;
    
    // Check if all elements exist
    if (!uploadArea) {
        console.error('Upload area not found!');
        return;
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
        
        if (!selectedFile) {
            fileInput.click();
        }
    });
    
    // File selection via input
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
        if (file) {
            // Check file type (allow images and PDFs)
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
        console.log('File selected:', file.name);
        
        // Check file type
        const allowedTypes = ['image/', 'application/pdf'];
        const isValid = allowedTypes.some(type => file.type.startsWith(type));
        
        if (!isValid) {
            alert('Please upload an image (JPG, PNG) or PDF file');
            return;
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size too large. Please select a file smaller than 5MB.');
            return;
        }
        
        selectedFile = file;
        
        // Show file info
        fileName.textContent = truncateFileName(file.name, 30);
        fileSize.textContent = formatFileSize(file.size);
        
        // Show file type
        if (file.type.startsWith('image/')) {
            fileType.textContent = '📷 Image';
        } else if (file.type === 'application/pdf') {
            fileType.textContent = '📄 PDF';
        }
        
        fileInfo.style.display = 'block';
        
        // Read file for preview
        const reader = new FileReader();
        
        reader.onload = (e) => {
            console.log('File loaded successfully');
            selectedFileData = e.target.result;
            
            if (file.type.startsWith('image/')) {
                // Show image preview
                previewImage.src = selectedFileData;
                previewContainer.style.display = 'block';
                pdfIcon.style.display = 'none';
                uploadPlaceholder.style.display = 'none';
                
                // Make sure image is loaded
                previewImage.onload = () => {
                    console.log('Image preview loaded');
                };
                
                previewImage.onerror = () => {
                    console.error('Failed to load image preview');
                    alert('Failed to load image preview. Please try again.');
                    resetUpload();
                };
                
            } else if (file.type === 'application/pdf') {
                // Show PDF icon
                previewContainer.style.display = 'none';
                pdfIcon.style.display = 'block';
                uploadPlaceholder.style.display = 'none';
            }
            
            analyzeBtn.style.display = 'block';
        };
        
        reader.onerror = () => {
            console.error('FileReader error');
            alert('Error reading file. Please try again.');
            resetUpload();
        };
        
        reader.readAsDataURL(file);
    }
    
    // Helper function to truncate long filenames
    function truncateFileName(name, maxLength) {
        if (name.length <= maxLength) return name;
        const ext = name.split('.').pop();
        const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
        const truncated = nameWithoutExt.substring(0, maxLength - 3 - ext.length);
        return truncated + '...' + ext;
    }
    
    // Format file size
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    
    // View/Download file
    if (viewImageBtn) {
        viewImageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            viewFile();
        });
    }
    
    if (viewPdfBtn) {
        viewPdfBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            viewFile();
        });
    }
    
    function viewFile() {
        if (!selectedFile || !selectedFileData) {
            alert('No file to view');
            return;
        }
        
        try {
            if (selectedFile.type.startsWith('image/')) {
                // Open image in new tab
                const newWindow = window.open();
                newWindow.document.write(`
                    <html>
                        <head>
                            <title>${selectedFile.name}</title>
                            <style>
                                body {
                                    margin: 0;
                                    min-height: 100vh;
                                    background: #0a0c10;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    padding: 20px;
                                }
                                img {
                                    max-width: 90vw;
                                    max-height: 90vh;
                                    object-fit: contain;
                                    border-radius: 8px;
                                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                                }
                                .download-btn {
                                    position: fixed;
                                    bottom: 20px;
                                    right: 20px;
                                    padding: 12px 24px;
                                    background: linear-gradient(135deg, #00ffc4, #00b8ff);
                                    border: none;
                                    border-radius: 8px;
                                    color: #0a0c10;
                                    font-weight: 600;
                                    cursor: pointer;
                                    text-decoration: none;
                                }
                            </style>
                        </head>
                        <body>
                            <img src="${selectedFileData}" alt="${selectedFile.name}">
                            <a href="${selectedFileData}" download="${selectedFile.name}" class="download-btn">⬇️ Download</a>
                        </body>
                    </html>
                `);
            } else if (selectedFile.type === 'application/pdf') {
                // Open PDF in new tab
                const newWindow = window.open();
                newWindow.document.write(`
                    <html>
                        <head>
                            <title>${selectedFile.name}</title>
                            <style>
                                body {
                                    margin: 0;
                                    background: #0a0c10;
                                }
                                embed {
                                    width: 100vw;
                                    height: 100vh;
                                }
                                .download-btn {
                                    position: fixed;
                                    bottom: 20px;
                                    right: 20px;
                                    padding: 12px 24px;
                                    background: linear-gradient(135deg, #00ffc4, #00b8ff);
                                    border: none;
                                    border-radius: 8px;
                                    color: #0a0c10;
                                    font-weight: 600;
                                    cursor: pointer;
                                    text-decoration: none;
                                    z-index: 1000;
                                }
                            </style>
                        </head>
                        <body>
                            <embed src="${selectedFileData}" type="application/pdf" width="100%" height="100%">
                            <a href="${selectedFileData}" download="${selectedFile.name}" class="download-btn">⬇️ Download</a>
                        </body>
                    </html>
                `);
            }
        } catch (error) {
            console.error('Error viewing file:', error);
            alert('Failed to open file. Please try again.');
        }
    }
    
    // Remove image
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetUpload();
        });
    }
    
    if (removePdfBtn) {
        removePdfBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetUpload();
        });
    }
    
    // Reset upload area
    function resetUpload() {
        console.log('Resetting upload');
        selectedFile = null;
        selectedFileData = null;
        fileInput.value = '';
        
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
        if (previewContainer) previewContainer.style.display = 'none';
        if (pdfIcon) pdfIcon.style.display = 'none';
        if (analyzeBtn) analyzeBtn.style.display = 'none';
        if (fileInfo) fileInfo.style.display = 'none';
        if (progressBar) progressBar.style.display = 'none';
        if (uploadArea) uploadArea.classList.remove('drag-over');
        
        // Clear image src to prevent cached images
        if (previewImage) previewImage.src = '';
    }
    
    // Analyze button click
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            if (!selectedFile) return;
            
            // Show loading
            const btnText = analyzeBtn.querySelector('.btn-text');
            const btnLoader = analyzeBtn.querySelector('.btn-loader');
            btnText.style.display = 'none';
            btnLoader.style.display = 'block';
            analyzeBtn.disabled = true;
            
            // Show progress bar
            progressBar.style.display = 'block';
            progressFill.style.width = '0%';
            
            // Simulate progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                progressFill.style.width = progress + '%';
                if (progress >= 100) {
                    clearInterval(interval);
                }
            }, 200);
            
            // Simulate API call
            setTimeout(() => {
                clearInterval(interval);
                progressFill.style.width = '100%';
                
                setTimeout(() => {
                    alert('🎉 Analysis complete! (Phase 4 coming soon)');
                    
                    // Reset button
                    btnText.style.display = 'block';
                    btnLoader.style.display = 'none';
                    analyzeBtn.disabled = false;
                    progressBar.style.display = 'none';
                }, 500);
            }, 2000);
        });
    }
    
    // Add window error handler for debugging
    window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
    });
});