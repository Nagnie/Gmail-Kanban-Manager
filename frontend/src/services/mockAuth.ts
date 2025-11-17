import type { LoginFormData } from "../schemas/auth";

const mockUsers = [
    {
        id: "1",
        email: "user@example.com",
        name: "Test User",
        password: "123456",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

const mockToken = "mock-jwt-token-12345";

export const mockAuthAPI = {
    login: async (data: LoginFormData) => {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const user = mockUsers.find((u) => u.email === data.email && u.password === data.password);

        if (user) {
            return {
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                    },
                    token: mockToken,
                },
            };
        }

        throw {
            response: {
                data: { message: "Wrong username or password" },
            },
        };
    },

    register: async (data: any) => {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const newUser = {
            id: String(mockUsers.length + 1),
            ...data,
        };

        mockUsers.push(newUser);

        return {
            data: {
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    name: newUser.name,
                    createdAt: newUser.createdAt,
                    updatedAt: newUser.updatedAt,
                },
                token: mockToken,
            },
        };
    },

    getMe: async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));

        return {
            data: {
                user: mockUsers[0],
            },
        };
    },
};
