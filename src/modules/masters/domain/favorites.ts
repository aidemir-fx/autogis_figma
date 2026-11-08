import { http } from "@common/lib/http";

export async function getMasterFavorite(masterId: string): Promise<boolean> {
    const { data } = await http.get<{ isFavorite: boolean }>(`/favorites/masters/${masterId}`);
    return Boolean(data.isFavorite);
}

export async function addMasterFavorite(masterId: string): Promise<boolean> {
    const { data } = await http.put<{ isFavorite: boolean }>(`/favorites/masters/${masterId}`);
    return Boolean(data.isFavorite);
}

export async function removeMasterFavorite(masterId: string): Promise<boolean> {
    const { data } = await http.delete<{ isFavorite: boolean }>(`/favorites/masters/${masterId}`);
    return Boolean(data.isFavorite);
}
