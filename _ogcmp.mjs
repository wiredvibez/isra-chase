import { chromium } from "playwright";
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:1300,height:300}, deviceScaleFactor:2})).newPage();
await p.goto("file:///private/tmp/claude-501/-Users-yayat-orca-workspaces-isra-chase-tunicate/9c5d8f29-42e2-4575-ad32-98372bb56729/scratchpad/shots/cmp.html", {waitUntil:"load"});
await p.waitForTimeout(800);
await p.screenshot({path:"/private/tmp/claude-501/-Users-yayat-orca-workspaces-isra-chase-tunicate/9c5d8f29-42e2-4575-ad32-98372bb56729/scratchpad/shots/og-crop.png", clip:{x:0,y:0,width:1290,height:250}});
await b.close();
