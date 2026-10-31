// Local, mocked browser checks. Requires Playwright (or PLAYWRIGHT_MODULE pointing to it).
// Run from the app directory: node scripts/stories-smoke.mjs
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const artifacts = await mkdtemp(path.join(tmpdir(), "autogis-stories-smoke-"));
const previewImage = process.env.STORIES_PREVIEW_IMAGE
    ? (await readFile(process.env.STORIES_PREVIEW_IMAGE)).toString("base64") : "";
const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body><div id="root"></div><script type="module">
import React from 'react';
import {createRoot} from 'react-dom/client';
import {CssBaseline,ThemeProvider,createTheme} from '@mui/material';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {ToastContainer} from 'react-toastify';
import {StoryComposer} from '/src/modules/stories/components/StoryComposer.tsx';
import {StoryViewer} from '/src/modules/stories/components/StoryViewer.tsx';
function TestApp(){
  const [story,setStory]=React.useState(null);
  React.useEffect(()=>{const handler=e=>setStory(e.detail);window.addEventListener('preview-story',handler);return()=>window.removeEventListener('preview-story',handler)},[]);
  return React.createElement(React.Fragment,null,
    React.createElement(StoryComposer,{authorId:'author'}),
    ${previewImage ? `React.createElement('button',{onClick:e=>{
      const bytes=Uint8Array.from(atob('${previewImage}'),c=>c.charCodeAt(0));
      const transfer=new DataTransfer();transfer.items.add(new File([bytes],'wide.png',{type:'image/png'}));
      const input=document.querySelector('input[type="file"]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
      e.currentTarget.hidden=true;
    }},'Тест: выбрать широкое фото'),` : ""}
    story && React.createElement(StoryViewer,{groups:[[story]],initialGroupIndex:0,open:true,onClose:()=>setStory(null)}),
    React.createElement(ToastContainer));
}
createRoot(document.getElementById('root')).render(React.createElement(ThemeProvider,{theme:createTheme()},
  React.createElement(CssBaseline),React.createElement(QueryClientProvider,{client:new QueryClient()},React.createElement(TestApp))));
</script></body></html>`;
const server = await createServer({ root, envDir: artifacts, server: { host: "127.0.0.1", port: 0, strictPort: false },
    plugins: [{ name: "story-smoke-harness", configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
            if (process.env.STORIES_PREVIEW === "1" && req.url?.startsWith("/api/")) {
                res.statusCode = 503;
                res.end("Preview only: publishing disabled");
                return;
            }
            if (req.url !== "/__stories_test") return next();
            res.setHeader("Content-Type", "text/html");
            res.end(await vite.transformIndexHtml(req.url, html));
        });
    } }],
});
// Optional local UI preview when the headless browser is not installed.
if (process.env.STORIES_PREVIEW === "1") {
    await server.listen();
    console.log(`Stories preview: http://127.0.0.1:${server.httpServer.address().port}/__stories_test`);
    await new Promise(() => {});
}
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
let browser;
try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const submissions = [];
    let failPublish = false;
    await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        const reply = (body, status = 200) => route.fulfill({ status, json: body });
        if (url.pathname.endsWith("/upload-intent")) return reply({ intentId: "intent", stagingKey: "tmp/photo", uploadUrl: "/v1/media/upload", headers: {} });
        if (url.pathname.endsWith("/confirm-upload")) return reply({ assetId: "asset", status: "ready" });
        if (url.pathname.endsWith("/v1/media/upload")) return reply({});
        if (url.pathname.includes("/v1/media/assets/")) return reply({ assetId: "asset", status: "ready" });
        if (url.pathname === "/api/stories") {
            if (failPublish) return reply({ message: "Test failure" }, 500);
            const payload = route.request().postDataJSON();
            submissions.push(payload);
            return reply({ id: "story", ...payload });
        }
        if (url.pathname.startsWith("/api/")) return reply({});
        return route.continue();
    });
    await page.goto(`${origin}/__stories_test`);
    await page.getByRole("button", { name: "Фото", exact: true }).click();
    await page.getByRole("button", { name: "Отмена", exact: true }).click();
    assert.equal(await page.getByText(/Продолжить/).count(), 0, "cancelling must not add a frame");
    await page.getByRole("button", { name: "Текст", exact: true }).click();
    await page.getByRole("textbox", { name: "Текст сторис" }).fill("Скидка 20% на диагностику\nДо конца недели");
    await page.getByRole("button", { name: "Крупный", exact: true }).click();
    await page.getByRole("button", { name: "Готово", exact: true }).click();
    await page.getByRole("button", { name: "Опубликовать · 24 часа" }).click();
    await page.getByRole("button", { name: "Фото", exact: true }).waitFor();
    assert.equal(submissions[0].frames[0].fontSize, 36);
    assert.equal(submissions[0].frames.length, 1);

    // Generate a local wide photo fixture, no external media or uploads.
    const dataURL = await page.evaluate(() => {
        const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 600;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#0f766e"; ctx.fillRect(0, 0, 1200, 600);
        ctx.fillStyle = "#f59e0b"; ctx.fillRect(0, 0, 160, 600); ctx.fillRect(1040, 0, 160, 600);
        ctx.fillStyle = "white"; ctx.font = "bold 60px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("АВТОГИС • АКЦИЯ", 600, 310);
        return canvas.toDataURL("image/png");
    });
    await page.getByRole("button", { name: "Фото", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles({ name: "wide.png", mimeType: "image/png", buffer: Buffer.from(dataURL.split(",")[1], "base64") });
    await page.getByRole("button", { name: "Добавить текст", exact: true }).click();
    await page.getByRole("textbox", { name: "Текст на фото" }).fill("Запишитесь на диагностику\nСегодня −20%");
    await page.getByRole("button", { name: "Готово", exact: true }).click();
    const editorCanvas = page.locator('[aria-label="Фото: переместите пальцем, измените масштаб двумя пальцами"]');
    const img = editorCanvas.locator("img");
    assert.equal(await img.evaluate((el) => getComputedStyle(el).objectFit), "contain");
    await page.screenshot({ path: path.join(artifacts, "mobile-contain.png") });
    await page.getByRole("button", { name: "Кадр", exact: true }).click();
    await page.getByRole("button", { name: "Заполнить", exact: true }).click();
    await page.getByRole("slider", { name: "Масштаб фото" }).focus();
    await page.keyboard.press("ArrowRight");
    const canvasBox = await editorCanvas.boundingBox();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 20, canvasBox.y + canvasBox.height / 2 + 20, { steps: 4 });
    await page.mouse.up();
    // Exercise a real two-touch gesture in Chromium.
    const cdp = await page.context().newCDPSession(page);
    const x = canvasBox.x + canvasBox.width / 2, y = canvasBox.y + canvasBox.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x-20, y, id: 1 }, { x: x+20, y, id: 2 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x-30, y, id: 1 }, { x: x+30, y, id: 2 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const transform = await img.evaluate((el) => getComputedStyle(el).transform);
    await page.getByRole("button", { name: "Закрыть редактор, сохранив черновик" }).click();
    await page.getByRole("button", { name: /Продолжить/ }).click();
    assert.equal(await img.evaluate((el) => getComputedStyle(el).transform), transform, "draft crop must survive closing");
    await page.getByRole("button", { name: "Добавить слайд" }).click();
    await page.getByRole("button", { name: "Текст на фоне" }).click();
    await page.getByRole("textbox", { name: "Текст сторис" }).fill("Следующий слайд");
    await page.getByRole("button", { name: "Готово" }).click();
    await page.getByRole("button", { name: "Слайд 1", exact: true }).click();
    failPublish = true;
    await page.getByRole("button", { name: "Опубликовать · 24 часа" }).click();
    await page.getByText(/Не удалось опубликовать сторис/).waitFor();
    assert.equal(await page.getByRole("button", { name: "Слайд 2", exact: true }).count(), 1, "failed publish preserves all frames");
    failPublish = false;
    await page.getByRole("button", { name: "Опубликовать · 24 часа" }).click();
    await page.getByRole("button", { name: "Фото", exact: true }).waitFor();
    const posted = submissions[1].frames;
    assert.equal(posted.length, 2);
    assert.equal(posted[0].kind, "image", "no phantom text slide");
    assert.equal(posted[0].imageFit, "cover");
    assert.ok(posted[0].imageScale > 1.05, "pinch must change zoom");
    assert.ok(posted[0].imageX > 0 && posted[0].imageY > 0, "drag must change position");
    assert.equal(posted[0].assetId, "asset");
    assert.ok(posted[0].text.includes("20%"));
    await page.evaluate(({ frames, imageUrl }) => window.dispatchEvent(new CustomEvent("preview-story", { detail: {
        id: "story", author: { userId: "author", displayName: "АвтоГис", role: "master" },
        frames: frames.map((frame, i) => ({ ...frame, id: String(i), imageUrl })),
        expiresAt: new Date(Date.now() + 86400000).toISOString(), createdAt: new Date().toISOString(), isViewed: false,
    } })), { frames: posted, imageUrl: dataURL });
    await page.getByRole("button", { name: "Следующая сторис" }).waitFor();
    assert.equal(await page.locator('img[alt="Фото сторис"]').evaluate((el) => getComputedStyle(el).transform), transform, "viewer must use exact editor crop");
    for (const [width, height] of [[390, 844], [320, 568], [844, 390], [1280, 800]]) {
        await page.setViewportSize({ width, height });
        await page.screenshot({ path: path.join(artifacts, `viewer-${width}x${height}.png`) });
        const bounds = await page.locator('[aria-label="Предпросмотр сторис"]').boundingBox();
        assert.ok(Math.abs(bounds.width / bounds.height - 9 / 16) < 0.01, "canvas must stay 9:16");
        assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= height + 1, "canvas must fit viewport");
    }
    assert.deepEqual(errors, []);
    console.log(`PASS: text/photo, cancel, overlay, fit, drag, pinch, drafts, failed retry, payload, viewer at four sizes. Screenshots: ${artifacts}`);
} finally {
    await browser?.close();
    await server.close();
}
