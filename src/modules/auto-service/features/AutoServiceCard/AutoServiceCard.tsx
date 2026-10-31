import { Button, Card } from "@common/components";
import {
    EyeIcon,
    MapPinIcon,
    OrganizationIcon,
    PhoneIcon,
    WrenchIcon,
} from "@common/icons";
import { formatDistanceFromUser } from "@common/lib/formatDistance";
import { AutoService, AutoServiceStatus } from "@modules/auto-service";
import {
    Avatar,
    AvatarFallback,
    ContentContainer,
    DescriptionWrapper,
    DetailsHeader,
    DistanceContainer,
    DistanceText,
    MasterDetails,
    MasterInfo,
    MasterName,
    SpecializationHeader,
    SpecializationLabel,
    SpecializationSection,
    SpecializationTag,
    SpecializationTags,
    StatusBadge,
    StatusDot,
    WorkingDay,
} from "@modules/masters/features/MasterPreview/styles";

const statusConfig = {
    available: {
        label: "Открыто",
        color: "#10b981",
        textColor: "#047857",
        bgColor: "#ecfdf5",
    },
    schedule: {
        label: "Закрыто",
        color: "#9ca3af",
        textColor: "#374151",
        bgColor: "#f1f5f9",
    },
    unavailable: {
        label: "Закрыто",
        color: "#9ca3af",
        textColor: "#374151",
        bgColor: "#f1f5f9",
    },
};

export const AutoServiceCard = ({
    autoService,
    size = "md",
    className,
    onShowOnMap,
}: {
    autoService: AutoService;
    size?: "bl" | "md" | "lg";
    className?: string;
    onShowOnMap?: (autoService: AutoService) => void;
}) => {
    const isOnMap = size === "bl";
    const isLg = size === "lg";
    const fullName = autoService.fullName || "Автосервис";
    const statusInfo =
        statusConfig[
            (autoService.currentStatus ||
                autoService.status ||
                AutoServiceStatus.UNAVAILABLE) as keyof typeof statusConfig
        ];
    const specs = [
        ...(autoService.professions || []).slice(0, 3),
        ...(autoService.services || []).slice(0, 2),
    ].slice(0, 4);

    return (
        <Card className={className}>
            <Card.Header>
                <MasterInfo $isOnMap={isOnMap}>
                    <Avatar>
                        <AvatarFallback>
                            <OrganizationIcon />
                        </AvatarFallback>
                    </Avatar>
                    <MasterDetails>
                        <DetailsHeader>
                            <MasterName>{fullName}</MasterName>
                        </DetailsHeader>
                        <DistanceContainer>
                            <MapPinIcon color="#3b82f6" />
                            <DistanceText>
                                {formatDistanceFromUser(autoService.distance)}
                            </DistanceText>
                        </DistanceContainer>
                        <StatusBadge
                            bgColor={statusInfo?.bgColor}
                            textColor={statusInfo?.textColor}
                        >
                            <StatusDot color={statusInfo?.color} />
                            {statusInfo?.label}
                        </StatusBadge>
                    </MasterDetails>
                </MasterInfo>
            </Card.Header>

            <Card.Content>
                <ContentContainer>
                    {isLg && autoService.description && (
                        <DescriptionWrapper>
                            {autoService.description}
                        </DescriptionWrapper>
                    )}

                    <SpecializationSection>
                        <SpecializationHeader>
                            <WrenchIcon color="#64748b" />
                            <SpecializationLabel>
                                Услуги и специализация:
                            </SpecializationLabel>
                        </SpecializationHeader>
                        <SpecializationTags>
                            {specs.length > 0 ? (
                                specs.map((spec, index) => (
                                    <SpecializationTag key={index}>
                                        {spec}
                                    </SpecializationTag>
                                ))
                            ) : (
                                <SpecializationTag>
                                    Специализация заполняется
                                </SpecializationTag>
                            )}
                        </SpecializationTags>
                    </SpecializationSection>

                    <SpecializationSection>
                        <SpecializationHeader>
                            <SpecializationLabel>Рабочие дни:</SpecializationLabel>
                        </SpecializationHeader>
                        <SpecializationTags>
                            {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map(
                                (day, index) => (
                                    <WorkingDay
                                        key={day}
                                        style={{
                                            backgroundColor: autoService
                                                .workingDays?.[index]
                                                ? "#ecfdf5"
                                                : "#f1f5f9",
                                            color: autoService.workingDays?.[
                                                index
                                            ]
                                                ? "#10b981"
                                                : "#9ca3af",
                                        }}
                                    >
                                        {day}
                                    </WorkingDay>
                                )
                            )}
                        </SpecializationTags>
                    </SpecializationSection>

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "8px",
                        }}
                    >
                        <a
                            href={
                                autoService.workingPhone
                                    ? `tel:${autoService.workingPhone}`
                                    : ""
                            }
                            style={{ width: "100%" }}
                        >
                            <Button icon={<PhoneIcon />} isFullWidth>
                                Позвонить
                            </Button>
                        </a>
                        <a
                            href={`/provider?id=${autoService.id}&type=auto_service`}
                            style={{ width: "100%" }}
                        >
                            <Button
                                icon={<EyeIcon />}
                                variant="outlined"
                                isFullWidth
                            >
                                Подробнее
                            </Button>
                        </a>
                    </div>
                </ContentContainer>
            </Card.Content>
        </Card>
    );
};
