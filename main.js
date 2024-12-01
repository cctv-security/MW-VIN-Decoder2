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
            // فتح الموقع
            await driver.get('https://bimmervin.com/en');
            await driver.wait(until.elementLocated(By.css('body')), 10000); // انتظار لتحميل الصفحة الأساسية

            // إدخال رقم الشاسيه وإرسال الطلب
            const vinInput = await driver.findElement(By.id('vin'));
            await vinInput.clear();
            await vinInput.sendKeys(input);
            const submitButton = await driver.findElement(By.css('button.btn.btn-primary'));
            await submitButton.click();

            // انتظار لتحميل النتائج
            const vehicleInfoElement = await driver.wait(until.elementLocated(By.css('div.col-sm-12.text-start')), 30000);
            await driver.sleep(30000); // إضافة تأخير إضافي للتأكد من التحميل الكامل
            const vehicleInfo = await vehicleInfoElement.getText();

            // استخراج السلسلة وإنشاء رابط ويكيبيديا
            const series = extractSeries(vehicleInfo);
            const wikipediaUrl = `http://en.wikipedia.org/wiki/BMW_${series}`;
            ctx.replyWithHTML(`<b>🔗 קישור לויקיפדיה לדגם:</b> <a href="${wikipediaUrl}">${series}</a>`);

            // إرسال المعلومات بالتنسيق المناسب
            const formattedInfo = `<pre><b>📝 מידע על הרכב:</b>\n${vehicleInfo}</pre>`;
            ctx.replyWithHTML(formattedInfo);

        } catch (error) {
            console.error('Error:', error.message);
            ctx.reply('❗❌ לא ניתן לאסוף מידע על הרכב, אנא נסה שוב.');
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

            // بيانات محدثة
            const currentOwnership = $('.table_col[data-name="baalut"] .value').text().trim();
            const lastAnnualInspection = $('.table_col[data-name="mivchan_acharon_dt"] .value').text().trim();
            const licenseValidity = $('.table_col[data-name="tokef_dt"] .activeDate').text().trim();
            const registrationGroup = $('.table_col[data-name="kvuzat_agra_cd"] .value').text().trim();
            const vehicleFee = $('.table_col[data-name="mehir_agra"] .value').text().trim();
            const importPrice = $('.table_col[data-name="mehir"] .value').text().trim();
            const usageValue = $('.table_col[data-name="shuvi_shimush"] .value').text().trim();
            const recallStatus = $('.table_col[data-name="recall"] .value').text().trim() === '✓' ? 'קריאת ריקול בוצעה' : 'קריאת ריקול שלא בוצעה';
            const handicappedTag = $('.table_col[data-name="tav_neche"] .value').text().trim() === '✓' ? 'כן' : 'לא';

            // صياغة الرسالة النهائية
            let replyMessage = `🚗 <b>מידע על הרכב:</b>\n`;
            replyMessage += `<b>🔹 דגם:</b> ${modelName}\n`;
            replyMessage += `<b>🔹 חברה:</b> ${manufacturer}\n`;
            replyMessage += `<b>🔹 שנה:</b> ${productionYear}\n`;
            replyMessage += `<b>🔹 רמת גימור:</b> ${trimLevel}\n`;
            replyMessage += `<b>🔹 צבע רכב:</b> ${carColor}\n`;
            replyMessage += `<b>🔹 סוג מרכב:</b> ${carBodyType}\n`;
            replyMessage += `<b>🔹 נפח מנוע:</b> ${engineCapacity}\n`;
            replyMessage += `<b>🔹 מספר שלדה | VIN:</b> ${vinNumber}\n`;
            replyMessage += `<b>🔹 מועד עלייה לכביש:</b> ${registrationDate}\n\n`;

            ctx.replyWithHTML(replyMessage);
        } catch (error) {
            console.error('Error during scraping:', error);
            ctx.reply('❌ לא ניתן לאסוף מידע על הרכב, אנא נסה שוב.');
        }
    }
});

bot.launch();

// دالة مساعدة لاستخراج سلسلة المركبة
function extractSeries(vehicleInfo) {
    const seriesMatch = vehicleInfo.match(/Series\s+(.*?)\n/);
    return seriesMatch ? seriesMatch[1] : '';
}
