import { http } from "@common/lib/http";

export async function getAutoServiceFavorite(autoServiceId: string): Promise<boolean> {
    const { data } = await http.get<{ isFavorite: boolean }>(`/favorites/auto-services/${autoServiceId}`);
    return Boolean(data.isFavorite);
}

export async function addAutoServiceFavorite(autoServiceId: string): Promise<boolean> {
    const { data } = await http.put<{ isFavorite: boolean }>(`/favorites/auto-services/${autoServiceId}`);
    return Boolean(data.isFavorite);
}

export async function removeAutoServiceFavorite(autoServiceId: string): Promise<boolean> {
    const { data } = await http.delete<{ isFavorite: boolean }>(`/favorites/auto-services/${autoServiceId}`);
    return Boolean(data.isFavorite);
}
