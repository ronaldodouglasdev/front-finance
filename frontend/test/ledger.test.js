import test from 'node:test'
import assert from 'node:assert/strict'
import { createLedgerStorage, LEDGER_KEY, ENTRY_KEY, PLAN_KEY } from '../src/storage/ledger.js'
function mock(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}}
test('migra dados antigos sem alterar ou apagar as chaves antigas',()=>{const s=mock();s.setItem(ENTRY_KEY,'[1]');s.setItem(PLAN_KEY,'{"plans":[]}');const a=createLedgerStorage(s);assert.equal(a.getItem(ENTRY_KEY),'[1]');a.setItem(PLAN_KEY,'{"plans":[1]}');assert.equal(a.getItem(ENTRY_KEY),'[1]');assert.equal(s.getItem(PLAN_KEY),'{"plans":[]}');assert.ok(s.getItem(LEDGER_KEY))})
test('atualiza os dois registros em uma única gravação',()=>{const s=mock(),a=createLedgerStorage(s);a.setBoth('[1]','{"plans":[2]}');assert.equal(a.getItem(ENTRY_KEY),'[1]');assert.equal(a.getItem(PLAN_KEY),'{"plans":[2]}')})
test('se a gravação falhar preserva ambos os dados anteriores',()=>{const s=mock(),a=createLedgerStorage(s);a.setBoth('[1]','{"plans":[]}');const before=s.getItem(LEDGER_KEY);s.setItem=()=>{throw Error('quota')};assert.throws(()=>a.setBoth('[2]','{"plans":[2]}'));assert.equal(s.getItem(LEDGER_KEY),before)})
test('recusa dados inválidos sem descartá-los',()=>{const s=mock();s.setItem(LEDGER_KEY,'inválido');const a=createLedgerStorage(s);assert.throws(()=>a.getItem(ENTRY_KEY));assert.equal(s.getItem(LEDGER_KEY),'inválido')})

test('operações concorrentes são serializadas quando o navegador oferece Web Locks', async () => {
  const { withLedgerLock } = await import('../src/storage/ledger.js')
  const original = globalThis.navigator
  let tail=Promise.resolve()
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request(_name,_options,fn){const work=tail.then(fn);tail=work.catch(()=>{});return work}}}})
  try {
    const order=[]
    await Promise.all([withLedgerLock(async()=>{order.push('a-início');await Promise.resolve();order.push('a-fim')}),withLedgerLock(()=>order.push('b'))])
    assert.deepEqual(order,['a-início','a-fim','b'])
  } finally { Object.defineProperty(globalThis,'navigator',{configurable:true,value:original}) }
})
test('sem Web Locks a gravação é recusada em vez de perder dados', async () => {
  const { withLedgerLock } = await import('../src/storage/ledger.js')
  const original=globalThis.navigator
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}})
  try { let warned=false; const result=await withLedgerLock(()=>{throw Error('não deve gravar')},()=>{warned=true});assert.equal(result,false);assert.equal(warned,true) }
  finally { Object.defineProperty(globalThis,'navigator',{configurable:true,value:original}) }
})
test('quando o navegador recusa o bloqueio a gravação falha de forma controlada', async () => {
  const { withLedgerLock } = await import('../src/storage/ledger.js')
  const original=globalThis.navigator
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request(){return Promise.reject(Error('bloqueado'))}}}})
  try { let warned=false;assert.equal(await withLedgerLock(()=>true,()=>{warned=true}),false);assert.equal(warned,true) }
  finally { Object.defineProperty(globalThis,'navigator',{configurable:true,value:original}) }
})
test('incorpora alterações da aba antiga preservando edições novas',()=>{
 const s=mock(),a=createLedgerStorage(s),old={id:'a',amount:1},added={id:'b',amount:2},modern={id:'c',amount:3}
 s.setItem(ENTRY_KEY,JSON.stringify([old]));a.setItem(PLAN_KEY,'{"plans":[]}');a.setItem(ENTRY_KEY,JSON.stringify([old,modern]));s.setItem(ENTRY_KEY,JSON.stringify([old,added]))
 assert.deepEqual(JSON.parse(a.getItem(ENTRY_KEY)),[old,modern,added]);a.setItem(PLAN_KEY,'{"plans":[1]}');assert.deepEqual(JSON.parse(a.getItem(ENTRY_KEY)),[old,modern,added])
})
test('preserva dados quando a mesma entrada foi editada nas duas versões',()=>{
 const s=mock(),a=createLedgerStorage(s);s.setItem(ENTRY_KEY,'[{"id":"a","amount":1}]');a.setItem(PLAN_KEY,'{}');a.setItem(ENTRY_KEY,'[{"id":"a","amount":2}]');s.setItem(ENTRY_KEY,'[{"id":"a","amount":3}]')
 const before=s.getItem(LEDGER_KEY);assert.throws(()=>a.getItem(ENTRY_KEY),/Conflito/);assert.equal(s.getItem(LEDGER_KEY),before);assert.equal(JSON.parse(s.getItem(ENTRY_KEY))[0].amount,3)
})
