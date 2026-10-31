import { useState } from "react";
import { styled } from "styled-components";
import { Provider } from "@modules/providers";
import { MasterStatus } from "@modules/masters";
import { formatDistanceFromUser } from "@common/lib/formatDistance";
import { ClockIcon, CrossIcon, MapPinIcon, StarIcon } from "@common/icons";

interface MobileBottomSummaryProps {
    totalCount: number;
    availableCount: number;
    radius: number;
    providers: Provider[];
    onSelectProvider: (provider: Provider) => void;
    onSwitchToList: () => void;
    onOpenRadiusPicker: () => void;
    onClose?: () => void;
}

const SummaryWrapper = styled.div<{ $collapsed?: boolean }>`
    width: 100%;
    background: #ffffff;
    border-radius: 14px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(226, 232, 240, 0.9);
    padding: ${({ $collapsed }) => ($collapsed ? "8px 10px" : "10px 10px 11px")};
    margin-top: 8px;
    margin-bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 6px);
    transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);

    @media (max-width: 600px) {
        border-radius: 12px;
        padding: ${({ $collapsed }) =>
            $collapsed ? "7px 9px" : "8px 9px 9px"};
    }
`;

const TopRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const CountInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;
    cursor: pointer;
`;

const MainCountText = styled.span`
    font-size: 13.5px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.25;

    b {
        color: #2563eb;
    }
`;

const SubCountText = styled.span`
    font-size: 11px;
    color: #16a34a;
    font-weight: 600;
    line-height: 1.2;
`;

const ActionControls = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
`;

const RadiusBadgeButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1d4ed8;
    padding: 4px 9px;
    border-radius: 8px;
    font-size: 11.5px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;

    &:hover {
        background: #dbeafe;
    }
`;

const ToggleCollapseButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #475569;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background: #f1f5f9;
        color: #0f172a;
    }
`;

const CloseButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s ease;

    svg {
        width: 14px;
        height: 14px;
    }

    &:hover {
        background: #fee2e2;
        border-color: #fca5a5;
        color: #ef4444;
    }
`;

const MiniCardsScroll = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    padding-top: 8px;
    padding-bottom: 2px;
    max-height: 320px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
`;

const MiniCard = styled.div`
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 12px;
    cursor: pointer;
    transition: transform 0.15s ease, border-color 0.15s ease;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    &:hover {
        border-color: #3b82f6;
        transform: translateY(-1px);
    }

    @media (max-width: 600px) {
        padding: 9px;
        border-radius: 12px;
    }
`;

const MiniCardHeader = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 9px;
    min-height: 58px;

    @media (max-width: 600px) {
        gap: 8px;
        min-height: 52px;
    }
`;

const MiniAvatar = styled.div`
    position: relative;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    overflow: hidden;
    background: #f1f5f9;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    font-size: 19px;
    font-weight: 800;
    color: #2563eb;
    margin-top: 2px;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    @media (max-width: 600px) {
        width: 38px;
        height: 38px;
        font-size: 15px;
    }
`;

const MiniStatusDot = styled.span<{ $available: boolean }>`
    position: absolute;
    bottom: 1px;
    right: 1px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${({ $available }) => ($available ? "#16a34a" : "#9ca3af")};
    border: 1px solid #ffffff;
`;

const MiniInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const MiniName = styled.span`
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.15;
    word-break: break-word;

    @media (max-width: 600px) {
        font-size: 13px;
    }
`;

const MiniSubtitle = styled.span`
    font-size: 12px;
    color: #64748b;
    font-weight: 500;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-top: 2px;
    margin-bottom: 5px;
    word-break: break-word;

    @media (max-width: 600px) {
        margin-top: 1px;
        margin-bottom: 4px;
        font-size: 10px;
    }
`;

const MiniSchedule = styled.span`
    display: none;
`;

const MiniStatusBadge = styled.span<{ $available: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    max-width: 100%;
    padding: 5px 8px;
    border-radius: 999px;
    background: ${({ $available }) => ($available ? "#dcfce7" : "#f1f5f9")};
    color: ${({ $available }) => ($available ? "#15803d" : "#64748b")};
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;

    &::before {
        width: 8px;
        height: 8px;
        flex: 0 0 8px;
        border-radius: 50%;
        background: ${({ $available }) => ($available ? "#16a34a" : "#94a3b8")};
        content: "";
    }

    @media (max-width: 600px) {
        gap: 4px;
        max-width: 100%;
        overflow: visible;
        padding: 4px 6px;
        font-size: 9.5px;
        line-height: 1.15;
        white-space: normal;

        &::before {
            width: 6px;
            height: 6px;
            flex-basis: 6px;
        }
    }
`;

const MiniScheduleBadge = styled.span`
    display: grid;
    grid-template-columns: 12px minmax(0, 1fr);
    align-items: center;
    column-gap: 4px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    color: #58718f;
    font-size: 10px;
    font-weight: 600;
    line-height: 1.1;

    svg {
        width: 12px;
        height: 12px;
        flex: 0 0 12px;
    }

    span {
        display: block;
        width: 100%;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: left;
    }
`;

const MiniMeta = styled.div`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    margin-top: 8px;
    padding-top: 7px;
    border-top: 1px solid #e5edf5;
    font-size: 13px;
    color: #64748b;

    @media (max-width: 600px) {
        gap: 4px;
        margin-top: 7px;
        padding-top: 6px;
        font-size: 11px;
    }
`;

const MiniMetaTop = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    min-width: 0;
    width: 100%;
`;

const MiniRating = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 15px;
    font-weight: 800;
    color: #d97706;

    svg {
        width: 16px;
        height: 16px;
        fill: #f59e0b;
        color: #f59e0b;
    }

    @media (max-width: 600px) {
        gap: 3px;
        font-size: 13px;

        svg {
            width: 14px;
            height: 14px;
        }
    }
`;

const MiniDistance = styled.span`
    display: block;
    min-width: 0;
    overflow: hidden;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #7890ae;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;

    svg {
        width: 14px;
        height: 14px;
        flex: 0 0 14px;
    }

    @media (max-width: 600px) {
        font-size: 10px;

        svg {
            width: 12px;
            height: 12px;
        }
    }
`;

const MiniScheduleInfo = styled.span`
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: #58718f;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;

    svg {
        width: 15px;
        height: 15px;
        flex: 0 0 15px;
    }

    span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    @media (max-width: 600px) {
        gap: 4px;
        overflow: hidden;
        font-size: 10px;
        text-overflow: ellipsis;

        svg {
            width: 12px;
            height: 12px;
            flex-basis: 12px;
        }
    }
`;

const MiniMetaDivider = styled.span`
    width: 1px;
    height: 18px;
    flex: 0 0 1px;
    background: #cbd5e1;

    @media (max-width: 600px) {
        height: 14px;
    }
`;

function formatClockShort(time?: string): string | undefined {
    return time ? time.slice(0, 2) : undefined;
}

function getSchedule(provider: Provider): string {
    const workFrom = formatClockShort(provider.workFrom);
    const workTo = formatClockShort(provider.workTo);
    const activeDays = provider.workingDays?.filter(Boolean).length ?? 0;

    if (workFrom && workTo) {
        return `${activeDays ? `${activeDays}д` : "Гр"} · ${workFrom}-${workTo}`;
    }

    return activeDays ? `${activeDays}д` : "Не уточнено";
}

function getSpecialization(provider: Provider): string {
    return (
        provider.professions?.[0] ||
        provider.services?.[0] ||
        provider.autoMarks?.[0] ||
        "Специализация не указана"
    );
}

function getDistanceLabel(provider: Provider): string {
    if (typeof provider.distance === "number" && Number.isFinite(provider.distance)) {
        return formatDistanceFromUser(provider.distance);
    }

    return "";
}

export const MobileBottomSummary = ({
    totalCount,
    availableCount,
    radius,
    providers,
    onSelectProvider,
    onOpenRadiusPicker,
    onClose,
}: MobileBottomSummaryProps) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const previewList = providers.slice(0, 10);

    return (
        <SummaryWrapper $collapsed={isCollapsed}>
            <TopRow>
                <CountInfo
                    onClick={() => setIsCollapsed((prev) => !prev)}
                    role="button"
                    tabIndex={0}
                    aria-label={isCollapsed ? "Развернуть карточки специалистов" : "Свернуть карточки специалистов"}
                >
                    <MainCountText>
                        Рядом <b>{totalCount}</b> специалистов
                    </MainCountText>
                    <SubCountText>
                        {availableCount > 0
                            ? `● ${availableCount} доступны прямо сейчас`
                            : "Все специалисты на карте"}
                    </SubCountText>
                </CountInfo>

                <ActionControls>
                    <RadiusBadgeButton
                        onClick={onOpenRadiusPicker}
                        aria-label="Изменить радиус"
                    >
                        📍 {radius} км ▾
                    </RadiusBadgeButton>
                    <ToggleCollapseButton
                        onClick={() => setIsCollapsed((prev) => !prev)}
                        title={isCollapsed ? "Развернуть" : "Свернуть"}
                        aria-label={isCollapsed ? "Развернуть" : "Свернуть"}
                    >
                        {isCollapsed ? "▲" : "▼"}
                    </ToggleCollapseButton>
                    {onClose && (
                        <CloseButton
                            onClick={onClose}
                            title="Скрыть окно"
                            aria-label="Скрыть окно"
                        >
                            <CrossIcon />
                        </CloseButton>
                    )}
                </ActionControls>
            </TopRow>

            {!isCollapsed && previewList.length > 0 && (
                <MiniCardsScroll>
                    {previewList.map((p) => {
                        const name =
                            p.fullName || p.businessName || p.name || "Мастер";
                        const isAvail =
                            (p.currentStatus || p.status) ===
                            MasterStatus.AVAILABLE;
                        const dist = getDistanceLabel(p);

                        return (
                            <MiniCard
                                key={`mini-${p.id}`}
                                onClick={() => onSelectProvider(p)}
                            >
                                <MiniCardHeader>
                                    <MiniAvatar>
                                        {p.avatarUrl || p.coverImageUrl || p.coverImage ? (
                                            <img
                                                src={p.avatarUrl || p.coverImageUrl || p.coverImage}
                                                alt={name}
                                            />
                                        ) : (
                                            name[0]?.toUpperCase() || "M"
                                        )}
                                        <MiniStatusDot $available={isAvail} />
                                    </MiniAvatar>
                                    <MiniInfo>
                                        <MiniName title={name}>{name}</MiniName>
                                        <MiniSubtitle title={getSpecialization(p)}>
                                            {getSpecialization(p)}
                                        </MiniSubtitle>
                                        <MiniScheduleBadge>
                                            <ClockIcon />
                                            <span>{getSchedule(p)}</span>
                                        </MiniScheduleBadge>
                                    </MiniInfo>
                                </MiniCardHeader>
                                <MiniMeta>
                                    <MiniMetaTop>
                                        <MiniRating>
                                            <StarIcon />
                                            {(p.rating || 0).toFixed(1)}
                                        </MiniRating>
                                        <MiniStatusBadge $available={isAvail}>
                                            {isAvail ? "Свободен" : "Недоступен"}
                                        </MiniStatusBadge>
                                    </MiniMetaTop>
                                    <MiniDistance>
                                        <MapPinIcon />
                                        {dist}
                                    </MiniDistance>
                                </MiniMeta>
                            </MiniCard>
                        );
                    })}
                </MiniCardsScroll>
            )}
        </SummaryWrapper>
    );
};
