const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let mobile = false, zoom = 15, angle = 0, pitchScale = 1, styleReady = true;
let controls = [], hitAreas = [], nextFrame = 0, layoutWrites = 0, coordinateWrites = 0;
const frames = new Map(), listeners = new Map(), sources = new Map(), rasterLayers = new Map();
const viewport = { left: 50, top: 70, right: 1050, bottom: 870, width: 1000, height: 800 };
const world = 512 * 2 ** 15;
const fromPixel = (x, y) => [(x - 500) / world * 360,
    Math.atan(Math.sinh(-2 * Math.PI * (y - 400) / world)) * 180 / Math.PI];
const project = ([lng, lat]) => {
    const dx = lng / 360 * 512 * 2 ** zoom;
    const dy = -Math.asinh(Math.tan(lat * Math.PI / 180)) / (2 * Math.PI) * 512 * 2 ** zoom;
    return { x: 500 + dx * Math.cos(angle) - dy * Math.sin(angle),
        y: 400 + (dx * Math.sin(angle) + dy * Math.cos(angle)) * pitchScale };
};
const baseLayers = [{ id: 'marker-bg-attention', type: 'circle' },
    { id: 'marker-text-attention', type: 'symbol' },
    { id: 'marker-shadow', type: 'symbol' }, { id: 'buildings', type: 'fill-extrusion' }];
const map = {
    getContainer: () => ({ getBoundingClientRect: () => viewport }), getZoom: () => zoom,
    isStyleLoaded: () => styleReady, project,
    getStyle: () => ({ layers: [...baseLayers, ...rasterLayers.values()] }),
    getSource: id => sources.get(id),
    addSource: (id, spec) => sources.set(id, { ...spec,
        setCoordinates(coordinates) { coordinateWrites++; this.coordinates = coordinates; } }),
    removeSource: id => sources.delete(id),
    getLayer: id => rasterLayers.get(id),
    addLayer: (spec, before) => {
        assert.equal(before, 'marker-bg-attention', 'place artwork below POI icons and names');
        assert.equal(spec.type, 'raster');
        rasterLayers.set(spec.id, spec);
    },
    removeLayer: id => rasterLayers.delete(id),
    getLayoutProperty: (id, key) => rasterLayers.get(id)?.layout[key],
    setLayoutProperty: (id, key, value) => { layoutWrites++; rasterLayers.get(id).layout[key] = value; },
    queryRenderedFeatures: (box, { layers }) => {
        assert.deepEqual(Array.from(layers), ['marker-bg-attention', 'marker-text-attention']);
        const [[left, top], [right, bottom]] = box;
        return hitAreas.filter(hit => left < hit.right && right > hit.left && top < hit.bottom && bottom > hit.top);
    },
    on: (name, fn) => listeners.set(name, fn),
    off: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); }
};
const context = vm.createContext({
    document: { createElement: () => ({ complete: true, naturalWidth: 200, naturalHeight: 100 }),
        querySelectorAll: () => controls },
    window: { withAppAssetVersion: url => `${url}?ver=test` },
    getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
    requestAnimationFrame: fn => { frames.set(++nextFrame, fn); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id)
});
vm.runInContext(fs.readFileSync('lib/mapillustrations.js', 'utf8') + '\nthis.MapIllustrations = MapIllustrations;', context);
const layer = new context.MapIllustrations({ isMobile: () => mobile });
const config = {
    use: true, autoHide: true, referenceZoom: 15, minZoom: 14, maxZoom: 17, widthPx: 120, mobileWidthPx: 80,
    maxVisible: { desktop: 4, mobile: 2 }, avoidPaddingPx: 24, illustrationGapPx: 40,
    items: [[200, 200], [400, 200], [600, 200], [800, 200], [200, 400]].map(([x, y], i) => ({
        id: `art${i}`, image: `art${i}.png`, coordinates: fromPixel(x, y), priority: i
    }))
};
const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); };
const visible = () => Array.from(layer.items).filter(entry => map.getLayoutProperty(entry.layerId, 'visibility') === 'visible');
const ids = () => visible().map(entry => entry.config.id);
const bounds = entry => {
    const points = sources.get(entry.layerId).coordinates.map(project);
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
};
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
layer.init(map, config);
flush();
assert.deepEqual(ids(), ['art0', 'art1', 'art2', 'art3']);
close(bounds(layer.items[0]).width, 120);
close(bounds(layer.items[0]).height, 60);
assert.equal(sources.get(layer.items[0].layerId).url, 'art0.png?ver=test');
const writes = layoutWrites;
layer.render();
assert.equal(layoutWrites, writes, 'stable renders do not change visibility or trigger render loops');
assert.equal(coordinateWrites, 0, 'stable renders do not rewrite geographic corners');
mobile = true;
layer.render();
assert.deepEqual(ids(), ['art0', 'art1']);
close(bounds(layer.items[0]).width, 80);
mobile = false;
styleReady = false; // New map tiles are still loading during a camera change.
hitAreas = [{ left: 195, right: 205, top: 195, bottom: 205 },
    { left: 575, right: 650, top: 190, bottom: 210 }];
layer.render();
assert.deepEqual(ids(), ['art1', 'art3', 'art4']);
styleReady = true;
controls = [{ getBoundingClientRect: () => ({ left: 410, top: 230, right: 490, bottom: 310, width: 80, height: 80 }) }];
layer.render();
assert.deepEqual(ids(), ['art3', 'art4'], 'avoid UI in screen coordinates including map offsets');
controls = []; hitAreas = [];
zoom = 13.9;
layer.render();
assert.deepEqual(ids(), []);
zoom = 17;
layer.render();
assert.deepEqual(ids(), []);
zoom = 15;
layer.init(map, { ...config, items: [{ ...config.items[0], coordinates: fromPixel(500, 400) }] });
flush();
const entry = layer.items[0];
const corners = JSON.stringify(sources.get(entry.layerId).coordinates);
zoom = 16;
layer.render();
close(bounds(entry).width, 240);
close(bounds(entry).height, 120);
angle = Math.PI / 2;
layer.render();
close(bounds(entry).width, 120);
close(bounds(entry).height, 240);
angle = 0; pitchScale = 0.5;
layer.render();
close(bounds(entry).width, 240);
close(bounds(entry).height, 60);
assert.equal(JSON.stringify(sources.get(entry.layerId).coordinates), corners,
    'zoom, bearing and pitch change the projection, never the anchored corners');
sources.clear(); rasterLayers.clear();
styleReady = false;
layer.render();
assert.equal(sources.size, 0, 'wait for a newly selected style to be parsed');
styleReady = true;
listeners.get('style.load')();
flush();
assert.equal(JSON.stringify(sources.get(entry.layerId).coordinates), corners, 'restore the same footprint after style changes');
assert.deepEqual(ids(), ['art0']);
zoom = 15; pitchScale = 1;
layer.init(map, { ...config, items: [config.items[0],
    { ...config.items[1], coordinates: fromPixel(210, 200) },
    { ...config.items[2], coordinates: fromPixel(1, 1) },
    { ...config.items[3], use: false }, { image: 'unused.png', coordinates: null }] });
flush();
assert.deepEqual(ids(), ['art0'], 'hide overlapping, clipped, disabled and unconfigured images');
layer.items[0].image.naturalWidth = 0;
layer.render();
assert.deepEqual(ids(), ['art1'], 'failed or unloaded images do not reserve space');
listeners.get('render')(); listeners.get('render')();
assert.equal(frames.size, 1);
layer.destroy();
assert.equal(frames.size, 0); assert.equal(listeners.size, 0);
assert.equal(sources.size, 0); assert.equal(rasterLayers.size, 0);
layer.init(map, { ...config, use: false });
assert.equal(listeners.size, 0);

// Fixed placement is the default: clipping and changing screen-space collisions
// must not turn entire images on and off, even at the old zoom cutoff of 17.
const fixedConfig = { ...config, minZoom: 0, maxZoom: 24, maxVisible: { desktop: 1, mobile: 1 } };
delete fixedConfig.autoHide;
controls = [{ getBoundingClientRect: () => viewport }];
hitAreas = [{ left: 0, top: 0, right: 1000, bottom: 800 }];
layer.init(map, fixedConfig);
flush();
assert.equal(visible().length, 5, 'all configured images remain enabled despite UI, markers and count limits');
const fixedWrites = layoutWrites;
const fixedCorners = JSON.stringify(Array.from(sources.values(), source => source.coordinates));
for (const nextZoom of [14, 17, 18, 15]) {
    zoom = nextZoom;
    angle += 0.3;
    pitchScale = 0.5;
    layer.render();
    assert.equal(visible().length, 5);
}
assert.equal(layoutWrites, fixedWrites, 'camera changes must not toggle fixed image visibility');
assert.equal(JSON.stringify(Array.from(sources.values(), source => source.coordinates)), fixedCorners);
layer.destroy();

const settings = JSON.parse(fs.readFileSync('data/config-user.jsonc', 'utf8')).mapIllustrations;
assert.equal(settings.items.length, 9);
assert.equal(settings.autoHide, false);
assert.equal(settings.minZoom, 0);
assert.equal(settings.maxZoom, 24);
for (const item of settings.items) assert.ok(fs.existsSync(item.image), item.image);
assert.ok(JSON.parse(fs.readFileSync('manifest.json', 'utf8')).scriptGroups
    .some(group => group.scripts.includes('./lib/mapillustrations.js')));
console.log('PASS: geographic illustrations scale/rotate/tilt at fixed corners, restore styles, avoid collisions and clean up');
