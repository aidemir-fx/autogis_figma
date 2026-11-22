import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { http } from "@common/lib/http";
import { normalizeUserProfile } from "@common/lib/userAccess";
import backIcon from "./assets/back.svg?url";
import clearIcon from "./assets/clear.svg?url";
import eyeIcon from "./assets/eye-off.svg?url";
import lockIcon from "./assets/lock.svg?url";
import loginIcon from "./assets/login.svg?url";
import phoneIcon from "./assets/phone.svg?url";
import recoveryIcon from "./assets/recovery.svg?url";
import registerIcon from "./assets/register.svg?url";
import "./mobileAuth.css";

type Mode = "login" | "register" | "recover";
type Verification = {
    id: string;
    status: "pending" | "smsCodeRequired" | "smsCodeSubmitted" | "success" | "failed" | "expired";
    errorCode?: string;
};

const copy = {
    login: ["Вход в аккаунт", "Добро пожаловать!", "Войти", loginIcon],
    register: ["Регистрация", "Создать аккаунт", "Зарегистрироваться", registerIcon],
    recover: ["Восстановление пароля", "Восстановление пароля", "Изменить пароль", recoveryIcon],
};

function internalPath(value: unknown) {
    if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return null;
    const path = new URL(value, window.location.origin);
    if (path.origin !== window.location.origin || /^\/(login|register|recover)(\/|$)/.test(path.pathname)) return null;
    return path.pathname + path.search + path.hash;
}

export function useAuthReturn() {
    const { search, state } = useLocation();
    const from = state?.from;
    return internalPath(new URLSearchParams(search).get("returnTo")) ?? internalPath(from)
        ?? (from ? internalPath(`${from.pathname ?? ""}${from.search ?? ""}${from.hash ?? ""}`) : null);
}

export function AuthHeader({ title, to = "/" }: { title: string; to?: string }) {
    return (
        <header className="compact-auth-header">
            <Link to={to} aria-label="Назад"><img src={backIcon} alt="" /></Link>
            <span>{title}</span>
        </header>
    );
}

function AuthField({ label, icon, error, children, action }: {
    label: string; icon?: string; error?: string;
    children: (attributes: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
    action?: ReactNode;
}) {
    const id = useId();
    return (
        <div className="compact-auth-field">
            <label htmlFor={id}>{label}</label>
            <div className="compact-auth-input" data-invalid={Boolean(error)}>
                {icon && <img src={icon} alt="" />}
                {children({ id, "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-error` : undefined })}
                {action}
            </div>
            {error && <span className="compact-auth-error" id={`${id}-error`}>{error}</span>}
        </div>
    );
}

function formatPhone(value: string, separator = " ") {
    const raw = value.replace(/[^0-9]/g, "");
    const digits = (/^[78]/.test(raw) ? raw.slice(1) : raw).slice(0, 10);
    if (!raw) return "";
    let result = "+7";
    if (digits.length) result += " (" + digits.slice(0, 3);
    if (digits.length >= 3) result += ")";
    if (digits.length > 3) result += " " + digits.slice(3, 6);
    if (digits.length > 6) result += separator + digits.slice(6, 8);
    if (digits.length > 8) result += separator + digits.slice(8, 10);
    return result;
}

export function usePhoneVerificationConfig() {
    return useQuery({
        queryKey: ["phone-verification-config"],
        queryFn: async () => (await http.get<{ enabled: boolean }>("/auth/phone-verification")).data.enabled,
        staleTime: 60_000,
        retry: false,
    });
}

export function MobileAuth({ mode }: { mode: Mode }) {
    const [header, title, submitLabel, icon] = copy[mode];
    const navigate = useNavigate();
    const returnTo = useAuthReturn();
    const queryClient = useQueryClient();
    const { data: enabled, isError: verificationConfigError } = usePhoneVerificationConfig();
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [consent, setConsent] = useState(false);
    const [visible, setVisible] = useState(false);
    const [busy, setBusy] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [done, setDone] = useState(false);
    const [attempt, setAttempt] = useState<Verification | null>(null);
    const [retryAt, setRetryAt] = useState(0);
    const [now, setNow] = useState(Date.now);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const completePhone = phone.replace(/\D/g, "").length === 11;
    const destination = returnTo ?? (mode === "register" ? "/cabinet" : "/");
    const query = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    const needsVerification = mode === "recover" || (mode === "register" && enabled === true);
    const retryIn = Math.max(0, Math.ceil((retryAt - now) / 1000));
    const isWaiting = attempt?.status === "pending" || attempt?.status === "smsCodeSubmitted";

    useEffect(() => {
        if (mode !== "recover" && localStorage.getItem("accessToken")) navigate(destination, { replace: true });
    }, [destination, mode, navigate]);

    useEffect(() => {
        if (retryAt <= Date.now()) return;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [retryAt]);

    const attemptId = attempt?.id;
    useEffect(() => {
        if (!attemptId || !isWaiting) return;
        let disposed = false;
        let timer: number;
        const stopAt = Date.now() + 5 * 60_000;
        const poll = async () => {
            if (Date.now() >= stopAt) {
                setAttempt({ id: attemptId, status: "expired" });
                return;
            }
            try {
                const { data } = await http.post<Verification>("/auth/phone-verification/status", { id: attemptId });
                if (disposed) return;
                setAttempt(data);
                setErrors((current) => current.verification ? { ...current, verification: "" } : current);
                if (data.status !== "pending" && data.status !== "smsCodeSubmitted") return;
            } catch {
                if (disposed) return;
                setErrors((current) => ({ ...current, verification: "Связь прервалась. Проверяем ещё раз…" }));
            }
            timer = window.setTimeout(poll, 2500);
        };
        timer = window.setTimeout(poll, 2500);
        return () => { disposed = true; window.clearTimeout(timer); };
    }, [attemptId, isWaiting]);

    function changePhone(value: string) {
        setPhone(formatPhone(value));
        setAttempt(null);
        setCode("");
        setErrors({});
    }

    async function requestVerification() {
        if (!completePhone || verifying || retryIn) return;
        setVerifying(true);
        setErrors({});
        setCode("");
        try {
            const { data } = await http.post<Verification>("/auth/phone-verification", {
                phone: phone.replace(/\D/g, ""), purpose: mode === "register" ? "register" : "recover",
            });
            setAttempt(data);
            setNow(Date.now());
            setRetryAt(Date.now() + 30_000);
        } catch (error: any) {
            setErrors({ verification: error?.response?.status === 429
                ? "Слишком много запросов. Попробуйте позже."
                : "Не удалось запустить проверку номера. Попробуйте ещё раз." });
        } finally {
            setVerifying(false);
        }
    }

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (busy || verifying) return;
        const validation: Record<string, string> = {};
        if (!completePhone) validation.phone = "Введите номер телефона полностью";
        if (password.length < 6) validation.password = "Введите пароль длиной не менее 6 символов";
        if (mode === "register" && !consent) validation.consent = "Подтвердите согласие";
        if (needsVerification && attempt?.status !== "success" && !(attempt?.status === "smsCodeRequired" && code.length >= 3)) {
            validation.verification = "Подтвердите номер телефона";
        }
        setErrors(validation);
        if (Object.keys(validation).length) return;
        setBusy(true);
        try {
            if (attempt?.status === "smsCodeRequired") {
                const { data } = await http.post<Verification>("/auth/phone-verification/code", { id: attempt.id, code });
                setAttempt(data);
                return;
            }
            const path = mode === "recover" ? "/auth/password-reset" : `/auth/${mode}`;
            const { data } = await http.post(path, {
                phone: formatPhone(phone, "-"), password, agreedToPrivacy: consent, verificationId: attempt?.id,
            });
            if (mode === "recover") {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("user");
                queryClient.clear();
                setPassword("");
                setDone(true);
                return;
            }
            if (!data.accessToken || !data.refreshToken) throw new Error("Missing session");
            queryClient.removeQueries({ queryKey: ["userProfile"] });
            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("refreshToken", data.refreshToken);
            if (data.user) {
                const user = normalizeUserProfile(data.user);
                localStorage.setItem("user", JSON.stringify(user));
                queryClient.setQueryData(["userProfile", user.id], user);
            }
            navigate(destination, { replace: true });
        } catch (error: any) {
            const status = error?.response?.status;
            const errorCode = error?.response?.data?.code;
            if (mode === "login" && (status === 400 || status === 401)) {
                setErrors({ password: "Неверный телефон или пароль" });
            } else if (mode === "register" && (status === 409 || errorCode === "USER_EXISTS")) {
                setErrors({ phone: "Этот номер уже зарегистрирован" });
            } else {
                setErrors({ form: status === 429 ? "Слишком много попыток. Попробуйте позже."
                    : status === 400 && mode !== "login" ? "Проверьте пароль и подтверждение номера."
                    : "Не удалось отправить форму. Попробуйте ещё раз." });
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="compact-auth">
            <AuthHeader title={header} to={mode === "recover" ? `/login${query}` : (returnTo ?? "/")} />
            <main className="compact-auth-content">
                <div className="compact-auth-intro">
                    <div className="compact-auth-emblem"><img src={icon} alt="" /></div>
                    <h1>{done ? "Пароль изменён" : title}</h1>
                    {mode !== "recover" && <p>АвтоГис — надёжный сервис поиска автомастеров</p>}
                </div>
                {done ? (
                    <Link className="compact-auth-primary" to={`/login${query}`}>Войти с новым паролем</Link>
                ) : mode === "recover" && enabled !== true ? (
                    <p className="compact-auth-hint">{enabled === undefined && !verificationConfigError ? "Проверяем доступность восстановления…" : "Восстановление пароля пока недоступно."}</p>
                ) : (
                    <form className="compact-auth-form" onSubmit={submit} noValidate>
                        <AuthField label="Номер телефона" icon={phoneIcon} error={errors.phone}
                            action={mode === "recover" && phone && (
                                <button type="button" aria-label="Очистить номер" onClick={() => changePhone("")}><img src={clearIcon} alt="" /></button>
                            )}>
                            {(attributes) => <input {...attributes} value={phone} type="tel" autoComplete="tel" placeholder="+7 (000) 000 00 00"
                                disabled={verifying || busy} onChange={(event) => changePhone(event.target.value)} />}
                        </AuthField>
                        <AuthField label={mode === "recover" ? "Новый пароль" : "Пароль"} icon={lockIcon} error={errors.password}
                            action={<button type="button" aria-label={visible ? "Скрыть пароль" : "Показать пароль"} aria-pressed={visible}
                                onClick={() => setVisible(!visible)}><img src={eyeIcon} alt="" /></button>}>
                            {(attributes) => <input {...attributes} value={password} autoComplete={mode === "login" ? "current-password" : "new-password"}
                                type={visible ? "text" : "password"} placeholder="Введите пароль" onChange={(event) => setPassword(event.target.value)} />}
                        </AuthField>
                        {mode === "login" && enabled && <Link className="compact-auth-forgot" to={`/recover${query}`}>Не помню пароль</Link>}
                        {needsVerification && (
                            <div className="compact-auth-verify">
                                {attempt?.status === "smsCodeRequired" ? (
                                    <AuthField label="Код из SMS">
                                        {(attributes) => <input {...attributes} inputMode="numeric" autoComplete="one-time-code" placeholder="— — — —"
                                            value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 10))} />}
                                    </AuthField>
                                ) : attempt?.status === "success" ? (
                                    <p role="status">Номер подтверждён</p>
                                ) : (
                                    <button className="compact-auth-verify-button" type="button" disabled={!completePhone || verifying || retryIn > 0 || isWaiting}
                                        onClick={requestVerification}>{retryIn > 0 && !isWaiting ? `Повторить через ${retryIn} с` : "Подтвердить номер"}</button>
                                )}
                                {isWaiting && <p role="status">Подтвердите запрос на телефоне или дождитесь SMS.</p>}
                                {(attempt?.status === "expired" || attempt?.status === "failed") && <p role="alert">Проверка завершилась. Запросите её ещё раз.</p>}
                                {attempt?.errorCode === "sms_code_invalid" && <p role="alert" className="compact-auth-error">Неверный код из SMS.</p>}
                                {errors.verification && <p role="alert" className="compact-auth-error">{errors.verification}</p>}
                            </div>
                        )}
                        {mode === "register" && (
                            <>
                                <div className="compact-auth-consent">
                                    <input id="compact-auth-consent" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                                    <div><label htmlFor="compact-auth-consent">Я согласен с </label>
                                        <Link to="/privacy" state={{ from: `/register${query}` }}>политикой конфиденциальности</Link> и <Link to="/terms" state={{ from: `/register${query}` }}>условиями использования</Link>
                                    </div>
                                </div>
                                {errors.consent && <p className="compact-auth-error" role="alert">{errors.consent}</p>}
                            </>
                        )}
                        {errors.form && <p className="compact-auth-error" role="alert">{errors.form}</p>}
                        <button className="compact-auth-primary" type="submit" disabled={busy || isWaiting}>
                            {busy ? "Подождите…" : attempt?.status === "smsCodeRequired" ? "Подтвердить код" : submitLabel}
                        </button>
                        {mode !== "recover" && (
                            <div className="compact-auth-bottom">
                                <span>{mode === "login" ? "Ещё нет аккаунта?" : "Уже есть аккаунт?"}</span>
                                <Link to={`${mode === "login" ? "/register" : "/login"}${query}`}>{mode === "login" ? "Зарегистрироваться" : "Войти"}</Link>
                            </div>
                        )}
                    </form>
                )}
            </main>
        </div>
    );
}

export function LegalScreen({ kind }: { kind: "privacy" | "terms" }) {
    const { state } = useLocation();
    const { data, isPending, isError } = useQuery({
        queryKey: ["legal-document", kind],
        queryFn: async () => (await http.get<{ text: string }>(`/auth/legal/${kind}`)).data,
        retry: false,
    });
    return (
        <main className="compact-auth">
            <AuthHeader title={kind === "privacy" ? "Политика конфиденциальности" : "Условия использования"}
                to={typeof state?.from === "string" && /^\/register(?:\?|$)/.test(state.from) ? state.from : "/register"} />
            <div className="compact-auth-content compact-legal-text">
                {isPending ? "Загрузка…" : isError ? "Документ сейчас недоступен." : data?.text}
            </div>
        </main>
    );
}
