export function parseStringArrayJson(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed;
    }
  } catch (err) {
    console.error('parseStringArrayJson error:', err);
  }

  return [];
}

export function stringifyStringArray(values: string[]): string {
  return JSON.stringify(values);
}
