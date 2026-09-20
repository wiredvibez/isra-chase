import { chromium } from "playwright";
const OUT = "/private/tmp/claude-501/-Users-yayat-orca-workspaces-isra-chase-tunicate/9c5d8f29-42e2-4575-ad32-98372bb56729/scratchpad/shots";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1280,height:900}, deviceScaleFactor:4 });
const page = await ctx.newPage();
await page.goto("http://localhost:3000/", { waitUntil:"networkidle" });
await page.locator("#missions > ul > li").nth(1).locator("p").first().screenshot({ path: `${OUT}/z-textblurb.png` });
// measure the % run
const m = await page.evaluate(() => {
  const el = [...document.querySelectorAll("p")].find(p => p.textContent.includes("92%"));
  const t = [...el.childNodes].find(n => n.nodeType === 3);
  const i = t.textContent.indexOf("92%");
  const out = [];
  for (const [label, s, e] of [["9", i, i+1], ["2", i+1, i+2], ["%", i+2, i+3]]) {
    const r = document.createRange(); r.setStart(t, s); r.setEnd(t, e);
    out.push(label + ":" + Math.round(r.getBoundingClientRect().left));
  }
  return out.join(" ");
});
console.log("char lefts:", m);
await browser.close();
