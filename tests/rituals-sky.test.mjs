// Rituals "Today's sky" (Nov 19): on a wide screen the day's rituals form a real constellation across the card, not a
// ribbon: stars spread across the width and height, evenly spaced, and every name sits clear of the others.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { placeAlong } = load('components/rituals/RitualsSky');
const names = ['💧water💧', 'vitamins', 'gua sha', 'No alcohol', 'Steps', 'sunshine walk', 'read a book', 'journal', 'meditate', 'in bed by 11:30', 'nighttime skincare', 'stretching', 'Brush teeth'];
const BAND = { w: 960, h: 196, points: [[30, 138], [150, 96], [262, 150], [380, 70], [502, 124], [618, 52], [736, 112], [850, 62], [934, 128]], font: 12, clear: [] };

test('wide sky: thirteen rituals spread across the card with every name clear of the others', () => {
  const stars = placeAlong(names, BAND);
  const xs = stars.map((s) => s.x), ys = stars.map((s) => s.y);
  assert.ok(Math.max(...xs) - Math.min(...xs) > BAND.w * 0.85, 'spread across the width');
  assert.ok(Math.max(...ys) - Math.min(...ys) > BAND.h * 0.35, 'and up and down, like a constellation');
  const gaps = xs.slice(1).map((x, i) => Math.hypot(x - xs[i], ys[i + 1] - ys[i]));
  assert.ok(Math.min(...gaps) > 50, `no two neighbours bunch together (closest ${Math.round(Math.min(...gaps))})`);
  const box = (s) => { const w = s.label.length * BAND.font * 0.56, x0 = s.anchor === 'middle' ? s.lx - w / 2 : s.anchor === 'start' ? s.lx : s.lx - w; return { x0, x1: x0 + w, y0: s.ly - BAND.font + 2, y1: s.ly + 2 }; };
  const boxes = stars.map(box);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    assert.ok(!(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1), `“${stars[i].label}” and “${stars[j].label}” don't overlap`);
  }
  assert.ok(boxes.every((b) => b.x0 >= 0 && b.x1 <= BAND.w), 'every name stays inside the sky');
  assert.ok(stars.filter((s) => s.label === names[stars.indexOf(s)]).length >= 11, 'nearly every name fits whole');
});

test('a short day still reads as a constellation', () => {
  const stars = placeAlong(['water', 'journal', 'Steps'], BAND);
  assert.equal(stars.length, 3); assert.ok(stars[2].x - stars[0].x > BAND.w * 0.8);
});
