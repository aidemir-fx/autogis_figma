import { useState, type ReactNode } from "react";
import { Collapse } from "@mui/material";
import Chevron from "@mui/icons-material/KeyboardArrowDownRounded";
import Phone from "@mui/icons-material/PhoneOutlined";
import Person from "@mui/icons-material/PersonOutlineRounded";
import Notifications from "@mui/icons-material/NotificationsNoneRounded";
import Location from "@mui/icons-material/LocationOnOutlined";
import { Link, useLocation } from "react-router-dom";
import { NotificationBell } from "../../../components/NotificationBell";
import { MediaAssetGallery } from "@modules/media/components/MediaAssetGallery";
import { OrderReviewPrompt } from "@modules/reviews";
import type { ChatOrder } from "@modules/chats/api";
import calendar from "./assets/calendar.svg?url";
import brand from "../../auth/assets/brand.png";
import "./compactBookings.css";

export type CompactTab = "pending" | "confirmed" | "history";
export type HistoryFilter = "all" | "completed" | "cancelled" | "expired" | "rejected";

const statuses: Record<ChatOrder["status"], string> = {
    pending: "Ожидает ответа", scheduled: "Подтверждена", completed: "Выполнена",
    cancelled: "Отменена", rejected: "Отклонена", expired: "Истекла",
};
const tabs: { key: CompactTab; label: string }[] = [
    { key: "pending", label: "Ожидают ответа" }, { key: "confirmed", label: "Подтверждены" }, { key: "history", label: "История" },
];
const filters: HistoryFilter[] = ["all", "completed", "rejected", "cancelled", "expired"];
const emptyCopy: Record<CompactTab, [string, string]> = {
    pending: ["Новых заявок пока нет", "Заявки появятся здесь после отправки исполнителю"],
    confirmed: ["Подтверждённых записей пока нет", "Когда исполнитель подтвердит заявку, она появится здесь"],
    history: ["История пока пуста", "Здесь будут выполненные и завершённые заявки"],
};
const dateFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });
const format = (value?: string) => value && Number.isFinite(Date.parse(value)) ? dateFormat.format(new Date(value)) : undefined;
const name = (order: ChatOrder) => order.provider?.name || "Исполнитель";
const service = (order: ChatOrder) => order.activityType?.displayName || order.description || "Услуга";
const tel = (order: ChatOrder) => order.provider?.phone ? `tel:${order.provider.phone.replace(/[^+0-9]/g, "")}` : null;
function route(order: ChatOrder) {
    const coords = order.provider?.coordinates?.coordinates;
    if (!coords || coords.length !== 2 || !coords.every(Number.isFinite)) return null;
    return `https://yandex.ru/maps/?rtext=~${coords[1]},${coords[0]}&rtt=auto`;
}

export function CompactCustomerHeader({ guest = false }: { guest?: boolean }) {
    const location = useLocation();
    const signIn = `/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`;
    return <header className="compact-client-header">
        <Link to="/" aria-label="АвтоГис, поиск"><img src={brand} alt="АвтоГис" /></Link>
        <div>
            {guest ? <Link to={signIn} aria-label="Уведомления"><Notifications /></Link> : <NotificationBell compact />}
            <Link to={guest ? signIn : "/cabinet"} aria-label={guest ? "Войти" : "Профиль"}>
                {guest ? <span>Войти</span> : <Person />}
            </Link>
        </div>
    </header>;
}

function BookingItem({ order, selected, onChat, onCancel }: {
    order: ChatOrder; selected: boolean; onChat: () => void; onCancel: () => void;
}) {
    const [expanded, setExpanded] = useState(selected);
    const [more, setMore] = useState(false);
    const isActive = order.status === "pending" || order.status === "scheduled";
    const summary = [
        ["Автомобиль", order.carBrand],
        ["Год автомобиля", order.vehicleYear],
        ["Требуемая услуга", service(order)],
        ["Желаемое время и дата", format(order.desiredDateTime)],
        ["Подтверждённое время", format(order.confirmedDateTime)],
        ["Описание", order.description],
        ["Причина", order.cancelReason],
        ["Заявка истекла", order.status === "expired" ? format(order.responseDeadline) : undefined],
    ].filter(([, value]) => Boolean(value));
    const routeURL = route(order);
    return <article className="compact-booking">
        <button className="compact-booking-summary" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
            <span className="compact-booking-icon"><img alt="" src={calendar} /></span>
            <span className="compact-booking-title"><strong>{name(order)}</strong><span>{service(order)}</span></span>
            <span className="compact-booking-status" data-status={order.status}>
                {isActive ? format(order.status === "scheduled" ? order.confirmedDateTime : order.createdAt) : statuses[order.status]}
            </span>
            <Chevron className="compact-booking-arrow" />
        </button>
        <Collapse in={expanded}>
            <div className="compact-booking-detail">
                <dl>{summary.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                {!!order.photoAssetIds?.length && <MediaAssetGallery assetIds={order.photoAssetIds} />}
                <div className="compact-booking-actions">
                    {isActive && <button type="button" className="compact-booking-cancel" onClick={onCancel}>
                        {order.status === "scheduled" ? "Отменить запись" : "Отменить заявку"}
                    </button>}
                    {order.status === "scheduled" ? <button type="button" aria-label="Другие действия" aria-expanded={more} onClick={() => setMore(!more)}>…</button>
                        : <button type="button" onClick={onChat}>Чат с исполнителем</button>}
                </div>
                {more && <div className="compact-booking-actions">
                    {routeURL && <a href={routeURL} target="_blank" rel="noreferrer">Построить маршрут</a>}
                    <button type="button" onClick={onChat}>Чат с исполнителем</button>
                </div>}
                {order.status === "completed" && <OrderReviewPrompt orderId={order.id} />}
            </div>
        </Collapse>
    </article>;
}

export function CompactBookings({
    orders, loading, error, reload, tab, history, changeTab, changeHistory, selected, openChat, cancel, notice, children,
}: {
    orders: ChatOrder[]; loading: boolean; error: boolean; reload: () => void;
    tab: CompactTab; history: HistoryFilter; changeTab: (tab: CompactTab) => void; changeHistory: (history: HistoryFilter) => void;
    selected: string | null; openChat: (id: string) => void; cancel: (order: ChatOrder) => void;
    notice: { kind: "success" | "error"; text: string } | null; children: ReactNode;
}) {
    const pending = orders.filter((order) => order.status === "pending");
    const confirmed = orders.filter((order) => order.status === "scheduled");
    const records = orders.filter((order) => order.status !== "pending" && order.status !== "scheduled");
    const current = tab === "pending" ? pending : tab === "confirmed" ? confirmed :
        records.filter((order) => history === "all" || order.status === history);
    const next = [...confirmed].filter((order) => order.confirmedDateTime && Date.parse(order.confirmedDateTime) + 3_600_000 > Date.now())
        .sort((a, b) => Date.parse(a.confirmedDateTime!) - Date.parse(b.confirmedDateTime!))[0];
    const nextRoute = next ? route(next) : null;
    const nextPhone = next ? tel(next) : null;

    return <div className="compact-bookings">
        <CompactCustomerHeader />
        <main className="compact-bookings-content">
            <h1>Мои записи</h1>
            {next && <section className="compact-booking-next">
                <div className="compact-booking-next-label"><img alt="" src={calendar} /> Ближайшая запись</div>
                <strong>{format(next.confirmedDateTime)}</strong>
                <div className="compact-booking-next-person">
                    {next.provider?.avatarUrl && <img src={next.provider.avatarUrl} alt="" />}
                    <div>{name(next)}<small>{service(next)}</small></div>
                </div>
                <div className="compact-booking-actions">
                    {nextRoute ? <a href={nextRoute} target="_blank" rel="noreferrer"><Location />Маршрут</a>
                        : <button type="button" onClick={() => openChat(next.id)}>Открыть чат</button>}
                    {nextPhone && <a href={nextPhone} aria-label="Позвонить"><Phone /></a>}
                </div>
            </section>}
            <nav className="compact-booking-tabs" aria-label="Разделы записей">
                {tabs.map(({ key, label }) => <button type="button" key={key} aria-pressed={tab === key} onClick={() => changeTab(key)}>
                    {label}{key !== "history" && (key === "pending" ? pending.length : confirmed.length) > 0 &&
                        <span>{key === "pending" ? pending.length : confirmed.length}</span>}
                </button>)}
            </nav>
            {tab === "history" && records.length > 0 && <select className="compact-booking-filter" aria-label="Фильтр истории" value={history}
                onChange={(event) => changeHistory(event.target.value as HistoryFilter)}>
                {filters.map((key) => <option key={key} value={key}>{key === "all" ? "Все" : statuses[key]}</option>)}
            </select>}
            {notice && <p className="compact-booking-notice" data-kind={notice.kind} role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</p>}
            {loading ? <p className="compact-booking-empty" role="status">Загружаем записи…</p>
                : error ? <div className="compact-booking-empty" role="alert">Не удалось загрузить записи. <button type="button" onClick={reload}>Повторить</button></div>
                : !current.length ? <div className="compact-booking-empty">
                    <span><img alt="" src={calendar} /></span>
                    <strong>{tab === "history" && history !== "all" ? "Записей с таким статусом нет" : emptyCopy[tab][0]}</strong>
                    {!(tab === "history" && history !== "all") && <p>{emptyCopy[tab][1]}</p>}
                </div>
                : <div className="compact-booking-list">{current.map((order) => <BookingItem key={`${order.id}:${selected ?? ""}`} order={order}
                    selected={selected === order.id} onChat={() => openChat(order.id)} onCancel={() => cancel(order)} />)}</div>}
        </main>
        {children}
    </div>;
}
