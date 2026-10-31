import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { Autocomplete } from "@mui/material";
import { useState } from "react";
import {
    ProfessionsContainer,
    ProfessionsGrid,
    ProfessionItem,
    ProfessionText,
    RemoveButton,
    EmptyProfessions,
    AddProfessionContainer,
} from "./styles";
import { TextField } from "@common/components";

interface Option {
    name: string;
    internationalName?: string;
}

interface TagSelectorProps<T extends FieldValues> {
    name: FieldPath<T>;
    control: Control<T>;
    options: Option[] | string[];
    label: string;
    placeholder: string;
    helperText?: string;
    emptyMessage: string;
    getOptionLabel?: (option: Option | string) => string;
    isOptionEqualToValue?: (
        option: Option | string,
        value: Option | string
    ) => boolean;
}

export function TagSelector<T extends FieldValues>({
    name,
    control,
    options,
    label,
    placeholder,
    helperText,
    emptyMessage,
    getOptionLabel = (option: Option | string) =>
        typeof option === "string" ? option : option.name,
    isOptionEqualToValue = (
        option: Option | string,
        value: Option | string
    ) => {
        if (typeof option === "string" && typeof value === "string") {
            return option === value;
        }
        if (typeof option === "object" && typeof value === "object") {
            return option.name === value.name;
        }
        return false;
    },
}: TagSelectorProps<T>) {
    const [inputValue, setInputValue] = useState("");

    return (
        <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <ProfessionsContainer>
                    {field.value?.length === 0 ? (
                        <EmptyProfessions>{emptyMessage}</EmptyProfessions>
                    ) : (
                        <ProfessionsGrid>
                            {field.value?.map((item: any, index: number) => (
                                <ProfessionItem key={index}>
                                    <ProfessionText>
                                        {getOptionLabel(item)}
                                    </ProfessionText>
                                    <RemoveButton
                                        onClick={() => {
                                            const newValue = field.value.filter(
                                                (_: any, i: number) =>
                                                    i !== index
                                            );
                                            field.onChange(newValue);
                                        }}
                                    >
                                        ×
                                    </RemoveButton>
                                </ProfessionItem>
                            ))}
                        </ProfessionsGrid>
                    )}

                    <AddProfessionContainer>
                        <Autocomplete
                            options={options}
                            value={null}
                            inputValue={inputValue}
                            onInputChange={(_, newInputValue) => {
                                setInputValue(newInputValue);
                            }}
                            getOptionLabel={getOptionLabel}
                            isOptionEqualToValue={isOptionEqualToValue}
                            onChange={(_, newValue) => {
                                if (
                                    newValue &&
                                    !field.value.some(
                                        (item: Option | string) => {
                                            try {
                                                return isOptionEqualToValue(
                                                    item,
                                                    newValue
                                                );
                                            } catch {
                                                return false;
                                            }
                                        }
                                    )
                                ) {
                                    field.onChange([...field.value, newValue]);
                                    setInputValue(""); // Очищаем поле ввода после выбора
                                }
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label={label}
                                    helperText={helperText}
                                    placeholder={placeholder}
                                />
                            )}
                        />
                    </AddProfessionContainer>
                </ProfessionsContainer>
            )}
        />
    );
}
