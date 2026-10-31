import React from "react";
import { Box, Skeleton, Stack } from "@mui/material";

interface PageSkeletonProps {
  rows?: number;
  hasAvatar?: boolean;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  rows = 4,
  hasAvatar = false,
}) => {
  return (
    <Box sx={{ p: 2, width: "100%" }}>
      {hasAvatar && (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Skeleton variant="circular" width={56} height={56} />
          <Stack spacing={1} flex={1}>
            <Skeleton variant="rounded" width="60%" height={16} />
            <Skeleton variant="rounded" width="40%" height={14} />
          </Stack>
        </Stack>
      )}
      <Stack spacing={2}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={i === 0 ? 24 : 16}
            width={i % 2 === 0 ? "100%" : "75%"}
          />
        ))}
      </Stack>
    </Box>
  );
};
