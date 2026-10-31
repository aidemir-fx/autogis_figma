import { Box, Typography, CircularProgress } from "@mui/material";

import { MastersListContainer, GridList } from "./styles";
import { useQueryParams } from "@common/hooks";
import { DEFAULT_SEARCH_RADIUS, Provider } from "@modules/providers";
import { ProvidersRadiusListItem } from "./ProviderRadiusListItem";
import { StaggerList, StaggerItem } from "@common/components";

interface ProvidersRadiusListProps {
    providers?: Provider[];
    isLoading?: boolean;
    onProviderClick?: (provider: Provider) => void;
}

export const ProvidersRadiusList = ({
    providers = [],
    isLoading = false,
    onProviderClick,
}: ProvidersRadiusListProps) => {
    const { params } = useQueryParams();
    const radius = (params.radius as string) || DEFAULT_SEARCH_RADIUS;
    if (isLoading) {
        return (
            <MastersListContainer>
                <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    p={4}
                >
                    <CircularProgress />
                    <Typography variant="body2" sx={{ ml: 2 }}>
                        Загрузка предложений...
                    </Typography>
                </Box>
            </MastersListContainer>
        );
    }

    if (providers.length === 0) {
        return (
            <MastersListContainer>
                <Typography variant="body2" textAlign="center" p={2}>
                    Предложений в радиусе {radius}км не найдено
                </Typography>
            </MastersListContainer>
        );
    }
    return (
        <MastersListContainer>
            <StaggerList>
                <GridList>
                    {providers.map((provider) => (
                        <StaggerItem key={provider.id}>
                            <ProvidersRadiusListItem
                                provider={provider}
                                onProviderClick={onProviderClick}
                            />
                        </StaggerItem>
                    ))}
                </GridList>
            </StaggerList>
        </MastersListContainer>
    );
};
