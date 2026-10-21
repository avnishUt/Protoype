/**
 * The demo form — a faithful copy of the real seed
 * `dqms_be/scripts/kinley_forms/treated-water-analysis-record.ts`
 * (WA-FRM-1105-1.0.0.8), same block keys / field keys / types, so the
 * extraction logic here ports straight onto a real FormVersion.
 *
 * Two prototype-only additions, both of which would become optional seed
 * fields in the real integration:
 *  - `aliases`: what the plant floor actually says for a field ("chlorine",
 *    "M alk", "calcium") — fed to the model and the offline parser.
 *  - `spec`: the limits already printed in each label, as numbers, so the
 *    preview can flag an out-of-spec reading before it is accepted.
 */
export const FORM = {
  id: 'KINLEY_TREATED_WATER_ANALYSIS_RECORD',
  formCode: 'WA-FRM-1105-1.0.0.8',
  name: 'Treated Water Analysis Record',
  department: 'Kinley',
  line: 'Kinley Line',
  blocks: [
    {
      key: 'header',
      kind: 'flat',
      title: null,
      fields: [
        { key: 'date', label: 'Date', type: 'date', mandatory: true, aliases: ['date', 'today'] },
      ],
    },
    {
      key: 'four_hourly',
      kind: 'grid',
      title: '4-Hourly Readings',
      maxRows: 6,
      fields: [
        { key: 'time', label: 'Time', type: 'time', aliases: ['time', 'at', 'sample time'] },
        {
          key: 'cl2',
          label: 'Cl2 (0.0 ppm)',
          type: 'decimal',
          unit: 'ppm',
          spec: { max: 0 },
          aliases: ['cl2', 'cl 2', 'chlorine', 'residual chlorine', 'free chlorine'],
        },
        {
          key: 'turbidity',
          label: 'Turbidity (Max 0.3 NTU)',
          type: 'decimal',
          unit: 'NTU',
          spec: { max: 0.3 },
          aliases: ['turbidity', 'turbid', 'ntu'],
        },
        {
          key: 'm_alk',
          label: 'M-Alk (Max 85 ppm)',
          type: 'decimal',
          unit: 'ppm',
          spec: { max: 85 },
          aliases: ['m alk', 'm-alk', 'malk', 'em alk', 'm alkalinity', 'alkalinity'],
        },
        {
          key: 'ph',
          label: 'pH (Min 4.9)',
          type: 'decimal',
          spec: { min: 4.9 },
          aliases: ['ph', 'p h', 'ph value'],
        },
        {
          key: 'tds',
          label: 'TDS (Max 500 ppm)',
          type: 'decimal',
          unit: 'ppm',
          spec: { max: 500 },
          aliases: ['tds', 't d s', 'total dissolved solids'],
        },
      ],
    },
    {
      key: 'daily',
      kind: 'flat',
      title: 'Daily Readings',
      fields: [
        {
          key: 'total_hardness',
          label: 'Total Hardness (<100 ppm)',
          type: 'decimal',
          unit: 'ppm',
          spec: { max: 100, exclusive: true },
          aliases: ['total hardness', 'hardness total', 'th'],
        },
        {
          key: 'calcium_hardness',
          label: 'Calcium Hardness (<100 ppm)',
          type: 'decimal',
          unit: 'ppm',
          spec: { max: 100, exclusive: true },
          aliases: ['calcium hardness', 'calcium', 'ca hardness'],
        },
        {
          key: 'chlorides',
          label: 'Chlorides (250ppm)',
          type: 'decimal',
          unit: 'ppm',
          spec: { max: 250 },
          aliases: ['chlorides', 'chloride'],
        },
        {
          key: 'iron',
          label: 'Iron (0.1ppm)',
          type: 'decimal',
          unit: 'ppm',
          spec: { max: 0.1 },
          aliases: ['iron', 'fe'],
        },
      ],
    },
  ],
};

export function findBlock(blockKey) {
  return FORM.blocks.find((b) => b.key === blockKey);
}

export function findField(blockKey, fieldKey) {
  return findBlock(blockKey)?.fields.find((f) => f.key === fieldKey);
}

/** Every (block, field) pair, in form order. */
export function allFields() {
  return FORM.blocks.flatMap((block) => block.fields.map((field) => ({ block, field })));
}

/** An empty record in the shape the UI and the save endpoint use:
 * flat block → { fieldKey: RecordValue }, grid block → RecordValue rows. */
export function emptyState() {
  const blocks = {};
  for (const block of FORM.blocks) blocks[block.key] = block.kind === 'grid' ? [{}] : {};
  return { status: 'draft', blocks };
}
