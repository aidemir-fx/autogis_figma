import { ReactNode, useEffect } from "react";
import { styled } from "styled-components";
import { CrossIcon } from "@common/icons";

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: fadeIn 0.2s ease-out;

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;

const ModalContainer = styled.div`
    position: relative;
    background: #f8fafc;
    border-radius: 24px;
    width: 100%;
    max-width: 480px;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    
    &::-webkit-scrollbar {
        width: 6px;
    }
    &::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 6px;
    }

    @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
    }
`;

const CloseButton = styled.button`
    position: absolute;
    top: 16px;
    right: 16px;
    width: 32px;
    height: 32px;
    border-radius: 16px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    transition: all 0.2s;
    color: #64748b;

    &:hover {
        background: #fee2e2;
        color: #ef4444;
        border-color: #fca5a5;
    }
    
    svg {
        width: 14px;
        height: 14px;
    }
`;

export const CustomModal = ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: ReactNode }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <Overlay onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <ModalContainer>
                <CloseButton onClick={onClose} aria-label="Закрыть">
                    <CrossIcon />
                </CloseButton>
                <div style={{ paddingTop: "40px" }}>{children}</div>
            </ModalContainer>
        </Overlay>
    );
};
