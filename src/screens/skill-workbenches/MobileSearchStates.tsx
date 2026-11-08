import type React from "react";
import { useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ActivityType, Provider } from "@modules/providers";
import { MasterStatus } from "@modules/masters";
import { MobileSearchExperience, type MobileProviderCategory } from "@screens/main-page/MobileSearchExperience";

const categories: MobileProviderCategory[] = [
    { type: ActivityType.master, title: "Частные мастера", empty: "Мастера не найдены. Попробуйте изменить фильтры." },
    { type: ActivityType.auto_service, title: "Автосервисы", empty: "Автосервисы не найдены. Попробуйте увеличить радиус." },
    { type: ActivityType.auto_shop, title: "Автомагазины", empty: "Автомагазины не найдены. Попробуйте увеличить радиус." },
    { type: ActivityType.auto_wash, title: "Автомойки", empty: "Автомойки не найдены. Попробуйте увеличить радиус." },
];

const provider = (type: ActivityType, n: number): Provider => ({
    id: `workbench-${type}-${n}`, userId: `workbench-user-${n}`, activityType: type,
    fullName: type === ActivityType.master ? (n === 1 ? "Александр Петров" : `Мастер ${n}`) : undefined,
    name: type === ActivityType.master ? undefined : ({
        [ActivityType.auto_service]: "Автосервис «Гараж»",
        [ActivityType.auto_shop]: "Магазин автозапчастей «Деталь»",
        [ActivityType.auto_wash]: "Автомойка «Чистый кузов»",
        [ActivityType.master]: "",
    })[type],
    businessName: type === ActivityType.master ? undefined : undefined,
    address: "ул. Примерная, 12", coordinates: { x: 43.2156 + n * 0.003, y: 46.8945 + n * 0.003 },
    status: n % 2 ? MasterStatus.AVAILABLE : MasterStatus.UNAVAILABLE,
    currentStatus: n % 2 ? MasterStatus.AVAILABLE : MasterStatus.UNAVAILABLE,
    description: "Обслуживание и ремонт автомобилей",
    rating: n % 2 ? 4.9 : 4.6, reviewsCount: 21 + n,
    professions: type === ActivityType.master ? ["Автомаляр", "Автослесарь", "Кузовщик"] : [],
    autoMarks: [], services: type === ActivityType.master ? ["Диагностика", "Ремонт ходовой"] : ["Диагностика", "Ремонт автомобилей", "Шиномонтаж"],
    payments: ["cash", "card"], workingDays: [true, true, true, true, true, true, false],
    workFrom: "08:00", workTo: "19:00", distance: 250 + n * 140,
    onlineBookingEnabled: type === ActivityType.auto_service || type === ActivityType.auto_wash,
    coverImageUrl: undefined, avatarUrl: undefined,
});

const dataStates = ["loading", "error", "empty", "one-master", "mixed-results", "long-catalog"] as const;
const accounts = ["guest", "signed-in"] as const;
type DataState = typeof dataStates[number];
type AccountState = typeof accounts[number];

function isDataState(value: string | null): value is DataState { return dataStates.includes(value as DataState); }
function isAccountState(value: string | null): value is AccountState { return accounts.includes(value as AccountState); }

function fixture(state: DataState): Provider[] {
    if (state === "empty" || state === "loading" || state === "error") return [];
    if (state === "one-master") return [provider(ActivityType.master, 1)];
    if (state === "mixed-results") return categories.map((category, index) => provider(category.type, index + 1));
    return Array.from({ length: 12 }, (_, index) => provider(ActivityType.master, index + 1));
}

const switcherStyle: React.CSSProperties = { background: "#171717", color: "white", borderRadius: 12, padding: 12, font: "13px system-ui", display: "grid", gap: 10 };

export function MobileSearchStatesWorkbench() {
    const [params, setParams] = useSearchParams();
    const state: DataState = isDataState(params.get("__state")) ? params.get("__state") as DataState : "mixed-results";
    const account: AccountState = isAccountState(params.get("__account")) ? params.get("__account") as AccountState : "guest";
    const providers = useMemo(() => fixture(state), [state]);
    const providersByType = Object.fromEntries(categories.map(({ type }) => [type, providers.filter((item) => item.activityType === type)])) as Record<ActivityType, Provider[]>;
    const countsByType = Object.fromEntries(categories.map(({ type }) => [type, providersByType[type].length])) as Record<ActivityType, number>;
    const mastersRef = useRef<Record<string, any>>({});
    const mapInstanceRef = useRef<any | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const setState = (key: "__state" | "__account", value: string) => setParams((current) => { current.set(key, value); current.set("__focus", value); return current; });
    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.altKey || event.ctrlKey || event.metaKey || ["INPUT", "SELECT", "TEXTAREA"].includes((event.target as HTMLElement).tagName)) return;
        if (event.key.toLowerCase() === "h") { document.documentElement.classList.toggle("hide-workbench-switcher"); return; }
        if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) return;
        const focusedState = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>("[data-state]")?.dataset.state;
        const order = [...dataStates, ...accounts];
        const current = focusedState || (params.get("__focus") ?? state);
        const index = Math.max(0, order.indexOf(current as typeof order[number]));
        const nextIndex = (index + (event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1) + order.length) % order.length;
        const next = order[nextIndex];
        event.preventDefault();
        setParams((currentParams) => {
            currentParams.set("__focus", next);
            if (dataStates.includes(next as DataState)) currentParams.set("__state", next);
            else currentParams.set("__account", next);
            return currentParams;
        });
    };
    const activeProviders = state === "loading" || state === "error" ? [] : providers;
    const categoryList = categories;

    return <main onKeyDown={onKeyDown} style={{ padding: 12, minHeight: "100vh", background: "#ddd", containerType: "inline-size" }}>
        <div className="workbench-layout">
            <nav className="workbench-switcher" aria-label="Сценарии стенда" style={switcherStyle}>
                <div role="group" aria-labelledby="wb-data"><strong id="wb-data">Данные ↘</strong>
                    {dataStates.map((item) => <button key={item} data-state={item} aria-pressed={state === item} onClick={() => setState("__state", item)}>{item}</button>)}
                </div>
                <div role="group" aria-labelledby="wb-account"><strong id="wb-account">Аккаунт ↘</strong>
                    {accounts.map((item) => <button key={item} data-state={item} aria-pressed={account === item} onClick={() => setState("__account", item)}>{item}</button>)}
                </div>
            </nav>
            <div className="workbench-select" style={{ ...switcherStyle, position: "relative" }}>
                <label>Сценарий <select value={state} onChange={(event) => setState("__state", event.target.value)}>{dataStates.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label>Аккаунт <select value={account} onChange={(event) => setState("__account", event.target.value)}>{accounts.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            </div>
            <section className="workbench-stage" aria-label="Главный мобильный поиск" style={{ width: 388, height: 820, overflow: "hidden", background: "white" }}>
                <MobileSearchExperience
                    query={[]} onQueryChange={() => undefined} onlyAvailable={false} onOnlyAvailableChange={() => undefined}
                    isRadiusPickerOpen={false} onRadiusPickerOpen={() => undefined} onRadiusPickerClose={() => undefined} onRadiusChange={() => undefined}
                    radius={10} activeTypes={categories.map(({ type }) => type)} isAllTypesActive onAllTypesClick={() => undefined} onActivityTypeClick={() => undefined}
                    categories={categoryList} providersByType={providersByType} countsByType={countsByType} totalNearbyCount={activeProviders.length}
                    filteredAllProviders={activeProviders} isLoading={state === "loading"} isError={state === "error"} errorMessage="Не удалось загрузить предложения. Проверьте подключение и повторите попытку."
                    onRetry={() => undefined} onShowOnMap={() => undefined} onOpenProfile={() => undefined} onFocusMap={() => undefined} userCoords={[43.2156, 46.8945]}
                    mastersRef={mastersRef} mapInstanceRef={mapInstanceRef} mapRef={mapRef} isMapAttentionVisible={false} mapAttentionKey={0}
                    isAuthenticated={account === "signed-in"} profileName={account === "signed-in" ? "Александр Петров" : undefined}
                />
            </section>
        </div>
        <style>{`.workbench-layout{display:flex;flex-direction:column;gap:16px;max-width:388px;margin:auto}.workbench-switcher{display:none}.workbench-select select{font:inherit}.workbench-switcher button{display:block;width:100%;text-align:left;background:transparent;color:white;border:0;padding:6px;cursor:pointer}.workbench-switcher button[aria-pressed=true]{font-weight:700;background:#3b3b3b}@container (min-width: 676px){.workbench-layout{display:grid;grid-template-columns:208px 388px;justify-content:center;gap:24px;max-width:none;align-items:start}.workbench-switcher{display:flex;position:sticky;top:12px}.workbench-select{display:none!important}}.hide-workbench-switcher .workbench-switcher,.hide-workbench-switcher .workbench-select{visibility:hidden}`}</style>
    </main>;
}
