import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAutoShopStatus } from "@modules/users/api";
import { toast } from "react-toastify";
import { SecondaryDot, SuccessDot } from "./styles";
import { ToggleButtonGroup } from "@common/components";
import { AutoShopStatus } from "@modules/auto-shops";

interface AutoWashStatusToggleProps {
    currentStatus: AutoShopStatus;
}

export function AutoShopStatusToggle({
    currentStatus,
}: AutoWashStatusToggleProps) {
    const queryClient = useQueryClient();
    const selectedStatus =
        currentStatus === AutoShopStatus.AVAILABLE
            ? AutoShopStatus.SCHEDULE
            : currentStatus;

    const mutation = useMutation({
        mutationFn: updateAutoShopStatus,
        onSuccess: (_, newStatus) => {
            queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "userProfile" });
            queryClient.invalidateQueries({ queryKey: ["autoShopProfile"] });
            const statusText = {
                available: "По графику",
                schedule: "По графику",
                unavailable: "Закрыто",
            }[newStatus];
            toast.success(
                `Статус автомагазина успешно изменен на "${statusText}"`
            );
        },

        onError: () => {
            toast.error("Ошибка при изменении статуса автомагазина");
        },
    });

    const handleStatusChange = (newStatus: string | number) => {
        if (newStatus && newStatus !== selectedStatus) {
            mutation.mutate(newStatus as AutoShopStatus);
        }
    };

    return (
        <ToggleButtonGroup value={selectedStatus} onChange={handleStatusChange}>
            <ToggleButtonGroup.Item
                value={AutoShopStatus.SCHEDULE}
                variant="success"
            >
                <SuccessDot
                    $isActive={selectedStatus === AutoShopStatus.SCHEDULE}
                />
                По графику
            </ToggleButtonGroup.Item>
            <ToggleButtonGroup.Item
                value={AutoShopStatus.UNAVAILABLE}
                variant="secondary"
            >
                <SecondaryDot
                    $isActive={selectedStatus === AutoShopStatus.UNAVAILABLE}
                />
                Закрыто
            </ToggleButtonGroup.Item>
        </ToggleButtonGroup>
    );
}
