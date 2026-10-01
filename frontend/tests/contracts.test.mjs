import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import en from '../src/i18n/en.ts'
import hr from '../src/i18n/hr.ts'
import { t,setLanguage,translateText,translateStatus } from '../src/i18n/index.ts'
import { createPinia,setActivePinia } from 'pinia'
import { useSensorStore } from '../src/stores/sensorStore.ts'

function flatten(value,prefix=''){
  return Object.entries(value).flatMap(([key,item])=>typeof item==='string'
    ?[[prefix+key,item]]:flatten(item,prefix+key+'.'))
}
describe('cross-module semantic contracts',()=>{
  test('coordinates outside world bounds use a finite map fallback',()=>{
    setActivePinia(createPinia());const store=useSensorStore()
    const fallback=store.parseLocation({location:'invalid'})
    assert.deepEqual(store.parseLocation({location:'(181,91)'}),fallback)
    assert.deepEqual(store.parseLocation({location:{coordinates:[Infinity,NaN]}}),fallback)
  })
  test('Croatian and English translations cover the same keys',()=>{
    assert.deepEqual(flatten(hr).map(([key])=>key).sort(),flatten(en).map(([key])=>key).sort())
  })
  test('translated interpolation placeholders retain every required parameter',()=>{
    const translated=Object.fromEntries(flatten(hr))
    for(const [key,message] of flatten(en)){
      const parameters=text=>(text.match(/\{\w+\}/g)||[]).sort()
      assert.deepEqual(parameters(translated[key]||''),parameters(message),key)
    }
  })
  test('translation supports raw English strings, null and missing keys',()=>{
    setLanguage('hr')
    try{
      assert.equal(translateText(null),null)
      assert.equal(translateStatus(undefined),undefined)
      assert.equal(t('missing-key'),'missing-key')
      assert.equal(typeof t('dashboard.now'),'string')
    }finally{setLanguage('en')}
  })
  test('store location parsing preserves valid coordinate zero',()=>{
    setActivePinia(createPinia());const store=useSensorStore()
    assert.deepEqual(store.parseLocation({location:'(0,0)'}),{lng:0,lat:0})
  })
  test('store invalid numeric coordinates are not exposed as NaN to map renderers',()=>{
    setActivePinia(createPinia());const store=useSensorStore()
    const point=store.parseLocation({location:'(broken,invalid)'})
    assert.ok(Number.isFinite(point.lng)&&Number.isFinite(point.lat))
  })
  test('GeoJSON Point coordinates use the same longitude/latitude as string coordinates',()=>{
    setActivePinia(createPinia());const store=useSensorStore()
    assert.deepEqual(store.parseLocation({location:{coordinates:[16.4,46.4]}}),{lng:16.4,lat:46.4})
  })
})
