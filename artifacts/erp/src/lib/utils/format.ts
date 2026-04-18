export function formatINR(value: number): string {
  if (!value) return "₹0";

  const crores = Math.floor(value / 10000000);
  const lakhs = Math.floor((value % 10000000) / 100000);
  const thousands = Math.floor((value % 100000) / 1000);
  const hundreds = value % 1000;

  if (crores > 0) {
    const croreVal = crores + (lakhs / 100);
    return `₹${croreVal.toFixed(2)} Cr`;
  }
  if (lakhs > 0) {
    const lakhVal = lakhs + (thousands / 100);
    return `₹${lakhVal.toFixed(2)} L`;
  }

  return `₹${value.toLocaleString("en-IN")}`;
}
