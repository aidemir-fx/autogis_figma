import React from "react";
import { Provider } from "@modules/providers";
import { IMAGES } from "../../../assets/images";

interface FigmaMasterCardProps {
    provider: Provider;
    onCall?: (phone: string) => void;
    onChat?: (provider: Provider) => void;
    onClick?: () => void;
}

export const FigmaMasterCard: React.FC<FigmaMasterCardProps> = ({
    provider,
    onCall,
    onChat,
    onClick,
}) => {
    const displayName = provider.fullName || provider.name || "Первый мастер";
    const rating = provider.rating ?? 5.0;
    const reviewsCount = provider.reviewsCount ?? 21;
    const distanceText = provider.distance
        ? provider.distance < 1000
            ? `${Math.round(provider.distance)} м`
            : `${(provider.distance / 1000).toFixed(1)} км`
        : "200 м";

    const isOpen = provider.status !== "unavailable";
    const professions = provider.professions && provider.professions.length > 0
        ? provider.professions
        : ["Автомаляр", "Кузовщик", "Сварщик", "Автоинженер", "Автоэлектрик"];
    const visibleProfessions = professions.slice(0, 5);
    const extraCount = Math.max(0, professions.length - 5) + 4; // Matching mock "+4"

    const avatarSrc = provider.avatar || IMAGES.masterAvatar;

    return (
        <div
            onClick={onClick}
            style={{
                width: 242,
                minWidth: 242,
                height: 266,
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 12,
                boxShadow: "0 1px 4px rgba(0, 0, 0, 0.08)",
                border: "1px solid #EEF2F6",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                flexShrink: 0,
                cursor: "pointer",
                boxSizing: "border-box",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
        >
            {/* Top row: Avatar & Main Info */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
                    <img
                        src={avatarSrc}
                        alt={displayName}
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 10,
                            objectFit: "cover",
                            backgroundColor: "#E2E8F0",
                        }}
                    />
                    {/* Green online badge */}
                    <span
                        style={{
                            position: "absolute",
                            top: -2,
                            left: -2,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: "#22C55E",
                            border: "2px solid #FFFFFF",
                        }}
                    />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: "#1E293B",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            lineHeight: "1.2",
                        }}
                    >
                        {displayName}
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 4,
                            fontSize: 12,
                        }}
                    >
                        <span style={{ color: "#EAB308", display: "inline-flex", alignItems: "center" }}>
                            ★
                        </span>
                        <span style={{ fontWeight: 600, color: "#1E293B" }}>
                            {rating.toFixed(1)}
                        </span>
                        <span style={{ color: "#94A3B8" }}>({reviewsCount})</span>

                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 2,
                                color: "#2563EB",
                                marginLeft: "auto",
                                fontSize: 11,
                                fontWeight: 500,
                            }}
                        >
                            <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                                <path
                                    d="M5 0C2.24 0 0 2.24 0 5C0 8.5 5 12 5 12C5 12 10 8.5 10 5C10 2.24 7.76 0 5 0ZM5 6.75C4.03 6.75 3.25 5.97 3.25 5C3.25 4.03 4.03 3.25 5 3.25C5.97 3.25 6.75 4.03 6.75 5C6.75 5.97 5.97 6.75 5 6.75Z"
                                    fill="#2563EB"
                                />
                            </svg>
                            {distanceText}
                        </span>
                    </div>
                </div>
            </div>

            {/* Schedule block */}
            <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: "#64748B", marginBottom: 4, fontWeight: 500 }}>
                    График работы
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                    <span
                        style={{
                            backgroundColor: isOpen ? "#DCFCE7" : "#FEE2E2",
                            color: isOpen ? "#16A34A" : "#DC2626",
                            padding: "2px 6px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                        }}
                    >
                        {isOpen ? "Открыто" : "Закрыто"}
                    </span>
                    <span
                        style={{
                            backgroundColor: "#F1F5F9",
                            color: "#475569",
                            padding: "2px 6px",
                            borderRadius: 6,
                            fontSize: 11,
                        }}
                    >
                        Пн - Вс
                    </span>
                    <span
                        style={{
                            backgroundColor: "#F1F5F9",
                            color: "#475569",
                            padding: "2px 6px",
                            borderRadius: 6,
                            fontSize: 11,
                        }}
                    >
                        {provider.workFrom || "8:00"} - {provider.workTo || "19:00"}
                    </span>
                </div>
            </div>

            {/* Specialization block */}
            <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: "#64748B", marginBottom: 4, fontWeight: 500 }}>
                    Специализация
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {visibleProfessions.map((prof, i) => (
                        <span
                            key={i}
                            style={{
                                backgroundColor: "#F1F5F9",
                                color: "#334155",
                                padding: "2px 6px",
                                borderRadius: 6,
                                fontSize: 11,
                                whiteSpace: "nowrap",
                            }}
                        >
                            {prof}
                        </span>
                    ))}
                    <span
                        style={{
                            backgroundColor: "#F1F5F9",
                            color: "#64748B",
                            padding: "2px 6px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 500,
                        }}
                    >
                        +{extraCount}
                    </span>
                </div>
            </div>

            {/* Action buttons row */}
            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onCall) {
                            onCall(provider.phone || "+7 (999) 111-22-33");
                        } else {
                            window.location.href = `tel:${provider.phone || "+79991112233"}`;
                        }
                    }}
                    style={{
                        flex: 1,
                        height: 38,
                        backgroundColor: "#2563EB",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        gap: 6,
                        boxShadow: "0 1px 2px rgba(37, 99, 235, 0.2)",
                    }}
                >
                    Позвонить
                </button>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onChat?.(provider);
                    }}
                    title="Написать сообщение"
                    style={{
                        width: 38,
                        height: 38,
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#475569",
                        flexShrink: 0,
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};
