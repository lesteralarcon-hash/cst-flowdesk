/**
 * Business Day Calculation Utility
 * 
 * Logic for CST FlowDesk:
 * - Skips Saturdays and Sundays.
 * - Handles the 'Client Padding' buffer.
 */

/**
 * Adds business days (Monday-Friday) to a given date.
 */
export function addBusinessDays(date: Date | string, days: number): Date {
  const result = new Date(date);
  let daysAdded = 0;
  
  while (daysAdded < days) {
    result.setDate(result.getDate() + 1);
    // 0 = Sunday, 6 = Saturday
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }
  
  return result;
}

/**
 * Formats a date for the SQLite-compatible ISO string.
 */
export function formatToISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Calculates the 'Client Padded' end date based on internal end date and padding.
 */
export function calculateClientEndDate(internalEnd: string, padding: number): string {
  if (!internalEnd) return "";
  const paddedDate = addBusinessDays(new Date(internalEnd), padding);
  return formatToISODate(paddedDate);
}
