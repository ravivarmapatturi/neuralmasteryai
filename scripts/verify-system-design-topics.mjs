/** Focused topic acceptance: no static build or full browser suite. */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const slugs = process.argv.slice(2);
if (!slugs.length) throw Error('Pass the topic slugs to check.');
const evidence = '/tmp/system-design-topics';
mkdirSync(evidence, { recursive: true });
for (const slug of slugs) {
  const mdx = readFileSync(`src/content/docs/software-system-design/${slug}.mdx`, 'utf8');
  const snippets = [...mdx.matchAll(/<RunnableCode code=\{`([\s\S]*?)`\}/g)].map(m => m[1]);
  if (snippets.length < 2) throw Error(`${slug}: requires two executable examples`);
  for (const code of snippets) {
    for (const source of [code, `try:\n${code.split('\n').map(line => '    '+line).join('\n')}\nexcept Exception:\n    raise`]) {
      const result = spawnSync('python3', ['-c', source], { encoding: 'utf8', timeout: 20000 });
      if (result.status !== 0 || !result.stdout.trim()) throw Error(`${slug}: ${result.stderr}`);
    }
  }
}
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const results = [];
try {
  for (const theme of ['light','dark']) {
    const context = await browser.newContext({viewport:{width:375,height:900},reducedMotion:'reduce'});
    await context.addInitScript(mode => localStorage.setItem('neural-mastery-theme', mode),theme);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if(m.type() === 'error') errors.push(m.text()); });
    for(const slug of slugs) {
      await page.goto(`http://127.0.0.1:5217/docs/software-system-design/${slug}`,{waitUntil:'networkidle'});
      await page.locator('h1').last().waitFor();
      await page.evaluate(() => document.fonts.ready);
      if(await page.getByText('Page not found',{exact:false}).count()) throw Error(`Missing ${slug}`);
      const blocks=page.getByText('Run it yourself',{exact:true}).locator('xpath=../..');
      const outputs=[];
      for(const block of await blocks.all()) {
        await block.getByRole('button',{name:'Run',exact:true}).click();
        await block.locator('pre').first().waitFor({timeout:120000});
        await block.getByRole('button',{name:'Run',exact:true}).waitFor({timeout:120000});
        const output=(await block.locator('pre').allTextContents()).join('\n');
        if(!output.trim() || /Traceback|Error:|ModuleNotFoundError/.test(output)) throw Error(`${slug}: ${output}`);
        outputs.push(output);
      }
      if(outputs.length<2) throw Error(`No browser executions for ${slug}`);
      for(const control of await page.locator('.nm-viz-content button').all()) {
        await control.focus(); await page.keyboard.press('Enter');
      }
      for(const control of await page.getByRole('slider').all()) {
        await control.focus();
        const atMax = Number(await control.inputValue()) === Number(await control.getAttribute('max'));
        await page.keyboard.press(atMax ? 'ArrowLeft' : 'ArrowRight');
        await page.keyboard.press(atMax ? 'ArrowRight' : 'ArrowLeft');
      }
      for(const width of [375,1440]) {
        await page.setViewportSize({width,height:1000});
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        if(await page.evaluate(()=>document.documentElement.scrollWidth)>width) throw Error(`${slug}: overflow at ${width}: ${JSON.stringify(await page.evaluate(()=>({width:document.documentElement.scrollWidth, elements:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>376 && !e.closest('.cm-editor')).slice(0,8).map(e=>({tag:e.tagName,text:e.textContent?.slice(0,120),right:e.getBoundingClientRect().right}))})))}`);
        let diagram = 0;
        for(const svg of await page.locator('svg[role="img"]').all()) {
          await svg.scrollIntoViewIfNeeded();
          await svg.screenshot({path:`${evidence}/${slug}-${theme}-${width}-diagram-${++diagram}.png`});
        }
      }
      if(errors.length) throw Error(errors.join('\n'));
      results.push({slug,theme,outputs,viewports:[375,1440],errors:[]});
      writeFileSync(`${evidence}/results.json`,JSON.stringify(results,null,2));
      console.log(`${slug}/${theme}: Python, browser execution, controls and geometry passed`);
      await page.setViewportSize({width:375,height:900});
    }
    await context.close();
  }
} finally { await browser.close(); }
