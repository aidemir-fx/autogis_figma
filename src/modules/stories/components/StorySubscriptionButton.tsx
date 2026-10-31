import { Button } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@common/hooks";
import { followAuthor, isFollowing, unfollowAuthor } from "../api";

type StorySubscriptionButtonProps = {
    authorId: string;
};

export function StorySubscriptionButton({ authorId }: StorySubscriptionButtonProps) {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const followingQuery = useQuery({
        queryKey: ["subscription", authorId],
        queryFn: () => isFollowing(authorId),
        enabled: Boolean(authorId && isAuthenticated),
    });
    const subscriptionMutation = useMutation({
        mutationFn: () => followingQuery.data ? unfollowAuthor(authorId) : followAuthor(authorId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["subscription", authorId] });
            void queryClient.invalidateQueries({ queryKey: ["stories", "home"] });
            void queryClient.invalidateQueries({ queryKey: ["subscription-stats"] });
        },
    });

    if (!isAuthenticated || !followingQuery.isSuccess) {
        return null;
    }

    return (
        <Button
            size="small"
            variant={followingQuery.data ? "outlined" : "contained"}
            onClick={() => subscriptionMutation.mutate()}
            disabled={subscriptionMutation.isPending}
            sx={{
                minWidth: 0,
                px: 1,
                py: 0.5,
                fontSize: 11,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                flexShrink: 0,
            }}
        >
            {followingQuery.data ? "Вы подписаны" : "Подписаться"}
        </Button>
    );
}
