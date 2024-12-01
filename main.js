
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
    ctx.reply('שלח מספר רכב לאיסוף מידע זמין ');
});

bot.on('text', async (ctx) => {
    const input = ctx.message.text.trim();

    if (input === '/start') {
        ctx.reply('שלח מספר רכב או מספר שלדה אם יש לך BMW .');
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
    // Once located, get the text of the element
    const vehicleInfo = await vehicleInfoElement.getText();

    // Extract series information
    const series = extractSeries(vehicleInfo);
    // Get Wikipedia URL for the series
    const wikipediaUrl = `http://en.wikipedia.org/wiki/BMW_${series}`;
    // Send the Wikipedia URL
    ctx.reply(wikipediaUrl);

    // Format the vehicle info with HTML
    const formattedInfo = `<pre>${vehicleInfo}</pre>`;
    // Send the formatted info
    ctx.replyWithHTML(formattedInfo);

    // Split the vehicle info and display it as buttons
    const infoLines = vehicleInfo.split('\n');
    const buttons = infoLines.map(line => {
        const parts = line.split('\t');
        if (parts.length === 2) {
            return [Markup.button.callback(parts[1], parts[0])];
        } else {
            return null;
        }
    }).filter(btn => btn !== null);

    // Send the buttons as an Inline Keyboard
    ctx.reply('T̷I̷R̷A̷B̷I̷M̷M̷E̷R̷', Markup.inlineKeyboard(buttons.flat()));

} catch (error) {
    console.error('Error:', error.message);
    ctx.reply('حدث خطأ أثناء جلب معلومات السيارة. يرجى المحاولة مرة أخرى.');
}

    } else {
        try {
            const url = `https://www.check-car.co.il/report/${input}/`;

            const response = await axios.get(url);

            const $ = cheerio.load(response.data);

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


            ctx.reply(replyMessage);
        } catch (error) {
            ctx.reply('יש לנסות שוב');
        }
    }
});

bot.launch();

function extractSeries(vehicleInfo) {
    const seriesMatch = vehicleInfo.match(/Series\s+(.*?)\n/);
    return seriesMatch ? seriesMatch[1] : '';
}
