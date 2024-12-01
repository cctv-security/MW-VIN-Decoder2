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

            // Extracting car details
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

            // Extracting additional technical data
            const countryOfOrigin = $('.table_col[data-name="tozeret_eretz_nm"] .value').text().trim();
            const europeanClassification = $('.table_col[data-name="tkina_eu"] .value').text().trim();
            const productCode = $('.table_col[data-name="tozeret_cd"] .value').text().trim();
            const modelNumber = $('.table_col[data-name="degem_nm"] .value').text().trim();
            const engineModel = $('.table_col[data-name="degem_manoa"] .value').text().trim();
            const registrationOrder = $('.table_col[data-name="horaat_rishum"] .value').text().trim();
            const totalWeight = $('.table_col[data-name="mishkal_kolel"] .value').text().trim();
            const curbWeight = $('.table_col[data-name="mishkal_azmi"] .value').text().trim();
            const maxCargoWeight = $('.table_col[data-name="mishkal_mitan_harama"] .value').text().trim();
            const driverSeats = $('.table_col[data-name="mispar_mekomot_leyd_nahag"] .value').text().trim();

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

            // Formatting the response message
            let replyMessage = `🚗 **מידע על הרכב**:\n`;
            replyMessage += `דגם: ${modelName}\n`;
            replyMessage += `חברה: ${manufacturer}\n`;
            replyMessage += `שנה: ${productionYear}\n`;
            replyMessage += `רמת גימור: ${trimLevel}\n`;
            replyMessage += `צבע רכב: ${carColor}\n`;
            replyMessage += `מרכב: ${carBodyType}\n`;
            replyMessage += `נפח מנוע: ${engineCapacity}\n`;
            replyMessage += `מספר שלדה | VIN: ${vinNumber}\n`;
            replyMessage += `מועד עלייה לכביש: ${registrationDate}\n`;
            replyMessage += `סוג דלק: ${fuelType}\n`;
            replyMessage += `הנעה: ${drivetrain}\n`;
            replyMessage += `אוטומטי: ${isAutomatic}\n`;
            replyMessage += `טסט אחרון: ${lastAnnualInspection}\n`;
            replyMessage += `תוקף רישוי שנתי: ${licenseValidity}\n\n`;

            // Adding the new vehicle data section
            replyMessage += `📊 **נתונים עדכניים**:\n`;
            replyMessage += `בעלות נוכחית: ${currentOwnership}\n`;
            replyMessage += `קבוצת אגרה: ${registrationGroup}\n`;
            replyMessage += `מחיר אגרת רכב: ${vehicleFee}\n`;
            replyMessage += `מחיר יבואן: ${importPrice}\n`;
            replyMessage += `שווי שימוש: ${usageValue}\n`;
            replyMessage += `קריאת ריקול: ${recallStatus}\n`;
            replyMessage += `תו נכה: ${handicappedTag}\n\n`;

            // Adding the technical data
            replyMessage += `📊 **נתונים טכניים**:\n`;
            replyMessage += `ארץ ייצור: ${countryOfOrigin}\n`;
            replyMessage += `סיווג תקינה אירופאית: ${europeanClassification}\n`;
            replyMessage += `קוד תוצר: ${productCode}\n`;
            replyMessage += `מספר דגם: ${modelNumber}\n`;
            replyMessage += `דגם מנוע: ${engineModel}\n`;
            replyMessage += `הוראת רישום: ${registrationOrder}\n`;
            replyMessage += `משקל כולל: ${totalWeight}\n`;
            replyMessage += `משקל עצמי: ${curbWeight}\n`;
            replyMessage += `משקל מטען מורשה: ${maxCargoWeight}\n`;
            replyMessage += `מספר מקומות ליד הנהג: ${driverSeats}\n`;

            // Send the final information
            ctx.reply(replyMessage);
        } catch (error) {
            console.error('Error during scraping:', error);
            ctx.reply('לא ניתן לאסוף מידע על הרכב');
        }
    }
});

bot.launch();
