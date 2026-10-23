'use client';
import type { TargetConditions } from '@microfire/shared';
import type { ApiFailure } from './client-api';

/** Presentation-only field labels and units for API field keys (the API's classifications are shown unchanged). */
export const fieldLabels: Record<string, [string, string]> = {
  gravity: ['Gravity', ''], material: ['Material', ''], geometry: ['Sample geometry', ''], flowDirection: ['Flow direction', ''],
  oxygenPct: ['Oxygen', 'vol%'], pressureKpa: ['Pressure', 'kPa'], flowCmS: ['Airflow', 'cm/s'], thicknessMm: ['Film thickness', 'mm']
};
export const fieldLabel = (field: string) => fieldLabels[field]?.[0] ?? field;
export const withUnit = (field: string, v: unknown) => `${String(v)}${fieldLabels[field]?.[1] ? ` ${fieldLabels[field]![1]}` : ''}`;
export type Pending<T> = { status: 'idle' } | { status: 'loading' } | { status: 'done'; data: T } | { status: 'failed'; failure: ApiFailure };
const num = (v: FormDataEntryValue | null) => (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined);
const text = (v: FormDataEntryValue | null) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
export function targetsFrom(form: FormData): TargetConditions {
  const t: TargetConditions = { gravity: text(form.get('gravity')), material: text(form.get('material')), geometry: text(form.get('geometry')),
    oxygenPct: num(form.get('oxygenPct')), pressureKpa: num(form.get('pressureKpa')), flowCmS: num(form.get('flowCmS')) };
  return Object.fromEntries(Object.entries(t).filter(([, v]) => v !== undefined)) as TargetConditions;
}
export function ConditionFields({ prefix, values = {} }: { prefix: string; values?: Partial<Record<string, string>> | undefined }) {
  const fields: [string, string, string, string?][] = [
    ['material', 'Material', 'text', 'e.g. PMMA'], ['gravity', 'Gravity', 'text', 'e.g. microgravity'], ['geometry', 'Geometry', 'text', 'e.g. thin film'],
    ['oxygenPct', 'Oxygen (vol%)', 'number'], ['flowCmS', 'Airflow (cm/s)', 'number'], ['pressureKpa', 'Pressure (kPa)', 'number']
  ];
  return <div className="fieldset-grid">{fields.map(([name, label, type, hint]) => <div className="field" key={name}>
    <label htmlFor={`${prefix}-${name}`}>{label}</label>
    <input id={`${prefix}-${name}`} name={name} type={type} placeholder={hint} step={type === 'number' ? 'any' : undefined} min={type === 'number' ? 0 : undefined}
      max={name === 'oxygenPct' ? 100 : undefined} defaultValue={values[name]} key={values[name] ?? ''} maxLength={type === 'text' ? 200 : undefined} />
  </div>)}</div>;
}

