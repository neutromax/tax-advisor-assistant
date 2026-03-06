// dashboard-stats.js - COMPLETE FIXED VERSION
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Dashboard Stats Loaded - FIXED VERSION');
    
    // Make functions globally available
    window.switchView = switchView;
    window.changeYear = changeYear;
    window.loadMonthData = loadMonthData;
    
    // Initialize
    loadAvailableYears();
    
    // Set default view
    setTimeout(() => {
        switchView('yearly');
    }, 500);
});

let currentView = 'yearly';
let selectedYear = '';
let selectedMonth = '';

// ========== VIEW SWITCHING ==========
function switchView(view) {
    console.log('🔄 Switching to:', view);
    
    currentView = view;
    
    const yearlyBtn = document.getElementById('yearlyViewBtn');
    const monthlyBtn = document.getElementById('monthlyViewBtn');
    const monthSelectorWrapper = document.getElementById('monthSelectorWrapper');
    
    if (view === 'yearly') {
        yearlyBtn.classList.add('active');
        monthlyBtn.classList.remove('active');
        monthSelectorWrapper.style.display = 'none';
        loadDashboardData();
    } else {
        monthlyBtn.classList.add('active');
        yearlyBtn.classList.remove('active');
        monthSelectorWrapper.style.display = 'block';
        if (selectedYear) {
            loadMonthsForYear(selectedYear);
        } else {
            const monthSelect = document.getElementById('monthSelect');
            if (monthSelect) {
                monthSelect.innerHTML = '<option value="">First select a year</option>';
            }
        }
    }
}

// ========== YEAR CHANGE ==========
function changeYear(year) {
    console.log('📅 Year selected:', year);
    
    selectedYear = year;
    selectedMonth = ''; // ← ADD THIS LINE to clear selected month
    
    if (currentView === 'yearly') {
        loadDashboardData();
    } else {
        if (year) {
            loadMonthsForYear(year);
        } else {
            const monthSelect = document.getElementById('monthSelect');
            if (monthSelect) {
                monthSelect.innerHTML = '<option value="">Select a year first</option>';
            }
            selectedMonth = '';
            clearCharts();
        }
    }
}

// ========== LOAD AVAILABLE YEARS ==========
async function loadAvailableYears() {
    try {
        console.log('📡 Fetching available years...');
        const response = await fetch('/api/financial-years');
        const data = await response.json();
        console.log('📅 Years API Response:', data);
        
        const yearSelect = document.getElementById('yearSelector');
        if (!yearSelect) {
            console.error('❌ Year selector not found!');
            return;
        }
        
        yearSelect.innerHTML = '<option value="">All Financial Years</option>';
        
        if (data.success && data.years && data.years.length > 0) {
            // Sort years in descending order (newest first)
            const sortedYears = data.years.sort((a, b) => b.localeCompare(a));
            console.log('✅ Years loaded:', sortedYears);
            
            sortedYears.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = `FY ${year}`;
                yearSelect.appendChild(option);
            });
        } else {
            console.log('⚠️ No years found in database');
            // Add a placeholder option
            const option = document.createElement('option');
            option.value = "";
            option.disabled = true;
            option.textContent = "No years available";
            yearSelect.appendChild(option);
        }
    } catch (error) {
        console.error('❌ Error loading years:', error);
    }
}

// ========== LOAD MONTHS FOR SELECTED YEAR ==========
async function loadMonthsForYear(year) {
    try {
        console.log('📆 Loading months for year:', year);
        
        const response = await fetch('/api/months-list');
        const data = await response.json();
        console.log('📅 Months API Response:', data);
        
        const monthSelect = document.getElementById('monthSelect');
        if (!monthSelect) {
            console.error('❌ Month selector not found!');
            return;
        }
        
        monthSelect.innerHTML = '<option value="">Select a month</option>';
        
        if (data.success && data.months && data.months.length > 0) {
            // Filter months that belong to the selected financial year
            const monthsForYear = data.months.filter(month => {
                const parts = month.split(' ');
                if (parts.length === 2) {
                    const monthName = parts[0];
                    const monthYear = parseInt(parts[1]);
                    
                    const months = {
                        'January': 1, 'February': 2, 'March': 3, 'April': 4,
                        'May': 5, 'June': 6, 'July': 7, 'August': 8,
                        'September': 9, 'October': 10, 'November': 11, 'December': 12
                    };
                    const monthNum = months[monthName];
                    
                    // Calculate financial year for this month
                    let monthFY;
                    if (monthNum >= 4) {
                        monthFY = `${monthYear}-${(monthYear + 1).toString().slice(-2)}`;
                    } else {
                        monthFY = `${monthYear - 1}-${monthYear.toString().slice(-2)}`;
                    }
                    
                    return monthFY === year;
                }
                return false;
            });
            
            console.log(`📊 Found ${monthsForYear.length} months for FY ${year}:`, monthsForYear);
            
            // Sort months chronologically (newest first)
            monthsForYear.sort((a, b) => {
                const [monthA, yearA] = a.split(' ');
                const [monthB, yearB] = b.split(' ');
                
                if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
                
                const months = {
                    'January': 1, 'February': 2, 'March': 3, 'April': 4,
                    'May': 5, 'June': 6, 'July': 7, 'August': 8,
                    'September': 9, 'October': 10, 'November': 11, 'December': 12
                };
                return months[monthB] - months[monthA];
            });
            
            // Add months to dropdown
            monthsForYear.forEach(month => {
                const option = document.createElement('option');
                option.value = month;
                option.textContent = month;
                monthSelect.appendChild(option);
            });
            
            // If there was a previously selected month that's still valid, select it
            if (selectedMonth && monthsForYear.includes(selectedMonth)) {
                monthSelect.value = selectedMonth;
                loadMonthData(selectedMonth);
            }
        } else {
            console.log('⚠️ No months found in database');
            monthSelect.innerHTML = '<option value="">No months available</option>';
        }
    } catch (error) {
        console.error('❌ Error loading months:', error);
    }
}

// ========== LOAD DASHBOARD DATA (Yearly View) ==========
async function loadDashboardData() {
    try {
        console.log('📡 Fetching dashboard data...');
        
        let url = '/api/financial-summary';
        if (selectedYear) {
            url += `?year=${selectedYear}`;
            console.log(`🎯 Loading data for FY: ${selectedYear}`);
        }
        
        const response = await fetch(url);
        const data = await response.json();
        console.log('📦 Dashboard Data Received:', data);
        
        if (data.success) {
            // Update stats cards
            document.getElementById('totalIncome').textContent = formatCurrency(data.summary.totalIncome || 0);
            document.getElementById('totalTax').textContent = formatCurrency(data.summary.totalTax || 0);
            document.getElementById('taxSaved').textContent = formatCurrency(data.summary.taxSaved || 0);
            document.getElementById('monthsTracked').textContent = (data.summary.monthsTracked || 0) + '/12';
            
            // Clear existing charts safely
            clearCharts();
            
            // Create new charts if data exists
            if (data.monthlyData && data.monthlyData.months && data.monthlyData.months.length > 0) {
                setTimeout(() => createCharts(data.monthlyData), 100);
            }
            
            // ===== THIS IS THE KEY PART =====
            // Update savings with new data for selected year
            if (data.savings) {
                console.log('💰 Updating savings for year:', selectedYear, data.savings);
                updateSavings(data.savings);  // This updates the progress bars
            }
            
            // Update tip
            updateSavingsTip();
        }
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
    }
}

// ========== LOAD MONTH DATA (Monthly View) ==========
async function loadMonthData(month) {
    if (!month) return;
    
    selectedMonth = month;
    console.log('📡 Fetching month data for:', month);
    
    try {
        const response = await fetch(`/api/monthly-data/${encodeURIComponent(month)}`);
        const data = await response.json();
        console.log('📦 Month Data Received:', data);
        
        if (data.success && data.data) {
            // Update stats
            document.getElementById('totalIncome').textContent = formatCurrency(data.data.income || 0);
            document.getElementById('totalTax').textContent = formatCurrency(data.data.tax_paid || 0);
            
            // Calculate tax saved from tax_analysis if available
            let taxSaved = 0;
            let month_80c = 0;
            let month_80d = 0;
            
            if (data.data.tax_analysis && data.data.tax_analysis.answers) {
                const answers = data.data.tax_analysis.answers;
                month_80c = (answers.ppf || 0) + (answers.elss || 0);
                month_80d = answers.insurance || 0;
                
                if (data.data.tax_analysis.results) {
                    taxSaved = data.data.tax_analysis.results.total_refund || 0;
                }
            }
            
            document.getElementById('taxSaved').textContent = formatCurrency(taxSaved);
            document.getElementById('monthsTracked').textContent = month;
            
            // Clear existing charts safely
            clearCharts();
            
            // Create single month charts
            setTimeout(() => createSingleMonthCharts(data.data, month), 100);
            
            // Update savings for this month
            const monthSavings = {
                invested80C: month_80c,
                invested80D: month_80d
            };
            updateSavings(monthSavings);
            
            // Update tip
            updateSavingsTip();
        }
    } catch (error) {
        console.error('❌ Error loading month data:', error);
    }
}

// ========== CREATE CHARTS (Yearly View) ==========
function createCharts(monthlyData) {
    console.log('📊 Creating yearly charts with months:', monthlyData.months);
    
    const incomeCanvas = document.getElementById('incomeChart');
    const taxCanvas = document.getElementById('taxChart');
    
    if (!incomeCanvas) {
        console.error('❌ incomeChart canvas not found');
        return;
    }
    if (!taxCanvas) {
        console.error('❌ taxChart canvas not found');
        return;
    }
    
    // Create income chart
    try {
        const incomeCtx = incomeCanvas.getContext('2d');
        window.incomeChart = new Chart(incomeCtx, {
            type: 'line',
            data: {
                labels: monthlyData.months,
                datasets: [{
                    label: 'Monthly Income',
                    data: monthlyData.incomes,
                    borderColor: '#00ffc4',
                    backgroundColor: 'rgba(0,255,196,0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#00ffc4',
                    pointBorderColor: '#0a0c10',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `Income: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => '₹' + value.toLocaleString('en-IN'),
                            color: '#8a8f99'
                        },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    x: {
                        ticks: {
                            color: '#8a8f99',
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: { display: false }
                    }
                }
            }
        });
        console.log('✅ Income chart created');
    } catch (error) {
        console.error('❌ Error creating income chart:', error);
    }
    
    // Create tax chart
    try {
        const taxCtx = taxCanvas.getContext('2d');
        window.taxChart = new Chart(taxCtx, {
            type: 'doughnut',
            data: {
                labels: ['Take Home', 'TDS', 'PF', 'Other'],
                datasets: [{
                    data: [
                        monthlyData.takeHome || 0,
                        monthlyData.tds || 0,
                        monthlyData.pf || 0,
                        monthlyData.otherDeductions || 0
                    ],
                    backgroundColor: ['#00ffc4', '#ffa64d', '#ff4d4d', '#8a8f99'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#c0c4cc' }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const value = ctx.raw;
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${ctx.label}: ${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        console.log('✅ Tax chart created');
    } catch (error) {
        console.error('❌ Error creating tax chart:', error);
    }
}

// ========== CREATE EMPTY CHARTS ==========
function createEmptyCharts() {
    console.log('📊 Creating empty charts');
    
    const incomeCanvas = document.getElementById('incomeChart');
    const taxCanvas = document.getElementById('taxChart');
    
    if (!incomeCanvas || !taxCanvas) return;
    
    try {
        const incomeCtx = incomeCanvas.getContext('2d');
        window.incomeChart = new Chart(incomeCtx, {
            type: 'line',
            data: {
                labels: ['No Data'],
                datasets: [{
                    label: 'Monthly Income',
                    data: [0],
                    borderColor: '#8a8f99',
                    backgroundColor: 'rgba(138,143,153,0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    } catch (error) {
        console.error('❌ Error creating empty income chart:', error);
    }
    
    try {
        const taxCtx = taxCanvas.getContext('2d');
        window.taxChart = new Chart(taxCtx, {
            type: 'doughnut',
            data: {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#8a8f99']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    } catch (error) {
        console.error('❌ Error creating empty tax chart:', error);
    }
}

// ========== CREATE SINGLE MONTH CHARTS ==========
function createSingleMonthCharts(monthData, monthName) {
    console.log('📊 Creating single month charts for:', monthName);
    
    const incomeCanvas = document.getElementById('incomeChart');
    const taxCanvas = document.getElementById('taxChart');
    
    if (!incomeCanvas || !taxCanvas) {
        console.error('❌ Canvas elements not found');
        return;
    }
    
    // Create income bar chart
    try {
        const incomeCtx = incomeCanvas.getContext('2d');
        window.incomeChart = new Chart(incomeCtx, {
            type: 'bar',
            data: {
                labels: [monthName],
                datasets: [{
                    label: 'Income',
                    data: [monthData.income || 0],
                    backgroundColor: '#00ffc4',
                    borderRadius: 8,
                    barPercentage: 0.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `Income: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => '₹' + value.toLocaleString('en-IN'),
                            color: '#8a8f99'
                        },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    x: {
                        ticks: { color: '#8a8f99' },
                        grid: { display: false }
                    }
                }
            }
        });
        console.log('✅ Single month income chart created');
    } catch (error) {
        console.error('❌ Error creating income chart:', error);
    }
    
    // Create tax chart
    try {
        const taxCtx = taxCanvas.getContext('2d');
        const deductions = monthData.deductions || 0;
        const taxPaid = monthData.tax_paid || 0;
        const netPay = monthData.net_pay || 0;
        const other = Math.max(0, deductions - taxPaid);
        
        window.taxChart = new Chart(taxCtx, {
            type: 'doughnut',
            data: {
                labels: ['Net Pay', 'Tax Paid', 'Other'],
                datasets: [{
                    data: [netPay, taxPaid, other],
                    backgroundColor: ['#00ffc4', '#ffa64d', '#8a8f99'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#c0c4cc' }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const value = ctx.raw;
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${ctx.label}: ${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        console.log('✅ Single month tax chart created');
    } catch (error) {
        console.error('❌ Error creating tax chart:', error);
    }
}

// ========== CLEAR CHARTS SAFELY ==========
function clearCharts() {
    console.log('📊 Clearing charts safely');
    
    // Check if charts exist and have destroy method
    if (window.incomeChart && typeof window.incomeChart.destroy === 'function') {
        window.incomeChart.destroy();
        window.incomeChart = null;
        console.log('✅ Income chart destroyed');
    } else {
        window.incomeChart = null;
    }
    
    if (window.taxChart && typeof window.taxChart.destroy === 'function') {
        window.taxChart.destroy();
        window.taxChart = null;
        console.log('✅ Tax chart destroyed');
    } else {
        window.taxChart = null;
    }
    
    // Clear canvases
    const incomeCanvas = document.getElementById('incomeChart');
    const taxCanvas = document.getElementById('taxChart');
    
    if (incomeCanvas) {
        const ctx = incomeCanvas.getContext('2d');
        ctx.clearRect(0, 0, incomeCanvas.width, incomeCanvas.height);
        console.log('✅ Income canvas cleared');
    }
    
    if (taxCanvas) {
        const ctx = taxCanvas.getContext('2d');
        ctx.clearRect(0, 0, taxCanvas.width, taxCanvas.height);
        console.log('✅ Tax canvas cleared');
    }
}

// ========== UPDATE SAVINGS ==========
// ========== UPDATE SAVINGS ==========
function updateSavings(savings) {
    if (!savings) {
        console.log('⚠️ No savings data to update');
        return;
    }
    
    console.log('💰 Updating savings with:', savings);
    
    // 80C elements
    const progress80C = document.getElementById('progress80C');
    const invested80C = document.getElementById('invested80C');
    const refund80C = document.getElementById('refund80C');
    
    // 80D elements
    const progress80D = document.getElementById('progress80D');
    const invested80D = document.getElementById('invested80D');
    const refund80D = document.getElementById('refund80D');
    
    // Constants
    const MAX_80C_REFUND = 45000;
    const MAX_80D_REFUND = 7500;
    
    // Update 80C
    if (progress80C && invested80C && refund80C) {
        const invested = savings.invested80C || 0;
        const refund = invested * 0.3; // Calculate refund as 30% of investment
        const percentage = Math.min((refund / MAX_80C_REFUND) * 100, 100);
        
        progress80C.style.width = percentage + '%';
        invested80C.textContent = formatCurrency(invested);
        refund80C.textContent = formatCurrency(refund);
        
        console.log(`📊 80C: Invested ₹${invested} → Refund ₹${refund} (${percentage.toFixed(1)}% of max ₹45,000 refund)`);
    } else {
        console.log('⚠️ 80C elements not found:', {progress80C, invested80C, refund80C});
    }
    
    // Update 80D
    if (progress80D && invested80D && refund80D) {
        const invested = savings.invested80D || 0;
        const refund = invested * 0.3; // Calculate refund as 30% of investment
        const percentage = Math.min((refund / MAX_80D_REFUND) * 100, 100);
        
        progress80D.style.width = percentage + '%';
        invested80D.textContent = formatCurrency(invested);
        refund80D.textContent = formatCurrency(refund);
        
        console.log(`📊 80D: Invested ₹${invested} → Refund ₹${refund} (${percentage.toFixed(1)}% of max ₹7,500 refund)`);
    } else {
        console.log('⚠️ 80D elements not found:', {progress80D, invested80D, refund80D});
    }
}

/// ========== UPDATE SAVINGS TIP ==========
function updateSavingsTip() {
    const tipElement = document.getElementById('savingsTip');
    if (!tipElement) return;
    
    if (selectedYear && currentView === 'yearly') {
        // Show year data
        const refund80C = parseFloat(document.getElementById('refund80C')?.textContent.replace(/[₹,]/g, '') || 0);
        const refund80D = parseFloat(document.getElementById('refund80D')?.textContent.replace(/[₹,]/g, '') || 0);
        
        const MAX_80C_REFUND = 45000;
        const MAX_80D_REFUND = 7500;
        
        const remaining80C = Math.max(0, MAX_80C_REFUND - refund80C);
        const remaining80D = Math.max(0, MAX_80D_REFUND - refund80D);
        
        tipElement.innerHTML = `📅 Showing refund data for FY ${selectedYear}`;
        
    } else if (selectedMonth && currentView === 'monthly') {
        tipElement.innerHTML = `📆 Showing refund data for ${selectedMonth}`;
    } else {
        tipElement.innerHTML = '💡 Select a financial year from the dropdown above to see filtered data';
    }
}
// ========== FORMAT CURRENCY ==========
function formatCurrency(amount) {
    if (!amount || amount === 0) return '₹0';
    return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}