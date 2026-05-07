// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { showHomepage, hideHomepage } from '../src/homepage.js';

const TOURS = [
  { id: 'campus-tour', name: 'Full Campus Tour', description: 'See the whole campus.', thumbnail: 'campus-tour-thumb.jpg' },
  { id: 'academics-tour', name: 'Academics Tour', description: 'Classrooms and library.', thumbnail: 'academics-tour-thumb.jpg' },
  { id: 'athletics-tour', name: 'Athletics Tour', description: 'Gym, pool, and fields.', thumbnail: 'athletics-tour-thumb.jpg' },
  { id: 'arts-tour', name: 'Arts Tour', description: 'Visual arts and theater.', thumbnail: 'arts-tour-thumb.jpg' },
  { id: 'career-tech-tour', name: 'Career Tech Pathways', description: 'CTE programs.', thumbnail: 'career-tech-tour-thumb.jpg' },
];

beforeEach(() => {
  document.body.innerHTML = '<canvas id="app"></canvas><div id="homepage"></div>';
});

describe('showHomepage', () => {
  it('makes the homepage element visible', () => {
    showHomepage(TOURS, vi.fn());
    const el = document.getElementById('homepage');
    expect(el.style.display).not.toBe('none');
    expect(el.style.opacity).not.toBe('0');
  });

  it('renders a selectable element for every tour', () => {
    showHomepage(TOURS, vi.fn());
    const el = document.getElementById('homepage');
    const tourEls = el.querySelectorAll('[data-tour-id]');
    expect(tourEls).toHaveLength(5);
  });

  it('calls onSelect with the correct tour id when a tour is clicked', () => {
    const onSelect = vi.fn();
    showHomepage(TOURS, onSelect);
    const el = document.getElementById('homepage');
    const campusCard = el.querySelector('[data-tour-id="campus-tour"]');
    campusCard.click();
    expect(onSelect).toHaveBeenCalledWith('campus-tour');
  });

  it('calls onSelect with the academics tour id when that card is clicked', () => {
    const onSelect = vi.fn();
    showHomepage(TOURS, onSelect);
    const el = document.getElementById('homepage');
    el.querySelector('[data-tour-id="academics-tour"]').click();
    expect(onSelect).toHaveBeenCalledWith('academics-tour');
  });

  it('calling showHomepage twice does not duplicate tour elements', () => {
    showHomepage(TOURS, vi.fn());
    showHomepage(TOURS, vi.fn());
    const el = document.getElementById('homepage');
    expect(el.querySelectorAll('[data-tour-id]')).toHaveLength(5);
  });
});

describe('hideHomepage', () => {
  it('returns a Promise', () => {
    showHomepage(TOURS, vi.fn());
    const result = hideHomepage();
    expect(result).toBeInstanceOf(Promise);
  });

  it('sets display:none after the fade', async () => {
    showHomepage(TOURS, vi.fn());
    await hideHomepage();
    const el = document.getElementById('homepage');
    expect(el.style.display).toBe('none');
  });
});
