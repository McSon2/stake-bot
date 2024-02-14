export function getDifferenceMessage(currentValue, previousValue) {
  const difference = (currentValue - previousValue).toFixed(2);
  if (difference == 0) return "";
  return difference > 0 ? `+${difference}` : `${difference}`;
}