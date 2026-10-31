import { MapPinIcon } from "@common/icons";
import { LocationIconContainer, MapStubTitle, Root } from "./styles";

export const MapStub = () => {
    return (
        <Root>
            <LocationIconContainer>
                <MapPinIcon />
            </LocationIconContainer>
            <MapStubTitle>Карта загружается...</MapStubTitle>
        </Root>
    );
};
