import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SceneManager } from '../src/scene-manager.js';

function createMockScene() {
  return { onBeforeRenderObservable: { add: vi.fn() }, removeMesh: vi.fn() };
}

function createMockEngine() {
  return { runRenderLoop: vi.fn(), resize: vi.fn() };
}

describe('SceneManager', () => {
  let mockScene, mockEngine;

  beforeEach(() => {
    mockScene = createMockScene();
    mockEngine = createMockEngine();
  });

  it('stores the current location id after transition', async () => {
    const manager = new SceneManager(mockScene, mockEngine, {
      createPhotoDome: vi.fn().mockResolvedValue({ dispose: vi.fn() }),
      animateFade: vi.fn().mockResolvedValue(undefined)
    });
    await manager.transitionTo('entrance', 'https://cdn.test/entrance-4k.jpg');
    expect(manager.currentLocationId).toBe('entrance');
  });

  it('calls createPhotoDome with the media URL', async () => {
    const createPhotoDome = vi.fn().mockResolvedValue({ dispose: vi.fn() });
    const manager = new SceneManager(mockScene, mockEngine, {
      createPhotoDome,
      animateFade: vi.fn().mockResolvedValue(undefined)
    });
    await manager.transitionTo('entrance', 'https://cdn.test/entrance-4k.jpg');
    expect(createPhotoDome).toHaveBeenCalledWith(mockScene, 'https://cdn.test/entrance-4k.jpg');
  });

  it('disposes previous PhotoDome on transition', async () => {
    const disposeFn = vi.fn();
    const createPhotoDome = vi.fn().mockResolvedValue({ dispose: disposeFn });
    const manager = new SceneManager(mockScene, mockEngine, {
      createPhotoDome,
      animateFade: vi.fn().mockResolvedValue(undefined)
    });
    await manager.transitionTo('entrance', 'https://cdn.test/entrance-4k.jpg');
    await manager.transitionTo('lobby', 'https://cdn.test/lobby-4k.jpg');
    expect(disposeFn).toHaveBeenCalledTimes(1);
  });

  it('fires onTransition callback', async () => {
    const onTransition = vi.fn();
    const manager = new SceneManager(mockScene, mockEngine, {
      createPhotoDome: vi.fn().mockResolvedValue({ dispose: vi.fn() }),
      animateFade: vi.fn().mockResolvedValue(undefined)
    });
    manager.onTransition = onTransition;
    await manager.transitionTo('entrance', 'https://cdn.test/entrance-4k.jpg');
    expect(onTransition).toHaveBeenCalledWith('entrance');
  });
});
