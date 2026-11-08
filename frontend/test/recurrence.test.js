import test from 'node:test'
import assert from 'node:assert/strict'
import { salaryForMonth } from '../src/utils/recurrence.js'
import { createDemoBackup, parseDemoBackup } from '../src/storage/demoBackup.js'
const plan = { id:'sal', name:'Salário', category:'Outros', kind:'salary', total:0, items:[{id:'base',date:'2026-01-31',cents:500000,number:1,paid:false}], receivedMonths:['2026-02'] }
test('receita se repete sem limite fixo e ajusta dias curtos',()=>{assert.equal(salaryForMonth(plan,'2025-12'),null);assert.equal(salaryForMonth(plan,'2026-02').date,'2026-02-28');assert.equal(salaryForMonth(plan,'2026-02').paid,true);assert.equal(salaryForMonth(plan,'2057-03').date,'2057-03-31');assert.equal(salaryForMonth(plan,'2057-03').paid,false)})
test('backup preserva recorrência e meses recebidos',()=>{const planner={plans:[plan],goals:[]};assert.deepEqual(parseDemoBackup(createDemoBackup([{id:'pagamento-salary-sal-2026-02',description:'Salário',category:'Outros',type:'income',amount:5000,date:'2026-02-05'}],planner)).planner,planner)})
test('backup rejeita meses recebidos inválidos ou duplicados',()=>{for(const receivedMonths of [['2026-13'],['2026-02','2026-02']])assert.throws(()=>parseDemoBackup(createDemoBackup([],{plans:[{...plan,receivedMonths}],goals:[]})))})

import { fixedForMonth, fixedUntil } from '../src/utils/recurrence.js'
const fixed={id:'fix',name:'Aluguel',category:'Moradia',kind:'fixed_rule',direction:'fixed',total:0,endDate:'2027-04-30',completedMonths:['2027-01'],changes:[{from:'2027-03',cents:120000}],overrides:{'2027-02':110000},items:[{id:'rule',date:'2026-12-31',cents:100000,number:1,paid:false}]}
test('recorrência fixa atravessa ano, ajusta dias e respeita término',()=>{assert.equal(fixedForMonth(fixed,'2026-11'),null);assert.equal(fixedForMonth(fixed,'2026-12').date,'2026-12-31');assert.equal(fixedForMonth(fixed,'2027-02').date,'2027-02-28');assert.equal(fixedForMonth(fixed,'2027-01').paid,true);assert.equal(fixedForMonth(fixed,'2027-05'),null);assert.equal(fixedUntil(fixed,'2027-02').length,3)})
test('alterações por mês e futuras preservam histórico',()=>{assert.equal(fixedForMonth(fixed,'2027-01').cents,100000);assert.equal(fixedForMonth(fixed,'2027-02').cents,110000);assert.equal(fixedForMonth(fixed,'2027-03').cents,120000);assert.equal(fixedForMonth(fixed,'2027-04').cents,120000)})
test('backup preserva regra, término e alterações',()=>{const planner={plans:[fixed],goals:[]};const paid={id:'pagamento-fixed-fix-2027-01',description:'Aluguel',category:'Moradia',type:'fixed',amount:1000,date:'2027-01-31'};assert.deepEqual(parseDemoBackup(createDemoBackup([paid],planner)).planner,planner)})
test('impede encerrar antes de ocorrência paga e permite após desfazer',async()=>{const {canStopFixed}=await import('../src/utils/recurrence.js');assert.equal(canStopFixed(fixed,'2026-12'),false);assert.equal(canStopFixed(fixed,'2027-01'),true);assert.equal(canStopFixed({...fixed,completedMonths:[]},'2026-12'),true)})
