import styled from "styled-components";

export const Title = styled.h3`
    font-size: 14px;
    font-weight: 400;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
`;

export const MainContainer = styled.div`
    padding-top: 24px;
    padding-bottom: 24px;
`;

export const FormContainer = styled.form``;

export const PaperStyled = styled.div`
    padding: 16px;
    width: 100%;
    border-radius: 14px;
    margin-bottom: 24px;
    box-shadow: none;
    border: 1px solid rgba(0, 0, 0, 0.1);
`;

export const WorkingDaysContainer = styled.div``;

export const SubmitButtonContainer = styled.div`
    position: sticky;
    bottom: 0;
    width: 100%;
    background: white;
    border-top: 1px solid #0000001a;
    padding: 16px;
    z-index: 10;
    margin-left: -16px;
    width: calc(100% + 32px);
`;

export const TimePickersContainer = styled.div`
    display: flex;
    gap: 16px;
    margin-top: 4px;
`;

export const MapContainer = styled.div`
    display: flex;
    gap: 8px;
    align-items: end;
    margin-bottom: 20px;
`;

export const MapTextField = styled.div`
    flex: 1;
`;

export const SectionTitle = styled.h4`
    font-size: 16px;
    font-weight: 500;
    margin: 0;
    margin-bottom: 16px;
`;
