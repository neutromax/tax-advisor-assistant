// Phase 5 - Dashboard Statistics and Charts - FIXED VERSION
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Dashboard Stats module loaded - FIXED VERSION');
    
    // Make functions globally available
    window.loadDashboardData = loadDashboardData;
    window.updateChartsForMonth = updateChartsForMonth;
    window.loadYearlyData = loadYearlyData;
    window.changeYear = changeYear;
    window.switchView = switchView;
    
    // Initialize
    loadAvailableYears();
    loadDashboardData();
});

let selectedYear = '';
let currentView = 'yearly';

function switchView(view) {
    currentView = view;
    const yearlyBtn = document.getElementById('yearlyViewBtn');
    const monthlyBtn = document.getElementById('monthlyViewBtn');
    const monthSelector = document.getElementById('monthSelectorWrapper');
    
    if (view === 'yearly') {
        yearlyBtn.classList.add('active');
        monthlyBtn.classList.remove('active');
        monthSelector.style.display = 'none';
        loadDashboardData(); // Load yearly data
    } else {
        monthlyBtn.classList.add('active');
        yearlyBtn.classList.remove('active');
        monthSelector.style.display = 'block';
        loadMonthsList(); // Load months for selection
    }
}

function changeYear(year) {
    selectedYear = year;
    console.log('📅 Year changed to:', year);
    loadDashboardData(); // Reload data with new year
}

async function loadAvailableYears() {
    try {
        const response = await fetch('/api/financial-years');
        const data = await response.json();
        
        const yearSelector = document.getElementById('yearSelector');
        if (!yearSelector) return;
        
        // Clear existing
        yearSelector.innerHTML = '<option value="">All Financial Years</option>';
        
        if (data.success && data.years && data.years.length > 0) {
            // Sort years in descending order (newest first)
            const sortedYears = data.years.sort((a, b) => b.localeCompare(a));
            
            sortedYears.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = `FY ${year}`;
                yearSelector.appendChild(option);
            });
            
            console.log('📅 Available financial years:', sortedYears);
        }
    } catch (error) {
        console.error('Error loading financial years:', error);
    }
}

async function loadMonthsList() {
    try {
        const response = await fetch('/api/months-list');
        const data = await response.json();
        
        const select = document.getElementById('monthSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select a month</option>';
        
        if (data.success && data.months && data.months.length > 0) {
            // Sort months chronologically (newest first)
            const sortedMonths = data.months.sort((a, b) => {
                const [monthA, yearA] = a.split(' ');
                const [monthB, yearB] = b.split(' ');
                
                if (yearA !== yearB) {
                    return parseInt(yearB) - parseInt(yearA);
                } else {
                    const months = {
                        'January': 1, 'February': 2, 'March': 3, 'April': 4,
                        'May': 5, 'June': 6, 'July': 7, 'August': 8,
                        'September': 9, 'October': 10, 'November': 11, 'December': 12
                    };
                    return months[monthB] - months[monthA];
                }
            });
            
            // Group by financial year for better UX
            let currentFY = null;
            
            sortedMonths.forEach(month => {
                const year = month.split(' ')[1];
                const monthNum = new Date(Date.parse(month + " 1, 2000")).getMonth() + 1;
                const fy = monthNum >= 4 ? `${year}-${parseInt(year)+1}` : `${parseInt(year)-1}-${year}`;
                
                if (fy !== currentFY) {
                    currentFY = fy;
                    const groupOption = document.createElement('option');
                    groupOption.disabled = true;
                    groupOption.style.backgroundColor = '#0f1218';
                    groupOption.style.color = '#00ffc4';
                    groupOption.style.fontWeight = 'bold';
                    groupOption.textContent = `📁 FY ${fy}`;
                    select.appendChild(groupOption);
                }
                
                const option = document.createElement('option');
                option.value = month;
                option.textContent = `   • ${month}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading months:', error);
    }
}

async function loadDashboardData() {
    try {
        console.log('📡 Fetching dashboard data for year:', selectedYear || 'All');
        
        let url = '/api/financial-summary';
        if (selectedYear) {
            url += `?year=${selectedYear}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('📦 Dashboard data received:', data);
        
        if (data.success) {
            updateStatsCards(data.summary);
            
            // Destroy existing charts
            if (window.incomeChart) window.incomeChart.destroy();
            if (window.taxChart) window.taxChart.destroy();
            
            createCharts(data.monthlyData);
            
            // FIXED: This is the key part - updating savings progress
            if (data.savings) {
                console.log('💰 Savings data received:', data.savings);
                updateSavingsProgress(data.savings);
            } else {
                console.warn('⚠️ No savings data in response');
                // Try to calculate from monthly data
                calculateSavingsFromMonthly(data.monthlyData);
            }
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// FALLBACK: Calculate savings from monthly data if API doesn't provide it
function calculateSavingsFromMonthly(monthlyData) {
    console.log('🔄 Calculating savings from monthly data...');
    
    // This would need actual investment data - for now use zeros
    updateSavingsProgress({
        invested80C: 0,
        invested80D: 0
    });
}

function updateStatsCards(summary) {
    console.log('📊 Updating stats cards with:', summary);
    
    const totalIncomeEl = document.getElementById('totalIncome');
    const totalTaxEl = document.getElementById('totalTax');
    const taxSavedEl = document.getElementById('taxSaved');
    const monthsTrackedEl = document.getElementById('monthsTracked');
    
    if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(summary.totalIncome || 0);
    if (totalTaxEl) totalTaxEl.textContent = formatCurrency(summary.totalTax || 0);
    if (taxSavedEl) taxSavedEl.textContent = formatCurrency(summary.taxSaved || 0);
    if (monthsTrackedEl) monthsTrackedEl.textContent = `${summary.monthsTracked || 0}/12`;
}

function createCharts(monthlyData) {
    if (!monthlyData || !monthlyData.months || monthlyData.months.length === 0) {
        console.log('No monthly data available for charts');
        return;
    }
    
    console.log('Creating charts with months:', monthlyData.months);
    
    // Income Trend Chart
    const incomeCtx = document.getElementById('incomeChart')?.getContext('2d');
    if (incomeCtx) {
        window.incomeChart = new Chart(incomeCtx, {
            type: 'line',
            data: {
                labels: monthlyData.months,
                datasets: [{
                    label: 'Monthly Income (₹)',
                    data: monthlyData.incomes,
                    borderColor: '#00ffc4',
                    backgroundColor: 'rgba(0, 255, 196, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#00ffc4',
                    pointBorderColor: '#0a0c10',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
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
    }
    
    // Tax Breakdown Pie Chart
    const taxCtx = document.getElementById('taxChart')?.getContext('2d');
    if (taxCtx) {
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
                        labels: { 
                            color: '#c0c4cc',
                            font: { size: 12 },
                            padding: 15
                        }
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
    }
}

function updateChartsForMonth(monthData, monthName) {
    if (!monthData) return;
    
    console.log('Updating charts for month:', monthName, monthData);
    
    // Destroy existing charts
    if (window.incomeChart) window.incomeChart.destroy();
    if (window.taxChart) window.taxChart.destroy();
    
    // Income chart - bar for single month
    const incomeCtx = document.getElementById('incomeChart')?.getContext('2d');
    if (incomeCtx) {
        window.incomeChart = new Chart(incomeCtx, {
            type: 'bar',
            data: {
                labels: [monthName],
                datasets: [{
                    label: 'Monthly Income',
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
    }
    
    // Tax chart for single month
    const taxCtx = document.getElementById('taxChart')?.getContext('2d');
    if (taxCtx) {
        const deductions = monthData.deductions || 0;
        const taxPaid = monthData.tax_paid || 0;
        const netPay = monthData.net_pay || 0;
        
        window.taxChart = new Chart(taxCtx, {
            type: 'doughnut',
            data: {
                labels: ['Net Pay', 'Tax Paid', 'Other'],
                datasets: [{
                    data: [
                        netPay,
                        taxPaid,
                        Math.max(0, deductions - taxPaid)
                    ],
                    backgroundColor: ['#00ffc4', '#ffa64d', '#8a8f99'],
                    borderWidth: 0
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
    }
}

// FIXED: This is the most important function - makes the progress bars work!
function updateSavingsProgress(savings) {
    console.log('💰 Updating savings progress with:', savings);
    
    if (!savings) {
        console.error('❌ No savings data provided');
        return;
    }
    
    // Get elements
    const progress80C = document.getElementById('progress80C');
    const invested80CEl = document.getElementById('invested80C');
    const progress80D = document.getElementById('progress80D');
    const invested80DEl = document.getElementById('invested80D');
    const tipElement = document.getElementById('savingsTip');
    
    // Log elements to debug
    console.log('🔍 Elements found:', {
        progress80C: !!progress80C,
        invested80CEl: !!invested80CEl,
        progress80D: !!progress80D,
        invested80DEl: !!invested80DEl,
        tipElement: !!tipElement
    });
    
    // Update 80C (Max ₹1,50,000)
    if (progress80C && invested80CEl) {
        const invested80C = savings.invested80C || 0;
        const percentage80C = Math.min((invested80C / 150000) * 100, 100);
        
        progress80C.style.width = percentage80C + '%';
        invested80CEl.textContent = formatCurrency(invested80C);
        
        console.log(`📊 80C: ₹${invested80C} (${percentage80C.toFixed(1)}%)`);
    } else {
        console.warn('⚠️ 80C elements not found in DOM');
    }
    
    // Update 80D (Max ₹25,000)
    if (progress80D && invested80DEl) {
        const invested80D = savings.invested80D || 0;
        const percentage80D = Math.min((invested80D / 25000) * 100, 100);
        
        progress80D.style.width = percentage80D + '%';
        invested80DEl.textContent = formatCurrency(invested80D);
        
        console.log(`📊 80D: ₹${invested80D} (${percentage80D.toFixed(1)}%)`);
    } else {
        console.warn('⚠️ 80D elements not found in DOM');
    }
    
    // Update tip
    if (tipElement) {
        const invested80C = savings.invested80C || 0;
        const invested80D = savings.invested80D || 0;
        
        if (selectedYear) {
            tipElement.innerHTML = `📅 Showing data for financial year ${selectedYear}`;
        } else if (invested80C < 150000 && invested80D < 25000) {
            const remainingC = 150000 - invested80C;
            const remainingD = 25000 - invested80D;
            tipElement.innerHTML = `💡 Invest ${formatCurrency(remainingC)} more in 80C and ${formatCurrency(remainingD)} more in 80D to maximize tax savings!`;
        } else if (invested80C < 150000) {
            const remaining = 150000 - invested80C;
            tipElement.innerHTML = `💡 Invest ${formatCurrency(remaining)} more in 80C (PPF, ELSS, Insurance) to save more tax!`;
        } else if (invested80D < 25000) {
            const remaining = 25000 - invested80D;
            tipElement.innerHTML = `💡 Invest ${formatCurrency(remaining)} more in 80D for health insurance tax benefits!`;
        } else if (invested80C >= 150000 && invested80D >= 25000) {
            tipElement.innerHTML = '🎉 Great job! You\'ve maximized your 80C and 80D deductions!';
        } else {
            tipElement.innerHTML = '💡 Upload more payslips to see tax-saving tips!';
        }
    }
}

function formatCurrency(amount) {
    if (amount === undefined || amount === null || amount === 0) return '₹0';
    return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// Load month data when selected
async function loadMonthData(month) {
    if (!month) return;
    
    try {
        const response = await fetch(`/api/monthly-data/${encodeURIComponent(month)}`);
        const data = await response.json();
        
        if (data.success && data.data) {
            updateChartsForMonth(data.data, month);
            
            // Update stats for this month
            document.getElementById('totalIncome').textContent = formatCurrency(data.data.income || 0);
            document.getElementById('totalTax').textContent = formatCurrency(data.data.tax_paid || 0);
            document.getElementById('monthsTracked').textContent = month;
        }
    } catch (error) {
        console.error('Error loading month data:', error);
    }
}