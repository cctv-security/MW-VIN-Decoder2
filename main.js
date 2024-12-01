const { Telegraf, Markup } = require('telegraf');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const token = '7870054164:AAFXEunNupYWvCJl_3zWCq8t7QlHfy7ChLU'; // ضع التوكن الخاص بك هنا
const CHROMEDRIVER_PATH = './chromedriver';

const bot = new Telegraf(token);
const options = new chrome.Options();
options.addArguments('--headless'); // تشغيل Chrome في وضع غير مرئي

const driver = new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

bot.start((ctx) => {
    ctx.reply('👋 ברוך הבא! שלח מספר רכב או מספר שלדה כדי לקבל מידע.');
});

bot.on('text', async (ctx) => {
    const input = ctx.message.text.trim();

    if (input === '/start') {
        ctx.reply('📩 אנא שלח מספר רכב או שלדה.');
    } else if (input.length === 17) {
        // البحث عن بيانات بواسطة VIN
        try {
            await driver.get('https://bimmervin.com/en');
            await driver.wait(until.elementLocated(By.css('body')), 10000);

            const vinInput = await driver.findElement(By.id('vin'));
            await vinInput.clear();
            await vinInput.sendKeys(input);
            const submitButton = await driver.findElement(By.css('button.btn.btn-primary'));
            await submitButton.click();

            // جلب معلومات السيارة
            const vehicleInfoElement = await driver.wait(until.elementLocated(By.css('div.col-sm-12.text-start')), 30000);
            const vehicleInfo = await vehicleInfoElement.getText();

            // استخراج روابط الصور (لوجو وصورة واجهة السيارة)
            const logoElement = await driver.findElement(By.css('.logo img'));
            const carImageElement = await driver.findElement(By.css('.front img'));

            const logoUrl = await logoElement.getAttribute('src');
            const carImageUrl = await carImageElement.getAttribute('src');

            // إرسال الصور والمعلومات
            await sendImage(ctx, logoUrl, '🔰 לוגו הרכב');
            await sendImage(ctx, carImageUrl, '🚘 חזית הרכב');

            // تنسيق النص وإرساله
            const formattedInfo = `<pre>${vehicleInfo}</pre>`;
            ctx.replyWithHTML(formattedInfo);

        } catch (error) {
            console.error('Error:', error.message);
            ctx.reply('❌ שגיאה באיסוף נתונים. נסה שוב מאוחר יותר.');
        }
    } else {
        // البحث عن بيانات بواسطة رقم السيارة
        try {
            const url = `https://www.check-car.co.il/report/${input}/`;

            const response = await axios.get(url);
            const $ = cheerio.load(response.data);

            const carInfo = $('.add_fav').data();
            const vinNumber = $('.table_col[data-name="misgeret"] .value').text().trim();
            const lastAnnualInspection = $('.table_col[data-name="mivchan_acharon_dt"] .value').text().trim();
            const licenseValidity = $('.table_col[data-name="tokef_dt"] .activeDate').text().trim();

            let replyMessage = `🚗 *פרטי הרכב:*\n`;
            replyMessage += `דגם: ${carInfo.model}\n`;
            replyMessage += `חברה: ${carInfo.heb}\n`;
            replyMessage += `שנה: ${carInfo.year}\n`;
            replyMessage += `סוג: ${carInfo.type}\n`;
            replyMessage += `מספר שלדה| VIN: ${vinNumber}\n`;
            replyMessage += `טסט אחרון: ${lastAnnualInspection}\n`;
            replyMessage += `תוקף טסט שנתי: ${licenseValidity}\n`;

            ctx.replyWithMarkdown(replyMessage);
        } catch (error) {
            console.error('Error:', error.message);
            ctx.reply('❌ לא ניתן להשיג מידע על הרכב. נסה שוב.');
        }
    }
});

// وظيفة إرسال الصور
async function sendImage(ctx, url, caption) {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer',
        });

        const tempFilePath = path.join(__dirname, 'temp.jpg');
        fs.writeFileSync(tempFilePath, response.data);

        await ctx.replyWithPhoto({ source: tempFilePath }, { caption });
        fs.unlinkSync(tempFilePath); // حذف الصورة المؤقتة
    } catch (error) {
        console.error('Error sending image:', error.message);
        ctx.reply('❌ לא ניתן לשלוח תמונה זו.');
    }
}

bot.launch();

console.log('🚀 הבוט פעיל!');
