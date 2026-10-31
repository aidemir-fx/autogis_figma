import { useLogic } from "./useLogic";
import {
    PromptContainer,
    HeaderContainer,
    Title,
    CloseButton,
    Description,
    ButtonContainer,
} from "./styles";
import { Button } from "@common/components";

export const GeolocationPrompt = () => {
    const {
        isPromptVisible,
        isButtonLoading,
        requestGeolocationAccess,
        hidePrompt,
        errorMessage,
    } = useLogic();

    if (!isPromptVisible) {
        return null;
    }

    return (
        <PromptContainer>
            <HeaderContainer>
                <Title>Нет доступа к геоданным</Title>
                <CloseButton onClick={hidePrompt}>×</CloseButton>
            </HeaderContainer>
            <Description>
                {errorMessage || "Для корректной работы сервиса нужен доступ к геоданным."}
            </Description>
            <ButtonContainer>
                <Button
                    onClick={requestGeolocationAccess}
                    isLoading={isButtonLoading}
                >
                    Предоставить доступ
                </Button>
            </ButtonContainer>
        </PromptContainer>
    );
};
