import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAutoWashStatus } from "@modules/users/api";
import { toast } from "react-toastify";
import { SecondaryDot, SuccessDot } from "./styles";
import { AutoWashStatus } from "@modules/auto-washes";
import { ToggleButtonGroup } from "@common/components";

interface AutoWashStatusToggleProps {
    currentStatus: AutoWashStatus;
}

export function AutoWashStatusToggle({
    currentStatus,
}: AutoWashStatusToggleProps) {
    const queryClient = useQueryClient();
    const selectedStatus =
        currentStatus === AutoWashStatus.AVAILABLE
            ? AutoWashStatus.SCHEDULE
            : currentStatus;

    const mutation = useMutation({
        mutationFn: updateAutoWashStatus,
        onSuccess: (_, newStatus) => {
            queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "userProfile" });
            queryClient.invalidateQueries({ queryKey: ["autoWashProfile"] });
            const statusText = {
                available: "По графику",
                schedule: "По графику",
                unavailable: "Закрыто",
            }[newStatus];
            toast.success(
                `Статус автомойки успешно изменен на "${statusText}"`
            );
        },

        onError: () => {
            toast.error("Ошибка при изменении статуса автомойки");
        },
    });

    const handleStatusChange = (newStatus: string | number) => {
        if (newStatus && newStatus !== selectedStatus) {
            mutation.mutate(newStatus as AutoWashStatus);
        }
    };

    return (
        <ToggleButtonGroup value={selectedStatus} onChange={handleStatusChange}>
            <ToggleButtonGroup.Item
                value={AutoWashStatus.SCHEDULE}
                variant="success"
            >
                <SuccessDot
                    $isActive={selectedStatus === AutoWashStatus.SCHEDULE}
                />
                По графику
            </ToggleButtonGroup.Item>
            <ToggleButtonGroup.Item
                value={AutoWashStatus.UNAVAILABLE}
                variant="secondary"
            >
                <SecondaryDot
                    $isActive={selectedStatus === AutoWashStatus.UNAVAILABLE}
                />
                Закрыто
            </ToggleButtonGroup.Item>
        </ToggleButtonGroup>
    );
}
