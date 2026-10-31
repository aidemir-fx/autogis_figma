import { useState, useEffect } from "react";

export const useLogic = () => {
    const [isPromptVisible, setIsPromptVisible] = useState(false);
    const [isButtonLoading, setIsButtonLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isSecureGeolocationContext = () =>
        window.isSecureContext ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

    const describeError = (error: GeolocationPositionError) => {
        if (!isSecureGeolocationContext()) {
            return "Геолокация доступна только по HTTPS. Откройте приложение через защищённый адрес.";
        }
        switch (error.code) {
            case error.PERMISSION_DENIED:
                return "Доступ к местоположению запрещён в настройках браузера.";
            case error.POSITION_UNAVAILABLE:
                return "Браузер не смог определить местоположение устройства.";
            case error.TIMEOUT:
                return "Определение местоположения заняло слишком много времени.";
            default:
                return "Не удалось определить местоположение.";
        }
    };

    useEffect(() => {
        if (!navigator.geolocation) {
            setErrorMessage("Этот браузер не поддерживает геолокацию.");
            setIsPromptVisible(true);
            return;
        }

        if (!isSecureGeolocationContext()) {
            setErrorMessage("Геолокация доступна только по HTTPS. Откройте приложение через защищённый адрес.");
            setIsPromptVisible(true);
            return;
        }

        // Check if permission is granted
        navigator.permissions
            .query({ name: "geolocation" })
            .then((result) => {
                if (result.state === "granted") {
                    setIsPromptVisible(false);
                } else if (result.state === "denied") {
                    setErrorMessage("Доступ к местоположению запрещён в настройках браузера.");
                    setIsPromptVisible(true);
                } else {
                    setIsPromptVisible(true);
                }
            })
            .catch(() => {
                // Fallback for browsers that don't support permissions API
                navigator.geolocation.getCurrentPosition(
                    () => {
                        setIsPromptVisible(false);
                    },
                    (error) => {
                        setErrorMessage(describeError(error));
                        setIsPromptVisible(true);
                    },
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
                );
            });
    }, []);

    const requestGeolocationAccess = () => {
        setIsButtonLoading(true);
        setErrorMessage(null);
        if (!navigator.geolocation) {
            setErrorMessage("Этот браузер не поддерживает геолокацию.");
            setIsButtonLoading(false);
            return;
        }
        if (!isSecureGeolocationContext()) {
            setErrorMessage("Геолокация доступна только по HTTPS. Откройте приложение через защищённый адрес.");
            setIsButtonLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                window.dispatchEvent(
                    new CustomEvent<[number, number]>("autogis:geolocation-updated", {
                        detail: [position.coords.latitude, position.coords.longitude],
                    }),
                );
                setIsPromptVisible(false);
                setIsButtonLoading(false);
            },
            (error) => {
                setErrorMessage(describeError(error));
                setIsPromptVisible(true);
                setIsButtonLoading(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
    };

    const hidePrompt = () => {
        setIsPromptVisible(false);
    };

    return {
        isPromptVisible,
        requestGeolocationAccess,
        hidePrompt,
        isButtonLoading,
        errorMessage,
    };
};
