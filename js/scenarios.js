// Synthetic scenario presets. Each pairs a seeded CSV with the contract that was registered for it.
export const SCENARIOS = [
  {
    id: 'pilot',
    file: 'scenario-a-clean-pilot.csv',
    title: 'A · Clean pilot',
    summary: '300 synthetic accounts, 21-day enrollment, all windows mature. Includes a handful of malformed rows, two duplicates and shuffled arrival order to show quarantine and de-duplication.',
    contract: { assignment_seed: 'tal-2026-10', enrollment_start: '2026-09-01T00:00:00Z', enrollment_end: '2026-09-21T23:59:59Z', analysis_as_of: '2026-10-01T00:00:00Z', minimum_sample_per_variant: 100, minimum_effect_pp: 5 },
    generator: {
      rngSeed: 20261006, n: 300, prefix: 'a',
      p: { control: { plan: 0.62, engaged: 0.30, early: 0.15, optOut: 0.03 }, treatment: { plan: 0.86, engaged: 0.5, early: 0.04, optOut: 0.035 } },
      duplicateShare: 0, contentDuplicates: 2, outOfOrder: 25,
      badRows: [
        'a-bad-1,,,evaluation_started,2026-09-04T10:00:00Z,control,,,,tal-2026-10',
        'a-bad-2,a-acct-900,a-acct-900-l1,learner_invited,04/09/2026 10:00,treatment,,,,tal-2026-10',
        'a-bad-3,a-acct-901,,course_purchased,2026-09-05T09:00:00Z,control,,,,tal-2026-10',
        'a-bad-4,a-acct-902,,lab_started,2026-09-05T09:00:00Z,treatment,,,lab-synthetic-1,tal-2026-10',
        'a-bad-5,a-acct-903,,evaluation_started,2026-09-06T08:00:00Z,variant_b,,,,tal-2026-10',
      ],
    },
  },
  {
    id: 'broken',
    file: 'scenario-b-broken-tracking.csv',
    title: 'B · Broken tracking',
    summary: 'Duplicate resends, a logging bug that tags many control accounts as treatment, lost control signups and only a 3-day observation window. Treatment looks better, but the lab must refuse to call a winner.',
    contract: { assignment_seed: 'tal-2026-10', enrollment_start: '2026-09-24T00:00:00Z', enrollment_end: '2026-09-30T23:59:59Z', analysis_as_of: '2026-10-03T00:00:00Z', minimum_sample_per_variant: 100, minimum_effect_pp: 5 },
    generator: {
      rngSeed: 4242, n: 150, prefix: 'b',
      p: { control: { plan: 0.6, engaged: 0.25, early: 0.3, optOut: 0.03 }, treatment: { plan: 0.9, engaged: 0.6, early: 0.05, optOut: 0.09 } },
      biasedLogging: 0.35, dropControlShare: 0.55, duplicateShare: 0.08, contentDuplicates: 6, outOfOrder: 40,
      badRows: [
        'b-bad-1,,b-acct-x-l1,meaningful_lab_completed,2026-09-28T10:00:00Z,treatment,,,lab-synthetic-2,tal-2026-10',
        'b-bad-2,,,evaluation_started,2026-09-28T11:00:00Z,control,,,,tal-2026-10',
        'b-bad-3,,,plan_created,2026-09-28T12:00:00Z,treatment,,,,tal-2026-10',
        'b-bad-4,b-acct-950,,evaluation_started,not-a-date,control,,,,tal-2026-10',
      ],
    },
  },
];
