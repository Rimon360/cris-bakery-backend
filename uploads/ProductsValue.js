async function main(imageOutputDir, options) {

    const { formatted_c_start_date, formatted_c_end_date, selected_products
    } = options
    const [_START_DATE, _END_DATE] = [formatted_c_start_date, formatted_c_end_date]


    const XLSX = require('xlsx');
    const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
    const fs = require('fs');
    const path = require('path');
    const fileName = 'products_sold.xlsx';
    const outputFileName = path.join(imageOutputDir);

    // ==================== CONFIGURATION VARIABLES ====================
    // Default to date range
    const START_DATE = _START_DATE || '22/09/2025';
    const END_DATE = _END_DATE || '05/10/2025';

    // Selected products from dropdown (array of product names)
    let SELECTED_PRODUCTS = [];
    // Parse selected products from options
    if (selected_products && Array.isArray(selected_products)) {
        SELECTED_PRODUCTS = selected_products;
    } else if (options.selected_products_string) {
        // Alternative: if passed as comma-separated string
        SELECTED_PRODUCTS = options.selected_products_string.split(',').map(p => p.trim());
    }

    // ==================================================================

    // Generate colors for products dynamically
    function generateColor(index) {
        const colors = [
            'rgb(255, 99, 132)',
            'rgb(54, 162, 235)',
            'rgb(255, 206, 86)',
            'rgb(75, 192, 192)',
            'rgb(153, 102, 255)',
            'rgb(255, 159, 64)',
            'rgb(201, 203, 207)',
            'rgb(255, 99, 71)',
            'rgb(60, 179, 113)',
            'rgb(106, 90, 205)',
            'rgb(255, 140, 0)',
            'rgb(220, 20, 60)',
            'rgb(0, 191, 255)',
            'rgb(218, 112, 214)',
            'rgb(127, 255, 0)'
        ];
        return colors[index % colors.length];
    }

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
                //console.log(`File ${fileName} not found at ${filePath}`);
                return [];
            }

            // CRITICAL: Read with cellDates to get Date objects
            const workbook = XLSX.readFile(filePath, { cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet); 

            return data.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
        } catch (error) {
            //console.log(`Error loading Excel file: ${error.message}`);
            return [];
        }
    }

    function getAllProductNames(excelData) {
        const productNames = new Set();
        excelData.forEach(row => {
            if (row.Name) {
                productNames.add(row.Name.trim());
            }
        });
        return Array.from(productNames).sort();
    }

    function processData(excelData, startDate, endDate, selectedProducts) {
        let start = parseDate(startDate);
        let end = parseDate(endDate);

        // If start and end are the same, or if we want single date support
        // Set to start of day for start, end of day for end
        start = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
        end = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);

        // Initialize data structure
        const dailyData = {};

        let matchedRows = 0;
        let totalValue = 0;
        let dateOutOfRange = 0;
        let invalidProduct = 0;
        let invalidDate = 0;

        // Get unique products in the data
        const allProducts = getAllProductNames(excelData);
        //console.log(`Total unique products in file: ${allProducts.length}`);
        //console.log('Sample products:', allProducts.slice(0, 10));

        // Process each row
        excelData.forEach((row, index) => {
            // Check if Date exists
            if (!row.Date) {
                if (index < 3) //console.log(`Row ${index}: Missing Date`);
                    invalidDate++;
                return;
            }

            // Parse the date (handles both Date objects and strings)
            let rowDate;
            try {
                rowDate = parseDate(row.Date);
                // Normalize to start of day for comparison
                rowDate = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate(), 0, 0, 0, 0);
            } catch (e) {
                if (index < 3) //console.log(`Row ${index}: Invalid date "${row.Date}"`);
                    invalidDate++;
                return;
            }

            // Check date range (inclusive on both ends)
            if (rowDate.getTime() < start.getTime() || rowDate.getTime() > end.getTime()) {
                dateOutOfRange++;
                if (dateOutOfRange <= 3) {
                    //console.log(`Row ${index}: Date ${rowDate.toDateString()} outside range`);
                }
                return;
            }

            // Check product name
            const productName = row.Name ? row.Name.trim() : null;
            if (!productName || !selectedProducts.includes(productName)) {
                invalidProduct++;
                if (invalidProduct <= 3) {
                    //console.log(`Row ${index}: Product "${productName}" not in selected list`);
                }
                return;
            }

            // Create date key
            const dateKey = formatDate(rowDate);

            // Initialize this date if needed
            if (!dailyData[dateKey]) {
                dailyData[dateKey] = {};
                selectedProducts.forEach(prod => {
                    dailyData[dateKey][prod] = 0;
                });
            }

            // Add value
            const value = parseFloat(row.Value) || 0;
            dailyData[dateKey][productName] += value;
            matchedRows++;
            totalValue += value;

            if (matchedRows <= 5) {
                //console.log(`✓ Row ${index}: ${productName} on ${dateKey} value=${value}`);
            }
        });

        //console.log('\n=== PROCESSING SUMMARY ===');
        //console.log(`Total rows in file: ${excelData.length}`);
        //console.log(`Successfully matched: ${matchedRows}`);
        //console.log(`Out of date range: ${dateOutOfRange}`);
        //console.log(`Not in selected products: ${invalidProduct}`);
        //console.log(`Invalid dates: ${invalidDate}`);
        //console.log(`Total value: ${totalValue.toFixed(2)}`);
        //console.log(`Dates with data: ${Object.keys(dailyData).length}`);

        // Show data summary
        //console.log('\n=== DATA BY DATE ===');
        Object.keys(dailyData).sort().forEach(date => {
            const dayTotal = selectedProducts.reduce((sum, prod) => sum + dailyData[date][prod], 0);
            //console.log(`${date}: ${dayTotal.toFixed(2)} value`);
        });

        return dailyData;
    }

    async function createChart(dailyData, startDate, endDate, selectedProducts, outputFileName) {
        const width = 1200;
        const height = 600;
        const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

        // Sort dates chronologically
        const dates = Object.keys(dailyData).sort((a, b) => {
            return parseDate(a) - parseDate(b);
        });

        //console.log('\n=== CREATING CHART ===');
        //console.log(`Chart will show ${dates.length} dates`);

        // Create datasets for selected products
        const datasets = selectedProducts.map((product, index) => {
            const data = dates.map(date => dailyData[date][product] || 0);
            const total = data.reduce((a, b) => a + b, 0);
            //console.log(`${product}: ${total.toFixed(2)} total value across all dates`);

            const color = generateColor(index);
            return {
                label: product,
                data: data,
                borderColor: color,
                backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
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
                        text: `Products Value (${startDate} to ${endDate})`,
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
                        beginAtZero: true
                    }
                }
            }
        };

        const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync(outputFileName, imageBuffer);
        //console.log(`✓ Chart saved to ${outputFileName}`);
    }

    try {
        //console.log('=== STARTING PRODUCTS VALUE CHART ===\n');

        // Load Excel data
        const excelData = loadExcelData(fileName);


        if (excelData.length === 0) {
            throw new Error('No data loaded from Excel file!');
        }

        // If no products selected, get all products for reference
        const allProducts = getAllProductNames(excelData);

        if (SELECTED_PRODUCTS.length === 0) {
            SELECTED_PRODUCTS = allProducts.slice(0, allProducts.length < 5 ? allProducts.length : 5)
            // throw new Error('Please select at least one product from the dropdown menu');
        }

        // Process data
        const dailyData = processData(excelData, START_DATE, END_DATE, SELECTED_PRODUCTS);

        if (Object.keys(dailyData).length === 0) {
            throw new Error('No data matched the date range and selected products!');
        }

        // Create and save chart
        await createChart(dailyData, START_DATE, END_DATE, SELECTED_PRODUCTS, outputFileName);

        //console.log('\n=== CHART GENERATION COMPLETED ===');
        return { productsName: allProducts }
    } catch (error) {
        throw new Error(`${error.message}`);
    }
}

// Export the main function
module.exports = main;