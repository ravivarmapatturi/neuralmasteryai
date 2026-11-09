/** Focused overview audit: preserves former headings and links to every topic. */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
const manifest=JSON.parse(readFileSync(process.env.SYSTEM_DESIGN_OVERVIEW_MANIFEST??'docs/evidence/software-system-design/remaining-overviews.json','utf8'));
const slugs=process.argv.slice(2);
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('/tmp/system-design-topics',{recursive:true});
try {
  for(const theme of ['light','dark']) {
    const context=await browser.newContext({viewport:{width:375,height:900},reducedMotion:'reduce'});
    await context.addInitScript(v=>localStorage.setItem('neural-mastery-theme',v),theme);
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    for(const slug of slugs) {
      await page.goto(`http://127.0.0.1:5217/docs/software-system-design/${slug}`,{waitUntil:'networkidle'});
      for(const topic of manifest[slug].topics) if(!await page.locator(`a[href="/docs/software-system-design/${topic}"]`).count()) throw Error(`Missing ${topic}`);
      for(const heading of manifest[slug].headings) if(!await page.getByRole('heading',{level:2,name:heading,exact:true}).count()) throw Error(`Lost heading ${heading}`);
      for(const width of [375,1440]) {
        await page.setViewportSize({width,height:900});
        await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
        if(await page.evaluate(()=>document.documentElement.scrollWidth)>width) throw Error(`${slug} overflows ${width}`);
        await page.screenshot({path:`/tmp/system-design-topics/${slug}-${theme}-${width}-overview.png`});
      }
      if(errors.length) throw Error(errors.join('; '));
      console.log(`${slug}/${theme}: topics, preserved headings, both widths passed`);
    }
    await context.close();
  }
} finally {await browser.close();}
