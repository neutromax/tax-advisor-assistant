// Phase 5 - Dashboard Statistics and Charts
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Dashboard Stats module loaded');
    
    // Make functions globally available
    window.loadDashboardData = loadDashboardData;
    window.updateChartsForMonth = updateChartsForMonth;
    window.loadYearlyData = loadYearlyData;
    
    // Load user's financial data
    loadDashboardData();
});

async function loadDashboardData() {
    try {
        const response = await fetch('/api/financial-summary');
        const data = await response.json();
        
        if (data.success) {
            updateStatsCards(data.summary);
            createCharts(data.monthlyData);
            updateSavingsProgress(data.savings);
        } else {
            console.error('Failed to load dashboard data');
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Separate function for yearly view that reloads charts
window.loadYearlyData = async function() {
    try {
        const response = await fetch('/api/financial-summary');
        const data = await response.json();
        
        if (data.success) {
            updateStatsCards(data.summary);
            
            // Destroy existing charts before creating new ones
            if (window.incomeChart) {
                window.incomeChart.destroy();
            }
            if (window.taxChart) {
                window.taxChart.destroy();
            }
            
            createCharts(data.monthlyData);
            updateSavingsProgress(data.savings);
        }
    } catch (error) {
        console.error('Error loading yearly data:', error);
    }
};

function updateStatsCards(summary) {
    document.getElementById('totalIncome').textContent = formatCurrency(summary.totalIncome);
    document.getElementById('totalTax').textContent = formatCurrency(summary.totalTax);
    document.getElementById('taxSaved').textContent = formatCurrency(summary.taxSaved);
    document.getElementById('monthsTracked').textContent = `${summary.monthsTracked}/12`;
}

function createCharts(monthlyData) {
    // Make sure we have data
    if (!monthlyData || !monthlyData.months || monthlyData.months.length === 0) {
        console.log('No monthly data available');
        return;
    }
    
    console.log('Creating charts with months:', monthlyData.months);
    
    // Income Trend Chart
    const incomeCtx = document.getElementById('incomeChart').getContext('2d');
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
    
    // Tax Breakdown Pie Chart
    const taxCtx = document.getElementById('taxChart').getContext('2d');
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

function updateChartsForMonth(monthData, monthName) {
    console.log('Updating charts for month:', monthName, monthData);
    
    // Destroy existing charts
    if (window.incomeChart) {
        window.incomeChart.destroy();
    }
    if (window.taxChart) {
        window.taxChart.destroy();
    }
    
    // Create new charts for single month
    const incomeCtx = document.getElementById('incomeChart').getContext('2d');
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
    
    // Update tax chart for single month
    const taxCtx = document.getElementById('taxChart').getContext('2d');
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

function updateSavingsProgress(savings) {
    const progress80C = document.getElementById('progress80C');
    const percentage80C = savings.invested80C ? (savings.invested80C / 150000) * 100 : 0;
    progress80C.style.width = Math.min(percentage80C, 100) + '%';
    document.getElementById('invested80C').textContent = formatCurrency(savings.invested80C);
    
    const progress80D = document.getElementById('progress80D');
    const percentage80D = savings.invested80D ? (savings.invested80D / 25000) * 100 : 0;
    progress80D.style.width = Math.min(percentage80D, 100) + '%';
    document.getElementById('invested80D').textContent = formatCurrency(savings.invested80D);
    
    const tipElement = document.getElementById('savingsTip');
    if (!tipElement) return;
    
    if (savings.invested80C < 150000) {
        const remaining = 150000 - savings.invested80C;
        tipElement.innerHTML = `💡 Invest ${formatCurrency(remaining)} more in 80C to save more tax!`;
    } else if (savings.invested80D < 25000) {
        const remaining = 25000 - savings.invested80D;
        tipElement.innerHTML = `💡 Invest ${formatCurrency(remaining)} more in 80D for health benefits!`;
    } else {
        tipElement.innerHTML = '🎉 Great job! You\'ve maximized your tax deductions!';
    }
}

function formatCurrency(amount) {
    if (!amount || amount === 0) return '₹0';
    return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}