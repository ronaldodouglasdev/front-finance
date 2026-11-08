import test from 'node:test'
import assert from 'node:assert/strict'
import { createDemoBackup, parseDemoBackup } from '../src/storage/demoBackup.js'
import { createBackup } from '../src/storage/transactions.js'
const entry={id:'t',description:'Salário',category:'Renda',type:'income',amount:100,date:'2026-09-10'}
const plan={id:'p',name:'Conta',kind:'installment',category:'Outros',total:0,items:[{id:'i',date:'2026-12-10',cents:1000,number:1,paid:false}]}
const goal={id:'g',name:'Reserva',target:100000,monthly:10000,deadline:'2027-01-01',contributions:[{id:'c',date:'2026-11-01',cents:1000}]}
test('restaura lançamentos, planejamento e metas',()=>{const planner={plans:[plan],goals:[goal]};assert.deepEqual(parseDemoBackup(createDemoBackup([entry],planner)),{entries:[entry],planner})})
test('aceita backup antigo sem substituir planejamento',()=>{assert.deepEqual(parseDemoBackup(createBackup([entry])),{entries:[entry],planner:null})})
test('rejeita dados financeiros inválidos, ids duplicados e datas inexistentes',()=>{for(const invalid of [{...plan,items:[{...plan.items[0],cents:-1}]},{...plan,items:[{...plan.items[0],date:'2026-02-30'}]},{...plan,items:[plan.items[0],plan.items[0]]}])assert.throws(()=>parseDemoBackup(createDemoBackup([entry],{plans:[invalid],goals:[]})))})
test('recusa backup com pagamento sem parcela ou parcela paga sem pagamento',()=>{
 const payment={...entry,id:'pagamento-i',amount:10}
 const paid={...plan,items:[{...plan.items[0],paid:true,paymentId:'pagamento-i'}]}
 assert.throws(()=>parseDemoBackup(createDemoBackup([payment],{plans:[],goals:[]})))
 assert.throws(()=>parseDemoBackup(createDemoBackup([],{plans:[paid],goals:[]})))
 assert.doesNotThrow(()=>parseDemoBackup(createDemoBackup([payment],{plans:[paid],goals:[]})))
})
test('backup rejeita fechamento que não corresponde aos lançamentos',()=>{const planner={plans:[],goals:[],closings:[{month:'2026-09',closedAt:'2026-10-01T00:00:00.000Z',opening:0,income:10000,expenses:0,saved:0,ending:10000}]};assert.doesNotThrow(()=>parseDemoBackup(createDemoBackup([entry],planner)));assert.throws(()=>parseDemoBackup(createDemoBackup([{...entry,amount:200}],planner)))})
