import fs from 'fs';

const debugCSVParsing = () => {
  try {
    console.log('🔍 Debugging CSV parsing...');

    // Read the CSV file
    const csvPath = '/Users/harrisonbudd/Downloads/AI Villa Assistant - d_propertyInfo.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    // Get header and data lines
    const headerLine = lines[0];
    const dataLine = lines[1];
    
    console.log('📊 Header line length:', headerLine.length);
    console.log('📊 Data line length:', dataLine.length);
    
    // Simple split by comma to count columns
    const headerColumns = headerLine.split(',');
    const dataColumns = dataLine.split(',');
    
    console.log('📊 Header columns count:', headerColumns.length);
    console.log('📊 Data columns count (simple split):', dataColumns.length);
    
    console.log('\n📋 First 10 header columns:');
    headerColumns.slice(0, 10).forEach((col, i) => {
      console.log(`  ${i + 1}: "${col}"`);
    });
    
    console.log('\n📋 Last 10 header columns:');
    headerColumns.slice(-10).forEach((col, i) => {
      console.log(`  ${headerColumns.length - 10 + i + 1}: "${col}"`);
    });
    
    // Try parsing with proper CSV parsing
    const parseCSVLine = (line) => {
      const values = [];
      let current = '';
      let inQuotes = false;
      let i = 0;
      
      while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i += 2;
            continue;
          }
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current);
          current = '';
          i++;
          continue;
        } else {
          current += char;
        }
        i++;
      }
      values.push(current);
      return values;
    };
    
    const parsedHeaders = parseCSVLine(headerLine);
    const parsedData = parseCSVLine(dataLine);
    
    console.log('\n📊 Parsed header columns count:', parsedHeaders.length);
    console.log('📊 Parsed data columns count:', parsedData.length);
    
    console.log('\n📋 All parsed headers:');
    parsedHeaders.forEach((header, i) => {
      console.log(`  ${i + 1}: "${header}"`);
    });
    
    if (parsedHeaders.length !== parsedData.length) {
      console.log('\n❌ Column count mismatch!');
      console.log(`Headers: ${parsedHeaders.length}, Data: ${parsedData.length}`);
    } else {
      console.log('\n✅ Column counts match');
    }
    
  } catch (error) {
    console.error('❌ Error debugging CSV:', error);
  }
};

debugCSVParsing();