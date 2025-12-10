async function main(imageOutputDir, options) {

    const { formatted_c_start_date, formatted_c_end_date
    } = options
    const [_START_DATE, _END_DATE] = [formatted_c_start_date, formatted_c_end_date]


    const XLSX = require('xlsx');
    const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
    const fs = require('fs');
    const path = require('path');
    const fileName = 'Segmentation.xlsx';
    const outputFileName = path.join(imageOutputDir);

    // ==================== CONFIGURATION VARIABLES ====================
    // Default to date range in the data: Sept 22-Oct 5, 2025
    const START_DATE = _START_DATE || '22/09/2025';
    const END_DATE = _END_DATE || '05/10/2025';

    // All categories
    let TEMP_CATEGORIES = ['Interest in Halal', 'Knows Eastern Food', 'Local Customer', 'Parent with Child', 'Student', 'Uncategorised'];
    let ALL_CATEGORIES = [];
    for (const key in options) {
        let str = key.replaceAll('cat_', ' ').replaceAll('_', ' ');


        if (TEMP_CATEGORIES.includes(str?.trim()) && options[key] === true) {
            ALL_CATEGORIES.push(str?.trim());
        }


    }


    // ==================================================================

    // Category colors
    const CATEGORY_COLORS = {
        'Knows Eastern Food': 'rgb(255, 99, 132)',
        'Local Customer': 'rgb(54, 162, 235)',
        'Student': 'rgb(255, 206, 86)',
        'Parent with Child': 'rgb(75, 192, 192)',
        'Interest in Halal': 'rgb(153, 102, 255)',
        'Uncategorised': 'rgb(255, 159, 64)'
    };

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

    function loadExcelData(fileName) {
        try {
            const filePath = path.join(__dirname, fileName);

            if (!fs.existsSync(filePath)) {
                console.log(`File ${fileName} not found at ${filePath}`);
                return [];
            }

            // CRITICAL: Read with cellDates to get Date objects
            const workbook = XLSX.readFile(filePath, { cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);

            console.log(`Loaded ${data.length} rows from ${sheetName}`);
            if (data.length > 0) {
                console.log('Columns:', Object.keys(data[0]));
                console.log('Sample row:', {
                    Date: data[0].Date,
                    DateType: typeof data[0].Date,
                    IsDateObject: data[0].Date instanceof Date,
                    Department: data[0].Department,
                    Quantity: data[0].Quantity
                });
            }

            return data;
        } catch (error) {
            console.log(`Error loading Excel file: ${error.message}`);
            return [];
        }
    }

    function processData(excelData, startDate, endDate) {
        const start = parseDate(startDate);
        const end = parseDate(endDate);

        // Set to start of day for comparison
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        console.log('\n=== PROCESSING DATA ===');
        console.log('Looking for dates between:', start.toDateString(), 'and', end.toDateString());

        // Initialize data structure
        const dailyData = {};

        let matchedRows = 0;
        let totalQuantity = 0;
        let dateOutOfRange = 0;
        let invalidCategory = 0;
        let invalidDate = 0;

        // Get unique categories in the data
        const uniqueCategories = new Set();
        excelData.forEach(row => {
            if (row.Department) uniqueCategories.add(row.Department);
        });
        console.log('Categories found:', Array.from(uniqueCategories));

        // Process each row
        excelData.forEach((row, index) => {
            // Check if Date exists
            if (!row.Date) {
                if (index < 3) console.log(`Row ${index}: Missing Date`);
                invalidDate++;
                return;
            }

            // Parse the date (handles both Date objects and strings)
            let rowDate;
            try {
                rowDate = parseDate(row.Date);
                rowDate.setHours(0, 0, 0, 0); // Normalize to start of day
            } catch (e) {
                if (index < 3) console.log(`Row ${index}: Invalid date "${row.Date}"`);
                invalidDate++;
                return;
            }

            // Check date range
            if (rowDate < start || rowDate > end) {
                dateOutOfRange++;
                if (dateOutOfRange <= 3) {
                    console.log(`Row ${index}: Date ${rowDate.toDateString()} outside range`);
                }
                return;
            }

            // Check category
            const category = row.Department;
            if (!category || !ALL_CATEGORIES.includes(category)) {
                invalidCategory++;
                if (invalidCategory <= 3) {
                    console.log(`Row ${index}: Invalid category "${category}"`);
                }
                return;
            }

            // Create date key
            const dateKey = formatDate(rowDate);

            // Initialize this date if needed
            if (!dailyData[dateKey]) {
                dailyData[dateKey] = {};
                ALL_CATEGORIES.forEach(cat => {
                    dailyData[dateKey][cat] = 0;
                });
            }

            // Add quantity
            const quantity = parseFloat(row.Quantity) || 0;
            dailyData[dateKey][category] += quantity;
            matchedRows++;
            totalQuantity += quantity;

            if (matchedRows <= 5) {
                console.log(`✓ Row ${index}: ${category} on ${dateKey} qty=${quantity}`);
            }
        });

        console.log('\n=== PROCESSING SUMMARY ===');
        console.log(`Total rows in file: ${excelData.length}`);
        console.log(`Successfully matched: ${matchedRows}`);
        console.log(`Out of date range: ${dateOutOfRange}`);
        console.log(`Invalid categories: ${invalidCategory}`);
        console.log(`Invalid dates: ${invalidDate}`);
        console.log(`Total quantity: ${totalQuantity}`);
        console.log(`Dates with data: ${Object.keys(dailyData).length}`);

        // Show data summary
        console.log('\n=== DATA BY DATE ===');
        Object.keys(dailyData).sort().forEach(date => {
            const dayTotal = ALL_CATEGORIES.reduce((sum, cat) => sum + dailyData[date][cat], 0);
            console.log(`${date}: ${dayTotal} items`);
        });

        return dailyData;
    }

    async function createChart(dailyData, startDate, endDate, outputFileName) {
        const width = 1200;
        const height = 600;
        const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

        // Sort dates chronologically
        const dates = Object.keys(dailyData).sort((a, b) => {
            return parseDate(a) - parseDate(b);
        });

        console.log('\n=== CREATING CHART ===');
        console.log(`Chart will show ${dates.length} dates`);

        // Create datasets for all categories
        const datasets = ALL_CATEGORIES.map(category => {
            const data = dates.map(date => dailyData[date][category] || 0);
            const total = data.reduce((a, b) => a + b, 0);
            console.log(`${category}: ${total} total items across all dates`);

            return {
                label: category,
                data: data,
                borderColor: CATEGORY_COLORS[category],
                backgroundColor: CATEGORY_COLORS[category].replace('rgb', 'rgba').replace(')', ', 0.2)'),
                borderWidth: 2,
                fill: false,
                tension: 0.1,
                pointRadius: 3,
                pointHoverRadius: 5
            };
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
                        text: `Client Segmentation (${startDate} to ${endDate})`,
                        font: {
                            size: 16,
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
                            text: 'Quantity'
                        },
                        beginAtZero: true
                    }
                }
            }
        };

        const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync(outputFileName, imageBuffer);
        console.log(`✓ Chart saved to ${outputFileName}`);
    }

    try {
        console.log('=== STARTING CLIENT SEGMENTATION CHART ===\n');

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
        await createChart(dailyData, START_DATE, END_DATE, outputFileName);

        console.log('\n=== CHART GENERATION COMPLETED ===');

    } catch (error) {
        throw new Error(`${error.message}`);
    }
}

// Export the main function
module.exports = main;