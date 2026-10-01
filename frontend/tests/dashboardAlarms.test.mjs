import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import {stationAlarms} from '../src/services/stationAlarms.ts'

const cases=JSON.parse(readFileSync(new URL('../../shared/alarm_rule_fixtures.json',import.meta.url),'utf8'))
for(const sample of cases){
  test(`dashboard alarm rules agree with backend: ${sample.name}`,()=>{
    assert.deepEqual(stationAlarms(sample.station).map(({type,severity})=>({type,severity})),sample.expected)
  })
}
