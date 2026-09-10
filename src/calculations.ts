import { singlePhaseMotorFlc, threePhaseInductionFlc, threePhaseSynchronousFlc } from './motorTables'

export type Material = 'copper' | 'aluminum'
export type Result = { title: string; primary: string; rows: [string, string][]; notes: string[]; citations: string[] }

type Conductor = { size: string; cu60: number; cu75: number; cu90: number; al60: number; al75: number; al90: number; area: number }

export const conductors: Conductor[] = [
  ['14',15,20,25,0,0,0,.0097],['12',20,25,30,0,0,0,.0133],['10',30,35,40,25,30,35,.0211],['8',40,50,55,35,40,45,.0366],['6',55,65,75,40,50,55,.0507],['4',70,85,95,55,65,75,.0824],['3',85,100,115,65,75,85,.0973],['2',95,115,130,75,90,100,.1158],['1',110,130,150,85,100,115,.1562],['1/0',125,150,170,100,120,135,.1855],['2/0',145,175,195,115,135,150,.2223],['3/0',165,200,225,130,155,175,.2679],['4/0',195,230,260,150,180,205,.3237],['250',215,255,290,170,205,230,.397],['300',240,285,320,190,230,255,.460],['350',260,310,350,210,250,280,.5242],['400',280,335,380,225,270,305,.5898],['500',320,380,430,260,310,350,.7073],
].map(([size,cu60,cu75,cu90,al60,al75,al90,area]) => ({ size: String(size), cu60: Number(cu60), cu75: Number(cu75), cu90: Number(cu90), al60: Number(al60), al75: Number(al75), al90: Number(al90), area: Number(area) }))

export const standardOcpd = [15,20,25,30,35,40,45,50,60,70,80,90,100,110,125,150,175,200,225,250,300,350,400,450,500,600,700,800,1000,1200,1600,2000,2500,3000,4000,5000,6000]
export type MotorType = 'squirrel-cage' | 'wound-rotor' | 'synchronous' | 'dc'
export type MotorPhase = 1 | 3
const motorFlc = Object.fromEntries(
  [...new Set([...Object.keys(threePhaseInductionFlc), ...Object.keys(threePhaseSynchronousFlc)])].map(key => {
    const horsepower = Number(key)
    return [horsepower, { induction: threePhaseInductionFlc[horsepower], synchronous: threePhaseSynchronousFlc[horsepower] }]
  }),
) as Record<number, { induction?: Record<number, number>; synchronous?: Record<number, number> }>
const singleMotorFlc = singlePhaseMotorFlc

const numeric = (values: number[]) => values.sort((left, right) => left - right)
const flcColumn = (type: MotorType) => type === 'synchronous' ? 'synchronous' : 'induction'
export function motorHorsepowers(type: MotorType) { return numeric(Object.keys(motorFlc).map(Number).filter(horsepower => Boolean(motorFlc[horsepower][flcColumn(type)]))) }
export function motorVoltages(horsepower: number, type: MotorType) { return numeric(Object.keys(motorFlc[horsepower]?.[flcColumn(type)] ?? {}).map(Number)) }
export function motorFlcFromHp(horsepower: number, voltage: number, type: MotorType = 'squirrel-cage') { return motorFlc[horsepower]?.[flcColumn(type)]?.[voltage] }
export function singleMotorHorsepowers() { return numeric(Object.keys(singleMotorFlc).map(Number)) }
export function singleMotorVoltages(horsepower: number) { return numeric(Object.keys(singleMotorFlc[horsepower] ?? {}).map(Number)) }
export function singleMotorFlcFromHp(horsepower: number, voltage: number) { return singleMotorFlc[horsepower]?.[voltage] }
export type MotorVoltageOption = { systemVoltage: number; tableVoltage: number; label: string }
export function motorVoltageOptions(horsepower: number, type: MotorType, phase: MotorPhase): MotorVoltageOption[] {
  const tableVoltages = phase === 1 ? singleMotorVoltages(horsepower) : motorVoltages(horsepower, type)
  return tableVoltages.flatMap(tableVoltage => {
    const option = { systemVoltage: tableVoltage, tableVoltage, label: `${tableVoltage} V` }
    if (tableVoltage === 115) return [option, { systemVoltage: 120, tableVoltage, label: '120 V' }]
    if (tableVoltage === 230) return [option, { systemVoltage: 240, tableVoltage, label: '240 V' }]
    return [option]
  })
}
export function tableMotorVoltage(systemVoltage: number) { return systemVoltage === 120 ? 115 : systemVoltage === 240 ? 230 : systemVoltage }
export function formatHorsepower(horsepower: number) {
  if (horsepower === 1 / 6) return '1/6'
  if (horsepower === .25) return '1/4'
  if (horsepower === 1 / 3) return '1/3'
  if (horsepower === .5) return '1/2'
  if (horsepower === .75) return '3/4'
  if (horsepower === 1.5) return '1-1/2'
  if (horsepower === 2.5) return '2-1/2'
  if (horsepower === 7.5) return '7-1/2'
  return String(horsepower)
}
const correction: Record<number, Record<number, number>> = {
  60: { 30: 1, 40: .82, 50: .58, 60: .41 }, 75: { 30: 1, 40: .88, 50: .75, 60: .58 }, 90: { 30: 1, 40: .91, 50: .82, 60: .71 },
}
const adjustment: Record<number, number> = { 3: 1, 6: .8, 9: .7, 20: .5, 30: .45, 40: .4 }
const groundingConductorAreas: Record<string, number> = { '14':4110,'12':6530,'10':10380,'8':16510,'6':26240,'4':41740,'3':52620,'2':66360,'1':83690,'1/0':105600,'2/0':133100,'3/0':167800,'4/0':211600,'250':250000,'300':300000,'350':350000,'400':400000,'500':500000,'600':600000,'700':700000,'750':750000,'800':800000,'900':900000,'1000':1000000,'1100':1100000,'1200':1200000,'1250':1250000,'1500':1500000,'1750':1750000,'2000':2000000 }
export const groundingConductorSizes = ['14','12','10','8','6','4','3','2','1','1/0','2/0','3/0','4/0','250','300','350','400','500','600','700','750','800','900','1000','1100','1200','1250','1500','1750','2000']
const egc: [number, string, string][] = [[15,'14','12'],[20,'12','10'],[60,'10','8'],[100,'8','6'],[200,'6','4'],[300,'4','2'],[400,'3','1'],[500,'2','1/0'],[600,'1','2/0'],[800,'1/0','3/0'],[1000,'2/0','4/0'],[1200,'3/0','250'],[1600,'4/0','350'],[2000,'250','400'],[2500,'350','600'],[3000,'400','600'],[4000,'500','750'],[5000,'700','1200'],[6000,'800','1200']]
const racewayAreas: Record<string, Record<string, number>> = {
  EMT: { '.5': .304, '.75': .533, '1': .864, '1.25': 1.496, '1.5': 2.036, '2': 3.356, '2.5': 5.858, '3': 8.846, '3.5': 11.545, '4': 14.753 },
  'PVC Sch 40': { '.5': .285, '.75': .508, '1': .832, '1.25': 1.453, '1.5': 1.986, '2': 3.291, '2.5': 5.761, '3': 8.293, '3.5': 10.923, '4': 14.094 },
  'PVC Sch 80': { '.5': .217, '.75': .409, '1': .688, '1.25': 1.237, '1.5': 1.711, '2': 2.874, '2.5': 5.095, '3': 7.268, '3.5': 9.737, '4': 12.486 },
  RMC: { '.5': .233, '.75': .424, '1': .693, '1.25': 1.225, '1.5': 1.664, '2': 2.731, '2.5': 4.951, '3': 7.499, '3.5': 9.829, '4': 12.715 },
  IMC: { '.5': .262, '.75': .454, '1': .742, '1.25': 1.309, '1.5': 1.771, '2': 2.930, '2.5': 5.135, '3': 7.781, '3.5': 10.185, '4': 13.120 },
}

const nextStandard = (amps: number) => standardOcpd.find(value => value >= amps) ?? null
const value = (material: Material, temp: number, conductor: Conductor) => conductor[`${material === 'copper' ? 'cu' : 'al'}${temp}` as keyof Conductor] as number
const display = (number: number) => Number(number.toFixed(1)).toString()
const apparentLoadVa = (amps: number, voltage: number, phase: 1 | 3) => amps * voltage * (phase === 3 ? Math.sqrt(3) : 1)
const apparentPower = (va: number) => va >= 10_000 ? `${display(va / 1000)} kVA` : `${Math.round(va).toLocaleString()} VA`
const circuitPoles = (phase: 1 | 3, voltage: number) => phase === 3 ? 3 : voltage <= 120 ? 1 : 2
const apparentPowerPerPhase = (label: string, va: number, poles: number): [string, string][] => poles === 1 ? [] : [[`${label} per phase`, apparentPower(va / (poles === 3 ? 3 : 1))]]
const conductorFor = (amps: number, material: Material, terminal: number, insulation: number, ambient: number, ccc: number) => {
  const adjusted = adjustment[Math.min(...Object.keys(adjustment).map(Number).filter(limit => ccc <= limit).concat(40))] ?? .4
  const ambientBand = ambient <= 30 ? 30 : ambient <= 40 ? 40 : ambient <= 50 ? 50 : 60
  const factor = correction[insulation][ambientBand] * adjusted
  return conductors.find(item => Math.min(value(material, terminal, item), value(material, insulation, item) * factor) >= amps)
}

export function generalSizing(input: { amps: number; continuous: boolean; material: Material; terminal: number; insulation: number; ambient: number; ccc: number; voltage?: number; phase?: 1 | 3; poles?: number; apparentVa?: number }): Result {
  const required = input.amps * (input.continuous ? 1.25 : 1)
  let sets = 1
  let wire = conductorFor(required, input.material, input.terminal, input.insulation, input.ambient, input.ccc)
  while (!wire && sets < 32) {
    sets += 1
    wire = conductorFor(required / sets, input.material, input.terminal, input.insulation, input.ambient, input.ccc)
  }
  if (!wire) return { title: 'Conductor sizing', primary: 'No result', rows: [], notes: ['No compliant arrangement was found within 32 parallel sets of 500 kcmil or smaller.'], citations: ['NEC Table 310.16'] }
  const ampacity = value(input.material, input.terminal, wire) * sets
  let breaker = nextStandard(required)
  if (wire.size === '14' && input.material === 'copper') breaker = 15
  if (wire.size === '12' && input.material === 'copper') breaker = 20
  if (wire.size === '10' && input.material === 'copper') breaker = 30
  const voltage = input.voltage ?? 208
  const phase = input.phase ?? 3
  const loadVa = input.apparentVa ?? apparentLoadVa(input.amps, voltage, phase)
  const poles = input.poles ?? circuitPoles(phase, voltage)
  return { title: 'Conductor & OCPD', primary: `${sets > 1 ? `${sets} sets of ` : ''}${wire.size} ${input.material === 'copper' ? 'Cu' : 'Al'} · ${breaker ?? 'Manual review'} A OCPD`, rows: [['Design load', `${display(input.amps)} A`],['Load apparent power', apparentPower(loadVa)],...apparentPowerPerPhase('Load apparent power', loadVa, poles),['System', `${phase}-phase · ${voltage} V · ${poles}-pole OCPD`],['Required ampacity', `${display(required)} A`],['Parallel sets per phase', `${sets}`],['Selected conductor ampacity', `${display(ampacity)} A`],['Standard OCPD', breaker ? `${breaker} A` : 'Above table range']], notes: input.continuous ? ['125% continuous-load factor applied.'] : ['Noncontinuous load; no 125% load factor applied.'], citations: ['NEC 210.19(A), 215.2(A), 240.4(D), 240.6(A), Table 310.16'] }
}

export function motorSizing(input: { fla: number; type: MotorType; fuse: boolean; material: Material; terminal: number; insulation: number; ambient: number; ccc: number; phase?: MotorPhase; voltage?: number; poles?: number; lookup?: { horsepower: number; tableVoltage: number } }): Result {
  const required = input.fla * 1.25
  const wire = conductorFor(required, input.material, input.terminal, input.insulation, input.ambient, input.ccc)
  const phase = input.phase ?? 3
  const voltage = input.voltage ?? 208
  const multipliers: Record<MotorType, number> = { 'squirrel-cage': input.fuse ? 1.75 : 2.5, 'wound-rotor': 1.5, 'synchronous': input.fuse ? 1.75 : 2.5, 'dc': input.fuse ? 1.5 : 2.5 };
  const multiplier = phase === 1 ? (input.fuse ? 1.75 : 2.5) : multipliers[input.type]
  const poles = input.poles ?? circuitPoles(phase, voltage)
  const ocpd = nextStandard(input.fla * multiplier)
  const motorVa = apparentLoadVa(input.fla, voltage, phase)
  const rows: [string, string][] = [['System', `${phase}-phase · ${voltage} V · ${poles}-pole OCPD`],['Motor FLA/FLC', `${display(input.fla)} A`],['Motor load', apparentPower(motorVa)],...apparentPowerPerPhase('Motor load', motorVa, poles),['Required conductor ampacity', `${display(required)} A`],['OCPD multiplier', `${multiplier * 100}%`],['Maximum calculated OCPD', `${display(input.fla * multiplier)} A`]]
  if (input.lookup) rows.unshift(['FLC lookup', `${formatHorsepower(input.lookup.horsepower)} hp · ${voltage} V system · ${input.lookup.tableVoltage} V column · Table ${phase === 1 ? '430.248' : '430.250'}`])
  return { title: 'Motor branch circuit', primary: `${wire?.size ?? 'No size'} ${input.material === 'copper' ? 'Cu' : 'Al'} · ${ocpd ?? 'Manual review'} A ${poles}-pole ${input.fuse ? 'time-delay fuse' : 'inverse-time breaker'}`, rows, notes: ['Motor OCPD is permitted to exceed conductor ampacity under the motor rules. Verify motor starting characteristics and manufacturer instructions.'], citations: ['NEC 430.22', phase === 1 ? 'Table 430.248' : 'Table 430.250', 'Table 430.52', '430.52(C)(1)', 'Table 310.16'] }
}

export function hvacSizing(mca: number, mocp: number, material: Material, terminal: number, insulation: number, ambient: number, ccc: number, voltage = 208, phase: 1 | 3 = 3, poles = circuitPoles(phase, voltage)): Result {
  const wire = conductorFor(mca, material, terminal, insulation, ambient, ccc)
  const loadVa = apparentLoadVa(mca, voltage, phase)
  return { title: 'HVAC nameplate circuit', primary: `${wire?.size ?? 'No size'} ${material === 'copper' ? 'Cu' : 'Al'} · up to ${mocp} A OCPD`, rows: [['Listed MCA', `${display(mca)} A`],['MCA apparent load', apparentPower(loadVa)],...apparentPowerPerPhase('MCA apparent load', loadVa, poles),['System', `${phase}-phase · ${voltage} V · ${poles}-pole OCPD`],['Listed MOCP', `${display(mocp)} A`],['Selected conductor', wire ? `${wire.size} ${material === 'copper' ? 'Cu' : 'Al'}` : 'No size']], notes: ['Apparent load is calculated from MCA, not compressor running current. For listed HVAC equipment, use nameplate MCA and MOCP.'], citations: ['NEC 440.6, 440.32, 440.22, Table 310.16'] }
}

function legacyEgcSizing(ocpd: number, material: Material, upsizedRatio = 1): Result {
  const row = egc.find(([limit]) => ocpd <= limit) ?? egc[egc.length - 1]
  const base = conductors.find(item => item.size === row[material === 'copper' ? 1 : 2])!
  const targetArea = base.area * upsizedRatio
  const sized = conductors.find(item => item.area >= targetArea) ?? conductors[conductors.length - 1]
  return { title: 'Equipment grounding conductor', primary: `${sized.size} ${material === 'copper' ? 'Cu' : 'Al'} EGC`, rows: [['Upstream OCPD', `${ocpd} A`],['Table 250.122 base EGC', `${base.size} ${material === 'copper' ? 'Cu' : 'Al'}`],['Upsize ratio', `${display(upsizedRatio)}×`]], notes: upsizedRatio > 1 ? ['Proportional EGC upsizing applied for enlarged ungrounded conductors.'] : ['No proportional upsizing entered.'], citations: ['NEC Table 250.122, 250.122(B)'] }
}

export function egcSizing(ocpd: number, material: Material, upsizedRatio = 1, circuitSize?: string): Result {
  const row = egc.find(([limit]) => ocpd <= limit)
  if (!row) return { title: 'Equipment grounding conductor', primary: 'Manual review', rows: [['Upstream OCPD', `${ocpd} A`]], notes: ['This OCPD exceeds Table 250.122.'], citations: ['NEC Table 250.122'] }
  const baseSize = row[material === 'copper' ? 1 : 2]
  const targetArea = groundingConductorAreas[baseSize] * upsizedRatio
  let sized = groundingConductorSizes.find(size => groundingConductorAreas[size] >= targetArea) ?? groundingConductorSizes.at(-1)!
  const capArea = circuitSize ? groundingConductorAreas[circuitSize] : undefined
  const capped = Boolean(capArea && groundingConductorAreas[sized] > capArea)
  if (capped) sized = groundingConductorSizes.filter(size => groundingConductorAreas[size] <= capArea!).at(-1) ?? sized
  return { title: 'Equipment grounding conductor', primary: `${sized} ${material === 'copper' ? 'Cu' : 'Al'} EGC`, rows: [['Upstream OCPD', `${ocpd} A`],['Table 250.122 base EGC', `${baseSize} ${material === 'copper' ? 'Cu' : 'Al'}`],['Vdrop upsize multiplier', `${display(upsizedRatio)}x`],['Circuit-conductor limit', circuitSize ?? 'Not entered']], notes: [upsizedRatio > 1 ? 'Proportional EGC upsizing applied for intentional ungrounded-conductor enlargement.' : 'No intentional voltage-drop upsizing entered.', ...(capped ? ['EGC limited to the entered supplying circuit-conductor area.'] : []), 'Parallel raceways or cables require a separate 250.122(F) installation review.'], citations: ['NEC Table 250.122, 250.122(A), 250.122(B), 250.122(F)'] }
}

export type Electrode = 'water-pipe' | 'structural-steel' | 'rod-pipe-plate' | 'concrete-encased' | 'ground-ring'
const electrodeLabels: Record<Electrode, string> = { 'water-pipe':'Metal water pipe', 'structural-steel':'Structural steel', 'rod-pipe-plate':'Rod, pipe, or plate', 'concrete-encased':'Concrete-encased electrode', 'ground-ring':'Ground ring' }
const gecBase = (area: number, sourceMaterial: Material, gecMaterial: Material) => {
  const limits: [number, string, string][] = sourceMaterial === 'copper' ? [[66360,'8','6'],[105600,'6','4'],[167800,'4','2'],[350000,'2','1/0'],[600000,'1/0','3/0'],[1100000,'2/0','4/0']] : [[105600,'8','6'],[167800,'6','4'],[250000,'4','2'],[500000,'2','1/0'],[900000,'1/0','3/0'],[1750000,'2/0','4/0']]
  return (limits.find(([limit]) => area <= limit) ?? [Infinity,'3/0','250'])[gecMaterial === 'copper' ? 1 : 2] as string
}

export function gecSizing(input: { sourceMaterial: Material; sourceSize: string; parallelSets: number; material: Material; electrode: Electrode; continues: boolean; ringSize?: string }): Result {
  const equivalentArea = groundingConductorAreas[input.sourceSize] * input.parallelSets
  const baseSize = gecBase(equivalentArea, input.sourceMaterial, input.material)
  let sized = baseSize
  let cap = 'None'
  if (!input.continues && input.electrode === 'rod-pipe-plate') { sized = groundingConductorAreas[sized] > groundingConductorAreas[input.material === 'copper' ? '6' : '4'] ? (input.material === 'copper' ? '6' : '4') : sized; cap = input.material === 'copper' ? '#6 Cu' : '#4 Al' }
  if (!input.continues && input.electrode === 'concrete-encased' && input.material === 'copper') { sized = groundingConductorAreas[sized] > groundingConductorAreas['4'] ? '4' : sized; cap = '#4 Cu' }
  if (!input.continues && input.electrode === 'ground-ring' && input.ringSize) { sized = groundingConductorAreas[sized] > groundingConductorAreas[input.ringSize] ? input.ringSize : sized; cap = `${input.ringSize} ground-ring conductor` }
  return { title: 'Grounding electrode conductor', primary: `${sized} ${input.material === 'copper' ? 'Cu' : 'Al'} GEC`, rows: [['Electrode', electrodeLabels[input.electrode]],['Equivalent ungrounded area', `${(equivalentArea / 1000).toLocaleString()} kcmil`],['Table 250.66 base GEC', `${baseSize} ${input.material === 'copper' ? 'Cu' : 'Al'}`],['Dedicated-electrode cap', cap]], notes: [input.continues ? 'Connection continues to another electrode; no dedicated-electrode cap applied.' : 'Dedicated-electrode limit applied where permitted.', ...(input.material === 'aluminum' ? ['Verify aluminum GEC installation restrictions in 250.64.'] : [])], citations: ['NEC Table 250.66, 250.66(A), 250.66(B), 250.66(C)'] }
}

const busRatings = [100,125,150,200,225,250,400,600,800,1000,1200,1600,2000,2500,3000,4000,5000,6000]
const busBars = [1,1.5,2,3,4,5,6].flatMap(width => [.125,.25,.375,.5].map(thickness => ({ width, thickness, area: width * thickness * 645.16 }))).sort((a,b) => a.area - b.area)
export function busbarSizing(input: { amps: number; continuous: boolean; material: Material; parallelBars: number }): Result {
  const required = input.amps * (input.continuous ? 1.25 : 1)
  const rating = busRatings.find(value => value >= required)
  const density = input.material === 'copper' ? 1 : .6
  const requiredArea = required / density
  const bar = busBars.find(candidate => candidate.area * input.parallelBars >= requiredArea)
  return { title: 'Busbar quick check', primary: rating ? `${rating} A listed bus minimum` : 'Manual review', rows: [['Design ampacity', `${display(required)} A`],['Listed bus rating', rating ? `${rating} A` : 'Above 6,000 A'],['Conservative density preset', `${density} A/mm2 ${input.material === 'copper' ? 'Cu' : 'Al'}`],['Required total bar area', `${display(requiredArea)} mm2`],['Suggested bar arrangement', bar ? `${input.parallelBars} x ${bar.width} in. x ${bar.thickness} in. per phase` : 'No catalog arrangement found']], notes: ['Physical bar sizing is an engineering estimate, not an NEC ampacity table. Verify listing, enclosure temperature rise, spacing, terminations, and fault duty.'], citations: ['NEC 366.23, 408.3 — listed equipment context'] }
}

export function conduitSizing(rows: { size: string; quantity: number }[], raceway: string): Result {
  const area = rows.reduce((total, row) => total + (conductors.find(item => item.size === row.size)?.area ?? 0) * row.quantity, 0)
  const count = rows.reduce((total, row) => total + row.quantity, 0)
  const fill = count === 1 ? .53 : count === 2 ? .31 : .4
  const size = Object.entries(racewayAreas[raceway]).find(([, internalArea]) => internalArea * fill >= area)
  return { title: 'Conduit fill', primary: size ? `${size[0]} in. ${raceway}` : 'No raceway size found', rows: [['Conductors', `${count}`],['Total conductor area', `${area.toFixed(4)} in²`],['Permitted fill', `${fill * 100}%`],['Required internal area', `${(area / fill).toFixed(4)} in²`]], notes: ['Include every conductor in the raceway, including equipment grounding conductors.'], citations: ['NEC Chapter 9, Tables 4 and 5'] }
}

export function voltageDrop(input: { amps: number; volts: number; phase: 1 | 3; length: number; material: Material; allowable: number }): Result {
  const k = input.material === 'copper' ? 12.9 : 21.2
  const multiplier = input.phase === 3 ? 1.732 : 2
  const circularMilsPerSquareInch = 1_273_239.54
  const candidates = conductors.map(item => ({ item, drop: multiplier * k * input.amps * input.length / (item.area * circularMilsPerSquareInch) }))
  const selected = candidates.find(candidate => candidate.drop / input.volts * 100 <= input.allowable)
  return { title: 'Voltage drop', primary: selected ? `${selected.item.size} ${input.material === 'copper' ? 'Cu' : 'Al'} meets ${input.allowable}% target` : 'Increase parallel sets', rows: selected ? [['One-way length', `${input.length} ft`],['Calculated voltage drop', `${selected.drop.toFixed(2)} V`],['Percentage drop', `${(selected.drop / input.volts * 100).toFixed(2)}%`],['Selected conductor', selected.item.size]] : [], notes: ['This is a resistance-based design estimate. Confirm impedance, power factor, terminals, and local requirements for final design.'], citations: ['NEC Informational Notes to 210.19(A) and 215.2(A)'] }
}

export function transformerSizing(kva: number, primary: number, secondary: number, phase: 1 | 3): Result {
  const divisor = phase === 3 ? 1.732 : 1
  const priAmps = kva * 1000 / (primary * divisor)
  const secAmps = kva * 1000 / (secondary * divisor)
  return { title: 'Transformer quick check', primary: `${display(priAmps)} A primary · ${display(secAmps)} A secondary`, rows: [['Transformer size', `${kva} kVA`],['Primary FLA', `${display(priAmps)} A`],['Secondary FLA', `${display(secAmps)} A`],['125% primary conductor target', `${display(priAmps * 1.25)} A`],['125% secondary conductor target', `${display(secAmps * 1.25)} A`]], notes: ['Use the transformer protection table and installation-specific rules to finalize OCPD.'], citations: ['NEC 450.3(B), Table 310.16'] }
}

export function loadConversion(valueIn: number, unit: 'W' | 'VA' | 'kVA', volts: number, phase: 1 | 3): Result {
  const va = unit === 'kVA' ? valueIn * 1000 : valueIn
  const amps = va / (volts * (phase === 3 ? 1.732 : 1))
  return { title: 'Load conversion', primary: `${display(amps)} A`, rows: [['Input load', `${valueIn} ${unit}`],['Voltage', `${volts} V`],['Phase', `${phase}-phase`],['Calculated current', `${display(amps)} A`]], notes: ['Watts are treated as VA for this quick check; use actual power factor when known.'], citations: ['NEC Article 220 — load calculation context'] }
}

export const lightingOccupancies = [
  { id: 'lab-qc', label: 'Lab / QC testing', lux: 500, footcandles: 45 }, { id: 'office-detailing', label: 'Office (Detailing)', lux: 500, footcandles: 45 },
  { id: 'office-general', label: 'Office (General)', lux: 300, footcandles: 30 }, { id: 'kitchen-food-prep', label: 'Kitchens / Food Prep', lux: 300, footcandles: 30 }, { id: 'workshop-fabrication', label: 'Workshop / Fabrication', lux: 300, footcandles: 30 }, { id: 'control-rooms', label: 'Control Rooms', lux: 300, footcandles: 30 },
  { id: 'elec-mech', label: 'Elec/Mech Rooms', lux: 200, footcandles: 20 }, { id: 'public-common', label: 'Public / Common Space', lux: 200, footcandles: 20 },
  { id: 'locker-dressing', label: 'Locker / Dressing Rooms', lux: 150, footcandles: 15 }, { id: 'storage-labeling', label: 'Storage Rooms (Labeling)', lux: 150, footcandles: 15 },
  { id: 'circulation-corridors', label: 'Gen Circulation / Corridors', lux: 100, footcandles: 10 }, { id: 'storage-general', label: 'Storage Rooms (General)', lux: 100, footcandles: 10 }, { id: 'toilets-washrooms', label: 'Toilets / Washrooms', lux: 100, footcandles: 10 }, { id: 'stairs-exits', label: 'Stairs / Exits', lux: 100, footcandles: 10 },
  { id: 'building-entrance-exits', label: 'Building Entrance / Exits', lux: 50, footcandles: 5 }, { id: 'loading-bays', label: 'Loading / Unloading Bays', lux: 50, footcandles: 5 }, { id: 'outdoor-assembly', label: 'Outdoor Assembly', lux: 50, footcandles: 5 },
  { id: 'open-storage-yards', label: 'Open Storage Yards', lux: 20, footcandles: 5 }, { id: 'parking-lots', label: 'Parking Lots', lux: 20, footcandles: 5 },
  { id: 'outdoor-walkways', label: 'Outdoor Walkways', lux: 10, footcandles: 5 }, { id: 'building-perimeter', label: 'Building Perimeter / Security', lux: 10, footcandles: 5 },
] as const
export type LightingOccupancy = typeof lightingOccupancies[number]['id']
export type LightingUnit = 'Imperial' | 'Metric'

export function powerFactorCorrection(input: { kw: number; existingPf: number; targetPf: number }): Result {
  const existingAngle = Math.acos(input.existingPf)
  const targetAngle = Math.acos(input.targetPf)
  const existingKvar = input.kw * Math.tan(existingAngle)
  const targetKvar = input.kw * Math.tan(targetAngle)
  const correction = Math.max(0, existingKvar - targetKvar)
  const existingKva = input.kw / input.existingPf
  const targetKva = input.kw / input.targetPf
  const needsCorrection = input.targetPf > input.existingPf
  return { title: 'Power factor correction', primary: needsCorrection ? `${display(correction)} kVAr capacitor required` : '0 kVAr required', rows: [['Real load', `${display(input.kw)} kW`],['Present power factor', input.existingPf.toFixed(2)],['Target power factor', input.targetPf.toFixed(2)],['Present apparent power', `${display(existingKva)} kVA`],['Corrected apparent power', `${display(targetKva)} kVA`],['Present reactive power', `${display(existingKvar)} kVAr`],['Target reactive power', `${display(targetKvar)} kVAr`],['Required capacitive correction', `${display(correction)} kVAr`]], notes: [needsCorrection ? 'Select and coordinate the actual capacitor equipment for harmonics, switching, voltage, and utility requirements.' : 'The target PF is already met or is lower than the present PF; no capacitive correction is indicated.'], citations: ['Power triangle: kVAr = kW × tan(arccos PF)'] }
}

export function lightingSizing(input: { occupancy: LightingOccupancy; area: number; unit: 'ft²' | 'm²'; lumens: number; cu: number; llf: number }): Result {
  const target = lightingOccupancies.find(item => item.id === input.occupancy)!
  const areaFt2 = input.unit === 'm²' ? input.area * 10.7639 : input.area
  const requiredLumens = target.footcandles * areaFt2
  const effectiveLumens = input.lumens * input.cu * input.llf
  const count = Math.ceil(requiredLumens / effectiveLumens)
  return { title: 'Lighting lumen-method estimate', primary: `${count} luminaires required`, rows: [['Occupancy target', `${target.label} · ${target.footcandles} fc`],['Room area', `${display(input.area)} ${input.unit}`],['Area used', `${display(areaFt2)} ft²`],['Luminaire output', `${display(input.lumens)} lm each`],['Coefficient of utilization', input.cu.toFixed(2)],['Light loss factor', input.llf.toFixed(2)],['Effective lumens per luminaire', `${display(effectiveLumens)} lm`],['Required delivered lumens', `${display(requiredLumens)} lm`],['Calculated luminaires', `${(requiredLumens / effectiveLumens).toFixed(2)} · rounded up`]], notes: ['This is a lumen-method estimate. Confirm photometrics, spacing, mounting height, glare, emergency lighting, and the adopted requirements for final design.'], citations: ['IES-style maintained illuminance preset · lumen method'] }
}

export function lightingSizingBySystem(input: { occupancy: LightingOccupancy; area: number; unit: LightingUnit; lumens: number; cu: number; llf: number }): Result {
  const target = lightingOccupancies.find(item => item.id === input.occupancy)!
  const metric = input.unit === 'Metric'
  const illuminance = metric ? target.lux : target.footcandles
  const illuminanceUnit = metric ? 'lux' : 'fc'
  const areaUnit = metric ? 'm²' : 'ft²'
  const requiredLumens = illuminance * input.area
  const effectiveLumens = input.lumens * input.cu * input.llf
  const count = Math.ceil(requiredLumens / effectiveLumens)
  const achievedIlluminance = count * effectiveLumens / input.area
  return { title: 'Lighting lumen-method estimate', primary: `${count} luminaires required`, rows: [['Unit', input.unit],['Occupancy', target.label],['Target illuminance', `${display(illuminance)} ${illuminanceUnit}`],['Room area', `${display(input.area)} ${areaUnit}`],['Luminaire output', `${display(input.lumens)} lm each`],['Coefficient of utilization', input.cu.toFixed(2)],['Light loss factor', input.llf.toFixed(2)],['Effective lumens per luminaire', `${display(effectiveLumens)} lm`],['Required delivered lumens', `${display(requiredLumens)} lm`],['Calculated luminaires', `${(requiredLumens / effectiveLumens).toFixed(2)} · rounded up`],['Achieved illuminance', `${display(achievedIlluminance)} ${illuminanceUnit}`]], notes: ['This is a lumen-method estimate. Confirm photometrics, spacing, mounting height, glare, emergency lighting, and the adopted requirements for final design.'], citations: ['IES-style maintained illuminance preset · lumen method'] }
}
