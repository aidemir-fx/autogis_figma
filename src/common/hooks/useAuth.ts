export function useAuth() {
    const accessToken = localStorage.getItem("accessToken");
    const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    
    let userId: string | null = null;
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            userId = user.id;
        } catch {
            // Silent fail
        }
    }

    const logout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/";
    };

    return { 
        isAuthenticated: !!accessToken,
        userId,
        logout 
    };
}
