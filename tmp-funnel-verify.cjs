const { chromium } = require('C:/Users/Test/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const http = require('http');
const root = path.resolve('frontend');
const server = http.createServer((req,res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) {res.writeHead(403).end();return;}
  try {res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'})[path.extname(file)] || 'text/plain');res.end(fs.readFileSync(file));} catch {res.writeHead(404).end();}
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-proxy-server']});
  try {
    const page = await browser.newPage(); const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('requestfailed',r=>console.log('Request failed:',r.url(),r.failure()));
    const tracking='https://a.partner-versicherung.de/click.php?partner_id=202430&ad_id=1618&deep=kfz-versicherung';
    for (const width of [375,390,1440]) {
      await page.setViewportSize({width,height:900});
      for (const file of ['index','strom','gas','internet','kfz','impressum','datenschutz','agb','partnerhinweis']) {
        await page.goto(`${base}/${file}.html`);
        for (const lang of ['de','tr']) {
          if(await page.locator(`[data-language="${lang}"]`).count()) {
            if(!await page.locator(`[data-language="${lang}"]`).isVisible()) await page.locator('.menu-toggle').click();
            await page.locator(`[data-language="${lang}"]`).click();
            assert.equal(await page.locator('html').getAttribute('lang'),lang);
            if(await page.locator('.header-panel.is-open').count()) await page.locator('.menu-toggle').click();
          }
          const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:innerWidth}));
          assert.ok(size.scroll<=size.view,`${file} ${width} ${lang} overflow: ${JSON.stringify(size)}`);
        }
        const links=await page.locator('a[href],script[src],link[href],img[src]').evaluateAll(es=>es.map(e=>e.getAttribute('href')||e.getAttribute('src')));
        for(const link of links) {
          const url=new URL(link,`${base}/${file}.html`);
          if(url.origin===base) assert.ok(fs.existsSync(path.join(root,url.pathname==='/'?'index.html':decodeURIComponent(url.pathname))),`${file} missing ${link}`);
        }
        if(file==='kfz') {
          assert.equal(await page.locator('a[href*="click.php"]').count(),2);
          for(const a of await page.locator('a[href*="click.php"]').all()) assert.equal(await a.getAttribute('href'),tracking);
          assert.equal(await page.locator('form,input').count(),0);
          const img=page.locator('.kfz-banner img');
          assert.equal(await img.getAttribute('src'),'https://a.partner-versicherung.de/view.php?partner_id=202430&ad_id=1618');
          assert.ok((await img.boundingBox()).width<=300);
          console.log('Banner load',width,await img.evaluate(i=>({complete:i.complete,width:i.naturalWidth,height:i.naturalHeight})));
          if(width===390) await page.screenshot({path:'tmp-kfz-mobile.png',fullPage:true});
        }
      }
      console.log('Layout, language and local resources PASS',width);
    }
    await page.setViewportSize({width:1440,height:900});
    // Capture prepared mailto URLs without opening a mail client or sending email.
    await page.route('**/js/*.js',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:(await response.text()).replaceAll('window.location.href =','window.__preparedMailto =')});
    });
    await page.goto(base+'/internet.html');
    await page.locator('#internet-postal').fill('10115');await page.locator('#internet-email').fill('test@example.com');
    assert.equal(await page.locator('#internet-form').evaluate(f=>f.checkValidity()),true);
    await page.locator('[data-internet-summary]').click();
    assert.equal(await page.locator('[data-internet-summary-list] dt').count(),2);
    await page.locator('[data-send-internet]').click();
    let mail=await page.evaluate(()=>window.__preparedMailto);
    assert.ok(mail.startsWith('mailto:info@feelyng.de?'));
    assert.ok(!decodeURIComponent(mail).includes('undefined'));
    assert.ok(!decodeURIComponent(mail).includes('Aktueller Anbieter:'));
    await page.locator('[data-language="de"]').click();
    assert.equal(await page.locator('[data-internet-summary-list] dt').count(),2);
    for(const [file,form,postal,email,consumption,toggle,estimator,apply] of [
      ['strom','#tariff-form','#postal-code','#customer-email','#annual-consumption','[data-estimator-toggle]','#estimator-form','[data-apply-estimate]'],
      ['gas','#gas-form','#gas-postal','#gas-email','#gas-consumption','[data-gas-toggle]','#gas-estimator-form','[data-gas-apply]']]) {
      await page.goto(base+'/'+file+'.html');
      await page.locator(postal).fill('10115');await page.locator(email).fill('test@example.com');await page.locator(consumption).fill('3127');
      assert.equal(await page.locator(form).evaluate(f=>f.checkValidity()),true);
      assert.equal(await page.locator(toggle).getAttribute('aria-expanded'),'false');
      await page.locator(form).evaluate(f=>f.requestSubmit());
      const mail=await page.evaluate(()=>window.__preparedMailto);
      assert.ok(mail.startsWith('mailto:info@feelyng.de?'));
      assert.ok(decodeURIComponent(mail).includes('3.127 kWh'));
      await page.locator(toggle).click();
      await page.locator(estimator).evaluate(f=>{
        const names=new Set();for(const i of f.querySelectorAll('input')) {
          if(i.type==='radio'&&!names.has(i.name)) {const choices=[...f.querySelectorAll('input')].filter(x=>x.name===i.name); const chosen=choices.find(x=>x.value===(i.name==='heating'?'yes':'no'))||i;chosen.checked=true;names.add(i.name);}
          if(i.type==='number') i.value='80';
        }
        f.requestSubmit();
      });
      await page.locator(apply).click();
      assert.ok(Number(await page.locator(consumption).inputValue())>0);
      assert.equal(await page.locator(toggle).getAttribute('aria-expanded'),'false');
      assert.equal(await page.locator(consumption).evaluate(e=>document.activeElement===e),true);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: minimal Internet inquiry; exact consumption validity; optional estimators and focus; no JS errors.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
