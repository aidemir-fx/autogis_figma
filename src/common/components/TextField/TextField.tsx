import {
    TextField as MuiTextField,
    TextFieldProps as TextFieldBaseProps,
} from "@mui/material";
import { IconWrapper, Label, Root, StyledTextField } from "./styles";
import { EyeIcon } from "@common/icons";
import { ReactNode, useMemo, useState, forwardRef, useId } from "react";
import { IconButton } from "../IconButton";

type TextFieldProps = TextFieldBaseProps & {
    icon?: ReactNode;
    error?: boolean;
    helperText?: ReactNode;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
    (props, ref) => {
        const { label, icon, type, ...otherProps } = props;
        const generatedId = useId();
        const inputId = otherProps.id ?? `textfield-${generatedId}`;

        const [isPasswordShown, setIsPasswordShown] = useState(false);

        const isPassword = type === "password";

        const inputType = useMemo(() => {
            if (isPasswordShown) {
                return "text";
            }

            return type;
        }, [isPasswordShown, type]);

        const handleShowClick = () => {
            setIsPasswordShown((prev) => !prev);
        };

        const StartAdornment = icon ? <IconWrapper>{icon}</IconWrapper> : <></>;

        const endAdornment = isPassword ? (
            <IconWrapper>
                <IconButton
                    onClick={handleShowClick}
                    aria-label={isPasswordShown ? "Скрыть пароль" : "Показать пароль"}
                >
                    <EyeIcon />
                </IconButton>
            </IconWrapper>
        ) : undefined;

        return (
            <div>
                {label && <Label htmlFor={inputId}>{label}</Label>}
                <Root>
                    <StyledTextField
                        {...otherProps}
                        id={inputId}
                        helperText={undefined}
                        inputRef={ref}
                        type={inputType}
                        variant="standard"
                        InputProps={{
                            ...otherProps.InputProps,
                            startAdornment: (
                                <>
                                    {StartAdornment}
                                    {otherProps.InputProps?.startAdornment}
                                </>
                            ),
                            endAdornment,
                            disableUnderline: true,
                        }}
                    />
                </Root>
                {props.helperText && (
                    <div
                        style={{
                            color: props.error ? "#d32f2f" : "inherit",
                            fontSize: "0.75rem",
                            marginTop: "3px",
                        }}
                    >
                        {props.helperText}
                    </div>
                )}
            </div>
        );
    }
);
