import { Autocomplete, Box, Chip } from "@mui/material";
import { partialMatchKey, useQuery } from "@tanstack/react-query";
import {
    fetchAllProfessions,
    fetchAllAutoMarks,
    fetchAllServices,
} from "../../domain/api";
import { Root } from "./styles";
import { TextField } from "@common/components/TextField";
import { SearchIcon, UserIcon } from "@common/icons";

type Props = {
    query: string[];
    onChange: (next: { query: string[] }) => void;
};

export function Filters({ query, onChange }: Props) {
    const professionsQuery = useQuery({
        queryKey: ["professions"],
        queryFn: fetchAllProfessions,
    });

    const autoMarksQuery = useQuery({
        queryKey: ["auto-marks"],
        queryFn: fetchAllAutoMarks,
    });

    const servicesQuery = useQuery({
        queryKey: ["services"],
        queryFn: fetchAllServices,
    });

    // Combine all options from backend
    const allOptions = [
        ...(professionsQuery.data || []),
        ...(autoMarksQuery.data?.map((am) => am.name) || []),
        ...(servicesQuery.data || []),
    ];

    const isLoading =
        professionsQuery.isLoading ||
        autoMarksQuery.isLoading ||
        servicesQuery.isLoading;

    return (
        <Root>
            <Box sx={{ maxWidth: "600px", width: "100%" }}>
                <Autocomplete
                    multiple
                    options={allOptions}
                    value={query}
                    onChange={(_, value) => onChange({ query: value })}
                    loading={isLoading}
                    renderOption={(props, option) => (
                        <li {...props}>{option}</li>
                    )}
                    sx={{ width: "100%" }}
                    noOptionsText={"Нет вариантов"}
                    fullWidth
                    size="small"
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                            <Chip
                                variant="outlined"
                                label={option}
                                {...getTagProps({ index })}
                            />
                        ))
                    }
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            inputRef={params.InputProps.ref}
                            icon={<SearchIcon />}
                            placeholder={
                                isLoading
                                    ? "Загрузка..."
                                    : "Поиск по профессиям, маркам, услугам"
                            }
                        />
                    )}
                />
            </Box>
        </Root>
    );
}
