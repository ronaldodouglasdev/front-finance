// Os arquivos existentes guardam valores em reais; somamos sempre em centavos.
export const toCents = amount => Math.round(amount * 100)
export const formatCents = cents => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
export const sumCents = entries => entries.reduce((sum, entry) => sum + toCents(entry.amount), 0)
