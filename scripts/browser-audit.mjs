/**
 * Visual audit via headless Chrome (CDP over WebSocket, no extra deps).
 * Measures nav + auth dialog layout at several viewports; optional screenshots.
 * Usage: node scripts/browser-audit.mjs [--base http://localhost:5173] [--shots]
 */
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'

const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]

const args = process.argv.slice(2)
const baseFlag = args.indexOf('--base')
const BASE = baseFlag !== -1 ? args[baseFlag + 1] : null
const SHOTS = args.includes('--shots')
const OUT_DIR = path.resolve('audit-out')

function log(msg) { console.log(msg) }
const fmt = (n) => (n == null ? 'n/a' : String(Math.round(n * 10) / 10))

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function findChrome() {
  for (const p of CHROME_PATHS) {
    try { if (fs.existsSync(p)) return p } catch { /* ignore */ }
  }
  throw new Error('Chrome not found')
}

async function startChrome() {
  const exe = await findChrome()
  const port = 9223 + Math.floor(Math.random() * 500)
  const profile = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'osa-audit-'))
  const child = spawn(exe, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,900',
    'about:blank',
  ], { stdio: 'ignore' })
  for (let i = 0; i < 40; i++) {
    try { await getJson(`http://127.0.0.1:${port}/json/version`); return { child, port } } catch { await sleep(250) }
  }
  child.kill()
  throw new Error('Chrome did not open the debugging port')
}

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.events = []
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.error) reject(new Error(msg.error.message))
        else resolve(msg.result)
      } else if (msg.method) {
        this.events.push(msg)
      }
    })
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params, sessionId }))
    })
  }
}

async function connect(port) {
  const targets = await getJson(`http://127.0.0.1:${port}/json`)
  const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
  if (!page) throw new Error('no page target')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve)
    ws.addEventListener('error', reject)
  })
  return new Cdp(ws)
}

/** Start `vite` dev server in-process and resolve with its base URL. */
async function startVite() {
  const { createServer } = await import('vite')
  const vite = await createServer({
    root: process.cwd(),
    server: { port: 5173, strictPort: false },
    logLevel: 'error',
  })
  await vite.listen()
  vite.printUrls()
  const port = vite.config.server.port
  return {
    url: `http://localhost:${port}`,
    stop: () => vite.close(),
  }
}

async function main() {
  const server = BASE ? null : await startVite()
  const base = BASE ?? server.url
  const { child, port } = await startChrome()
  const cdp = await connect(port)
  try {
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')

    await cdp.send('Page.navigate', { url: base })
    await sleep(2500) // let React mount, fonts settle

    const viewports = [
      { name: 'laptop', width: 1366, height: 640 },
      { name: 'desktop', width: 1536, height: 800 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 390, height: 844 },
    ]

    const report = []
    for (const vp of viewports) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.name === 'mobile',
      })
      await sleep(400)

      const metrics = await cdp.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          const q = (sel) => document.querySelector(sel)
          const rectOf = (sel) => { const el = q(sel); return el ? el.getBoundingClientRect() : null }
          const cs = (el) => el ? getComputedStyle(el) : null
          const nav = q('header')
          const navRect = nav ? nav.getBoundingClientRect() : null
          const bar = nav ? nav.firstElementChild.getBoundingClientRect() : null
          const mobileMenu = q('#mobile-nav')
          const mmRect = mobileMenu ? mobileMenu.getBoundingClientRect() : null
          const mmOpen = mobileMenu ? getComputedStyle(mobileMenu).maxHeight : null
          return {
            inner: { w: innerWidth, h: innerHeight },
            dpr: devicePixelRatio,
            nav: navRect ? { top: navRect.top, height: navRect.height, bottom: navRect.bottom } : null,
            bar: bar ? { height: bar.height } : null,
            mobileMenu: mmRect ? { height: mmRect.height, maxHeight: mmOpen } : null,
            heroH1: rectOf('h1') ? { top: rectOf('h1').top } : null,
            scrollY: scrollY,
            docHeight: document.documentElement.scrollHeight,
          }
        })()`,
      })
      const m = metrics.result.value
      report.push({ viewport: vp.name, ...m })

      if (SHOTS) {
        fs.mkdirSync(OUT_DIR, { recursive: true })
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
        fs.writeFileSync(path.join(OUT_DIR, `nav-${vp.name}.png`), Buffer.from(shot.data, 'base64'))
      }

      // Open the signup dialog via the nav button and measure.
      const clicked = await cdp.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          const btns = [...document.querySelectorAll('header button')]
          const signUp = btns.find((b) => b.textContent.trim().toLowerCase() === 'sign up')
          if (!signUp) return false
          signUp.click()
          return true
        })()`,
      })
      await sleep(700)

      const dlg = await cdp.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          const panel = document.querySelector('[role="dialog"]')
          if (!panel) return { open: false }
          const pr = panel.getBoundingClientRect()
          const scrollBody = [...panel.querySelectorAll(':scope > div, :scope *')].find((el) => getComputedStyle(el).overflowY === 'auto')
          const submit = [...panel.querySelectorAll('button')].find((b) => /create account/i.test(b.textContent))
          const github = [...panel.querySelectorAll('button')].find((b) => /github/i.test(b.textContent))
          const footer = panel.lastElementChild
          const footerRect = footer ? footer.getBoundingClientRect() : null
          const tablist = panel.querySelector('[role="tablist"]')
          return {
            open: true,
            panel: { top: pr.top, bottom: pr.bottom, height: pr.height, width: pr.width },
            viewport: { h: innerHeight, w: innerWidth },
            panelFits: pr.top >= 0 && pr.bottom <= innerHeight,
            bodyScrollable: scrollBody ? { sh: scrollBody.scrollHeight, ch: scrollBody.clientHeight } : null,
            createBtnVisible: submit ? submit.getBoundingClientRect().bottom <= innerHeight : null,
            githubVisible: github ? github.getBoundingClientRect().bottom <= innerHeight : null,
            footerVisible: footerRect ? footerRect.bottom <= innerHeight + 1 : null,
            hasTablist: !!tablist,
          }
        })()`,
      })
      report.push({ viewport: vp.name, dialog: dlg.result.value })

      if (SHOTS) {
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
        fs.writeFileSync(path.join(OUT_DIR, `signup-${vp.name}.png`), Buffer.from(shot.data, 'base64'))
      }

      // Switch to the login tab and re-measure (regression guard).
      await cdp.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => { const t = [...document.querySelectorAll('[role="dialog"] [role="tab"]')].find((x) => /log in/i.test(x.textContent)); if (t) t.click(); return !!t })()`,
      })
      await sleep(500)
      const loginDlg = await cdp.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          const panel = document.querySelector('[role="dialog"]')
          const pr = panel.getBoundingClientRect()
          const github = [...panel.querySelectorAll('button')].find((b) => /github/i.test(b.textContent))
          const scrollBody = [...panel.querySelectorAll('*')].find((el) => getComputedStyle(el).overflowY === 'auto')
          return {
            fits: pr.top >= 0 && pr.bottom <= innerHeight,
            hasRememberMe: panel.querySelectorAll('input[type="checkbox"]').length === 1,
            githubVisible: github ? github.getBoundingClientRect().bottom <= innerHeight : false,
            bodyScroll: scrollBody ? scrollBody.scrollHeight - scrollBody.clientHeight : -1,
          }
        })()`,
      })
      report.push({ viewport: vp.name, loginDialog: loginDlg.result.value })

      // Close dialog for next viewport.
      await cdp.send('Runtime.evaluate', { expression: `document.querySelector('[role="dialog"] [aria-label="Close dialog"]')?.click()` })
      await sleep(300)
    }

    // Scroll-spy check on desktop: scroll to #modules, is the link active?
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 800, deviceScaleFactor: 1, mobile: false })
    await cdp.send('Runtime.evaluate', { expression: `(() => { const el = document.querySelector('#modules'); window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 80, behavior: 'instant' }) })()` })
    await sleep(900)
    const spy = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const links = [...document.querySelectorAll('header nav a')].map((a) => ({ label: a.textContent.trim(), active: a.dataset.active }))
        return links
      })()`,
    })
    report.push({ scrollSpy: spy.result.value })

    // Hero: typewriter + caret + floating stat chips (first-load pop).
    await cdp.send('Runtime.evaluate', { expression: `window.scrollTo({ top: 0, behavior: 'instant' })` })
    await sleep(2200) // wait for type (18 chars * 55ms) + chip delays (1.5s)
    const hero = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const caret = document.querySelector('.terminal-caret')
        const p = caret?.closest('p')
        const caretStyle = caret ? getComputedStyle(caret) : null
        const chips = [...document.querySelectorAll('.chip-neutral')].filter((el) => /points earned|badges unlocked/.test(el.textContent))
        return {
          typedLine: p?.textContent.trim() ?? null,
          typedComplete: /osa\\ roadmap\\ --begin/.test(p?.textContent ?? ''),
          caretVisible: caretStyle ? caretStyle.opacity === '1' || caretStyle.animationName === 'caret-blink' : false,
          chipsPopped: chips.filter((el) => getComputedStyle(el).opacity === '1').length,
          chipCount: chips.length,
        }
      })()`,
    })
    report.push({ hero: hero.result.value })

    // Community stats: count-up fires when scrolled into view.
    await cdp.send('Runtime.evaluate', { expression: `(() => { const el = document.querySelector('#community'); window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 80, behavior: 'instant' }) })()` })
    await sleep(2600) // count duration 1300ms + stagger 360ms
    const stats = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const nums = [...document.querySelectorAll('#community dd span')]
          .filter((s) => /^\\d{1,3}(,\\d{3})*$/.test(s.textContent.trim()))
        const vals = nums.map((s) => s.textContent.trim())
        return {
          animatedCount: nums.length,
          finalValues: vals,
          allReachedTargets: vals.length > 0 && vals.every((v) => Number(v.replace(/,/g, '')) > 0),
        }
      })()`,
    })
    report.push({ communityStats: stats.result.value })

    // ProjectFinder: global top repos — three cards, no filter bar, contributor stacks.
    const finder = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const section = document.querySelector('#finder')
        if (!section) return { present: false }
        const filterCard = [...section.querySelectorAll('input, select, button')].filter((el) =>
          /language|issue type/i.test(el.textContent || el.getAttribute('label') || ''),
        )
        const selects = section.querySelectorAll('select')
        const repoLinks = [...section.querySelectorAll('a[href^="https://github.com/"]')].filter((a) =>
          /\\//.test(a.textContent.trim()) && a.className.includes('font-mono'),
        )
        const topLabels = [...section.querySelectorAll('span')].filter((s) => s.textContent.trim().startsWith('top:'))
        return {
          present: true,
          selects: selects.length,
          filterControls: filterCard.length,
          repoCardCount: repoLinks.length,
          contributorStacks: topLabels.length,
          firstRepo: repoLinks[0]?.textContent.trim() ?? null,
        }
      })()`,
    })
    report.push({ finder: finder.result.value })

    // Footer: theme toggle must be gone (only the nav one remains).
    const footer = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const f = document.querySelector('footer')
        if (!f) return { present: false }
        return { present: true, themeTogglesInFooter: f.querySelectorAll('button[aria-label*="mode"]').length }
      })()`,
    })
    report.push({ footer: footer.result.value })

    // Nav scrolled state: bubble class + blur should be active now.
    const navScrolled = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const header = document.querySelector('header')
        const cs = getComputedStyle(header)
        const inner = header.firstElementChild
        const ics = getComputedStyle(inner)
        return {
          scrollY: scrollY,
          headerBg: cs.backgroundColor,
          headerBorder: cs.borderBottomColor,
          bubbleClass: inner.className.includes('nav-bubble'),
          bubbleRadius: ics.borderRadius,
          bubbleBlur: ics.backdropFilter || ics.webkitBackdropFilter,
          barHeight: inner.getBoundingClientRect().height,
        }
      })()`,
    })
    report.push({ navScrolled: navScrolled.result.value })

    log(JSON.stringify(report, null, 2))
  } finally {
    child.kill()
    if (server) await server.stop()
    try { cdp.ws.close() } catch { /* ignore */ }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
