export const PAYMENT_OPTIONS = [
    { value: "cash", label: "Наличные" },
    { value: "card", label: "Карта" },
    { value: "sbp", label: "СБП" },
] as const;

export function formatPaymentMethods(values?: string[]): string[] {
    return (values ?? []).map(
        (value) => PAYMENT_OPTIONS.find((option) => option.value === value)?.label ?? value,
    );
}
