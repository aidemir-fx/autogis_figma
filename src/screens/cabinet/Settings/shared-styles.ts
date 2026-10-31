import styled from "styled-components";

export const SettingsForm = styled.form``;

export const FieldGrid = styled.div`
    display: grid;
    width: 100%;
    grid-template-columns: 1fr 1fr;
    gap: 16px;

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
    }
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

export const TimePickersContainer = styled.div`
    display: flex;
    gap: 16px;
    margin-top: 4px;
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

export const AdditionalServiceWrapper = styled.div`
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
`;

export const SwitchRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
`;

export const SwitchLabel = styled.span`
    font-size: 14px;
    font-weight: 400;
`;
