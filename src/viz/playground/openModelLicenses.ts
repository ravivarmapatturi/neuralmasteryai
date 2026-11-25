import rawModels from './openModelLicenses.json';

export interface OpenModelLicenseRecord {
  id: string;
  model: string;
  provider: string;
  params: string;
  category: string;
  licenseName: string;
  licenseFamily: string;
  osiApproved: boolean;
  commercialAllowed: boolean;
  saasAllowed: boolean;
  redistributeFinetunes: boolean;
  mauCapMillions: number | null;
  hasAcceptableUsePolicy: boolean;
  attributionNotice: string;
  notes: string;
  sourceUrl: string;
}

export interface LicenseRequirements {
  commercialUse: boolean;
  saasHosting: boolean;
  redistributeFinetunes: boolean;
  noMauCap: boolean;
  osiOnly: boolean;
}

export type LicenseVerdictStatus = 'Compatible' | 'Compatible with conditions' | 'Blocked';

export interface EvaluatedModelLicense {
  record: OpenModelLicenseRecord;
  status: LicenseVerdictStatus;
  blockers: string[];
  conditions: string[];
}

export const OPEN_MODEL_LICENSES: OpenModelLicenseRecord[] = rawModels;

export function evaluateModelLicense(
  record: OpenModelLicenseRecord,
  req: LicenseRequirements,
): EvaluatedModelLicense {
  const blockers: string[] = [];
  const conditions: string[] = [];

  if (req.commercialUse && !record.commercialAllowed) {
    blockers.push(`${record.licenseName} forbids commercial use.`);
  }
  if (req.saasHosting && !record.saasAllowed) {
    blockers.push(`${record.licenseName} does not allow commercial SaaS hosting.`);
  }
  if (req.redistributeFinetunes && !record.redistributeFinetunes) {
    blockers.push(`${record.licenseName} restricts commercial redistribution of fine-tuned weights.`);
  }
  if (req.noMauCap && record.mauCapMillions !== null) {
    blockers.push(`Enforces a ${record.mauCapMillions}M monthly active user cap.`);
  }
  if (req.osiOnly && !record.osiApproved) {
    blockers.push(`${record.licenseName} is custom open-weights, not an OSI-approved license.`);
  }

  if (record.mauCapMillions !== null) {
    conditions.push(`${record.mauCapMillions}M MAU cap applies`);
  }
  if (record.hasAcceptableUsePolicy) {
    conditions.push('Acceptable/Prohibited Use Policy flow-down');
  }
  conditions.push(record.attributionNotice);

  let status: LicenseVerdictStatus = 'Compatible';
  if (blockers.length > 0) {
    status = 'Blocked';
  } else if (record.mauCapMillions !== null || record.hasAcceptableUsePolicy || !record.osiApproved) {
    status = 'Compatible with conditions';
  }

  return { record, status, blockers, conditions };
}
