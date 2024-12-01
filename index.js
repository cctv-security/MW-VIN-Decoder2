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
    } else {
        try {
            const url = `https://www.check-car.co.il/report/${input}/`;

            const response = await axios.get(url);
            const $ = cheerio.load(response.data);

            // שליפת לוגו הרכב
            const logoUrl = $('img.logo-selector').attr('src') || '';
            const logoFullUrl = logoUrl.startsWith('http') ? logoUrl : `https://www.check-car.co.il${logoUrl}`;

            // שליפת תמונת הרכב (חזית הרכב)
            const frontCarImage = $('img.car-image').attr('src') || '';
            const carImageFullUrl = frontCarImage.startsWith('http') ? frontCarImage : `https://www.check-car.co.il${frontCarImage}`;

            // שליפת נתונים כלליים
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

            // שליחת לוגו הרכב (אם קיים)
            if (logoFullUrl) {
                await ctx.replyWithPhoto({ url: logoFullUrl }, { caption: '🔰 לוגו הרכב' });
            }

            // שליחת חזית הרכב (אם קיימת)
            if (carImageFullUrl) {
                await ctx.replyWithPhoto({ url: carImageFullUrl }, { caption: '🚘 חזית הרכב' });
            }

            // שליחת הודעה טקסטואלית עם מידע כללי
            ctx.reply(replyMessage, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('שגיאה:', error.message);
            ctx.reply('שגיאה בעת שליפת המידע. נסה שוב.');
        }
    }
});

// הפעלת הבוט
bot.launch();
