import { mkdirSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4183';
const OUT_DIR = process.env.OUT_DIR ?? path.resolve('shots');
const CHROME_PATH =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const STORAGE_KEY = 'moss-and-ember-v1';

mkdirSync(OUT_DIR, { recursive: true });

const base = (x, z, itemId = 'sandstone_tile', rotation = 0) => ({
  id: `seed_b_${x}_${z}`,
  itemId,
  x,
  z,
  rotation,
  placedAt: Date.now() - 12000,
});
const prop = (x, z, itemId, rotation = 0) => ({
  id: `seed_p_${x}_${z}_${itemId}`,
  itemId,
  x,
  z,
  rotation,
  placedAt: Date.now() - 11000,
});

const bases = [
  base(-1, -2, 'grass_tile'), base(0, -2, 'grass_tile'), base(1, -2, 'grass_tile'),
  base(-2, -1, 'grass_tile'), base(-1, -1), base(0, -1), base(1, -1), base(2, -1, 'grass_tile'),
  base(-2, 0, 'slate_tile'), base(-1, 0, 'grass_tile'), base(0, 0), base(1, 0), base(2, 0, 'grass_tile'),
  base(-2, 1, 'grass_tile'), base(-1, 1), base(0, 1, 'slate_tile'), base(1, 1), base(2, 1, 'grass_tile'),
  base(-1, 2, 'grass_tile'), base(0, 2, 'stone_stairs'), base(1, 2, 'grass_tile'),
  base(0, -3), base(-1, -3, 'grass_tile'), base(1, -3, 'grass_tile'),
  base(3, 0, 'grass_tile'), base(3, 1, 'water_basin'),
];
const props = [
  prop(0, -2, 'blossom_tree'), prop(-1, -3, 'stone_lantern'), prop(-2, -1, 'birdbath_fountain'),
  prop(-1, 0, 'rose_planter'), prop(1, 0, 'firepot'), prop(2, -1, 'stone_lantern'),
  prop(-2, 1, 'wooden_bench', 1), prop(2, 1, 'market_stall', 3), prop(1, 1, 'balustrade', 0),
  prop(-1, 2, 'rose_planter'), prop(3, 0, 'blossom_tree', 1), prop(0, 1, 'stone_lantern'),
  prop(1, 2, 'balustrade', 2),
];

const now = Date.now();
const seed = {
  state: {
    coins: 245,
    tasks: [
      { id: 'sd1', title: 'Water the windowsill herbs', tier: 'quick', done: false, createdAt: now - 90000 },
      { id: 'sd2', title: 'Sketch the spring courtyard', tier: 'standard', done: false, createdAt: now - 80000 },
      { id: 'sd3', title: 'Deep work: finish the chapter', tier: 'deep', done: true, createdAt: now - 200000, completedAt: now - 100000 },
      { id: 'sd4', title: 'Tidy the desk', tier: 'quick', done: true, createdAt: now - 300000, completedAt: now - 250000 },
      { id: 'sd5', title: 'Water the fern', tier: 'quick', done: false, createdAt: now - 70000 },
      { id: 'sd6', title: 'Read ten quiet pages', tier: 'standard', done: false, createdAt: now - 60000 },
      { id: 'sd7', title: 'Outline the next chapter', tier: 'deep', done: false, createdAt: now - 50000 },
      { id: 'sd8', title: 'Sharpen the pencil', tier: 'quick', done: false, createdAt: now - 40000 },
      { id: 'sd9', title: 'Stretch by the window', tier: 'quick', done: false, createdAt: now - 30000 },
    ],
    inventory: {
      stone_lantern: 2, rose_planter: 2, cottage: 1, pine_tree: 1,
      sandstone_tile: 4, slate_tile: 2, grass_tile: 3, water_basin: 1,
      stone_stairs: 1, paper_lantern: 1, birdbath_fountain: 1,
      balustrade: 1, firepot: 1, blossom_tree: 1, leafy_tree: 1,
      market_stall: 1, blue_market_stall: 1, wooden_bench: 0,
    },
    placedItems: [...bases, ...props],
    themeMode: 'day',
  },
  version: 1,
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => {
  if (!condition) throw new Error(`QA failed: ${message}`);
};

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: 'new',
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
    '--disable-gpu-sandbox',
  ],
});

const page = await browser.newPage();
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

try {
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  const title = await page.title();
  assert(title.includes('Evergrow'), `unexpected page title: ${title}`);

  await page.evaluate(
    (payload, key) => {
      localStorage.setItem(key, JSON.stringify(payload));
    },
    seed,
    STORAGE_KEY,
  );
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(4200);

  await page.screenshot({ path: path.join(OUT_DIR, 'ui-day.png') });

  const dockGap = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    };
    return { drawer: rect('[data-testid="task-drawer"]'), dock: rect('[data-testid="hotbar-dock"]') };
  });
  assert(dockGap.drawer && dockGap.dock, 'task drawer or hotbar dock is missing');
  const overlaps =
    dockGap.drawer.left < dockGap.dock.right &&
    dockGap.drawer.right > dockGap.dock.left &&
    dockGap.drawer.top < dockGap.dock.bottom &&
    dockGap.drawer.bottom > dockGap.dock.top;
  assert(!overlaps, 'task drawer overlaps the hotbar dock');

  const categoryPills = await page.evaluate(() =>
    ['All', 'Terrain', 'Buildings', 'Nature', 'Decor'].every((label) =>
      [...document.querySelectorAll('button')].some(
        (button) => button.textContent?.trim() === label,
      ),
    ),
  );
  assert(categoryPills, 'hotbar category pills are missing');
  await page.evaluate(() => {
    const tab = [...document.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Decor',
    );
    tab?.click();
  });
  await wait(350);
  const decorGroup = await page.evaluate(
    () =>
      Boolean(document.querySelector('[data-testid="hotbar-slot-paper_lantern"]')) &&
      Boolean(document.querySelector('[data-testid="hotbar-slot-stone_lantern"]')),
  );
  assert(decorGroup, 'Decor category did not reveal its items');
  await page.screenshot({ path: path.join(OUT_DIR, 'ui-category.png') });
  await page.click('[data-testid="hotbar-slot-wooden_bench"]');
  await wait(700);
  const shopFocus = await page.evaluate(() => ({
    open: Boolean(document.querySelector('[role="dialog"]')),
    card: Boolean(document.getElementById('shop-item-wooden_bench')),
  }));
  assert(shopFocus.open, 'an empty hotbar slot did not open the shop');
  assert(shopFocus.card, 'the shop did not focus the requested item');
  await page.keyboard.press('h');
  await wait(350);
  const shopSurvives = await page.evaluate(
    () =>
      Boolean(document.querySelector('[role="dialog"]')) &&
      !document.body.innerText.includes('Show interface'),
  );
  assert(shopSurvives, 'world shortcuts fired while the shop was open');
  await page.keyboard.press('Escape');
  await wait(450);

  await page.keyboard.press('h');
  await wait(800);
  await page.evaluate(() => {
    const button = document.querySelector('button[aria-label="Show interface"]');
    if (button) button.style.display = 'none';
  });
  await page.mouse.move(720, 470);
  for (let index = 0; index < 2; index += 1) {
    await page.mouse.wheel({ deltaY: -110 });
    await wait(120);
  }
  await wait(700);
  await page.screenshot({ path: path.join(OUT_DIR, 'hero-day.png') });
  await page.evaluate(() => {
    const button = document.querySelector('button[aria-label="Show interface"]');
    if (button) button.style.display = '';
  });
  await page.keyboard.press('h');
  await wait(400);

  await page.click('button[aria-label="Switch to night mode"]');
  await wait(2500);
  await page.keyboard.press('h');
  await wait(800);
  await page.evaluate(() => {
    const button = document.querySelector('button[aria-label="Show interface"]');
    if (button) button.style.display = 'none';
  });
  await page.screenshot({ path: path.join(OUT_DIR, 'hero-night.png') });
  await page.evaluate(() => {
    const button = document.querySelector('button[aria-label="Show interface"]');
    if (button) button.style.display = '';
  });
  await page.keyboard.press('h');
  await wait(300);
  await page.click('button[aria-label="Switch to day mode"]');
  await wait(1000);

  await page.keyboard.press('b');
  await wait(1300);
  await page.screenshot({ path: path.join(OUT_DIR, 'shop.png') });
  await page.keyboard.press('Escape');
  await wait(500);

  const readState = () =>
    page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').state, STORAGE_KEY);

  await page.evaluate(() => {
    document
      .querySelector('button[aria-label="Pin Sketch the spring courtyard to the top"]')
      ?.click();
  });
  await wait(450);
  const pinnedState = await readState();
  assert(
    pinnedState.tasks.find((task) => task.id === 'sd2')?.pinned === true,
    'pin did not persist',
  );
  const firstRow = await page.evaluate(
    () => document.querySelector('ul li')?.textContent || '',
  );
  assert(firstRow.includes('Sketch the spring courtyard'), 'pinned task did not move to the top');
  await page.evaluate(() => {
    document
      .querySelector('button[aria-label="Unpin Sketch the spring courtyard"]')
      ?.click();
  });
  await wait(450);
  assert(
    (await readState()).tasks.find((task) => task.id === 'sd2')?.pinned === false,
    'unpin did not persist',
  );
  const hiddenPin = await page.evaluate(() =>
    document
      .querySelector('button[aria-label="Pin Water the windowsill herbs to the top"]')
      ?.parentElement?.className.includes('opacity-0'),
  );
  assert(hiddenPin, 'individual pin button is not hidden until hover');

  await page.click('button[aria-label="Pin all unfinished tasks to the top"]');
  await wait(450);
  const allPinned = await readState();
  assert(
    allPinned.tasks.filter((task) => !task.done).every((task) => task.pinned === true),
    'pin-all did not pin every unfinished task',
  );
  await page.click('button[aria-label="Unpin all unfinished tasks"]');
  await wait(450);
  const allUnpinned = await readState();
  assert(
    allUnpinned.tasks.filter((task) => !task.done).every((task) => !task.pinned),
    'pin-all toggle did not unpin every unfinished task',
  );

  const beforeTask = await readState();
  await page.click('button[aria-label="Complete Water the windowsill herbs"]');
  await wait(700);
  const afterTask = await readState();
  assert(afterTask.coins === beforeTask.coins + 10, 'quick task did not pay 10 coins');
  assert(afterTask.tasks[0].done === true, 'task did not become done');

  await page.keyboard.press('b');
  await wait(900);
  await page.evaluate(() => {
    const target = [...document.querySelectorAll('button')].find(
      (button) => button.title === 'Buy Grass Tile for 14 coins',
    );
    target?.click();
  });
  await wait(700);
  const afterBuy = await readState();
  assert(afterBuy.coins === afterTask.coins - 14, 'purchase did not deduct 14 coins');
  assert(
    afterBuy.inventory.grass_tile === afterTask.inventory.grass_tile + 1,
    'purchase did not add a grass tile',
  );
  await page.keyboard.press('Escape');
  await wait(500);

  await page.evaluate(() => {
    document.querySelector('[data-testid="hotbar-slot-grass_tile"]')?.click();
  });
  await wait(400);
  await page.mouse.click(300, 300);
  await wait(900);
  const afterPlace = await readState();
  assert(
    afterPlace.placedItems.length === afterBuy.placedItems.length + 1,
    'placement did not add a piece',
  );
  assert(
    afterPlace.inventory.grass_tile === afterBuy.inventory.grass_tile - 1,
    'placement did not decrement inventory',
  );

  await page.reload({ waitUntil: 'networkidle0' });
  await wait(3000);
  const afterReload = await readState();
  assert(
    afterReload.placedItems.length === afterPlace.placedItems.length,
    'placement did not persist across reload',
  );
  assert(afterReload.coins === afterPlace.coins, 'coins did not persist');

  await page.click('button[aria-label="Toggle move mode"]');
  await wait(400);
  const moveModeOn = await page.evaluate(() =>
    document.body.innerText.includes('Move mode'),
  );
  assert(moveModeOn, 'move mode did not start from the Move control');
  await page.mouse.click(200, 200);
  await wait(400);
  const moveModePersisted = await page.evaluate(
    () =>
      document.body.innerText.includes('Move mode') &&
      !document.body.innerText.includes('Moving '),
  );
  assert(moveModePersisted, 'move mode did not persist on empty ground');
  await page.click('button[aria-label="Toggle move mode"]');
  await wait(300);
  assert(
    !(await page.evaluate(() => document.body.innerText.includes('Move mode'))),
    'the Move control did not exit move mode',
  );

  await page.click('button[aria-label="Toggle move mode"]');
  await wait(300);
  await page.mouse.click(489, 498);
  await wait(400);
  const moveModeLifted = await page.evaluate(() =>
    document.body.innerText.includes('Moving Flower Pot'),
  );
  assert(moveModeLifted, 'clicking a placed piece did not lift it in move mode');
  await page.keyboard.press('Escape');
  await wait(400);
  const escapedMoveMode = await page.evaluate(
    () =>
      !document.body.innerText.includes('Move mode') &&
      !document.body.innerText.includes('Moving '),
  );
  assert(escapedMoveMode, 'Escape did not exit move mode');
  const afterMoveMode = await readState();
  assert(
    afterMoveMode.placedItems.length === afterReload.placedItems.length,
    'entering and leaving move mode changed the board',
  );

  await page.mouse.click(489, 498);
  await wait(500);
  const selectedVisible = await page.evaluate(() =>
    document.body.innerText.includes('Selected Flower Pot'),
  );
  assert(selectedVisible, 'clicking a placed prop did not select it');
  const afterSelect = await readState();
  const selectedRose = afterSelect.placedItems.find(
    (piece) => piece.itemId === 'rose_planter' && piece.x === -1 && piece.z === 2,
  );
  assert(selectedRose, 'selecting a prop moved it');

  await page.click('button[aria-label="Rotate selection, placement, or lifted piece 90 degrees"]');
  await wait(400);
  const afterRotate = await readState();
  const rotatedRose = afterRotate.placedItems.find(
    (piece) => piece.itemId === 'rose_planter' && piece.x === -1 && piece.z === 2,
  );
  assert(rotatedRose, 'rotating a selected prop moved it');
  assert(rotatedRose.rotation === 1, 'HUD rotate did not rotate the selected prop');

  await page.click('button[aria-label="Toggle move mode"]');
  await wait(400);
  const movingVisible = await page.evaluate(() =>
    document.body.innerText.includes('Moving Flower Pot'),
  );
  assert(movingVisible, 'the Move action did not lift the selected prop');
  await page.mouse.click(871, 426);
  await wait(800);
  const stickyMoveMode = await page.evaluate(() =>
    document.body.innerText.includes('Move mode'),
  );
  assert(stickyMoveMode, 'move mode did not persist after dropping a piece');
  await page.keyboard.press('Escape');
  await wait(300);
  assert(
    !(await page.evaluate(() => document.body.innerText.includes('Move mode'))),
    'Escape did not exit move mode after a drop',
  );
  const afterMove = await readState();
  const movedRose = afterMove.placedItems.find(
    (piece) => piece.itemId === 'rose_planter' && piece.x === 1 && piece.z === -1,
  );
  assert(movedRose, 'the prop did not move to the target base tile');
  assert(movedRose.rotation === 1, 'the moved prop lost its rotation');
  assert(
    afterMove.placedItems.length === afterReload.placedItems.length,
    'moving a piece changed the board count',
  );
  assert(
    afterMove.inventory.rose_planter === afterReload.inventory.rose_planter,
    'moving a piece changed inventory',
  );

  await page.reload({ waitUntil: 'networkidle0' });
  await wait(2500);
  const afterMoveReload = await readState();
  assert(
    afterMoveReload.placedItems.some(
      (piece) =>
        piece.itemId === 'rose_planter' &&
        piece.x === 1 &&
        piece.z === -1 &&
        piece.rotation === 1,
    ),
    'the moved and rotated piece did not persist across reload',
  );

  await page.keyboard.press('b');
  await wait(800);
  await page.evaluate(() => {
    const tab = [...document.querySelectorAll('button')].find((button) =>
      (button.textContent || '').trim() === 'Decor',
    );
    tab?.click();
  });
  await wait(300);
  await page.evaluate(() => {
    const target = [...document.querySelectorAll('button')].find((button) =>
      (button.getAttribute('aria-label') || '').startsWith('Buy Paper Lantern'),
    );
    target?.click();
  });
  await wait(700);
  const revealedGroup = await page.evaluate(
    () =>
      Boolean(document.querySelector('[data-testid="hotbar-slot-paper_lantern"]')) &&
      Boolean(document.querySelector('[data-testid="hotbar-slot-stone_lantern"]')),
  );
  assert(revealedGroup, 'buying an item did not reveal its hotbar category');
  await page.keyboard.press('Escape');
  await wait(450);

  await page.click('button[aria-label^="Graphics quality: high"]');
  await wait(800);
  const lowQuality = await readState();
  assert(lowQuality.graphicsQuality === 'low', 'the quality preset did not toggle');

  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await wait(700);
  const compactGap = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    };
    return { drawer: rect('[data-testid="task-drawer"]'), dock: rect('[data-testid="hotbar-dock"]') };
  });
  assert(compactGap.drawer && compactGap.dock, 'compact HUD is missing a dock or drawer');
  const compactOverlaps =
    compactGap.drawer.left < compactGap.dock.right &&
    compactGap.drawer.right > compactGap.dock.left &&
    compactGap.drawer.top < compactGap.dock.bottom &&
    compactGap.drawer.bottom > compactGap.dock.top;
  assert(!compactOverlaps, 'task drawer overlaps the hotbar dock at 1280px');
  await page.screenshot({ path: path.join(OUT_DIR, 'ui-1280.png') });

  await page.click('button[aria-label="Reset world"]');
  await wait(300);
  const beforeResetConfirm = await readState();
  assert(beforeResetConfirm.tasks.length > 0, 'first reset click applied immediately');
  const confirmVisible = await page.evaluate(() =>
    document.body.innerText.includes('Confirm Reset?'),
  );
  assert(confirmVisible, 'reset did not enter its confirmation state');
  await page.click('button[aria-label="Confirm reset world"]');
  await wait(700);
  const resetState = await readState();
  assert(resetState.coins === 0, 'confirmed reset did not clear coins');
  assert(resetState.tasks.length === 0, 'confirmed reset did not clear tasks');
  assert(resetState.placedItems.length === 0, 'confirmed reset did not clear the world');

  assert(errors.length === 0, errors.join('\n'));

  console.log('QA passed');
  console.log(`screenshots: ${OUT_DIR}`);
} finally {
  await browser.close();
}
