const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({headless:false});
  const page = await browser.newPage();
  page.on('console', message =>
      console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
  await page.goto('http://localhost:5500');

  while (true){
    const profiled = await page.evaluate(() =>{ return eval("viewerParams.profiled")});
    if (profiled) break;
  }
  //await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
