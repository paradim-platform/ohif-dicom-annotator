/**
 * Convert a simple Western name like "Bob Smith" to DICOM PN: "SMITH^BOB".
 * Assumes format: "Given [Middle ...] Family" OR "Family, Given [Middle ...]".
 * Returns only the alphabetic group.
 */
export function toDICOMPN(name: string, locale?: string): string {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return '';
  }

  // If there's a comma, assume "Family, Given Middle..."
  let givenParts: string[] = [];
  let family = '';

  if (cleaned.includes(',')) {
    const [familyRaw, restRaw] = cleaned.split(',', 2).map(s => s.trim());
    family = familyRaw;
    givenParts = restRaw ? restRaw.split(' ').filter(Boolean) : [];
  } else {
    // Assume last token is family name; preceding tokens are given/middle
    const parts = cleaned.split(' ').filter(Boolean);
    if (parts.length === 1) {
      // Single token => treat as family only
      family = parts[0];
    } else {
      family = parts[parts.length - 1];
      givenParts = parts.slice(0, -1);
    }
  }

  const given = givenParts[0] ?? '';
  const middle = givenParts.slice(1).join(' ');

  // Uppercase (DICOM PN is case-sensitive but many systems store alphabetic in uppercase)
  const up = (s: string) => (locale ? s.toLocaleUpperCase(locale) : s.toUpperCase());

  const familyUP = up(family);
  const givenUP = up(given);
  const middleUP = middle ? up(middle) : '';

  // Construct "Family^Given^Middle" (omit empty trailing components)
  const components = [familyUP, givenUP, middleUP];
  while (components.length && !components[components.length - 1]) {
    components.pop();
  }
  return components.join('^');
}

export function retrieveUserName(): string {

  const oidcConfig = window.config?.oidc?.[0];
  if (!oidcConfig) return '';

  const authority = oidcConfig.authority || '';
  const clientId = oidcConfig.client_id || '';

  const azureADKey = `oidc.user:${authority}:${clientId}`;

  console.log("Constructed Key:", azureADKey);

  const rawData = sessionStorage.getItem(azureADKey);
  
  if (!rawData) {
    console.error("Could not find data for key. Double check the dots/colons.");
    return '';
  }

  try {

    const parsed = JSON.parse(rawData);
    
    const rawName = parsed.profile?.name || '';
    
    console.log("Found User:", rawName);

    const name = rawName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return name;
  } catch (error) {
    console.error("Error parsing session data:", error);
    return '';
  }
}
