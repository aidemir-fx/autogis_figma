import { Provider } from "../../../types";
import { ProviderShowcaseCard } from "../../ProviderShowcaseCard";

interface ProvidersRadiusListItemProps {
    provider: Provider;
    onProviderClick?: (provider: Provider) => void;
}

export const ProvidersRadiusListItem = ({
    provider,
    onProviderClick,
}: ProvidersRadiusListItemProps) => {
    return (
        <ProviderShowcaseCard
            provider={provider}
            onShowOnMap={onProviderClick}
        />
    );
};
