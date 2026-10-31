import { Button, Card } from "@common/components";
import { EyeIcon, PhoneIcon, WrenchIcon } from "@common/icons";
import { WorkingDay } from "./styles";
import {
    ContentContainer,
    SpecializationSection,
    SpecializationHeader,
    SpecializationLabel,
    SpecializationTags,
    SpecializationTag,
    DescriptionWrapper,
} from "./styles";
import { MasterPreview } from "../MasterPreview";
import { Master } from "@modules/masters";

export const MasterCard = ({
    master,
    size = "md",
    className,
    onShowOnMap,
}: {
    master: Master;
    size?: "bl" | "md" | "lg";
    className?: string;
    onShowOnMap?: (master: Master) => void;
}) => {
    const isLg = size === "lg";

    const specs = [
        ...master.professions.slice(0, 1),
        ...master.services.slice(0, 2),
        ...master.autoMarks.slice(0, 1),
    ];
    const activityType = master.activityType || "master";

    return (
        <Card className={className}>
            <Card.Header>
                <MasterPreview
                    master={master}
                    size={size}
                    onShowOnMap={onShowOnMap}
                />
            </Card.Header>

            <Card.Content>
                <ContentContainer>
                    {isLg && (
                        <DescriptionWrapper>
                            {master.description}
                        </DescriptionWrapper>
                    )}
                    <SpecializationSection>
                        <SpecializationHeader>
                            <WrenchIcon color="#64748b" />

                            <SpecializationLabel>
                                Специализация:
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
                                    Нет специализаций
                                </SpecializationTag>
                            )}
                        </SpecializationTags>
                    </SpecializationSection>

                    <SpecializationSection>
                        <SpecializationHeader>
                            <SpecializationLabel>
                                Рабочие дни:
                            </SpecializationLabel>
                        </SpecializationHeader>
                        <SpecializationTags>
                            {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map(
                                (day, index) => (
                                    <WorkingDay
                                        key={day}
                                        style={{
                                            backgroundColor: master
                                                .workingDays?.[index]
                                                ? "#ecfdf5"
                                                : "#f1f5f9",
                                            color: master.workingDays?.[index]
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
                                master.workingPhone
                                    ? `tel:${master.workingPhone}`
                                    : ""
                            }
                            style={{ width: "100%" }}
                        >
                            <Button
                                icon={<PhoneIcon />}
                                isFullWidth
                                onClick={() => {
                                    if (master.workingPhone) {
                                        window.location.href = `tel:${master.workingPhone}`;
                                    }
                                }}
                            >
                                Позвонить
                            </Button>
                        </a>
                        <a
                            href={`/provider?id=${master.id}&type=${activityType}`}
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
