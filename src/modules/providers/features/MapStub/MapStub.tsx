import { MapPinIcon } from "@common/icons";
import {
    LocationIconContainer,
    MapCopyButton,
    MapErrorCard,
    MapErrorCode,
    MapErrorActions,
    MapErrorDescription,
    MapErrorTitle,
    MapRetryButton,
    MapStubTitle,
    Root,
} from "./styles";

export type MapFailureCode =
    | "api-network"
    | "api-access"
    | "map-init"
    | "map-timeout"
    | "tiles-timeout";

type MapStubProps = {
    errorCode?: MapFailureCode | null;
    onRetry?: () => void;
    onCopyDiagnostics?: () => void;
    copied?: boolean;
};

const ERROR_COPY: Record<MapFailureCode, string> = {
    "api-network": "Не удалось загрузить сервис Яндекс.Карт. Проверьте подключение к сети.",
    "api-access": "Запрос к Яндекс.Картам отклонён. Проверьте ограничения API-ключа.",
    "map-init": "Сервис загрузился, но карта не смогла запуститься.",
    "map-timeout": "Карта не запустилась за отведённое время.",
    "tiles-timeout": "Карта запустилась, но её фрагменты не загрузились.",
};

export const MapStub = ({
    errorCode = null,
    onRetry,
    onCopyDiagnostics,
    copied = false,
}: MapStubProps) => {
    if (!errorCode) {
        return (
            <Root role="status" aria-live="polite">
                <LocationIconContainer>
                    <MapPinIcon />
                </LocationIconContainer>
                <MapStubTitle>Карта загружается…</MapStubTitle>
            </Root>
        );
    }

    return (
        <Root role="alert" aria-live="assertive">
            <MapErrorCard>
                <MapErrorTitle>Не удалось загрузить карту</MapErrorTitle>
                <MapErrorDescription>{ERROR_COPY[errorCode]}</MapErrorDescription>
                <MapErrorCode>Код: {errorCode}</MapErrorCode>
                <MapErrorActions>
                    <MapRetryButton type="button" onClick={onRetry}>
                        Повторить
                    </MapRetryButton>
                    <MapCopyButton type="button" onClick={onCopyDiagnostics}>
                        {copied ? "Скопировано" : "Скопировать диагностику"}
                    </MapCopyButton>
                </MapErrorActions>
            </MapErrorCard>
        </Root>
    );
};
