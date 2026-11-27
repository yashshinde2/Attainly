import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { REPORT_PRESETS_LIST, REPORT_REGISTRY } from '../lib/reporting-registry'

test('Phase 10D: Every registered report preset has complete metadata and a report-studio handler', () => {
  const registryKeys = Object.keys(REPORT_REGISTRY)
  assert.equal(REPORT_PRESETS_LIST.length, registryKeys.length, 'REPORT_PRESETS_LIST must match REPORT_REGISTRY')

  const studioSource = fs.readFileSync('lib/server/services/report-studio.ts', 'utf8')
  for (const key of registryKeys) {
    const preset = REPORT_REGISTRY[key as keyof typeof REPORT_REGISTRY]
    assert.ok(preset.label.length > 0, `${key} missing label`)
    assert.ok(preset.countingUnit.length > 0, `${key} missing countingUnit`)
    assert.ok(preset.dateFieldSemantics.length > 0, `${key} missing dateFieldSemantics`)
    assert.ok(preset.columns.length > 0, `${key} missing columns`)
    assert.ok(
      studioSource.includes(`case '${key}':`),
      `report-studio.ts is missing case '${key}': handler`,
    )
  }
})
