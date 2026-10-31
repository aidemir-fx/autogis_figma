import { Button, Drawer, Slider } from "@common/components";
import {
    StatsCard,
    StatsContainer,
    StatItem,
    StatNumber,
    StatLabel,
    DrawerContainer,
    DrawerHeader,
    SliderWrapper,
    DrawerContent,
    ButtonWrapper,
    ContentWrapper,
} from "./styles";
import { FilterIcon, RullerIcon } from "@common/icons";
import { useState } from "react";
import { useQueryParams } from "@common/hooks";
import { DEFAULT_SEARCH_RADIUS } from "@modules/providers";

type ProvidersCounterProps = {
    nearCount: number;
    availableCount: number;
};

export const ProvidersCounter = (props: ProvidersCounterProps) => {
    const { nearCount, availableCount } = props;
    const { setParam, params } = useQueryParams();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [radius, setRadius] = useState(
        (params.radius as number) || DEFAULT_SEARCH_RADIUS
    );

    const handleChange = (_: any, value: unknown) => {
        setRadius(value as number);
    };

    const handleSave = () => {
        setIsDrawerOpen(false);
        setParam("radius", radius);
    };
    return (
        <>
            <StatsCard>
                <StatsContainer>
                    <StatItem>
                        <StatNumber>{nearCount}</StatNumber>
                        <StatLabel>Найдено</StatLabel>
                    </StatItem>
                    <StatItem>
                        <StatNumber color="#059669">
                            {availableCount}
                        </StatNumber>
                        <StatLabel>Доступно</StatLabel>
                    </StatItem>

                    <StatItem>
                        <Button
                            variant="outlined"
                            isFullWidth
                            icon={<FilterIcon />}
                            onClick={() => setIsDrawerOpen(true)}
                        >
                            Фильтр
                        </Button>
                    </StatItem>
                </StatsContainer>
            </StatsCard>
            <Drawer
                anchor="bottom"
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
            >
                <DrawerContainer>
                    <ContentWrapper>
                        <DrawerHeader>
                            <RullerIcon width="24px" height="24px" />{" "}
                            <span>Выберите радиус</span>
                        </DrawerHeader>
                        <DrawerContent >
                            <SliderWrapper>
                                <Slider
                                    aria-label="Temperature"
                                    defaultValue={
                                        (params.radius as number) ||
                                        DEFAULT_SEARCH_RADIUS
                                    }
                                    valueLabelDisplay="auto"
                                    shiftStep={30}
                                    step={10}
                                    marks
                                    min={0}
                                    max={200}
                                    onChange={handleChange}
                                />
                            </SliderWrapper>
                            <ButtonWrapper>
                                <Button onClick={handleSave}>Сохранить</Button>
                            </ButtonWrapper>
                        </DrawerContent>
                    </ContentWrapper>
                </DrawerContainer>
            </Drawer>
        </>
    );
};
