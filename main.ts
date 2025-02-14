import { Builder, By, until, WebDriver } from "selenium-webdriver";
import { Options } from "selenium-webdriver/chrome";
const nodemailer = require("nodemailer");

let pricesPerDay = new Map<string, number>();
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "mailservice0110@gmail.com",
        pass: "..."
    }
});
async function sendEmail(prices: Map<string, number>) {
    const emailText = Array.from(prices.entries())
        .map(([date, price]) => `Data: ${date}, Cena: ${price} PLN`)
        .join("\n");

    const mailOptions = {
        from: "mailservice0110@gmail.com",
        to: "...",
        subject: "Price below point 3500",
        text: `${emailText}`
    };
    try {
        await transporter.sendMail(mailOptions);
    } catch (e) {
        console.log(e);
    }
}

async function extractPrice(driver: WebDriver, date: string): Promise<boolean> {
    try {
        await driver.wait(until.elementsLocated(By.css(".karta-lotu__cena")), 10000);
        const priceElements = await driver.findElements(By.css(".karta-lotu__cena"));
        let sum = 0;
        for (let element of priceElements) {
            let priceText = await element.getText();
            let price = priceText.match(/\d+/);
            sum += parseInt(price![0]);
        }
        pricesPerDay.set(date, sum);
        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
}
async function handleFallbackScenario(driver: WebDriver) {
    try {
        const fallbackUrl = "https://biletyczarterowe.r.pl/destynacja?data=2025-03-03&dokad%5B%5D=BKK&idPrzylot=192905_339903&idWylot=339923&oneWay=false&pakietIdPrzylot=192905_339903&pakietIdWylot=192905_339923&przylotDo&przylotOd&wiek%5B%5D=1989-10-30&wiek%5B%5D=1995-02-13&wylotDo&wylotOd#filtry";
        await driver.get(fallbackUrl);
        await driver.sleep(3000);
        await driver.wait(until.elementsLocated(By.css(".swiper-slide-prev")), 10000);
        const prevBttnUpper = await driver.findElement(By.css(".swiper-slide-prev .termin"));
        await prevBttnUpper.click();
        await driver.sleep(1000);
        const prevBttnLower = await driver.findElement(By.css(".swiper-slide-prev .termin"));
        await prevBttnLower.click();
        await driver.sleep(1000);
        await extractPrice(driver, "2025-03-01");
        await driver.sleep(1000);
        const nextBttnUpper = await driver.findElement(By.css(".swiper-slide-next .termin"));
        await nextBttnUpper.click();
        await driver.sleep(2000);
        const prevBttnsLower = await driver.findElements(By.css(".swiper-slide-prev .termin"));
        await prevBttnsLower[1].click();
        await driver.sleep(1000);
        await extractPrice(driver, "2025-03-03");
    } catch (e) {
        console.log(e);
    }
}
async function runSelenium() {
    const options = new Options();
    options.addArguments("--headless");
    const driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
    try {
        const initialUrl = "https://biletyczarterowe.r.pl/destynacja?data=2025-02-17&dokad%5B%5D=BKK&idPrzylot=192901_339901&idWylot=339921&oneWay=false&pakietIdPrzylot=192901_339901&pakietIdWylot=192901_339921&przylotDo&przylotOd&wiek%5B%5D=1989-10-30&wiek%5B%5D=1995-02-13&wylotDo&wylotOd#filtry";
        await driver.get(initialUrl);
        await driver.sleep(1000);
        const cookieAgreedBttn = await driver.wait(until.elementLocated(By.className("cmpboxbtnyes")), 10000);
        await cookieAgreedBttn.click();
        const initialPriceSuccess = await extractPrice(driver, "2025-02-17");
        if (initialPriceSuccess) {
            await driver.sleep(1000);
            const nextBttn = await driver.wait(until.elementLocated(By.css(".miesiace__arrow.right")), 10000);
            await nextBttn.click();
            await driver.sleep(2000);
            await driver.wait(until.elementsLocated(By.css(".swiper-slide-prev")), 10000);
            const prevBttnUpper = await driver.findElement(By.css(".swiper-slide-prev .termin"));
            await prevBttnUpper.click();
            await driver.sleep(1000);
            const prevBttnLower = await driver.findElement(By.css(".swiper-slide-prev .termin"));
            await prevBttnLower.click();
            await driver.sleep(1000);
            await extractPrice(driver, "2025-03-01");
            await driver.sleep(1000);
            const nextBttnUpper = await driver.findElement(By.css(".swiper-slide-next .termin"));
            await nextBttnUpper.click();
            await driver.sleep(2000);
            const prevBttnsLower = await driver.findElements(By.css(".swiper-slide-prev .termin"));
            await prevBttnsLower[1].click();
            await driver.sleep(1000);
            await extractPrice(driver, "2025-03-03");
        } else {
            await handleFallbackScenario(driver);
        }
        const below3500 = new Map<string, number>();
        pricesPerDay.forEach((value, key) => {
            if (value < 3500) {
                below3500.set(key, value);
            }
        });

        if (below3500.size > 0) {
            await sendEmail(below3500);
        }
    } catch (e) {
        console.log(e);
    } finally {
        await driver.quit();
    }
}

runSelenium();
