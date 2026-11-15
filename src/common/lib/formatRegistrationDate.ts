const MONTHS_GENITIVE = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
];

export function formatRegistrationDate(value?: string) {
    if (!value) return undefined;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;

    return `${MONTHS_GENITIVE[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
