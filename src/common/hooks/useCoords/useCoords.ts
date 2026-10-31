import { useEffect, useState } from "react";

type GeolocationState = {
    code?: number;
    message?: string;
};

function getGeolocationError(error: GeolocationPositionError): GeolocationState {
    if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        return {
            code: error.code,
            message: "Геолокация доступна только по HTTPS. Откройте приложение через защищённый адрес.",
        };
    }

    switch (error.code) {
        case error.PERMISSION_DENIED:
            return { code: error.code, message: "Доступ к местоположению запрещён в настройках браузера." };
        case error.POSITION_UNAVAILABLE:
            return { code: error.code, message: "Браузер не смог определить местоположение устройства." };
        case error.TIMEOUT:
            return { code: error.code, message: "Определение местоположения заняло слишком много времени." };
        default:
            return { code: error.code, message: "Не удалось определить местоположение." };
    }
}

export const useCoords = () => {
    const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
    const [geoError, setGeoError] = useState<GeolocationState | null>(null);
    const [isLocating, setIsLocating] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const handleCoordinatesUpdated = (event: Event) => {
            const detail = (event as CustomEvent<[number, number]>).detail;
            if (!Array.isArray(detail) || detail.length < 2) return;
            setUserCoords(detail);
            setGeoError(null);
            setIsLocating(false);
        };

        window.addEventListener("autogis:geolocation-updated", handleCoordinatesUpdated);

        if (!navigator.geolocation) {
            setIsLocating(false);
            setGeoError({ message: "Этот браузер не поддерживает геолокацию." });
            return () => {
                isMounted = false;
                window.removeEventListener("autogis:geolocation-updated", handleCoordinatesUpdated);
            };
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                if (!isMounted) return;
                const next: [number, number] = [
                    pos.coords.latitude,
                    pos.coords.longitude,
                ];
                setUserCoords(next);
                setGeoError(null);
                setIsLocating(false);
            },
            (error) => {
                if (!isMounted) return;
                setGeoError(getGeolocationError(error));
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
        );

        return () => {
            isMounted = false;
            window.removeEventListener("autogis:geolocation-updated", handleCoordinatesUpdated);
        };
    }, []);

    return { userCoords, geoError, isLocating };
};
