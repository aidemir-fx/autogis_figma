export function formatDistanceFromUser(distance?: number | null): string {
    if (typeof distance !== "number" || !Number.isFinite(distance)) {
        return "Расстояние неизвестно";
    }

    const safeDistance = Math.max(0, distance);

    if (safeDistance >= 1000) {
        return `${(safeDistance / 1000).toFixed(1)} км от вас`;
    }

    return `${Math.round(safeDistance)} м от вас`;
}
