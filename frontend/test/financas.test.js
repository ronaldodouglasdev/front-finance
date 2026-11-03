import test from 'node:test'
import assert from 'node:assert/strict'
import { sumCents, toCents, formatCents } from '../src/utils/money.js'
import { STORAGE_KEY, loadTransactions, saveTransactions, createBackup, parseBackup } from '../src/storage/transactions.js'

const entry = (overrides = {}) => ({ id: '1', description: 'Mercado', category: 'Alimentação', type: 'variable', amount: 10.25, date: '2026-11-02', ...overrides })
function makeStorage() {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
}

test('soma valores decimais em centavos sem erro de ponto flutuante', () => {
  assert.equal(sumCents([{ amount: 0.1 }, { amount: 0.2 }, { amount: 1.01 }]), 131)
  assert.equal(sumCents([]), 0)
  assert.equal(toCents(2.29), 229)
  assert.equal(formatCents(131), new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(1.31))
})

test('salva, carrega, edita e mantém uma lista vazia', () => {
  const storage = makeStorage()
  assert.equal(loadTransactions(storage).entries, null)
  assert.equal(saveTransactions(storage, [entry()]), null)
  assert.deepEqual(loadTransactions(storage).entries, [entry()])
  assert.equal(saveTransactions(storage, [entry({ amount: 50 })]), null)
  assert.equal(loadTransactions(storage).entries[0].amount, 50)
  assert.equal(saveTransactions(storage, []), null)
  assert.deepEqual(loadTransactions(storage).entries, [])
})

test('informa falhas de leitura e gravação sem sobrescrever dados inválidos', () => {
  const storage = makeStorage()
  storage.setItem(STORAGE_KEY, '{inválido')
  assert.ok(loadTransactions(storage).error)
  assert.equal(storage.getItem(STORAGE_KEY), '{inválido')
  assert.ok(loadTransactions({ getItem() { throw new Error('acesso negado') } }).error)
  assert.ok(saveTransactions({ setItem() { throw new Error('sem espaço') } }, [entry()]))
})

test('exporta e importa backups, inclusive vazios', () => {
  assert.deepEqual(parseBackup(createBackup([entry()])), [entry()])
  assert.deepEqual(parseBackup(createBackup([])), [])
})

test('rejeita backups inválidos, repetidos ou com datas impossíveis', () => {
  assert.throws(() => parseBackup('texto inválido'))
  assert.throws(() => parseBackup(JSON.stringify({ format: 'meu-fluxo-backup', version: 99, entries: [] })))
  assert.throws(() => parseBackup(createBackup([entry(), entry()])))
  assert.throws(() => parseBackup(createBackup([entry({ date: '2026-02-30' })])))
  assert.throws(() => parseBackup(createBackup([entry({ amount: -1 })])))
})
