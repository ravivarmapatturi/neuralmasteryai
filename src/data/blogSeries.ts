/** Multi-part blog series. A post joins one with `series: <slug>` and
 * `part: <n>` in its frontmatter. The planned titles are listed here so
 * each part can show where it sits; unwritten parts appear as plain text. */
export interface BlogSeries {
  slug: string;
  title: string;
  description: string;
  /** The tag every part carries; the series title links to it. */
  tag: string;
  plannedParts: string[];
}

export const BLOG_SERIES: BlogSeries[] = [
  {
    slug: 'us-healthcare',
    tag: 'us healthcare',
    title: 'How US Healthcare Works',
    description: 'The US healthcare system end to end: who pays, who provides, and how a visit turns into a claim and a payment.',
    plannedParts: [
      'The map: members, patients, providers and payers',
      'Public and private coverage: Medicare, Medicaid, employer and marketplace plans',
      'How a health plan works: premiums, cost sharing and plan types',
      'The code systems: ICD-10, CPT, HCPCS, DRGs and more',
      'Coverage policy: NCDs, LCDs and medical policy',
      'Eligibility and enrollment',
      'Network management: contracting, credentialing and provider data',
      'Benefit digitization',
      'Utilization management',
      'Prior authorization',
      'Care management',
      'From visit to claim',
      'Claim adjudication',
      'The claim SOP: the checks an examiner works through, step by step, to a final decision',
      'Payment integrity',
      'How providers get paid',
      'Pharmacy and PBMs',
      'The data and rules underneath, and where AI fits',
    ],
  },
];

export function getSeries(slug: string | null | undefined): BlogSeries | undefined {
  return BLOG_SERIES.find((s) => s.slug === slug);
}
