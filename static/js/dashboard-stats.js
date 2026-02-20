// Phase 5 - Dashboard Statistics and Charts
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Dashboard Stats module loaded');
    
    // Make functions globally available
    window.loadDashboardData = loadDashboardData;
    window.updateChartsForMonth = updateChartsForMonth;
    
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

function updateStatsCards(summary) {
    document.getElementById('totalIncome').textContent = formatCurrency(summary.totalIncome);
    document.getElementById('totalTax').textContent = formatCurrency(summary.totalTax);
    document.getElementById('taxSaved').textContent = formatCurrency(summary.taxSaved);
    document.getElementById('monthsTracked').textContent = `${summary.monthsTracked}/12`;
}

function createCharts(monthlyData) {
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
                fill: true
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
    
    // Tax Breakdown Pie Chart
    const taxCtx = document.getElementById('taxChart').getContext('2d');
    window.taxChart = new Chart(taxCtx, {
        type: 'doughnut',
        data: {
            labels: ['Take Home', 'TDS', 'PF', 'Other'],
            datasets: [{
                data: [
                    monthlyData.takeHome,
                    monthlyData.tds,
                    monthlyData.pf,
                    monthlyData.otherDeductions
                ],
                backgroundColor: ['#00ffc4', '#ffa64d', '#ff4d4d', '#8a8f99'],
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
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${ctx.label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateChartsForMonth(monthData, monthName) {
    // Update income chart for single month
    if (window.incomeChart) {
        window.incomeChart.destroy();
    }
    
    const incomeCtx = document.getElementById('incomeChart').getContext('2d');
    window.incomeChart = new Chart(incomeCtx, {
        type: 'bar',
        data: {
            labels: [monthName],
            datasets: [{
                label: 'Monthly Income',
                data: [monthData.income || 0],
                backgroundColor: '#00ffc4',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    ticks: {
                        callback: (value) => '₹' + value.toLocaleString('en-IN'),
                        color: '#8a8f99'
                    }
                },
                x: { ticks: { color: '#8a8f99' } }
            }
        }
    });
    
    // Update tax chart for single month
    if (window.taxChart) {
        window.taxChart.destroy();
    }
    
    const taxCtx = document.getElementById('taxChart').getContext('2d');
    const deductions = monthData.deductions || 0;
    const taxPaid = monthData.tax_paid || 0;
    
    window.taxChart = new Chart(taxCtx, {
        type: 'doughnut',
        data: {
            labels: ['Net Pay', 'Tax Paid', 'Other'],
            datasets: [{
                data: [
                    monthData.net_pay || 0,
                    taxPaid,
                    deductions - taxPaid
                ],
                backgroundColor: ['#00ffc4', '#ffa64d', '#8a8f99'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#c0c4cc' } }
            }
        }
    });
}

function updateSavingsProgress(savings) {
    const progress80C = document.getElementById('progress80C');
    const percentage80C = (savings.invested80C / 150000) * 100;
    progress80C.style.width = Math.min(percentage80C, 100) + '%';
    document.getElementById('invested80C').textContent = formatCurrency(savings.invested80C);
    
    const progress80D = document.getElementById('progress80D');
    const percentage80D = (savings.invested80D / 25000) * 100;
    progress80D.style.width = Math.min(percentage80D, 100) + '%';
    document.getElementById('invested80D').textContent = formatCurrency(savings.invested80D);
    
    const tipElement = document.getElementById('savingsTip');
    if (savings.invested80C < 150000) {
        const remaining = 150000 - savings.invested80C;
        tipElement.innerHTML = `💡 Invest ${formatCurrency(remaining)} more in 80C to save more tax!`;
    } else {
        tipElement.innerHTML = '🎉 Great job! You\'ve maximized your 80C deductions!';
    }
}

function formatCurrency(amount) {
    if (!amount) return '₹0';
    return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}