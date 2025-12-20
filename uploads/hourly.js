async function main(imageOutputDir, options) {
    const {
        formatted_c_start_date,
        formatted_c_end_date,
        c_start_time,
        c_end_time,
        cost_target
    } = options;

    const _START_DATE = formatted_c_start_date;
    const _END_DATE = formatted_c_end_date;
    const _START_TIME = c_start_time;
    const _END_TIME = c_end_time;
    const _LABOR_COST_TARGET = cost_target;

    const XLSX = require('xlsx');
    const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
    const fs = require('fs');
    const path = require('path');
    const fileName = 'hourly.xlsx';
    const outputFileName = path.join(imageOutputDir); // *****
    // ==================== CONFIGURATION VARIABLES ====================
    const START_DATE = _START_DATE || '28/08/2025';  // DD/MM/YYYY format
    const END_DATE = _END_DATE || '28/08/2025';    // DD/MM/YYYY format (same as start for single day)
    const START_TIME = _START_TIME || '05:00';       // HH:MM format
    const END_TIME = _END_TIME || '20:00';         // HH:MM format
    const LABOR_COST_TARGET = _LABOR_COST_TARGET || 40;    // Percentage target
    // ==================================================================

    function getMonthName(date) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[date.getMonth()];
    }

    function parseDate(dateStr) {
        // Handle DD/MM/YYYY format
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return new Date(dateStr);
    }

    function formatTime(timeStr) {
        // Convert "5:00" to "05:00" format
        const parts = timeStr.toString().split(':');
        return parts[0].padStart(2, '0') + ':00';
    }

    function generateFileName(startDate, endDate) {
        const start = parseDate(startDate);
        const end = parseDate(endDate);

        if (start.getTime() === end.getTime()) {
            // Single day
            const monthName = getMonthName(start);
            const year = start.getFullYear();
            return `${monthName}_${year}.xlsx`;
        } else {
            // Date range - use start date's month
            const monthName = getMonthName(start);
            const year = start.getFullYear();
            return `${monthName}_${year}.xlsx`;
        }
    }

    function loadExcelData(fileName) {
        try {
            const filePath = path.join(__dirname, fileName);
            if (!fs.existsSync(filePath)) {
                //console.log(`File ${fileName} not found in current directory`);
            }

            const workbook = XLSX.readFile(filePath);

            // Look for the "labour" sheet
            let sheetName = 'labour';
            if (!workbook.Sheets[sheetName]) {
                // Try different variations if exact match not found
                const possibleNames = ['labour', 'Labour', 'LABOUR', 'labor', 'Labor', 'LABOR', 'Sheet1'];
                sheetName = possibleNames.find(name => workbook.Sheets[name]);

                if (!sheetName) {
                    //console.log('Available sheets:', workbook.SheetNames);
                    //console.log(`Sheet "labour" not found. Available sheets: ${workbook.SheetNames.join(', ')}`);
                }
            }

            //console.log(`Reading from sheet: ${sheetName}`);
            const worksheet = workbook.Sheets[sheetName];
            return XLSX.utils.sheet_to_json(worksheet);
        } catch (error) {
            //console.log(`Error loading Excel file: ${error.message}`);
            //process.exit(1);
        }
    }

    function processData(excelData, startDate, endDate, startTime, endTime) {
        const start = parseDate(startDate);
        const end = parseDate(endDate);

        // Filter data by date range
        const filteredData = excelData.filter(row => {
            if (!row.Date) return false;
            const rowDate = parseDate(row.Date.toString());
            return rowDate >= start && rowDate <= end;
        });

        if (filteredData.length === 0) {
            throw new Error('No data found for the selected date range!');
        }

        // Group by time and calculate averages
        const timeGroups = {};

        filteredData.forEach(row => {
            const timeKey = formatTime(row['Time Period']);
            if (!timeGroups[timeKey]) {
                timeGroups[timeKey] = {
                    sales: [],
                    laborCost: [],
                    laborPercent: []
                };
            }

            if (row['Total Sales']) timeGroups[timeKey].sales.push(parseFloat(row['Total Sales']));
            if (row['Labour Cost']) timeGroups[timeKey].laborCost.push(parseFloat(row['Labour Cost']));
            if (row['%']) timeGroups[timeKey].laborPercent.push(parseFloat(row['%']));
        });

        // Calculate averages and filter by time range
        const chartData = [];
        const timeStart = parseInt(startTime.split(':')[0]);
        const timeEnd = parseInt(endTime.split(':')[0]);

        for (let hour = timeStart; hour <= timeEnd; hour++) {
            const timeKey = hour.toString().padStart(2, '0') + ':00';
            if (timeGroups[timeKey]) {
                const group = timeGroups[timeKey];
                chartData.push({
                    time: timeKey,
                    sales: group.sales.length > 0 ? group.sales.reduce((a, b) => a + b) / group.sales.length : 0,
                    laborCost: group.laborCost.length > 0 ? group.laborCost.reduce((a, b) => a + b) / group.laborCost.length : 0,
                    laborPercent: group.laborPercent.length > 0 ? group.laborPercent.reduce((a, b) => a + b) / group.laborPercent.length : 0
                });
            } else {
                chartData.push({
                    time: timeKey,
                    sales: 0,
                    laborCost: 0,
                    laborPercent: 0
                });
            }
        }

        return chartData;
    }

    async function createChart(data, laborTarget, outputFileName) {
        const width = 1200;
        const height = 600;
        const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

        const times = data.map(d => d.time);
        const sales = data.map(d => d.sales);
        const laborCost = data.map(d => d.laborCost);
        const targetLine = data.map(d => d.sales * (laborTarget / 100)); // 40% of sales

        // Create datasets for the fill areas
        const aboveTargetData = data.map((d, i) => {
            const target = d.sales * (laborTarget / 100);
            return d.laborCost > target ? d.laborCost : target;
        });
        const belowTargetData = data.map((d, i) => {
            const target = d.sales * (laborTarget / 100);
            return d.laborCost < target ? d.laborCost : target;
        });

        const configuration = {
            type: 'line',
            data: {
                labels: times,
                datasets: [
                    // Red fill area (above target)
                    {
                        label: 'Above Target',
                        data: aboveTargetData,
                        borderColor: 'transparent',
                        backgroundColor: 'rgba(255, 99, 132, 0.3)',
                        fill: '+1',
                        pointRadius: 0,
                        order: 5
                    },
                    // Target line for fill reference
                    {
                        label: '',
                        data: targetLine,
                        borderColor: 'transparent',
                        backgroundColor: 'transparent',
                        pointRadius: 0,
                        order: 4
                    },
                    // Green fill area (below target)
                    {
                        label: 'Below Target',
                        data: belowTargetData,
                        borderColor: 'transparent',
                        backgroundColor: 'rgba(75, 192, 192, 0.3)',
                        fill: 'origin',
                        pointRadius: 0,
                        order: 3
                    },
                    // Sales line
                    {
                        label: 'Sales',
                        data: sales,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        order: 1
                    },
                    // Labor cost line
                    {
                        label: 'Labour Cost',
                        data: laborCost,
                        borderColor: 'rgb(255, 206, 86)',
                        backgroundColor: 'rgba(255, 206, 86, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        order: 2
                    },
                    // Target line
                    {
                        label: `${laborTarget}% Target`,
                        data: targetLine,
                        borderColor: 'rgb(128, 128, 128)',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            filter: function (legendItem) {
                                return legendItem.text !== '' &&
                                    legendItem.text !== 'Above Target' &&
                                    legendItem.text !== 'Below Target';
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: `Labour cost (${START_DATE} to ${END_DATE})`,
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
                            text: 'Time'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Amount'
                        },
                        beginAtZero: true
                    }
                }
            }
        };

        const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync(outputFileName, imageBuffer);
        //console.log(`Chart saved as ${outputFileName}`);
    }


    try {

        // Load Excel data
        const excelData = loadExcelData(fileName);

        // Process data
        const chartData = processData(excelData, START_DATE, END_DATE, START_TIME, END_TIME);

        // Create and save chart
        await createChart(chartData, LABOR_COST_TARGET, outputFileName);

        //console.log('Chart generation completed successfully!');

    } catch (error) {
        throw new Error(`${error.message}`); 
    }
}

// Run the main function
module.exports = main;