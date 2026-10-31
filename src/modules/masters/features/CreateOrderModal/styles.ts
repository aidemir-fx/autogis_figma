import { DialogContent } from "@mui/material";
import { styled } from "styled-components";

// ─── Layout ───────────────────────────────────────────────────────────────────

export const DialogHeaderWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;

    svg {
        color: #64b441;
        width: 22px;
        height: 22px;
        flex-shrink: 0;
    }
`;

export const Title = styled.h3`
    font-size: 18px;
    font-weight: 600;
    line-height: 1.3;
    color: #262626;
    padding: 0;
    margin: 0;
`;

export const StyledDialogContent = styled(DialogContent)`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-top: 20px !important;
`;

// ─── Time preference hint ──────────────────────────────────────────────────────

export const TimeHint = styled.p`
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin: 0;
    padding: 10px 12px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.5;
    color: #92400e;
`;

// ─── Photo upload ──────────────────────────────────────────────────────────────

export const PhotoSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const PhotoSectionLabel = styled.span`
    font-size: 13px;
    font-weight: 500;
    color: #4d4d4d;
`;

export const PhotoGrid = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

export const PhotoThumb = styled.div`
    position: relative;
    width: 72px;
    height: 72px;
    border-radius: 8px;
    overflow: hidden;
    border: 1.5px solid #e5e7eb;
    background: #f3f4f6;
    flex-shrink: 0;
`;

export const PhotoThumbImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
`;

export const PhotoRemoveButton = styled.button`
    position: absolute;
    top: 3px;
    right: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.55);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: background 0.15s;

    &:hover {
        background: rgba(0, 0, 0, 0.75);
    }

    svg {
        width: 10px;
        height: 10px;
        color: #fff;
    }
`;

export const PhotoUploadingOverlay = styled.div`
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
`;

export const PhotoErrorOverlay = styled.div`
    position: absolute;
    inset: 0;
    background: rgba(189, 9, 53, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #bd0935;
    text-align: center;
    padding: 4px;
`;

export const AddPhotoButton = styled.label`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 72px;
    height: 72px;
    border-radius: 8px;
    border: 1.5px dashed #d1d5db;
    background: #f9fafb;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    flex-shrink: 0;

    &:hover {
        border-color: #64b441;
        background: #f0fde4;
    }

    svg {
        width: 20px;
        height: 20px;
        color: #9ca3af;
    }

    span {
        font-size: 10px;
        color: #9ca3af;
        font-weight: 500;
    }

    input {
        display: none;
    }
`;
