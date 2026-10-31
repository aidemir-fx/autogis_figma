import type { KeyboardEvent, MouseEvent } from "react";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import {
    CalendarIcon,
    ClockIcon,
    EyeIcon,
    MapPinIcon,
    PhoneIcon,
    StarIcon,
    WrenchIcon,
} from "@common/icons";
import { formatDistanceFromUser } from "@common/lib/formatDistance";
import { useUserProfile } from "@common/hooks";
import { MasterStatus } from "@modules/masters";
import { ActivityType, Provider } from "../../types";
import {
    ActionLink,
    Actions,
    Avatar,
    AvatarImage,
    Block,
    BlockTitle,
    Body,
    CardRoot,
    Cover,
    CoverBadge,
    CoverImage,
    CoverOverlays,
    CoverRow,
    CoverScrim,
    CoverStatusPill,
    Day,
    Days,
    Distance,
    Dot,
    Identity,
    LiveDot,
    MasterHead,
    MetaRow,
    OnlinePill,
    PaymentIcons,
    PaymentIcon,
    PaymentRow,
    ScheduleRow,
    OrgAddress,
    OrgIdentity,
    OrgMeta,
    ProviderName,
    RatingPill,
    Reviews,
    StatusPill,
    StatusRow,
    Tag,
    Tags,
} from "./styles";

const WEEK_DAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const WEEK_DAYS_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type VisualStatus = "on" | "busy" | "off";

type ProviderShowcaseCardProps = {
    provider: Provider;
    isSelfProvider?: boolean;
    className?: string;
    onShowOnMap?: (provider: Provider) => void;
    onOpenProfile?: (provider: Provider) => void;
};

function getProviderType(provider: Provider): ActivityType {
    return provider.activityType || ActivityType.master;
}

function isMasterProvider(provider: Provider): boolean {
    return getProviderType(provider) === ActivityType.master;
}

function shouldShowBookingAction(provider: Provider): boolean {
    const type = getProviderType(provider);

    return (
        Boolean(provider.onlineBookingEnabled) &&
        !provider.liveQueueEnabled &&
		type !== ActivityType.auto_wash &&
        (type === ActivityType.master ||
            type === ActivityType.auto_service)
    );
}

function getDisplayName(provider: Provider): string {
    return (
        provider.fullName ||
        provider.businessName ||
        provider.name ||
        (isMasterProvider(provider) ? "Мастер" : "Организация")
    );
}

function getInitials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function getAvatarUrl(provider: Provider): string | undefined {
    // Do not use the personal account avatar in a professional card.
    return provider.avatarUrl || undefined;
}

function getCoverUrl(provider: Provider): string | undefined {
    return provider.coverImageUrl || provider.coverImage || undefined;
}

function getVisualStatus(provider: Provider): VisualStatus {
    const status = provider.currentStatus || provider.status;

    if (status === MasterStatus.AVAILABLE) {
        return "on";
    }

    return "off";
}

function getStatusLabel(provider: Provider): string {
    const status = provider.currentStatus || provider.status;

    if (status === MasterStatus.AVAILABLE) {
        return isMasterProvider(provider) ? "На работе" : "Открыто";
    }

    return isMasterProvider(provider) ? "Не работает" : "Закрыто";
}

function formatClock(time?: string): string | undefined {
    if (!time) {
        return undefined;
    }

    return time.slice(0, 5);
}

function getStatusSummary(provider: Provider): string {
    const status = provider.currentStatus || provider.status;
    const label = getStatusLabel(provider);
    const workTo = formatClock(provider.workTo);

    if (status === MasterStatus.AVAILABLE && workTo) {
        return `${label} до ${workTo}`;
    }

    return label;
}

function formatWorkingDaysSummary(workingDays?: boolean[]): string {
    const activeIndexes =
        workingDays
            ?.map((isActive, index) => (isActive ? index : -1))
            .filter((index) => index >= 0) ?? [];

    if (activeIndexes.length === 0) {
        return "График уточняется";
    }

    if (activeIndexes.length === WEEK_DAYS_LABELS.length) {
        return "Ежедневно";
    }

    const ranges: string[] = [];
    let rangeStart = activeIndexes[0];
    let previous = activeIndexes[0];

    for (const index of activeIndexes.slice(1)) {
        if (index === previous + 1) {
            previous = index;
            continue;
        }

        ranges.push(
            rangeStart === previous
                ? WEEK_DAYS_LABELS[rangeStart]
                : `${WEEK_DAYS_LABELS[rangeStart]}-${WEEK_DAYS_LABELS[previous]}`
        );
        rangeStart = index;
        previous = index;
    }

    ranges.push(
        rangeStart === previous
            ? WEEK_DAYS_LABELS[rangeStart]
            : `${WEEK_DAYS_LABELS[rangeStart]}-${WEEK_DAYS_LABELS[previous]}`
    );

    return ranges.join(", ");
}

function buildTags(provider: Provider): string[] {
    const isMaster = isMasterProvider(provider);
    const tags = isMaster
        ? [
              ...(provider.professions || []).slice(0, 1),
              ...(provider.services || []).slice(0, 2),
              ...(provider.autoMarks || []).slice(0, 1),
          ]
        : [
              ...(provider.professions || []).slice(0, 3),
              ...(provider.services || []).slice(0, 2),
          ];

    const normalized = Array.from(new Set(tags.filter(Boolean)));

    if (normalized.length <= 4) {
        return normalized;
    }

    return [...normalized.slice(0, 3), `+${normalized.length - 3}`];
}

function getDetailsHref(provider: Provider): string {
    return `/provider?id=${provider.id}&type=${getProviderType(provider)}`;
}

function getPhoneHref(provider: Provider): string {
    return provider.workingPhone || provider.phone
        ? `tel:${provider.workingPhone || provider.phone}`
        : "#";
}

function RatingBadge({ provider }: { provider: Provider }) {
    const rating = provider.rating || 0;
    const reviewsCount = provider.reviewsCount || 0;

    return (
        <RatingPill>
            <StarIcon />
            {rating > 0 ? rating.toFixed(1) : "0.0"}
            <Reviews>({reviewsCount})</Reviews>
        </RatingPill>
    );
}

function WorkingDays({ provider, compact = false }: { provider: Provider; compact?: boolean }) {
    return (
        <Days $compact={compact}>
            {WEEK_DAYS.map((day, index) => (
                <Day key={day} $compact={compact} $isActive={Boolean(provider.workingDays?.[index])}>
                    {day}
                </Day>
            ))}
        </Days>
    );
}

function CardActions({ provider, isSelfProvider = false }: { provider: Provider; isSelfProvider?: boolean }) {
    const stopCardClick = (event: MouseEvent) => event.stopPropagation();

    if (shouldShowBookingAction(provider) && !isSelfProvider) {
        return (
            <Actions $layout="booking">
                <ActionLink href={getDetailsHref(provider)} $variant="booking" onClick={stopCardClick}>
                    <CalendarIcon />
                    Записаться
                </ActionLink>
                <ActionLink
                    href={getPhoneHref(provider)}
                    $variant="phoneIcon"
                    aria-label="Позвонить"
                    title="Позвонить"
                    onClick={stopCardClick}
                >
                    <PhoneIcon />
                </ActionLink>
            </Actions>
        );
    }

    return (
        <Actions>
            <ActionLink href={getPhoneHref(provider)} $variant="primary" onClick={stopCardClick}>
                <PhoneIcon />
                Позвонить
            </ActionLink>
            <ActionLink href={getDetailsHref(provider)} $variant="outline" onClick={stopCardClick}>
                <EyeIcon />
                Подробнее
            </ActionLink>
        </Actions>
    );
}

function MasterScheduleSummary({ provider }: { provider: Provider }) {
    return (
        <StatusRow>
            <StatusPill $status={getVisualStatus(provider)}>
                {getStatusSummary(provider)}
            </StatusPill>
            <Tag>{formatWorkingDaysSummary(provider.workingDays)}</Tag>
        </StatusRow>
    );
}

function TagsBlock({
    provider,
    compact = false,
}: {
    provider: Provider;
    compact?: boolean;
}) {
    const tags = buildTags(provider);
    const title = isMasterProvider(provider) ? "Специализация" : "Услуги";

    if (compact) {
        return (
            <Tags $compact>
                {tags.length > 0 ? (
                    tags.map((tag) => <Tag key={tag}>{tag}</Tag>)
                ) : (
                    <Tag>Заполняется</Tag>
                )}
            </Tags>
        );
    }

    return (
        <Block>
            <BlockTitle>
                <WrenchIcon />
                {title}
            </BlockTitle>
            <Tags>
                {tags.length > 0 ? (
                    tags.map((tag) => <Tag key={tag}>{tag}</Tag>)
                ) : (
                    <Tag>Заполняется</Tag>
                )}
            </Tags>
        </Block>
    );
}

const PAYMENT_LABELS: Record<string, string> = {
    cash: "Наличные",
    card: "Карта",
    sbp: "СБП",
    qr: "QR",
    apple_pay: "Apple Pay",
    google_pay: "Google Pay",
};

function CardPaymentIcons({ provider }: { provider: Provider }) {
    const payments = Array.from(new Set(provider.payments ?? []));
    if (payments.length === 0) {
        return null;
    }

    return (
        <div style={{ display: "flex", gap: 5, alignItems: "flex-start", marginTop: 4 }}>
            {payments.map((p) => {
                const shortLabel = p === "cash" ? "наличные" : p === "card" ? "карта" : p === "sbp" || p === "qr" ? "СБП" : p;
                const fullLabel = PAYMENT_LABELS[p] ?? p;
                const icon = p === "cash"
                    ? <PaymentsRoundedIcon sx={{ fontSize: 13, color: "#475569" }} />
                    : p === "card"
                        ? <CreditCardRoundedIcon sx={{ fontSize: 13, color: "#475569" }} />
                        : <QrCode2RoundedIcon sx={{ fontSize: 13, color: "#475569" }} />;
                return (
                    <div
                        key={p}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 1,
                        }}
                    >
                        <div
                            title={fullLabel}
                            aria-label={fullLabel}
                            style={{
                                width: 26,
                                height: 22,
                                borderRadius: 5,
                                border: "1px solid #E2E8F0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#F8FAFC",
                            }}
                        >
                            {icon}
                        </div>
                        <span style={{ fontSize: 8, fontWeight: 500, color: "#64748B", lineHeight: 1, whiteSpace: "nowrap" }}>
                            {shortLabel}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function MasterCard({
    provider,
    isSelfProvider,
}: ProviderShowcaseCardProps) {
    const name = getDisplayName(provider);
    const avatarUrl = getAvatarUrl(provider);
    const type = getProviderType(provider);
    const status = getVisualStatus(provider);

    return (
        <>
            <MasterHead>
                <Avatar>
                    {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt={name} />
                    ) : (
                        getInitials(name)
                    )}
                    <LiveDot $status={status} />
                </Avatar>
                <Identity>
                    <ProviderName $master>{name}</ProviderName>
                    <MetaRow>
                        <RatingBadge provider={provider} />
                        <Dot />
                        <Distance>
                            {formatDistanceFromUser(provider.distance)}
                        </Distance>
                    </MetaRow>
                    <CardPaymentIcons provider={provider} />
                </Identity>
                {provider.liveQueueEnabled ? (
                    <OnlinePill>
                        <ClockIcon />
                        Живая очередь
                    </OnlinePill>
				) : provider.onlineBookingEnabled && type !== ActivityType.auto_wash ? (
                    <OnlinePill>
                        <CalendarIcon />
                        Запись онлайн
                    </OnlinePill>
                ) : null}
            </MasterHead>
            <Body>
                <MasterScheduleSummary provider={provider} />
                <BlockTitle $compact>
                    <WrenchIcon />
                    Специализация
                </BlockTitle>
                <TagsBlock provider={provider} compact />
                <CardActions provider={provider} isSelfProvider={isSelfProvider} />
            </Body>
        </>
    );
}

function OrganizationCard({
    provider,
    isSelfProvider,
}: ProviderShowcaseCardProps) {
    const name = getDisplayName(provider);
    const type = getProviderType(provider);
    const coverUrl = getCoverUrl(provider);
    const status = getVisualStatus(provider);

    return (
        <>
            <Cover $activityType={type}>
                {coverUrl && <CoverImage src={coverUrl} alt={name} />}
                <CoverScrim />
                <CoverOverlays>
                    <CoverRow>
						{(provider.liveQueueEnabled || (provider.onlineBookingEnabled && type !== ActivityType.auto_wash)) && (
                            <OnlinePill $cover>
                                {provider.liveQueueEnabled ? <ClockIcon /> : <CalendarIcon />}
                                {provider.liveQueueEnabled ? "Живая очередь" : "Запись онлайн"}
                            </OnlinePill>
                        )}
                        <CoverBadge>
                            <StarIcon />
                            {provider.rating ? provider.rating.toFixed(1) : "0.0"}
                            <Reviews>({provider.reviewsCount || 0})</Reviews>
                        </CoverBadge>
                    </CoverRow>
                    <CoverRow>
                        <CoverStatusPill $status={status}>
                            {getStatusLabel(provider)}
                        </CoverStatusPill>
                    </CoverRow>
                </CoverOverlays>
            </Cover>
            <OrgIdentity>
                <ProviderName>{name}</ProviderName>
                <OrgMeta>
                    <Distance>
                        <MapPinIcon />
                        {formatDistanceFromUser(provider.distance)}
                    </Distance>
                    <Dot />
                    <OrgAddress>{provider.address || "Адрес уточняется"}</OrgAddress>
                </OrgMeta>
                <CardPaymentIcons provider={provider} />
            </OrgIdentity>
            <Body>
                <TagsBlock provider={provider} />
                <Block>
                    <ScheduleRow>
                        <BlockTitle>Рабочие дни</BlockTitle>
                        <WorkingDays provider={provider} compact />
                    </ScheduleRow>
                </Block>
                <CardActions provider={provider} isSelfProvider={isSelfProvider} />
            </Body>
        </>
    );
}

export const ProviderShowcaseCard = ({
    provider,
    className,
    onShowOnMap,
    onOpenProfile,
}: ProviderShowcaseCardProps) => {
    const isMaster = isMasterProvider(provider);
    const { profile: currentProfile } = useUserProfile();
    const isSelfProvider = Boolean(currentProfile?.id && currentProfile.id === provider.userId);
    const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (onOpenProfile && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            onOpenProfile(provider);
        }
    };

    return (
        <CardRoot
            className={className}
            $variant={isMaster ? "master" : "organization"}
            onClick={onOpenProfile ? () => onOpenProfile(provider) : undefined}
            onKeyDown={onOpenProfile ? handleCardKeyDown : undefined}
            role={onOpenProfile ? "link" : undefined}
            tabIndex={onOpenProfile ? 0 : undefined}
            $clickable={Boolean(onOpenProfile)}
        >
            {isMaster ? (
                <MasterCard provider={provider} isSelfProvider={isSelfProvider} onShowOnMap={onShowOnMap} onOpenProfile={onOpenProfile} />
            ) : (
                <OrganizationCard
                    provider={provider}
                    isSelfProvider={isSelfProvider}
                    onShowOnMap={onShowOnMap}
                    onOpenProfile={onOpenProfile}
                />
            )}
        </CardRoot>
    );
};
