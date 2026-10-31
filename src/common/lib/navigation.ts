import type { NavigateFunction, To } from "react-router-dom";

export function goBackOrNavigate(
    navigate: NavigateFunction,
    fallbackRoute: To,
) {
    const historyState =
        typeof window !== "undefined"
            ? (window.history.state as { idx?: number } | null)
            : null;

    if (typeof historyState?.idx === "number" && historyState.idx > 0) {
        navigate(-1);
        return;
    }

    navigate(fallbackRoute, { replace: true });
}
