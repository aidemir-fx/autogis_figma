import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAutoServiceStatus } from "@modules/users/api";
import { toast } from "react-toastify";
import { ToggleButtonGroup } from "@common/components";
import { SecondaryDot, SuccessDot } from "./styles";
import { AutoServiceStatus } from "@modules/auto-service/types";

interface AutoServiceStatusToggleProps {
    currentStatus: AutoServiceStatus;
}

export function AutoServiceStatusToggle({
    currentStatus,
}: AutoServiceStatusToggleProps) {
    const queryClient = useQueryClient();
    const selectedStatus =
        currentStatus === AutoServiceStatus.AVAILABLE
            ? AutoServiceStatus.SCHEDULE
            : currentStatus;

    const mutation = useMutation({
        mutationFn: updateAutoServiceStatus,
        onSuccess: (_, newStatus) => {
            queryClient.invalidateQueries({
                queryKey: ["autoServiceProfile"],
            });
            const statusText = {
                available: "По графику",
                schedule: "По графику",
                unavailable: "Закрыто",
            }[newStatus];
            toast.success(
                `Статус автосервиса успешно изменен на "${statusText}"`
            );
        },
        onError: () => {
            toast.error("Ошибка при изменении статуса автосервиса");
        },
    });

    const handleStatusChange = (newStatus: string | number) => {
        if (newStatus && newStatus !== selectedStatus) {
            mutation.mutate(newStatus as AutoServiceStatus);
        }
    };

    return (
        <ToggleButtonGroup value={selectedStatus} onChange={handleStatusChange}>
            <ToggleButtonGroup.Item
                value={AutoServiceStatus.SCHEDULE}
                variant="success"
            >
                <SuccessDot
                    $isActive={selectedStatus === AutoServiceStatus.SCHEDULE}
                />
                По графику
            </ToggleButtonGroup.Item>
            <ToggleButtonGroup.Item
                value={AutoServiceStatus.UNAVAILABLE}
                variant="secondary"
            >
                <SecondaryDot
                    $isActive={selectedStatus === AutoServiceStatus.UNAVAILABLE}
                />
                Закрыто
            </ToggleButtonGroup.Item>
        </ToggleButtonGroup>
    );
}
