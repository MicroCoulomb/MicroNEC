import { describe, expect, it } from 'vitest'
import { busbarSizing, conduitSizing, egcSizing, formatHorsepower, gecSizing, generalSizing, hvacSizing, lightingSizing, lightingSizingBySystem, motorFlcFromHp, motorHorsepowers, motorSizing, motorVoltageOptions, motorVoltages, powerFactorCorrection, singleMotorFlcFromHp, singleMotorHorsepowers, singleMotorVoltages, tableMotorVoltage, transformerSizing, voltageDrop } from './calculations'
import { referenceTables } from './referenceTables'

describe('NEC quick-check calculations', () => {
  it('provides the core NEC reference table library', () => {
    expect(referenceTables).toHaveLength(14)
    expect(referenceTables.map((table) => table.code)).toEqual(expect.arrayContaining([
      'Table 310.16', 'Table 250.66', 'Table 250.122', 'Table 430.248', 'Table 430.250', 'Chapter 9 Table 1', 'Table 450.3(A)', 'Table 450.3(B)', 'Conversion reference',
    ]))
    expect(referenceTables.map((table) => table.code)).not.toEqual(expect.arrayContaining(['240.4(D)', 'Table 240.6(A)']))
    expect(referenceTables.find((table) => table.id === '31016')?.rows.at(-1)?.[0]).toBe('2000')
    expect(referenceTables.find((table) => table.id === '430248')?.rows).toHaveLength(12)
    expect(referenceTables.find((table) => table.id === '430250')?.sections).toHaveLength(2)
    expect(referenceTables.find((table) => table.id === 'awg-metric')?.rows.find(([size]) => size === '14')).toEqual(['14', '2'])
    expect(referenceTables.find((table) => table.id === 'awg-metric')?.rows.find(([size]) => size === '500')).toEqual(['500', '250'])
    expect(referenceTables.every((table) => table.rows.length > 0)).toBe(true)
  })

  it('formats fractional horsepower using conventional notation', () => {
    expect(formatHorsepower(1 / 6)).toBe('1/6')
    expect(formatHorsepower(.5)).toBe('1/2')
    expect(formatHorsepower(1.5)).toBe('1-1/2')
    expect(formatHorsepower(7.5)).toBe('7-1/2')
  })

  it('sizes the binder continuous-load example at 4/0 copper and 250 A', () => {
    const result = generalSizing({ amps: 184, continuous: true, material: 'copper', terminal: 75, insulation: 90, ambient: 30, ccc: 3, voltage: 480, phase: 3 })
    expect(result.primary).toContain('4/0 Cu')
    expect(result.primary).toContain('250 A')
    expect(result.rows.find(([label]) => label === 'Load apparent power')?.[1]).toBe('153 kVA')
  })

  it('automatically selects the minimum parallel sets when one conductor would exceed 500 kcmil', () => {
    const result = generalSizing({ amps: 800, continuous: true, material: 'copper', terminal: 75, insulation: 90, ambient: 30, ccc: 3 })
    expect(result.primary).toContain('3 sets of 400 Cu')
  })

  it('selects NEC standard large OCPD ratings through 6,000 A', () => {
    const input = { continuous: false, material: 'copper' as const, terminal: 75, insulation: 90, ambient: 30, ccc: 3 }
    expect(generalSizing({ ...input, amps: 801 }).primary).toContain('1000 A OCPD')
    expect(generalSizing({ ...input, amps: 1200 }).primary).toContain('1200 A OCPD')
    expect(generalSizing({ ...input, amps: 1201 }).primary).toContain('1600 A OCPD')
    expect(generalSizing({ ...input, amps: 6000 }).primary).toContain('6000 A OCPD')
  })

  it('uses MCA and MOCP for HVAC equipment', () => {
    const result = hvacSizing(60, 80, 'copper', 75, 90, 30, 3, 208, 3)
    expect(result.primary).toContain('6 Cu')
    expect(result.primary).toContain('80 A')
    expect(result.rows.find(([label]) => label === 'MCA apparent load')?.[1]).toBe('21.6 kVA')
  })

  it('looks up the binder 208 V three-phase motor FLC values', () => {
    expect(motorFlcFromHp(5, 208)).toBe(16.7)
    expect(motorFlcFromHp(10, 208)).toBe(30.8)
  })

  it('covers the complete Table 430.250 lookup range and only exposes published combinations', () => {
    expect(motorHorsepowers('squirrel-cage')).toEqual([...motorHorsepowers('squirrel-cage')].sort((left, right) => left - right))
    expect(motorHorsepowers('squirrel-cage')).toContain(500)
    expect(motorHorsepowers('synchronous')).toEqual([25,30,40,50,60,75,100,125,150,200])
    expect(motorVoltages(1, 'squirrel-cage')).toEqual([115,200,208,230,460,575])
    expect(motorVoltages(500, 'squirrel-cage')).toEqual([460,575,2300])
    expect(motorVoltages(25, 'synchronous')).toEqual([230,460,575])
    expect(motorVoltageOptions(1, 'squirrel-cage', 3)).toContainEqual({ systemVoltage: 120, tableVoltage: 115, label: '120 V' })
    expect(motorVoltageOptions(5, 'squirrel-cage', 3)).toContainEqual({ systemVoltage: 240, tableVoltage: 230, label: '240 V' })
    expect(tableMotorVoltage(120)).toBe(115)
    expect(tableMotorVoltage(240)).toBe(230)
    expect(motorFlcFromHp(25, 230, 'wound-rotor')).toBe(68)
    expect(motorFlcFromHp(25, 230, 'synchronous')).toBe(53)
  })

  it('looks up single-phase motors and derives their OCPD poles', () => {
    expect(singleMotorHorsepowers()).toEqual([...singleMotorHorsepowers()].sort((left, right) => left - right))
    expect(singleMotorVoltages(5)).toEqual([115,200,208,230])
    expect(singleMotorFlcFromHp(5, 115)).toBe(56)
    expect(singleMotorFlcFromHp(5, 230)).toBe(28)
    const base = { fla: 28, type: 'squirrel-cage' as const, fuse: false, phase: 1 as const, material: 'copper' as const, terminal: 75, insulation: 90, ambient: 30, ccc: 3 }
    expect(motorSizing({ ...base, voltage: 115 }).primary).toContain('1-pole')
    expect(motorSizing({ ...base, voltage: 230 }).primary).toContain('2-pole')
    const lookup = motorSizing({ ...base, voltage: 240, lookup: { horsepower: 5, tableVoltage: 230 } })
    expect(lookup.rows[0][1]).toContain('240 V system · 230 V column · Table 430.248')
    expect(lookup.rows.find(([label]) => label === 'Motor load')?.[1]).toBe('6,720 VA')
  })

  it('identifies three-phase HP lookups as Table 430.250', () => {
    const result = motorSizing({ fla: 16.7, type: 'squirrel-cage', fuse: false, phase: 3, voltage: 208, material: 'copper', terminal: 75, insulation: 90, ambient: 30, ccc: 3, lookup: { horsepower: 5, tableVoltage: 208 } })
    expect(result.rows[0][1]).toContain('Table 430.250')
    expect(result.rows.find(([label]) => label === 'Motor load')?.[1]).toBe('6,016 VA')
    const largeMotor = motorSizing({ fla: 30, type: 'squirrel-cage', fuse: false, phase: 3, voltage: 230, material: 'copper', terminal: 75, insulation: 90, ambient: 30, ccc: 3 })
    expect(largeMotor.rows.find(([label]) => label === 'Motor load')?.[1]).toBe('12 kVA')
  })

  it('uses distinct wound-rotor and synchronous OCPD defaults', () => {
    const base = { fla: 40, fuse: false, material: 'copper' as const, terminal: 75, insulation: 90, ambient: 30, ccc: 3 }
    expect(motorSizing({ ...base, type: 'wound-rotor' }).primary).toContain('60 A')
    expect(motorSizing({ ...base, type: 'synchronous' }).primary).toContain('100 A')
  })

  it('matches the binder EGC examples', () => {
    expect(egcSizing(225, 'copper').primary).toBe('4 Cu EGC')
    expect(egcSizing(450, 'copper').primary).toBe('2 Cu EGC')
    expect(egcSizing(6000, 'copper').primary).toBe('800 Cu EGC')
    expect(egcSizing(200, 'copper', 3, '4').primary).toBe('4 Cu EGC')
  })

  it('sizes GECs from Table 250.66 and applies electrode caps', () => {
    const service = { sourceMaterial: 'copper' as const, sourceSize: '500', parallelSets: 1, material: 'copper' as const, continues: false }
    expect(gecSizing({ ...service, electrode: 'water-pipe' }).primary).toBe('1/0 Cu GEC')
    expect(gecSizing({ ...service, electrode: 'rod-pipe-plate' }).primary).toBe('6 Cu GEC')
    expect(gecSizing({ ...service, electrode: 'concrete-encased' }).primary).toBe('4 Cu GEC')
    expect(gecSizing({ ...service, electrode: 'ground-ring', ringSize: '2' }).primary).toBe('2 Cu GEC')
  })

  it('returns listed bus rating and conservative physical busbar estimate', () => {
    const result = busbarSizing({ amps: 600, continuous: true, material: 'copper', parallelBars: 2 })
    expect(result.primary).toBe('800 A listed bus minimum')
    expect(result.rows.find(([label]) => label === 'Suggested bar arrangement')?.[1]).toContain('2 x')
  })

  it('matches the 4x3/0 plus #6 EMT conduit example', () => {
    expect(conduitSizing([{ size: '3/0', quantity: 4 }, { size: '6', quantity: 1 }], 'EMT').primary).toBe('2 in. EMT')
    const fiveSets = conduitSizing([{size:'6',quantity:1},{size:'8',quantity:1},{size:'10',quantity:1},{size:'12',quantity:1},{size:'14',quantity:1}], 'EMT')
    expect(fiveSets.rows.find(([label]) => label === 'Conductors')?.[1]).toBe('5')
    expect(fiveSets.rows.find(([label]) => label === 'Permitted fill')?.[1]).toBe('40%')
  })

  it('calculates the 75 kVA, 480 V to 208 V three-phase transformer currents', () => {
    const result = transformerSizing(75, 480, 208, 3)
    expect(result.primary).toContain('90.2 A primary')
    expect(result.primary).toContain('208.2 A secondary')
  })

  it('selects a conductor that meets the requested voltage-drop target', () => {
    const result = voltageDrop({ amps: 60, volts: 208, phase: 3, length: 100, material: 'copper', allowable: 3 })
    expect(result.primary).toContain('meets 3% target')
  })

  it('calculates capacitor kVAr needed for lagging power-factor correction', () => {
    const result = powerFactorCorrection({ kw: 100, existingPf: .8, targetPf: .95 })
    expect(result.primary).toContain('42.1 kVAr')
    expect(result.rows.find(([label]) => label === 'Corrected apparent power')?.[1]).toBe('105.3 kVA')
    expect(powerFactorCorrection({ kw: 100, existingPf: .95, targetPf: .9 }).primary).toBe('0 kVAr required')
  })

  it('uses occupancy targets, CU, LLF, and area conversion for lighting estimates', () => {
    const result = lightingSizing({ occupancy: 'office-general', area: 1000, unit: 'ft²', lumens: 10000, cu: .7, llf: .85 })
    expect(result.primary).toBe('6 luminaires required')
    expect(result.rows.find(([label]) => label === 'Occupancy target')?.[1]).toContain('30 fc')
    expect(lightingSizing({ occupancy: 'office-general', area: 100, unit: 'm²', lumens: 10000, cu: .7, llf: .85 }).rows.find(([label]) => label === 'Area used')?.[1]).toBe('1076.4 ft²')
  })

  it('uses the selected lighting system consistently in calculations and results', () => {
    const imperial = lightingSizingBySystem({ occupancy: 'office-general', area: 1000, unit: 'Imperial', lumens: 10000, cu: .7, llf: .85 })
    const metric = lightingSizingBySystem({ occupancy: 'office-general', area: 92.903, unit: 'Metric', lumens: 10000, cu: .7, llf: .85 })
    expect(imperial.primary).toBe('6 luminaires required')
    expect(metric.primary).toBe('5 luminaires required')
    expect(imperial.rows.find(([label]) => label === 'Target illuminance')?.[1]).toBe('30 fc')
    expect(imperial.rows.find(([label]) => label === 'Achieved illuminance')?.[1]).toBe('35.7 fc')
    expect(metric.rows.find(([label]) => label === 'Target illuminance')?.[1]).toBe('300 lux')
    expect(metric.rows.find(([label]) => label === 'Room area')?.[1]).toBe('92.9 m²')
  })

  it('uses the uploaded illumination schedule and rounded Imperial targets', () => {
    expect(lightingSizingBySystem({ occupancy: 'lab-qc', area: 100, unit: 'Metric', lumens: 10000, cu: .7, llf: .85 }).rows.find(([label]) => label === 'Target illuminance')?.[1]).toBe('500 lux')
    expect(lightingSizingBySystem({ occupancy: 'lab-qc', area: 1000, unit: 'Imperial', lumens: 10000, cu: .7, llf: .85 }).rows.find(([label]) => label === 'Target illuminance')?.[1]).toBe('45 fc')
    expect(lightingSizingBySystem({ occupancy: 'outdoor-walkways', area: 1000, unit: 'Imperial', lumens: 10000, cu: .7, llf: .85 }).rows.find(([label]) => label === 'Target illuminance')?.[1]).toBe('5 fc')
    expect(lightingSizingBySystem({ occupancy: 'parking-lots', area: 100, unit: 'Metric', lumens: 10000, cu: .7, llf: .85 }).rows.find(([label]) => label === 'Target illuminance')?.[1]).toBe('20 lux')
  })
})
