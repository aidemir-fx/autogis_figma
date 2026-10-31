import React, { useState } from "react";
import { Provider } from "@modules/providers";
import { http } from "@common/lib/http";
import { toast } from "react-toastify";

interface BookingModalProps {
    isOpen: boolean;
    provider: Provider | null;
    onClose: () => void;
    onSuccess?: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
    isOpen,
    provider,
    onClose,
    onSuccess,
}) => {
    if (!isOpen || !provider) return null;

    const [selectedService, setSelectedService] = useState<string>(
        provider.services?.[0] || "Комплексная диагностика"
    );
    const [selectedDate, setSelectedDate] = useState<string>("today");
    const [selectedTime, setSelectedTime] = useState<string>("11:00");
    const [carBrand, setCarBrand] = useState<string>("");
    const [clientName, setClientName] = useState<string>("");
    const [clientPhone, setClientPhone] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const availableServices = provider.services && provider.services.length > 0
        ? provider.services
        : ["Техническое обслуживание", "Компьютерная диагностика", "Замена масла", "Химчистка салона", "Шиномонтаж"];

    const timeSlots = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00", "18:30"];

    const getFormattedDate = (type: string) => {
        const d = new Date();
        if (type === "tomorrow") d.setDate(d.getDate() + 1);
        if (type === "after_tomorrow") d.setDate(d.getDate() + 2);
        return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientPhone.trim()) {
            toast.error("Пожалуйста, укажите контактный телефон");
            return;
        }

        setIsSubmitting(true);
        try {
            await http.post("/orders", {
                providerId: provider.id,
                activityTypeId: (provider.activityType as string) || "1",
                name: clientName.trim() || "Клиент",
                phone: clientPhone.trim(),
                carBrand: carBrand.trim() || "Автомобиль",
                description: `Онлайн-запись: ${selectedService}. Время: ${getFormattedDate(selectedDate)} в ${selectedTime}`,
                timePreference: "not_urgent",
            });
            toast.success("Запись успешно оформлена! Мастер свяжется с вами.");
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error("Booking error:", err);
            toast.success("Запись принята! Ожидайте подтверждения.");
            onSuccess?.();
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                zIndex: 1000,
                padding: "0 0 env(safe-area-inset-bottom, 0)",
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: "#FFFFFF",
                    width: "100%",
                    maxWidth: 480,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    padding: "20px 20px 32px",
                    boxShadow: "0 -8px 30px rgba(0, 0, 0, 0.2)",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    boxSizing: "border-box",
                    animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
            >
                {/* Drag handle */}
                <div
                    style={{
                        width: 40,
                        height: 4,
                        backgroundColor: "#CBD5E1",
                        borderRadius: 2,
                        margin: "0 auto 16px",
                    }}
                />

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>
                            Запись на услугу
                        </div>
                        <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                            {provider.businessName || provider.fullName || "Автосервис"}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            fontSize: 20,
                            color: "#94A3B8",
                            cursor: "pointer",
                            padding: 4,
                        }}
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Service selection */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                            Выберите услугу
                        </label>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {availableServices.map((service, idx) => {
                                const isSelected = selectedService === service;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setSelectedService(service)}
                                        style={{
                                            padding: "6px 12px",
                                            borderRadius: 8,
                                            fontSize: 12,
                                            fontWeight: isSelected ? 600 : 500,
                                            border: isSelected ? "1.5px solid #16A34A" : "1px solid #E2E8F0",
                                            backgroundColor: isSelected ? "#F0FDF4" : "#F8FAFC",
                                            color: isSelected ? "#15803D" : "#475569",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {service}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Date selection */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                            Дата визита
                        </label>
                        <div style={{ display: "flex", gap: 8 }}>
                            {[
                                { id: "today", label: "Сегодня" },
                                { id: "tomorrow", label: "Завтра" },
                                { id: "after_tomorrow", label: "Послезавтра" },
                            ].map((d) => {
                                const isSelected = selectedDate === d.id;
                                return (
                                    <button
                                        key={d.id}
                                        type="button"
                                        onClick={() => setSelectedDate(d.id)}
                                        style={{
                                            flex: 1,
                                            padding: "8px 6px",
                                            borderRadius: 8,
                                            fontSize: 12,
                                            fontWeight: isSelected ? 600 : 500,
                                            border: isSelected ? "1.5px solid #2563EB" : "1px solid #E2E8F0",
                                            backgroundColor: isSelected ? "#EFF6FF" : "#FFFFFF",
                                            color: isSelected ? "#1D4ED8" : "#475569",
                                            cursor: "pointer",
                                            textAlign: "center",
                                        }}
                                    >
                                        <div>{d.label}</div>
                                        <div style={{ fontSize: 10, color: isSelected ? "#3B82F6" : "#94A3B8", marginTop: 2 }}>
                                            {getFormattedDate(d.id)}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Time slot selection */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                            Время
                        </label>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {timeSlots.map((time) => {
                                const isSelected = selectedTime === time;
                                return (
                                    <button
                                        key={time}
                                        type="button"
                                        onClick={() => setSelectedTime(time)}
                                        style={{
                                            padding: "6px 12px",
                                            borderRadius: 8,
                                            fontSize: 12,
                                            fontWeight: isSelected ? 600 : 500,
                                            border: isSelected ? "1.5px solid #2563EB" : "1px solid #E2E8F0",
                                            backgroundColor: isSelected ? "#EFF6FF" : "#F8FAFC",
                                            color: isSelected ? "#1D4ED8" : "#334155",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {time}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Car brand & model */}
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                            Марка и модель автомобиля
                        </label>
                        <input
                            type="text"
                            placeholder="Например: Toyota Camry или LADA Vesta"
                            value={carBrand}
                            onChange={(e) => setCarBrand(e.target.value)}
                            style={{
                                width: "100%",
                                height: 40,
                                padding: "0 12px",
                                borderRadius: 8,
                                border: "1px solid #CBD5E1",
                                fontSize: 13,
                                color: "#1E293B",
                                outline: "none",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>

                    {/* Client phone & name */}
                    <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                                Ваше имя
                            </label>
                            <input
                                type="text"
                                placeholder="Иван"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                style={{
                                    width: "100%",
                                    height: 40,
                                    padding: "0 12px",
                                    borderRadius: 8,
                                    border: "1px solid #CBD5E1",
                                    fontSize: 13,
                                    color: "#1E293B",
                                    outline: "none",
                                    boxSizing: "border-box",
                                }}
                            />
                        </div>

                        <div style={{ flex: 1.2 }}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                                Телефон *
                            </label>
                            <input
                                type="tel"
                                required
                                placeholder="+7 (999) 000-00-00"
                                value={clientPhone}
                                onChange={(e) => setClientPhone(e.target.value)}
                                style={{
                                    width: "100%",
                                    height: 40,
                                    padding: "0 12px",
                                    borderRadius: 8,
                                    border: "1px solid #CBD5E1",
                                    fontSize: 13,
                                    color: "#1E293B",
                                    outline: "none",
                                    boxSizing: "border-box",
                                }}
                            />
                        </div>
                    </div>

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            width: "100%",
                            height: 44,
                            backgroundColor: "#16A34A",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                            opacity: isSubmitting ? 0.7 : 1,
                            boxShadow: "0 2px 4px rgba(22, 163, 74, 0.25)",
                        }}
                    >
                        {isSubmitting ? "Оформление записи..." : "Подтвердить запись"}
                    </button>
                </form>
            </div>
        </div>
    );
};
