const { Telegraf, Markup } = require('telegraf');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');
const cheerio = require('cheerio');

const token = '7870054164:AAFXEunNupYWvCJl_3zWCq8t7QlHfy7ChLU';
const CHROMEDRIVER_PATH = './chromedriver';

const bot = new Telegraf(token);
const options = new chrome.Options();
options.addArguments('--headless'); // Run Chrome in headless mode

const driver = new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

bot.start((ctx) => {
    ctx.reply('שלום! אנא שלח את מספר הרכב כדי לקבל מידע עדכני 📲');
});

bot.on('text', async (ctx) => {
    const input = ctx.message.text.trim();

    if (input === '/start') {
        ctx.reply('שלח מספר רכב או מספר שלדה כדי לאסוף מידע 📄');
    } else if (input.length === 17) {
        try {
            await driver.get('https://bimmervin.com/en');
            await driver.wait(until.elementLocated(By.css('body')), 10000); // Wait for the body element to be present

            const vinInput = await driver.findElement(By.id('vin'));
            await vinInput.clear();
            await vinInput.sendKeys(input);
            const submitButton = await driver.findElement(By.css('button.btn.btn-primary'));
            await submitButton.click();

            // Wait for the vehicle info element to be located with an increased timeout
            const vehicleInfoElement = await driver.wait(until.elementLocated(By.css('div.col-sm-12.text-start')), 30000);
            const vehicleInfo = await vehicleInfoElement.getText();

            const series = extractSeries(vehicleInfo);
            const wikipediaUrl = `http://en.wikipedia.org/wiki/BMW_${series}`;
            ctx.replyWithHTML(`<b>🔗 קישור לויקיפדיה לדגם:</b> <a href="${wikipediaUrl}">${series}</a>`);

            const formattedInfo = `<pre><b>📝 מידע על הרכב:</b>\n${vehicleInfo}</pre>`;
            ctx.replyWithHTML(formattedInfo);

        } catch (error) {
            console.error('Error:', error.message);
            ctx.reply('❗حدث خطأ أثناء جلب معلومات السيارة. يرجى المحاولة مرة أخرى.');
        }
    } else {
        try {
            const url = `https://www.check-car.co.il/report/${input}/`;
            const response = await axios.get(url);
            const $ = cheerio.load(response.data);

            const vinNumber = $('.table_col[data-name="misgeret"] .value').text().trim();
            const modelName = $('.table_col[data-name="kinuy_mishari"] .value').text().trim();
            const manufacturer = $('.table_col[data-name="tozar"] .value').text().trim();
            const trimLevel = $('.table_col[data-name="ramat_gimur"] .value').text().trim();
            const productionYear = $('.table_col[data-name="shnat_yitzur"] .value').text().trim();
            const carColor = $('.table_col[data-name="tzeva_rechev"] .value').text().trim();
            const registrationDate = $('.table_col[data-name="moed_aliya_lakvish"] .value').text().trim();
            const carBodyType = $('.table_col[data-name="merkav"] .value').text().trim();
            const engineCapacity = $('.table_col[data-name="nefah_manoa"] .value').text().trim();
            const isAutomatic = $('.table_col[data-name="automatic_ind"] .value').text().trim() === '✓' ? 'אוטומטי' : 'לא אוטומטי';
            const fuelType = $('.table_col[data-name="sug_delek_nm"] .value').text().trim();
            const drivetrain = $('.table_col[data-name="hanaa_nm"] .value').text().trim();

            // Extracting updated vehicle data
            const currentOwnership = $('.table_col[data-name="baalut"] .value').text().trim();
            const lastAnnualInspection = $('.table_col[data-name="mivchan_acharon_dt"] .value').text().trim();
            const licenseValidity = $('.table_col[data-name="tokef_dt"] .activeDate').text().trim();
            const registrationGroup = $('.table_col[data-name="kvuzat_agra_cd"] .value').text().trim();
            const vehicleFee = $('.table_col[data-name="mehir_agra"] .value').text().trim();
            const importPrice = $('.table_col[data-name="mehir"] .value').text().trim();
            const usageValue = $('.table_col[data-name="shuvi_shimush"] .value').text().trim();
            const recallStatus = $('.table_col[data-name="recall"] .value').text().trim() === '✓' ? 'קריאת ריקול בוצעה' : 'קריאת ריקול שלא בוצעה';
            const handicappedTag = $('.table_col[data-name="tav_neche"] .value').text().trim() === '✓' ? 'כן' : 'לא';

            // Extract ownership history data
            const ownershipHistory = [];
            $('.data_table.wide_table.history_table .table_col').each((i, element) => {
                const label = $(element).find('.label').text().trim();
                const value = $(element).find('.value').text().trim();
                if (label && value) {
                    ownershipHistory.push(`<b>${label}:</b> ${value}`);
                }
            });

            // Formatting the response message with colors and emojis
            let replyMessage = `🚗 <b>מידע על הרכב:</b>\n`;
            replyMessage += `<b>🔹 דגם:</b> ${modelName}\n`;
            replyMessage += `<b>🔹 חברה:</b> ${manufacturer}\n`;
            replyMessage += `<b>🔹 שנה:</b> ${productionYear}\n`;
            replyMessage += `<b>🔹 רמת גימור:</b> ${trimLevel}\n`;
            replyMessage += `<b>🔹 צבע רכב:</b> ${carColor}\n`;
            replyMessage += `<b>🔹 סוג מרכב:</b> ${carBodyType}\n`;
            replyMessage += `<b>🔹 נפח מנוע:</b> ${engineCapacity}\n`;
            replyMessage += `<b>🔹 מספר שלדה | VIN:</b> ${vinNumber}\n`;
            replyMessage += `<b>🔹 מועד עלייה לכביש:</b> ${registrationDate}\n`;
            
            replyMessage += `<b>🔹 סוג דלק:</b> ${fuelType}\n`;
            replyMessage += `<b>🔹 הנעה:</b> ${drivetrain}\n`;
            replyMessage += `<b>🔹 אוטומטי:</b> ${isAutomatic}\n`;
            
            replyMessage += `<b>🔹 טסט אחרון:</b> ${lastAnnualInspection}\n`;
            replyMessage += `<b>🔹 תוקף רישוי:</b> ${licenseValidity}\n\n`;

            // Adding the updated vehicle data section
            replyMessage += `<b>📊 נתונים עדכניים:</b>\n`;
            replyMessage += `<b>🔑 בעלות נוכחית:</b> ${currentOwnership}\n`;
            replyMessage += `<b>🔑 קבוצת אגרה:</b> ${registrationGroup}\n`;
            replyMessage += `<b>💰 מחיר אגרת רכב:</b> ${vehicleFee}\n`;
            
            replyMessage += `<b>💵 מחיר יבואן:</b> ${importPrice}\n`;
            replyMessage += `<b>💸 שווי שימוש:</b> ${usageValue}\n`;
            replyMessage += `<b>⚠️ קריאת ריקול:</b> ${recallStatus}\n`;
            replyMessage += `<b>♿️ תו נכה:</b> ${handicappedTag}\n\n`;

            // Adding ownership history section
            if (ownershipHistory.length > 0) {
                replyMessage += `<b>📅 היסטוריית בעלות:</b>\n`;
                ownershipHistory.forEach(item => {
                    replyMessage += `${item}\n`;
                });
            }

            // Send the final information with HTML formatting
            ctx.replyWithHTML(replyMessage);
        } catch (error) {
            console.error('Error during scraping:', error);
            ctx.reply('❌ לא ניתן לאסוף מידע על הרכב, אנא נסה שוב.');
        }
    }
});

bot.launch();

// Helper function to extract the series from the vehicle info text
function extractSeries(vehicleInfo) {
    const seriesMatch = vehicleInfo.match(/Series\s+(.*?)\n/);
    return seriesMatch ? seriesMatch[1] : '';
}
