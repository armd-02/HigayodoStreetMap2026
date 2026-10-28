const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const parse = name => vm.runInNewContext('(' + fs.readFileSync(name, 'utf8') + ')');
const Stub = class {};
const context = vm.createContext({
    window: { navigator: { language: 'ja' } },
    IndoorControl: Stub, Glottologist: Stub, Basic: Stub, PoiStatusCont: Stub,
    OverPassControl: Stub, Maplibre: Stub, GeoCont: Stub, ListTable: Stub,
    PoiCont: Stub, MapFeature3D: Stub, PlaygroundModelFactories: {},
    GoogleSpreadSheet: Stub, HistoricalNewsController: Stub, NewsTicker: Stub,
    ChangeController: Stub, AreaFeatureLinker: Stub, AreaSearchController: Stub,
    ListActionButtons: Stub
});
vm.runInContext(fs.readFileSync('cmapmaker.js', 'utf8') + '\nthis.maker = cMapMaker;', context);
const config = parse('data/config-user.jsonc');
const before = JSON.stringify(config);
context.Conf = structuredClone(config);
context.maker.prepareConfig();
const prepared = context.Conf;
assert.equal(JSON.stringify(config), before);
for (const key of Object.keys(config)) {
    assert.equal(JSON.stringify(prepared[key]), JSON.stringify(config[key]), `${key} is preserved`);
}
assert.equal(prepared.activity.url, config.activity.url);
assert.equal(prepared.activity.targetName, config.activity.targetName);
assert.equal(prepared.activity.authMode, 'basic');
assert.equal(prepared.selectItem.action, 'ChangePoi', 'category changes must refresh the map and list');
assert.equal(new URL(prepared.activity.url).protocol, 'https:');
assert.equal(new URL(prepared.activity.url).searchParams.get('app'), 'higayodo_artfes_2026');
assert.equal(prepared.google.AppScript, prepared.activity.url);
assert.equal(prepared.activity.local.use, true);
assert.ok(prepared.activity.local.hosts.includes('127.0.0.1'));
assert.equal(new URL(prepared.activity.local.url).hostname, '127.0.0.1');
for (const name of ['news', 'changes', 'intro', 'areaFeatureLinker', 'areaSearch',
    'discovery', 'listActions', 'directions']) {
    assert.equal(prepared[name].use, false, `${name} requires opt-in`);
}
assert.equal(prepared.feature3d.use, true);
vm.runInContext(fs.readFileSync('lib/playgroundmodels3d.js', 'utf8') + '\nthis.factories = PlaygroundModelFactories;', context);
vm.runInContext(fs.readFileSync('lib/mapfeature3d.js', 'utf8') + '\nthis.modelLayer = new MapFeature3D({ modelFactories: this.factories });', context);
context.modelLayer.configure(prepared.feature3d);
assert.equal(context.modelLayer.getModelKey({ amenity: 'vending_machine', brand: 'コカ・コーラ' }), 'vending_machine_red');
assert.equal(context.modelLayer.getModelKey({ amenity: 'vending_machine', brand: '別ブランド' }), 'vending_machine');
assert.equal(context.modelLayer.getModelKey({ amenity: 'vending_machine' }), 'vending_machine');
for (const model of Object.values(prepared.feature3d.models)) if (model.url) assert(fs.existsSync(model.url));
assert.equal(prepared.indoor.use, false);
assert.equal(parse('data/glot-custom.jsonc').site_title.ja, 'ひがよど文化祭 会場周遊マップ2026');
assert.equal(parse('manifest.json').gId, '');
assert.equal(prepared.map.tileName, 'OSMFJ_NOPOI');
assert.equal(JSON.stringify(prepared.map.viewCenter), '[135.528728,34.744132]');
assert.equal(prepared.minimap.use, false);
assert.equal(prepared.static.use, false);
assert.equal(JSON.stringify(prepared.static.osmjsons), '[]');
assert.equal(prepared.etc.localSave, 'higayodo2026');
assert.equal(prepared.etc.reverseIcon, false);
assert.equal(prepared.selectItem.default, 'activity');
assert.equal(prepared.icon.markerColors.attention.stroke, '#ffc786');
assert.equal(JSON.stringify(parse('data/listtable.jsonc').list.columns.poiFields),
    '["id","ref","name","#category","reservation"]');
// The application merges these files shallowly, in this order.
const loaded = Object.assign({}, ...[
    'data/config-user.jsonc', 'data/config-system.jsonc', 'data/config-activities.jsonc',
    'data/marker.jsonc', 'data/category-ja.jsonc', 'data/listtable.jsonc', 'data/overpass-system.jsonc'
].map(parse));
assert.equal(JSON.stringify(loaded.listTable), JSON.stringify(config.listTable),
    'loading list columns must preserve the complete user list settings');
assert.equal(loaded.listTable.nameFallback, 'category');
assert.equal(loaded.listTable.playback.view, false);
assert.equal(loaded.listTable.backgroundImage, './image/higayodo-pattern-256.png');
assert.ok(fs.existsSync(loaded.listTable.backgroundImage));
assert.equal(loaded.listTable.category, 'activity');
assert.equal(loaded.listTable.target, 'activity');
assert.equal(loaded.mapDisplayStatus.use, false);
assert.equal(prepared.menu.modal.find(item => item['glot-model'] === 'osm_open').linkto,
    'javascript:winCont.osm_open(cMapMaker.openOSMid)');

// Explicit new settings take precedence over the legacy adapter and defaults.
context.Conf = structuredClone(config);
delete context.Conf.activity;
context.Conf.google.AppScript = 'https://script.google.com/macros/s/example/exec';
context.maker.prepareConfig();
assert.equal(context.Conf.activity.url, context.Conf.google.AppScript);
context.Conf.activity = { url: 'https://example.test/activities', authMode: 'basic', targetName: 'custom' };
context.Conf.areaFeatureLinker = { use: true, areaTargets: ['historic'] };
context.Conf.feature3d = { use: true, models: {}, rules: [] };
context.maker.prepareConfig();
assert.equal(context.Conf.activity.url, 'https://example.test/activities');
assert.equal(context.Conf.activity.authMode, 'basic');
assert.equal(context.Conf.activity.targetName, 'custom');
assert.equal(context.Conf.areaFeatureLinker.use, true);
assert.equal(context.Conf.feature3d.use, true);
console.log('PASS: Higayodo backend settings, legacy GAS compatibility, disabled dedicated services, and explicit opt-in');
