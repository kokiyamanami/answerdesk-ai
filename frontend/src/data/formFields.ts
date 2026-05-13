export const FORM_FIELD_DEFS = [
  { key: 'name',    label: 'お名前' },
  { key: 'email',   label: 'メールアドレス' },
  { key: 'phone',   label: '電話番号' },
  { key: 'address', label: '住所' },
  { key: 'subject', label: '件名' },
  { key: 'body',    label: 'お問い合わせ内容' },
] as const

export type FormFieldKey = typeof FORM_FIELD_DEFS[number]['key']

export interface FormFieldConfig {
  key: FormFieldKey
  label: string
  enabled: boolean
  required: boolean
}

export function defaultFormFields(): FormFieldConfig[] {
  return FORM_FIELD_DEFS.map(f => ({ ...f, enabled: false, required: false }))
}

export function mergeFormFields(saved: FormFieldConfig[] | null | undefined): FormFieldConfig[] {
  const defaults = defaultFormFields()
  if (!saved || saved.length === 0) return defaults
  return defaults.map(def => {
    const match = saved.find(s => s.key === def.key)
    return match ? { ...def, enabled: match.enabled, required: match.required } : def
  })
}
