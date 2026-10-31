import { useState, useEffect, useRef, useCallback } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    CircularProgress,
} from "@mui/material";
import { Coordinates } from "@common/types";

interface LocationPickerProps {
    open: boolean;
    onClose: () => void;
    onLocationSelect: (coordinates: Coordinates, address: string) => void;
    initialCoordinates?: Coordinates;
}

export const LocationPicker = ({
    open,
    onClose,
    onLocationSelect,
    initialCoordinates,
}: LocationPickerProps) => {
    const [coordinates, setCoordinates] = useState<Coordinates | null>(
        initialCoordinates || null
    );
    const [address, setAddress] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const initializedRef = useRef(false);

    const loadYandexMaps = useCallback(async () => {
        if (typeof window === "undefined") {
            throw new Error("Window is not available");
        }

        if (!import.meta.env.VITE_YMAPS_API_KEY?.trim()) {
            throw new Error("VITE_YMAPS_API_KEY is not configured");
        }

        const waitForReady = () =>
            new Promise<void>((resolve, reject) => {
                if (!window.ymaps) {
                    reject(new Error("Yandex Maps API is not loaded"));
                    return;
                }

                window.ymaps.ready(() => resolve());
            });

        if (window.ymaps) {
            await waitForReady();
            return;
        }

        const existingScript = document.querySelector(
            'script[data-ymaps="true"]'
        ) as HTMLScriptElement | null;

        if (existingScript) {
            await new Promise<void>((resolve, reject) => {
                existingScript.addEventListener("load", () => resolve(), {
                    once: true,
                });
                existingScript.addEventListener(
                    "error",
                    () =>
                        reject(
                            new Error("Failed to load Yandex Maps API script")
                        ),
                    { once: true }
                );
            });
            await waitForReady();
            return;
        }

        await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = `https://api-maps.yandex.ru/2.1/?apikey=${import.meta.env.VITE_YMAPS_API_KEY}&lang=ru_RU`;
            script.async = true;
            script.defer = true;
            script.dataset.ymaps = "true";
            script.onload = () => resolve();
            script.onerror = () =>
                reject(new Error("Failed to load Yandex Maps API script"));
            document.head.appendChild(script);
        });

        await waitForReady();
    }, []);

    useEffect(() => {
        if (open && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        if (!open) {
            initializedRef.current = false;
        }
    }, [open]);

    const initializeMap = async () => {
        if (!mapRef.current || initializedRef.current) return;

        try {
            setLoading(true);
            setError(null);
            initializedRef.current = true;

            if (mapInstanceRef.current) {
                mapInstanceRef.current.destroy();
                mapInstanceRef.current = null;
                markerRef.current = null;
            }

            await loadYandexMaps();

            const hasSavedCoordinates = Boolean(
                initialCoordinates &&
                    !(initialCoordinates.x === 0 && initialCoordinates.y === 0),
            );
            let initialCoords = hasSavedCoordinates
                ? initialCoordinates!
                : { x: 42.9849, y: 47.5047 };

            // Resolve the browser location before creating the map so the
            // user does not briefly see the fallback center.
            if (!hasSavedCoordinates && navigator.geolocation) {
                try {
                    const position = await new Promise<GeolocationPosition>(
                        (resolve, reject) =>
                            navigator.geolocation.getCurrentPosition(resolve, reject, {
                                enableHighAccuracy: true,
                                timeout: 10000,
                                maximumAge: 300000,
                            }),
                    );
                    initialCoords = {
                        x: position.coords.latitude,
                        y: position.coords.longitude,
                    };
                } catch (geoError) {
                    console.warn("Could not get user location:", geoError);
                }
            }

            // Give the dialog a frame to finish layout before map creation.
            await new Promise<void>((resolve) => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => resolve());
                });
            });

            const map = new window.ymaps.Map(mapRef.current, {
                center: [initialCoords.x, initialCoords.y],
                zoom: 15,
                controls: ["zoomControl", "fullscreenControl"],
            });

            const marker = new window.ymaps.Placemark(
                [initialCoords.x, initialCoords.y],
                {},
                {
                    draggable: true,
                    preset: "islands#redDotIcon",
                }
            );

            map.geoObjects.add(marker);
            mapInstanceRef.current = map;
            markerRef.current = marker;
            setCoordinates(initialCoords);
            setAddress("");

            setTimeout(() => {
                try {
                    map.container.fitToViewport();
                } catch (fitError) {
                    console.warn("Could not fit map viewport:", fitError);
                }
            }, 0);

            // Get address for initial location
            await getAddressFromCoordinates(initialCoords);

            // Handle marker drag
            marker.events.add("dragend", async () => {
                const coords = marker.geometry?.getCoordinates();
                if (!coords?.[0] || !coords?.[1]) {
                    return;
                }
                const newCoordinates = {
                    x: coords?.[0],
                    y: coords?.[1],
                };
                setCoordinates(newCoordinates);
                await getAddressFromCoordinates(newCoordinates);
            });

            // Handle map click
            map.events.add("click", async (e: any) => {
                const coords = e.get("coords");
                const newCoordinates = { x: coords[0], y: coords[1] };
                marker.geometry?.setCoordinates(coords);
                setCoordinates(newCoordinates);
                await getAddressFromCoordinates(newCoordinates);
            });
        } catch (error) {
            setError("Не удалось загрузить карту");
            initializedRef.current = false;
            console.error("Map initialization error:", error);
        } finally {
            setLoading(false);
        }
    };

    const getAddressFromCoordinates = async (coords: Coordinates) => {
        try {
            setAddress("Определяем адрес…");

            if (!window.ymaps) {
                throw new Error("Yandex Maps API is not loaded");
            }

            const result = await window.ymaps.geocode(
                [coords.x, coords.y],
                { results: 1 },
            );
            const geoObject = result.geoObjects.get(0);
            const properties = geoObject?.properties as any;
            const resolvedAddress =
                (geoObject as any)?.getAddressLine?.() ||
                properties?.get?.("text", "") ||
                properties?.get?.("name", "");

            setAddress(resolvedAddress || "Адрес не найден");
        } catch (error) {
            console.error("Geocoding error:", error);
            setAddress("Адрес не найден");
        }
    };

    const handleConfirm = () => {
        if (coordinates) {
            onLocationSelect(coordinates, address);
            onClose();
        }
    };

    const handleClose = () => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.destroy();
            mapInstanceRef.current = null;
        }
        markerRef.current = null;
        initializedRef.current = false;
        onClose();
    };

    const handleMapRef = useCallback((ref: HTMLDivElement | null) => {
        mapRef.current = ref;
    }, []);

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            keepMounted
            TransitionProps={{
                onEntered: () => {
                    initializeMap();
                },
            }}
            slotProps={{
                paper: {
                    sx: { width: "100%", margin: "0" },
                },
            }}
        >
            <DialogTitle sx={{ padding: "8px" }}>
                Выберите местоположение
            </DialogTitle>
            <DialogContent sx={{ padding: "8px" }}>
                <Box sx={{ position: "relative", height: 400 }}>
                    {loading && (
                        <Box
                            sx={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                zIndex: 1,
                            }}
                        >
                            <CircularProgress />
                        </Box>
                    )}
                    {error && (
                        <Box
                            sx={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                zIndex: 1,
                                textAlign: "center",
                            }}
                        >
                            <Typography color="error">{error}</Typography>
                        </Box>
                    )}
                    <div
                        ref={handleMapRef}
                        style={{
                            width: "100%",
                            height: "100%",
                            minHeight: 400,
                        }}
                    />
                </Box>
                {coordinates && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            Координаты: {coordinates?.x?.toFixed(6)},{" "}
                            {coordinates?.y?.toFixed(6)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Адрес: {address}
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Отмена</Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={!coordinates}
                >
                    Готово
                </Button>
            </DialogActions>
        </Dialog>
    );
};
