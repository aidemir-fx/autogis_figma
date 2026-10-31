import styled from "styled-components";

export const ProfessionsContainer = styled.div`
    width: 100%;
`;

export const ProfessionsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 16px;
`;

export const ProfessionItem = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    border: 2px solid #2b7fff;
    color: #1447e6;
    font-weight: 500;
    border-radius: 8px;
    background-color: #eff6ff;
`;

export const ProfessionText = styled.div`
    font-size: 14px;
`;

export const RemoveButton = styled.button`
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    font-size: 18px;
    padding: 4px;
    line-height: 1;
    min-width: auto;

    &:hover {
        color: #333;
    }
`;

export const EmptyProfessions = styled.div`
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 16px 0;
`;

export const AddProfessionContainer = styled.div`
    margin-top: 8px;
`;
