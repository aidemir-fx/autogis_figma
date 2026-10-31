import React from "react";
import { Provider, ActivityType } from "@modules/providers";
import { IMAGES } from "../../../assets/images";

interface FigmaOrgCardProps {
    provider: Provider;
    categoryType: ActivityType;
    onBook?: (provider: Provider) => void;
    onCall?: (phone: string) => void;
    onChat?: (provider: Provider) => void;
    onClick?: () => void;
}

export const FigmaOrgCard: React.FC<FigmaOrgCardProps> = ({
    provider,
    categoryType,
    onBook,
    onCall,
    onChat,
    onClick,
}) => {
    const isShop = categoryType === ActivityType.auto_shop;
    const isWash = categoryType === ActivityType.auto_wash;
    const isService = categoryType === ActivityType.auto_service;

    // Pick appropriate cover image
    let coverSrc = provider.avatar;
    if (!coverSrc) {
        if (isService) coverSrc = IMAGES.autoServiceCover;
        else if (isShop) coverSrc = IMAGES.autoShopCover;
        else coverSrc = IMAGES.autoWashCover;
    }

    // Default titles matching mock
    let defaultTitle = "Организация";
    if (isService) defaultTitle = "Автосервис";
    if (isShop) defaultTitle = "Автомагазин";
    if (isWash) defaultTitle = "Автомойка";

    const title = provider.businessName || provider.fullName || provider.name || defaultTitle;
    const rating = provider.rating ?? 5.0;
    const reviewsCount = provider.reviewsCount ?? 21;
    const distanceText = provider.distance
        ? provider.distance < 1000
            ? `${Math.round(provider.distance)} м`
            : `${(provider.distance / 1000).toFixed(1)} км`
        : "200 м";

    // For shop, mock showed one closed shop for demonstration
    const isClosed = isShop && provider.status === "unavailable";
    const isOpen = !isClosed;

    // Section label: "Товары" for auto shops, "Услуги" for service and wash
    const itemsLabel = isShop ? "Товары" : "Услуги";

    // Item tags
    let rawTags = provider.services || [];
    if (rawTags.length === 0) {
        if (isShop) {
            rawTags = ["Запчасти", "Шины", "Краска", "Масло", "Ходовая"];
        } else if (isWash) {
            rawTags = ["Химчистка салона", "Полировка", "Нано-мойка", "Антидождь"];
        } else {
            rawTags = ["Диагностика", "ТО", "Ходовая", "ДВС", "Электрика"];
        }
    }

    const visibleTags = rawTags.slice(0, 5);
    const extraCount = Math.max(0, rawTags.length - 5) + 3;

    // Actions logic:
    // Auto Service & Auto Wash lead with "Записаться" (Green) + Phone button
    // Auto Shop leads with "Позвонить" (Blue) + Chat button
    const isBookingPrimary = isService || isWash;

    return (
        <div
            onClick={onClick}
            style={{
                width: 242,
                minWidth: 242,
                height: 381,
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 1px 4px rgba(0, 0, 0, 0.08)",
                border: "1px solid #EEF2F6",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                cursor: "pointer",
                boxSizing: "border-box",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
        >
            {/* Top Cover Image with Rating Badge */}
            <div style={{ position: "relative", width: "100%", height: 149, flexShrink: 0, backgroundColor: "#E2E8F0" }}>
                <img
                    src={coverSrc}
                    alt={title}
                    style={{
                        width: "100%",
                        height: 149,
                        objectFit: "cover",
                        display: "block",
                    }}
                />
                {/* Floating rating badge in top-left */}
                <div
                    style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(4px)",
                        padding: "3px 8px",
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#1E293B",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.15)",
                    }}
                >
                    <span style={{ color: "#EAB308", fontSize: 13 }}>★</span>
                    <span>{rating.toFixed(1)}</span>
                    <span style={{ color: "#64748B", fontWeight: 400 }}>({reviewsCount})</span>
                </div>
            </div>

            {/* Bottom Content Area: height ~232px */}
            <div
                style={{
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    flex: 1,
                    boxSizing: "border-box",
                }}
            >
                {/* Title */}
                <div
                    style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#1E293B",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        lineHeight: "1.25",
                    }}
                >
                    {title}
                </div>

                {/* Schedule Header & Distance */}
                <div style={{ marginTop: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
                            График работы
                        </span>
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 2,
                                color: "#2563EB",
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

                {/* Services / Goods Tags */}
                <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: "#64748B", marginBottom: 4, fontWeight: 500 }}>
                        {itemsLabel}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxHeight: 52, overflow: "hidden" }}>
                        {visibleTags.map((tag, idx) => (
                            <span
                                key={idx}
                                style={{
                                    backgroundColor: "#F1F5F9",
                                    color: "#334155",
                                    padding: "2px 6px",
                                    borderRadius: 6,
                                    fontSize: 11,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {tag}
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

                {/* Actions bottom row */}
                <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                    {isBookingPrimary ? (
                        <>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onBook?.(provider);
                                }}
                                style={{
                                    flex: 1,
                                    height: 38,
                                    backgroundColor: "#16A34A",
                                    color: "#FFFFFF",
                                    border: "none",
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    boxShadow: "0 1px 2px rgba(22, 163, 74, 0.2)",
                                }}
                            >
                                Записаться
                            </button>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onCall) {
                                        onCall(provider.phone || "+7 (495) 777-88-99");
                                    } else {
                                        window.location.href = `tel:${provider.phone || "+74957778899"}`;
                                    }
                                }}
                                title="Позвонить"
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
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onCall) {
                                        onCall(provider.phone || "+7 (495) 555-44-33");
                                    } else {
                                        window.location.href = `tel:${provider.phone || "+74955554433"}`;
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
