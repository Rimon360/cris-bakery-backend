async function main(imageOutputDir, options) {

    const { formatted_c_start_date, formatted_c_end_date, show_weekends } = options;
    const [_START_DATE, _END_DATE] = [formatted_c_start_date, formatted_c_end_date]; 

    const XLSX = require('xlsx');
    const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
    const fs = require('fs');
    const path = require('path');
    const fileName = 'labour_cost_product.xlsx';
    const outputFileName = path.join(imageOutputDir);

    // ==================== CONFIGURATION VARIABLES ====================
    // Calculate default dates (last 7 days)
    function getDefaultDates() {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 6); // Last 7 days including today

        const formatDate = (date) => {
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        };

        return { start: formatDate(start), end: formatDate(end) };
    }

    const defaults = getDefaultDates();
    const START_DATE = _START_DATE || defaults.start;
    const END_DATE = _END_DATE || defaults.end;
    
    // Show weekends option (default: false)
    const SHOW_WEEKENDS = show_weekends !== undefined ? show_weekends : true;

    // ==================================================================

    function parseDate(input) {
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

        return new Date(input);
    }

    function isWeekend(dateStr) {
        const date = parseDate(dateStr);
        const dayOfWeek = date.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
    }

    function loadExcelData(fileName) {
        try {
            const filePath = path.join(__dirname, fileName);

            if (!fs.existsSync(filePath)) {
                //console.log(`File ${fileName} not found at ${filePath}`);
                return [];
            }

            const workbook = XLSX.readFile(filePath, { cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);

            return data;
        } catch (error) {
            //console.log(`Error loading Excel file: ${error.message}`);
            return [];
        }
    }

    function processData(excelData, startDate, endDate) {
        const start = parseDate(startDate);
        const end = parseDate(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        const dailyData = {}; 

        excelData.forEach(row => {
            if (!row.Date) return;

            const rowDate = parseDate(row.Date);
            if (isNaN(rowDate)) return;
            rowDate.setHours(0, 0, 0, 0);

            // FIXED: Changed from <= and >= to < and > to include start and end dates
            if (rowDate < start || rowDate > end) return;

            const dateKey = `${String(rowDate.getDate()).padStart(2, '0')}/${String(rowDate.getMonth() + 1).padStart(2, '0')}/${rowDate.getFullYear()}`;

            if (!dailyData[dateKey]) {
                dailyData[dateKey] = { Value: 0, count: 0 };
            }

            const value = parseFloat(row.Value) || 0;
            dailyData[dateKey].Value += value;
            dailyData[dateKey].count += 1;
        });

        // Average if multiple rows per day
        Object.keys(dailyData).forEach(date => {
            const day = dailyData[date];
            day.Value = day.Value / day.count;
            delete day.count;
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

        //console.log('\n=== CREATING CHART ==='); 

        // Get actual values
        const values = dates.map(date => dailyData[date].Value || 0);

        const datasets = [];

        // Add weekend indicator as bar chart (if enabled)
        if (showWeekends) {
            // Use fixed height of 2.0 (the y-axis max)
            const weekendData = dates.map(date => {
                return isWeekend(date) ? 2.0 : 0;
            });

            datasets.push({
                label: 'Weekend',
                data: weekendData,
                type: 'bar',
                backgroundColor: 'rgba(128, 128, 128, 0.15)',
                borderColor: 'rgba(128, 128, 128, 0.3)',
                borderWidth: 0,
                order: 5, // Render behind everything
                barPercentage: 1.0,
                categoryPercentage: 1.0
            });
        }

        // Green layer: 0 to 0.9
        datasets.push({
            label: 'Good (0-0.9)',
            data: values.map(v => Math.min(v, 0.9)),
            borderColor: 'rgb(0, 128, 0)',
            backgroundColor: 'rgba(0, 128, 0, 0.3)',
            borderWidth: 2,
            fill: 'origin',
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 5,
            order: 4
        });

        // Orange layer: 0.9 to 1.0
        datasets.push({
            label: 'Warning (0.9-1.0)',
            data: values.map(v => {
                if (v <= 0.9) return 0.9;
                if (v >= 1.0) return 1.0;
                return v;
            }),
            borderColor: 'rgb(255, 165, 0)',
            backgroundColor: 'rgba(255, 165, 0, 0.3)',
            borderWidth: 2,
            fill: '-1',
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 5,
            order: 3
        });

        // Red layer: 1.0 to 2.0
        datasets.push({
            label: 'Critical (1.0-2.0)',
            data: values.map(v => {
                if (v <= 1.0) return 1.0;
                return Math.min(v, 2.0);
            }),
            borderColor: 'rgb(255, 0, 0)',
            backgroundColor: 'rgba(255, 0, 0, 0.3)',
            borderWidth: 2,
            fill: '-1',
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 5,
            order: 2
        });

        // Actual value line (on top, no fill)
        datasets.push({
            label: 'Actual Value',
            data: values,
            borderColor: 'rgb(0, 0, 0)',
            backgroundColor: 'rgba(0, 0, 0, 0)',
            borderWidth: 3,
            fill: false,
            tension: 0.1,
            pointRadius: 3,
            pointHoverRadius: 6,
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
                        text: `Labour Cost Product (${startDate} to ${endDate})`,
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
                            text: 'Value'
                        },
                        beginAtZero: true,
                        max: 2.0,
                        ticks: {
                            stepSize: 0.2
                        }
                    }
                }
            }
        };

        const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync(outputFileName, imageBuffer);
        //console.log(`✓ Chart saved to ${outputFileName}`);
    }

    try {
        //console.log('=== STARTING LABOUR COST PRODUCT CHART ===\n');

        // Load Excel data
        const excelData = loadExcelData(fileName);

        if (excelData.length === 0) {
            throw new Error('No data loaded from Excel file!');
        }

        // Process data
        const dailyData = processData(excelData, START_DATE, END_DATE);

        if (Object.keys(dailyData).length === 0) {
            throw new Error('No data matched the date range!');
        }

        // Create and save chart
        await createChart(dailyData, START_DATE, END_DATE, outputFileName, SHOW_WEEKENDS);

        //console.log('\n=== CHART GENERATION COMPLETED ===');

    } catch (error) {
        throw new Error(`${error.message}`);
    }
}

// Export the main function
module.exports = main;