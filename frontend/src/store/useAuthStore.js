import { create } from "zustand";

export const useAuthStore = create((set) => ({
    authUser: { name: "Lakshay", _id: 123, age: 25 },
    isLoggedIn: false,
    isLoading: false,

    login: () => {
        console.log("We logged In");
        set({ isLoggedIn: true, isLoading: true })
    }
}));