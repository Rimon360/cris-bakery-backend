async function main(imageOutputDir, options) {

    const { formatted_c_start_date, formatted_c_end_date, show_weekends } = options;
    const [_START_DATE, _END_DATE] = [formatted_c_start_date, formatted_c_end_date];

    const XLSX = require('xlsx');
    const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
    const fs = require('fs');
    const path = require('path');
    const fileName = 'delivery.xlsx';
    const outputFileName = path.join(imageOutputDir);

    // ==================== CONFIGURATION VARIABLES ====================
    // Default to last 7 days if no dates provided
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const START_DATE = _START_DATE || formatDate(sevenDaysAgo);
    const END_DATE = _END_DATE || formatDate(today);

    // Show weekends option (default: true)
    const SHOW_WEEKENDS = show_weekends !== undefined ? show_weekends : true;

    // ==================================================================

    function parseDate(input) {
        // If it's already a Date object, return it
        if (input instanceof Date) {
            return input;
        }

        const str = input.toString().trim();

        // Try DD/MM/YYYY format
        if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const year = parseInt(parts[2]);
                return new Date(year, month, day);
            }
        }

        // Try YYYY-MM-DD format
        if (str.includes('-')) {
            const parts = str.split('-');
            if (parts.length === 3 && parts[0].length === 4) {
                return new Date(parts[0], parts[1] - 1, parts[2]);
            }
        }

        // Fallback
        return new Date(input);
    }

    function formatDate(date) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function isWeekend(dateStr) {
        const date = parseDate(dateStr);
        const dayOfWeek = date.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
    }

    // Parse currency values and convert to number
    function parseCurrencyValue(value) {
        if (typeof value === 'number') {
            return value;
        }
        
        if (typeof value === 'string') {
            // Remove currency symbols, commas, and whitespace
            const cleaned = value.replace(/[£$€¥₹,\s]/g, '').trim();
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        }
        
        return 0;
    }

    function loadExcelData(fileName) {
        try {
            const filePath = path.join(__dirname, fileName);

            if (!fs.existsSync(filePath)) {
                return [];
            }

            // Read with cellDates to get Date objects
            const workbook = XLSX.readFile(filePath, { cellDates: true });
            const sheetName = workbook.SheetNames[0]; 
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);

            return data;
        } catch (error) {
            return [];
        }
    }

    function processData(excelData, startDate, endDate) {
        let start = parseDate(startDate);
        let end = parseDate(endDate);

        // Set to start of day for start, end of day for end
        start = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
        end = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);

        // Initialize data structure
        const dailyData = {};

        let matchedRows = 0;
        let dateOutOfRange = 0;
        let invalidDate = 0;

        // Process each row
        excelData.forEach((row, index) => {
            // Check if Date exists
            if (!row.Date && !row.date) {
                invalidDate++;
                return;
            }

            // Parse the date (handles both Date objects and strings)
            let rowDate;
            try {
                rowDate = parseDate(row.Date || row.date);
                // Normalize to start of day for comparison
                rowDate = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate(), 0, 0, 0, 0);
            } catch (e) {
                invalidDate++;
                return;
            }

            // Check date range (inclusive on both ends)
            if (rowDate.getTime() < start.getTime() || rowDate.getTime() > end.getTime()) {
                dateOutOfRange++;
                return;
            }

            // Create date key
            const dateKey = formatDate(rowDate);

            // Initialize this date if needed
            if (!dailyData[dateKey]) {
                dailyData[dateKey] = {
                    justEat: 0,
                    deliveroo: 0
                };
            }

            // Parse and add sales values (handle currency symbols)
            // console.log(row);
            const justEatSales = parseCurrencyValue(row['Just eat Sales'] || row[' Just eat Sales '] || 0);
            const deliverooSales = parseCurrencyValue(row['Deliveroo Sales']||row[' Deliveroo Sales '] || 0);

            dailyData[dateKey].justEat += justEatSales;
            dailyData[dateKey].deliveroo += deliverooSales;
            matchedRows++;
        });

        return dailyData;
    }

    async function createChart(dailyData, startDate, endDate, outputFileName, showWeekends) {
        const width = 1200;
        const height = 600;
        const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

        // Sort dates chronologically
        const dates = Object.keys(dailyData).sort((a, b) => {
            return parseDate(a) - parseDate(b);
        });

        const datasets = [];

        // Add weekend indicator as bar chart (if enabled)
        if (showWeekends) {
            // Calculate max sales value across all dates for proper scaling
            const maxSales = Math.max(...dates.map(date => 
                Math.max(dailyData[date].justEat, dailyData[date].deliveroo)
            ));

            // Create weekend indicator data
            const weekendData = dates.map(date => {
                return isWeekend(date) ? maxSales * 1.1 : 0; // 110% of max to cover entire chart height
            });

            datasets.push({
                label: 'Weekend',
                data: weekendData,
                type: 'bar',
                backgroundColor: 'rgba(128, 128, 128, 0.15)',
                borderColor: 'rgba(128, 128, 128, 0.3)',
                borderWidth: 0,
                order: 2, // Render behind lines
                barPercentage: 1.0,
                categoryPercentage: 1.0
            });
        }

        // Just Eat Sales line
        datasets.push({
            label: 'Just Eat Sales',
            data: dates.map(date => dailyData[date].justEat),
            type: 'line',
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 3,
            pointHoverRadius: 5,
            order: 1
        });

        // Deliveroo Sales line
        datasets.push({
            label: 'Deliveroo Sales',
            data: dates.map(date => dailyData[date].deliveroo),
            type: 'line',
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 3,
            pointHoverRadius: 5,
            order: 1
        });

        const configuration = {
            type: 'line',
            data: {
                labels: dates,
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 11
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: `Delivery Sales (${startDate} to ${endDate})`,
                        font: {
                            size: 26,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Sales Amount'
                        },
                        beginAtZero: true
                    }
                }
            }
        };

        const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync(outputFileName, imageBuffer);
    }

    try {
        // Load Excel data
        const excelData = loadExcelData(fileName);

        if (excelData.length === 0) {
            throw new Error('No data loaded from delivery.xlsx file!');
        }

        // Process data
        const dailyData = processData(excelData, START_DATE, END_DATE);

        if (Object.keys(dailyData).length === 0) {
            throw new Error('No data matched the date range!');
        }

        // Create and save chart
        await createChart(dailyData, START_DATE, END_DATE, outputFileName, SHOW_WEEKENDS);

        return { success: true };
    } catch (error) {
        throw new Error(`${error.message}`);
    }
}

// Export the main function
module.exports = main;