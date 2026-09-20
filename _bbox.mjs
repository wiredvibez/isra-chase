import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:844}});
const p = await ctx.newPage();
const reqs=[];
p.on("response", r => { if (r.status()>=400) reqs.push(r.status()+" "+r.url()); });
await p.goto("http://localhost:3000/", {waitUntil:"networkidle"});
console.log(await p.evaluate(() => [...document.querySelectorAll("svg text")].map(t => {
  const bb = t.getBBox();
  const vb = t.ownerSVGElement.viewBox.baseVal;
  return `"${t.textContent.trim()}" bbox x=${bb.x.toFixed(1)} w=${bb.width.toFixed(1)} right=${(bb.x+bb.width).toFixed(1)} / viewBox w=${vb.width}`;
})));
console.log("failed requests:", reqs);
await b.close();
