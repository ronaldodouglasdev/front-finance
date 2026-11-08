import test from 'node:test'
import assert from 'node:assert/strict'
import { undoPayment } from '../src/utils/payment.js'
const record={id:'pagamento-i',description:'Conta',category:'Outros',type:'fixed',amount:10,date:'2026-11-04'}
test('desfaz pagamento e devolve parcela ao estado pendente',()=>{const planner={plans:[{id:'p',kind:'loan',items:[{id:'i',paid:true,paymentId:record.id,paidDate:'2026-11-04'}]}],goals:[]};const result=undoPayment([record],planner,record.id);assert.deepEqual(result.entries,[]);assert.equal(result.planner.plans[0].items[0].paid,false);assert.equal(planner.plans[0].items[0].paid,true)})
test('desfaz confirmação de receita fixa e preserva outros meses',()=>{const id='pagamento-fixed-plano-2026-11',planner={plans:[{id:'plano',kind:'fixed_rule',completedMonths:['2026-10','2026-11']}],goals:[]};assert.deepEqual(undoPayment([{...record,id}],planner,id).planner.plans[0].completedMonths,['2026-10'])})
test('recusa remover pagamento sem parcela vinculada',()=>{assert.throws(()=>undoPayment([record],{plans:[],goals:[]},record.id));assert.throws(()=>undoPayment([],{plans:[],goals:[]},record.id))})
