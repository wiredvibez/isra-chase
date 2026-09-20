import { chromium } from "playwright";
const OUT = "/private/tmp/claude-501/-Users-yayat-orca-workspaces-isra-chase-tunicate/9c5d8f29-42e2-4575-ad32-98372bb56729/scratchpad/shots";
import fs from "node:fs";
fs.mkdirSync(OUT, { recursive: true });
const pages = [["home","/"],["signin","/signin"],["signup","/signup"],["reset","/reset-password"],["404","/this-page-does-not-exist"]];
const sizes = [["390",390,844],["1280",1280,900]];
const browser = await chromium.launch();
for (const [sname,w,h] of sizes) {
  const ctx = await browser.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:2, locale:"he-IL" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", m => { if (m.type()==="error") errs.push(m.text()); });
  for (const [name, path] of pages) {
    const resp = await page.goto("http://localhost:3000"+path, { waitUntil:"networkidle", timeout: 90000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path:`${OUT}/${name}-${sname}.png`, fullPage:true });
    const overflow = await page.evaluate(() => {
      const de = document.documentElement;
      const bad = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        if (r.right > de.clientWidth + 1 || r.left < -1) {
          bad.push(`${el.tagName}.${(el.className&&el.className.baseVal!==undefined?el.className.baseVal:el.className||"").toString().slice(0,60)} L${Math.round(r.left)} R${Math.round(r.right)}`);
        }
        if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === "visible") {
          bad.push(`CLIP ${el.tagName}.${(el.className||"").toString().slice(0,50)} sw${el.scrollWidth} cw${el.clientWidth}`);
        }
      }
      return { docScroll: de.scrollWidth > de.clientWidth, clientWidth: de.clientWidth, scrollWidth: de.scrollWidth, bad: bad.slice(0,12) };
    });
    console.log(sname, name, resp.status(), JSON.stringify(overflow));
  }
  if (errs.length) console.log(sname, "CONSOLE ERRORS", errs.slice(0,5));
  await ctx.close();
}
await browser.close();
