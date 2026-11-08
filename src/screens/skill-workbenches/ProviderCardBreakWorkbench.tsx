import { ActivityType, Provider } from "@modules/providers";
import { MasterStatus } from "@modules/masters";
import { ProviderShowcaseCard } from "@modules/providers/features/ProviderShowcaseCard";

const base: Provider = {
    id: "break-master-1", userId: "break-user-1", activityType: ActivityType.master,
    fullName: "Александр Петров", address: "Кизилюрт, ул. Буйнakского, 8А", coordinates: { x: 43.2156, y: 46.8945 },
    status: MasterStatus.AVAILABLE, currentStatus: MasterStatus.AVAILABLE, description: "Ремонт и обслуживание автомобилей",
    rating: 4.9, reviewsCount: 41, professions: ["Автомаляр", "Автослесарь"], autoMarks: ["Toyota", "Kia"],
    services: ["Диагностика", "Ремонт ходовой части", "Кузовной ремонт"], payments: ["cash", "card", "sbp"],
    workingDays: [true, true, true, true, true, true, false], workFrom: "08:00", workTo: "19:00", distance: 200,
};

const longText = "Автомеханическаядиагностикаинесъемноевосстановлениекузовныхэлементов";
const cases: { label: string; width: number; provider: Provider }[] = [
    { label: "Мастер · типичное содержимое · 360 px", width: 360, provider: base },
    { label: "Мастер · длинное имя, адрес и услуги · узкая колонка 320 px", width: 320, provider: { ...base, fullName: "Александр Петрович Автомеханик Кузовных Работ", address: `ул. ${longText} № 128, Кизилюрт`, professions: [longText, "Автоэлектрик"], services: [longText, longText, "Восстановление кузова после серьёзного ДТП"] } },
    { label: "Мастер · пустые специализации, марки и оплата", width: 360, provider: { ...base, professions: [], services: [], autoMarks: [], payments: [], address: "" } },
    { label: "Мастер · большой набор услуг и профессий", width: 360, provider: { ...base, professions: Array.from({ length: 16 }, (_, i) => `Специализация ${i + 1}`), services: Array.from({ length: 24 }, (_, i) => `Услуга ${i + 1}`), autoMarks: Array.from({ length: 12 }, (_, i) => `Марка ${i + 1}`), payments: ["cash", "card", "sbp", "qr"] } },
    { label: "Мастер · закрыт, нет аватара и дистанции", width: 360, provider: { ...base, currentStatus: MasterStatus.UNAVAILABLE, status: MasterStatus.UNAVAILABLE, distance: undefined, avatarUrl: undefined } },
    { label: "Организация · длинное название и услуги · сжатие flex", width: 232, provider: { ...base, id: "break-organization", activityType: ActivityType.auto_service, fullName: undefined, name: undefined, businessName: `Автосервис «${longText}»`, address: `Республика Дагестан, г. Кизилюрт, ул. ${longText}`, professions: [], services: Array.from({ length: 14 }, (_, i) => `${longText} ${i + 1}`), coverImageUrl: undefined, onlineBookingEnabled: true } },
    { label: "Организация · автомагазин, закрыт, нет обложки", width: 900, provider: { ...base, id: "break-shop", activityType: ActivityType.auto_shop, fullName: undefined, businessName: "Автомагазин «Запчасти рядом с вами»", professions: [], services: ["Запчасти", "Шины", "Масла"], currentStatus: MasterStatus.UNAVAILABLE, status: MasterStatus.UNAVAILABLE, coverImageUrl: undefined } },
];

export function ProviderCardBreakWorkbench() {
    return <main>
        <h1>Break · карточка провайдера</h1>
        {cases.map(({ label, width, provider }) => <section key={label}>
            <p>{label}</p>
            {width === 232 ? <div style={{ width, display: "flex" }}><div style={{ flex: "1 1 auto", minWidth: 0 }}><ProviderShowcaseCard provider={provider} onOpenProfile={() => undefined} onShowOnMap={() => undefined} /></div><div style={{ flex: "0 0 24px" }} aria-hidden="true" /></div> : <div style={{ width, maxWidth: "100%" }}><ProviderShowcaseCard provider={provider} onOpenProfile={() => undefined} onShowOnMap={() => undefined} /></div>}
            {width === 232 && <p>Наблюдение: карточка выходит вправо за 232 px контекст · better-layout</p>}
        </section>)}
    </main>;
}
