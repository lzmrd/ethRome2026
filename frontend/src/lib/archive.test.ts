import { describe, expect, it } from 'vitest'
import { isArchived, parseArchived, partitionGoals, toggleArchived } from './archive'

const A = '0x1618094A5fC624061a1112ef3ec262fdCBB73CAc' as const
const B = '0xcedD962D5bFEE6Dbbd509Ccb67475F517631b3da' as const

describe('archive', () => {
  it('legge la lista salvata normalizzando il maiuscolo', () => {
    expect(parseArchived(JSON.stringify([A]))).toEqual([A.toLowerCase()])
  })

  it('tratta come vuoto tutto cio che non e una lista di indirizzi', () => {
    expect(parseArchived(null)).toEqual([])
    expect(parseArchived('non json')).toEqual([])
    expect(parseArchived('{"a":1}')).toEqual([])
    expect(parseArchived(JSON.stringify(['non un indirizzo', 42]))).toEqual([])
  })

  it('archivia e disarchivia lo stesso goal', () => {
    const once = toggleArchived([], A)
    expect(isArchived(once, A)).toBe(true)
    expect(isArchived(toggleArchived(once, A), A)).toBe(false)
  })

  it('riconosce il goal anche se scritto con un altro maiuscolo', () => {
    expect(isArchived(toggleArchived([], A), A.toLowerCase() as typeof A)).toBe(true)
  })

  it('divide i goal lasciando intatto l ordine della factory', () => {
    const { visible, archived } = partitionGoals([A, B], toggleArchived([], A))
    expect(visible).toEqual([B])
    expect(archived).toEqual([A])
  })
})
