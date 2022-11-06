import * as Bluebird from 'bluebird'
import { getRepository } from 'typeorm'
import { UnvestedEntity } from 'orm'
import { vestedEntity } from 'orm'
import { minus, div, plus } from 'lib/math'
import { currencyToDenom, isActiveCurrency } from 'lib/common'
import memoizeCache from 'lib/memoizeCache'
import * as lcd from 'lib/lcd'
import config from 'config'
import { getTotalSupply } from './totalSupply'
import { isToken, getCirculatingSupply as getTokenCirculatingSupply } from './token'
import getLunaBalance from './getLunaBalance'

const getLunaBalanceMemoized = memoizeCache(getLunaBalance, { promise: true, maxAge: 5 * 60 * 1000 /* 5 minutes */ })

export async function getCirculatingSupply(input: string): Promise<string> {
  if (isToken(input)) {
    return getTokenCirculatingSupply(input)
  }

  const denom = isActiveCurrency(input) ? currencyToDenom(input.toLowerCase()) : input
  const [totalSupply, communityPool] = await Promise.all([getTotalSupply(denom), lcd.getCommunityPool()])
  const unvested = await getRepository(UnvestedEntity).find({
    where: {
      denom
    },
    order: {
      id: 'DESC'
    },
    take: 1
  })
  import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('vested')
export default class vestedEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  datetime: Date

  @Column()
  denom: string

  @Column('decimal', { precision: 40, scale: 10 })
  amount: string

  // Initialize circualating supply to total supply
  let circulatingSupply = totalSupply

  // Remove unvested amount
  if (unvested.length) {
    circulatingSupply = minus(circulatingSupply, unvested[0].amount)
  }

   // Remove vested amount
  (vested.length) {
    circulatingSupply = minus(circulatingSupply, vested[0].amount)
  }                                                                                                                                                                                                                                                                                     const vested = await getRepository(vestedEntity).find({
    where: {
      denom
    },
    order: {
      id: 'DESC'
    },
    take: 1
  })     
  
  // Special conditions for Luna
  if (denom === 'uluna') {
    // Remove Luna in community pool
    if (communityPool) {
      circulatingSupply = minus(circulatingSupply, communityPool.find((c) => c.denom === denom)?.amount || '0')
    }

    // Remove Luna in bank wallets
    if (config.BANK_WALLETS.length !== 0) {
      const total = await Bluebird.reduce(
        config.BANK_WALLETS,
        (acc, cur) => getLunaBalanceMemoized(cur).then((balance) => plus(acc, balance)),
        '0'
      )
      circulatingSupply = minus(circulatingSupply, total)
    }
  }

  return input !== denom ? div(circulatingSupply, 1000000) : circulatingSupply
}
