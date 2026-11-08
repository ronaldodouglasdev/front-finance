import test from 'node:test'
import assert from 'node:assert/strict'
import {projectMonths} from '../src/utils/projection.js'
const fixed={id:'f',kind:'fixed_rule',direction:'fixed',items:[{date:'2026-11-30',cents:10000}],completedMonths:[],changes:[],overrides:{},endDate:''}
const salary={id:'s',kind:'salary',items:[{date:'2026-11-05',cents:300000}],receivedMonths:[]}
const installments={id:'i',kind:'installment',items:[{date:'2026-11-03',cents:20000,paid:false},{date:'2026-12-03',cents:20000,paid:false}]}
test('projeta salário e despesas sem contar duas vezes',()=>{const x=projectMonths([fixed,salary,installments],'2026-11',50000,2);assert.deepEqual(x.map(v=>[v.income,v.total,v.projection]),[[300000,30000,320000],[300000,30000,590000]])})
test('ignora receita ou despesa já confirmada',()=>{const x=projectMonths([{...salary,receivedMonths:['2026-11']},{...fixed,completedMonths:['2026-11']}],'2026-11',1000,1);assert.deepEqual([x[0].income,x[0].total,x[0].projection],[0,0,1000])})
test('despesas atrasadas são descontadas apenas uma vez',()=>{const x=projectMonths([installments],'2026-12',50000,2);assert.deepEqual(x.map(v=>v.total),[40000,0]);assert.deepEqual(x.map(v=>v.projection),[10000,10000])})
test('considera lançamentos realizados em meses posteriores sem duplicar pagamentos',()=>{
 const paid={...installments,items:[{...installments.items[0],date:'2026-12-03',paid:true}]}
 const entries=[{date:'2026-11-10',type:'income',amount:500},{date:'2026-12-03',type:'variable',amount:200},{date:'2026-12-05',type:'income',amount:300}]
 assert.deepEqual(projectMonths([paid],'2026-11',50000,2,entries).map(x=>x.projection),[50000,60000])
})
