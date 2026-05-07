import csvParser from "csv-parser";
import fs from 'fs';
import stripBom from 'strip-bom-stream';


export const readCSV = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];
        
        fs.createReadStream(filePath)
        .pipe(stripBom())
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            resolve(results);
        })
        .on('error', (err) => {
            reject(err);
        })
    });
}