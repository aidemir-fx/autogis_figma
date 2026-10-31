import React from "react";
import { Box, Typography, Button } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = "Что-то пошло не так",
  onRetry,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        py: 6,
        px: 2,
        textAlign: "center",
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 48, color: "error.main", opacity: 0.7 }} />
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
      {onRetry && (
        <Button variant="outlined" size="small" onClick={onRetry}>
          Попробовать снова
        </Button>
      )}
    </Box>
  );
};
