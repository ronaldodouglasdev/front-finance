import test from 'node:test'
import assert from 'node:assert/strict'
import { isPlannedIncome } from '../src/utils/planned.js'
test('classifica receitas fixas e salários como positivas, e despesas como negativas',()=>{
 assert.equal(isPlannedIncome({kind:'fixed_rule',direction:'income'}),true)
 assert.equal(isPlannedIncome({kind:'salary'}),true)
 assert.equal(isPlannedIncome({kind:'fixed_rule',direction:'fixed'}),false)
})
