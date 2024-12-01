const { Telegraf, Markup } = require('telegraf');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');
const cheerio = require('cheerio');

const token = '7870054164:AAFXEunNupYWvCJl_3zWCq8t7QlHfy7ChLU';
const CHROMEDRIVER_PATH = './chromedriver';

const bot = new Telegraf(token);
const options = new chrome.Options();
options.addArguments('--headless'); // הפעלת Chrome במצב ללא ראש

const driver = new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

bot.start((ctx) => {
    ctx.reply('שלח מספר רכב או מספר שלדה (VIN) לבדיקה.');
});

bot.on('text', async (ctx) => {
    const input = ctx.message.text.trim();

    if (input === '/start') {
        ctx.reply('שלח מספר רכב או מספר שלדה (VIN) לבדיקה.');
    } else if (input.length === 17) {
        // בדיקה באמצעות אתר BimmerVIN
        try {
            await driver.get('https://bimmervin.com/en');
            await driver.wait(until.elementLocated(By.css('body')), 10000);

            const vinInput = await driver.findElement(By.id('vin'));
            await vinInput.clear();
            await vinInput.sendKeys(input);

            const submitButton = await driver.findElement(By.css('button.btn.btn-primary'));
            await submitButton.click();

            const vehicleInfoElement = await driver.wait(until.elementLocated(By.css('div.col-sm-12.text-start')), 30000);
            const vehicleInfo = await vehicleInfoElement.getText();

            const series = extractSeries(vehicleInfo);
            const wikipediaUrl = `http://en.wikipedia.org/wiki/BMW_${series}`;
            ctx.reply(`🔗 קישור לויקיפדיה: ${wikipediaUrl}`);

            const formattedInfo = `<pre>${vehicleInfo}</pre>`;
            ctx.replyWithHTML(`📄 **מידע מרכב BMW**:\n${formattedInfo}`);

        } catch (error) {
            console.error('שגיאה:', error.message);
            ctx.reply('שגיאה בעת הבדיקה. נסה שוב.');
        }
    } else {
        // בדיקה באמצעות Check-Car
        try {
            const url = `https://www.check-car.co.il/report/${input}/`;

            const response = await axios.get(url);
            const $ = cheerio.load(response.data);

            // שליפת מידע
            const vinNumber = $('.table_col[data-name="misgeret"] .value').text().trim();
            const lastAnnualInspection = $('.table_col[data-name="mivchan_acharon_dt"] .value').text().trim();
            const licenseValidity = $('.table_col[data-name="tokef_dt"] .activeDate').text().trim();
            const ownershipHistory = $('.ownership-history').text().trim() || 'לא זמין';
            const technicalData = $('.technical-data').text().trim() || 'לא זמין';
            const basicInfo = $('.basic-info').text().trim() || 'לא זמין';

            const carInfo = $('.add_fav').data();

            // פורמט התגובה
            let replyMessage = `🚗 **מידע על הרכב**:\n`;
            replyMessage += `דגם: ${carInfo.model}\n`;
            replyMessage += `חברה: ${carInfo.heb}\n`;
            replyMessage += `שנה: ${carInfo.year}\n`;
            replyMessage += `סוג: ${carInfo.type}\n`;
            replyMessage += `מספר שלדה | VIN: ${vinNumber}\n`;
            replyMessage += `טסט אחרון: ${lastAnnualInspection}\n`;
            replyMessage += `תוקף רישוי שנתי: ${licenseValidity}\n\n`;
            replyMessage += `📜 **היסטוריית בעלויות**:\n${ownershipHistory}\n\n`;
            replyMessage += `🔧 **נתונים טכניים**:\n${technicalData}\n\n`;
            replyMessage += `ℹ️ **מידע בסיסי על כלי הרכב**:\n${basicInfo}\n`;

            // שליפת תמונות
            const images = [];
            $('img').each((index, img) => {
                const src = $(img).attr('src');
                if (src && src.startsWith('http')) {
                    images.push(src);
                }
            });

            // שליחת תמונות
            for (const url of images) {
                await ctx.replyWithPhoto({ url });
            }

            // שליחת הודעה
            ctx.reply(replyMessage, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('שגיאה:', error.message);
            ctx.reply('שגיאה בעת שליפת המידע. נסה שוב.');
        }
    }
});

// פונקציה לשליפת סדרת BMW
function extractSeries(vehicleInfo) {
    const seriesMatch = vehicleInfo.match(/Series\s+(.*?)\n/);
    return seriesMatch ? seriesMatch[1] : '';
}

// הפעלת הבוט
bot.launch();
