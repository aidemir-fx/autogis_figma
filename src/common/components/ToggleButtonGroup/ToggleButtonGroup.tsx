import React from "react";
import {
    SecondaryItem,
    SuccessItem,
    ToggleButtonGroupContainer,
    ToggleButtonGroupItem,
    WarningItem,
} from "./styles";

interface ToggleButtonGroupProps {
    children: React.ReactNode;
    value?: string | number;
    onChange?: (value: string | number) => void;
    className?: string;
}

const VARIANT_ITEM_MAP = {
    success: SuccessItem,
    warning: WarningItem,
    secondary: SecondaryItem,
};

export const ToggleButtonGroup = ({
    children,
    value,
    onChange,
    className,
}: ToggleButtonGroupProps) => {
    return (
        <ToggleButtonGroupContainer className={className}>
            {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                    const childProps = child.props as any;
                    return React.cloneElement(
                        child as React.ReactElement<any>,
                        {
                            isActive: value === childProps.value,
                            onClick: () =>
                                onChange && onChange(childProps.value),
                        }
                    );
                }
                return child;
            })}
        </ToggleButtonGroupContainer>
    );
};

interface ItemProps {
    value: string;
    variant: "success" | "warning" | "secondary";
    children: React.ReactNode;
    disabled?: boolean;
    className?: string;
    isActive?: boolean;
    onClick?: () => void;
}

const Item: React.FC<ItemProps> = ({
    children,
    disabled,
    className,
    isActive,
    onClick,
    variant,
}) => {
    const Component = VARIANT_ITEM_MAP[variant];
    return (
        <Component
            className={className}
            disabled={disabled}
            $isDisabled={disabled}
            $isActive={isActive}
            onClick={onClick}
            type="button"
        >
            {children}
        </Component>
    );
};

ToggleButtonGroup.Item = Item;
