import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStatus } from "@modules/masters/domain/api";
import { toast } from "react-toastify";
import { MasterStatus } from "@modules/masters";
import { ToggleButtonGroup } from "@common/components";
import { SecondaryDot, SuccessDot } from "./styles";

interface StatusToggleProps {
    currentStatus: MasterStatus;
}

const MASTER_PROFILE_QUERY_KEY = ["masterProfile", "me"] as const;

export function StatusToggle({ currentStatus }: StatusToggleProps) {
    const queryClient = useQueryClient();
    const selectedStatus =
        currentStatus === MasterStatus.AVAILABLE
            ? MasterStatus.SCHEDULE
            : currentStatus;

    const mutation = useMutation({
        mutationFn: updateStatus,
        onSuccess: (_, newStatus) => {
            queryClient.invalidateQueries({ queryKey: MASTER_PROFILE_QUERY_KEY });
            const statusText = {
                [MasterStatus.AVAILABLE]: "По графику",
                [MasterStatus.SCHEDULE]: "По графику",
                [MasterStatus.UNAVAILABLE]: "Закрыто",
            }[newStatus as MasterStatus];
            toast.success(`Статус успешно изменен на "${statusText}"`);
        },
        onError: () => {
            toast.error("Ошибка при изменении статуса");
        },
    });

    const handleStatusChange = (newStatus: string | number) => {
        if (newStatus !== selectedStatus) {
            mutation.mutate(newStatus as MasterStatus);
        }
    };

    return (
        <ToggleButtonGroup value={selectedStatus} onChange={handleStatusChange}>
            <ToggleButtonGroup.Item
                value={MasterStatus.SCHEDULE}
                variant="success"
            >
                <SuccessDot
                    $isActive={selectedStatus === MasterStatus.SCHEDULE}
                />
                По графику
            </ToggleButtonGroup.Item>
            <ToggleButtonGroup.Item
                value={MasterStatus.UNAVAILABLE}
                variant="secondary"
            >
                <SecondaryDot
                    $isActive={selectedStatus === MasterStatus.UNAVAILABLE}
                />
                Закрыто
            </ToggleButtonGroup.Item>
        </ToggleButtonGroup>
    );
}
