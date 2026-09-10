"""Optional real-browser smoke test. Requires Playwright and a Chromium executable."""
import argparse
import functools
import http.server
import json
from pathlib import Path
import re
import shutil
import threading
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--browser', default=shutil.which('chromium'))
parser.add_argument('--output', default='/tmp/adv-job-browser')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
output = Path(args.output)
output.mkdir(parents=True, exist_ok=True)
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
errors = []
checks = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.browser, headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1280, 'height': 1000})
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda response: errors.append(f'{response.status} {response.url}') if response.status >= 400 and not response.url.endswith('favicon.ico') else None)
        url = f'http://127.0.0.1:{server.server_port}/'
        page.goto(url, wait_until='networkidle')
        for _ in range(10):
            advance = page.get_by_role('button', name=re.compile('続きを読む'))
            if not advance.count():
                break
            advance.click()
        page.get_by_role('button', name='酒場・仲間', exact=True).click()
        card = page.locator('.companion-card').filter(has=page.get_by_role('heading', name='アダ', exact=True))
        card.locator('summary').click()
        assert card.get_by_label('アダの転職先').locator('option').count() == 30
        card.get_by_label('アダの転職先').select_option('mage')
        card.get_by_role('button', name='この職業へ転職', exact=True).click()
        assert page.evaluate("JSON.parse(localStorage.getItem('lantern-archive:v1:auto')).state.actors.ada.job") == 'mage'
        checks.append('30 choices, preview, actual job change and autosave')
        card.locator('summary').click()
        card.scroll_into_view_if_needed()
        page.screenshot(path=str(output / 'jobs-desktop.png'))
        page.reload(wait_until='networkidle')
        page.get_by_role('button', name='酒場・仲間', exact=True).click()
        assert '職業・成長：魔術師' in page.locator('#app').inner_text()
        checks.append('reload restores selected job')
        # A controlled fixture is stored using the same engine/save API as the app.
        page.evaluate("""async () => {
          const {loadContent}=await import('./src/core/loader.js');
          const {GameEngine}=await import('./src/core/engine.js');
          const {activeActor}=await import('./src/core/battle.js');
          const data=await loadContent(),g=new GameEngine(data,17);
          while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
          g.dispatch({type:'job.change',actor:'ada',job:'scholar'});g.award(0,40*9*10);
          g.dispatch({type:'travel',region:10});g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});
          while(activeActor(g)!=='ada')g.state.battle.acted.push(activeActor(g));
          localStorage.setItem('lantern-archive:v1:auto',g.save());
        }""")
        page.reload(wait_until='networkidle')
        assert page.get_by_role('button', name=re.compile('^弱点注記')).is_disabled()
        page.get_by_role('button', name=re.compile('^魔物解析')).click()
        assert page.locator('.analysis-result').count() == 1
        checks.append('analysis prerequisite and per-enemy disclosure in battle UI')
        for _ in range(10):
            if page.get_by_role('button', name=re.compile('^弱点注記')).count():
                break
            page.get_by_role('button', name='防御', exact=True).click()
        assert page.get_by_role('button', name=re.compile('^弱点注記')).is_enabled()
        page.locator('.enemy').nth(1).click()
        assert page.get_by_role('button', name=re.compile('^弱点注記')).is_disabled()
        checks.append('target change revalidates selected skill')
        page.set_viewport_size({'width': 390, 'height': 844})
        page.screenshot(path=str(output / 'jobs-mobile-battle.png'), full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
        checks.append('390px battle layout has no horizontal overflow')
        assert not errors, errors
        browser.close()
finally:
    server.shutdown()
result = {'passed': True, 'checks': checks, 'errors': errors}
(output / 'browser-results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False, indent=2))
