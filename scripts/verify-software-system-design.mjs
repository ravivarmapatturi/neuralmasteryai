/** Focused dev-server audit; intentionally does not build or run the full Playwright suite. */
import { chromium } from 'playwright';
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
const origin = process.env.SYSTEM_DESIGN_ORIGIN ?? 'http://localhost:5217';
const output = process.env.SYSTEM_DESIGN_EVIDENCE ?? '/tmp/software-system-design';
mkdirSync(output, {recursive:true});
const slugs = readdirSync('src/content/docs/software-system-design').filter(f=>f.endsWith('.mdx')).map(f=>f.slice(0,-4));
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
const results = [];
try {
  for (const theme of (process.env.SYSTEM_DESIGN_THEMES ?? 'light,dark').split(',')) {
    const context = await browser.newContext({viewport:{width:375,height:900},reducedMotion:'reduce'});
    await context.addInitScript(mode => localStorage.setItem('neural-mastery-theme', mode), theme);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',message=>{if(message.type()==='error') errors.push(message.text());});
    for (const slug of (process.env.SYSTEM_DESIGN_SKIP_TRACK === '1' ? [] : slugs)) {
      const startErrors=errors.length;
      console.log(`Checking ${theme}/${slug}`);
      await page.goto(`${origin}/docs/software-system-design/${slug}`,{waitUntil:'networkidle'});
      await page.locator('h1').last().waitFor();
      if (await page.getByText('Page not found',{exact:false}).count()) throw Error(`Missing ${slug}`);
      await page.evaluate(()=>document.fonts.ready);
      const width=await page.evaluate(()=>document.documentElement.scrollWidth);
      if(width>375) throw Error(`${theme}/${slug}: overflow ${width}`);
      // Use real DOM buttons and real worker; one block at a time limits RAM use.
      const blocks=page.getByText('Run it yourself',{exact:true}).locator('xpath=../..');
      const snippets=await blocks.count();
      const outputs=[];
      for(let i=0;i<snippets && process.env.SYSTEM_DESIGN_SKIP_PYTHON !== '1';i++) {
        const block=blocks.nth(i);
        const button=block.getByRole('button',{name:'Run',exact:true});
        await button.click();
        await block.locator('pre').first().waitFor({timeout:120000});
        await block.getByRole('button',{name:'Run',exact:true}).waitFor({timeout:120000});
        const text=await block.innerText();
        if(/Traceback|Couldn.t load the in-browser|Error:|ModuleNotFoundError/.test(text)) throw Error(`${theme}/${slug} snippet ${i+1}: ${text}`);
        const pre=await block.locator('pre').allTextContents();
        if(!pre.length || !pre.join('').trim()) throw Error(`No Python output ${slug}/${i+1}`);
        outputs.push(pre.join('\n'));
      }
      // Exercise both paths of each case trace and return to the informative failure state.
      const normal=page.getByRole('button',{name:'Normal path',exact:true});
      if(await normal.count()) {
        await normal.focus(); await page.keyboard.press('Enter');
        await page.getByRole('button',{name:'Failure path',exact:true}).click();
      }
      for (const name of ['Healthy','Lose largest zone','Before write','Replica catches up','Write acknowledged','No deduplication','Atomic deduplication']) {
        const control=page.getByRole('button',{name,exact:true});
        if(await control.count()) {await control.focus(); await page.keyboard.press('Enter');}
      }
      const prediction=page.getByText('Predict First',{exact:true}).locator('..');
      if(await prediction.count()) {
        await prediction.getByRole('button').first().click();
        if(!await prediction.getByText(/Correct\.|Not quite\./).count()) throw Error(`Prediction did not reveal ${slug}`);
      }
      // Range controls receive keyboard input, in addition to unit-level arithmetic checks.
      for(const slider of await page.getByRole('slider').all()) {
        await slider.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft');
      }
      const consoleErrors=errors.slice(startErrors);
      if(consoleErrors.length) throw Error(`${slug}: ${consoleErrors.join('; ')}`);
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({path:`${output}/${slug}-${theme}-375.png`,fullPage:false,animations:'disabled'});
      const trace=page.locator('svg[aria-label*="→"]');
      if(await trace.count()) {
        const defects=await trace.first().evaluate(svg=>{
          const boxes=[...svg.querySelectorAll('text')].map(el=>({label:el.textContent,box:el.getBBox()}));
          const bad=boxes.filter(({box:b})=>b.x<0 || b.x+b.width>300).map(x=>`clipped: ${x.label}`);
          for(let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++) {
            const a=boxes[i].box,b=boxes[j].box;
            if(a.x<b.x+b.width && a.x+a.width>b.x && a.y<b.y+b.height && a.y+a.height>b.y) bad.push(`overlap: ${boxes[i].label} / ${boxes[j].label}`);
          }
          return bad;
        });
        if(defects.length) throw Error(`${slug}: ${defects.join('; ')}`);
        await trace.first().evaluate(el=>window.scrollTo(0,Math.max(0,el.getBoundingClientRect().top+window.scrollY-110)));
        await trace.first().screenshot({path:`${output}/${slug}-${theme}-trace.png`});
      }
      await page.setViewportSize({width:1440,height:1000});
      if(await page.evaluate(()=>document.documentElement.scrollWidth)>1440) throw Error(`Desktop overflow ${slug}`);
      await page.screenshot({path:`${output}/${slug}-${theme}-1440.png`,fullPage:false,animations:'disabled'});
      await page.setViewportSize({width:375,height:900});
      results.push({slug,theme,mobileWidth:width,snippets,pythonExecuted:process.env.SYSTEM_DESIGN_SKIP_PYTHON !== '1',outputs,consoleErrors});
      writeFileSync(`${output}/browser-results.json`,JSON.stringify(results,null,2));
      console.log(`${theme}/${slug}: ${process.env.SYSTEM_DESIGN_SKIP_PYTHON === '1' ? 'geometry/control pass' : `${snippets} Python blocks passed`}, 375px and 1440px clean`);
    }
    await page.goto(`${origin}/interview/questions`,{waitUntil:'networkidle'});
    await page.getByLabel('Topic',{exact:true}).selectOption('software-system-design-questions');
    await page.getByLabel('Search interview questions').fill('Ten instances run at 60%');
    await page.getByRole('button',{name:/Ten instances run at 60%/}).click();
    if(!await page.getByText(/Peak traffic is 6,000 requests/).count()) throw Error('Missing scenario context');
    await page.getByLabel('Your answer',{exact:true}).fill('The largest zone has four instances. Six survivors run at 100%; fourteen placed five, five, four leave nine at 66.7%. Check the shared database under failure.');
    await page.getByRole('button',{name:'Review my answer →'}).click();
    const rubric=page.getByLabel('Computes six surviving instances after the largest-zone failure.',{exact:true});
    await rubric.check();
    const href=await page.getByRole('link',{name:/original study guide/}).getAttribute('href');
    if(href!=='/docs/software-system-design/foundations') throw Error('Wrong teaching route');
    if(await page.evaluate(()=>document.documentElement.scrollWidth)>375) throw Error('Interview mobile overflow');
    await page.screenshot({path:`${output}/interview-${theme}-375.png`,animations:'disabled'});
    await page.setViewportSize({width:1440,height:1000});
    await page.screenshot({path:`${output}/interview-${theme}-1440.png`,animations:'disabled'});
    await page.goto(`${origin}/interview/topics/software-system-design-questions`,{waitUntil:'networkidle'});
    if(await page.getByRole('link',{name:/Ten instances run at 60%/}).count()!==1) throw Error('Topic index missing architecture question');
    console.log(`${theme}/interview: topic filter, answer, specific rubric, teaching link, and topic index passed`);
    await context.close();
  }
} catch(error) {
  console.error(error);
  throw error;
} finally { await browser.close(); }
console.log(`Verified ${results.length} page/theme combinations.`);
