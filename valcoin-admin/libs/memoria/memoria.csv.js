// valcoin-admin/libs/memoria/memoria.csv.js

const csv = require('csv-parser');
const { Readable } = require('stream');

const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer.toString());

    stream
      .pipe(csv({ headers: false, separator: ',' }))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

const processCSVData = (data) => {
    let flashcards = [];
    let currentDate = null;
    let currentAssunto = null;

    // Set a default date to today if no date is found initially
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    currentDate = `${year}-${month}-${day}`;

    for (const row of data) {
        const values = Object.values(row);
        if (values.length === 0) continue;

        const firstValue = values[0] || '';
        const secondValue = values[1] || null;

        const dateRegex = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
        const dateMatch = firstValue.match(dateRegex);

        if (dateMatch) {
            const [, day, month, year] = dateMatch;
            currentDate = `${year}-${month}-${day}`;
            if (secondValue) {
                currentAssunto = secondValue;
            }
        } else {
            const front = firstValue;
            const back = secondValue;

            if (front && back && currentDate) {
                flashcards.push({
                    front,
                    back,
                    scheduled_date: currentDate,
                    assunto_name: currentAssunto,
                });
            }
        }
    }

    return flashcards;
};


module.exports = {
    parseCSV,
    processCSVData,
};
