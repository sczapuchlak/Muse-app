// Replace this value with the authenticated profile when identity is introduced.
export const mockProfile = { firstName: "Stephanie", zodiacSign: "Virgo", timeZone: "America/Los_Angeles" };

export function personalizedGreeting(greeting: string, firstName: string): string {
  const name = firstName.trim();
  return name ? `${greeting.replace(/[.!?]+$/, "")}, ${name}.` : greeting;
}
