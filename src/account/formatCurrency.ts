const ugxFormatter = new Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  maximumFractionDigits: 0,
});

export const formatUgx = (value: number): string => ugxFormatter.format(value);
