import type { LoginFormData, SignupFormData } from "../schemas/auth";

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  };
  accessToken: string;
  refreshToken: string;
}

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

const MOCK_ACCESS_TOKEN = "mock-access-token-valid-30s";
const MOCK_REFRESH_TOKEN = "mock-refresh-token-valid-7days";
const DELAY_MS = 500;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockAuthAPI = {
    login: async (data: LoginFormData) => {
        // Simulate API delay
        await delay(DELAY_MS);

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
                accessToken: MOCK_ACCESS_TOKEN,
                refreshToken: MOCK_REFRESH_TOKEN,
                } as AuthResponse,
            };
        }

        throw {
            response: {
                status: 401,
                data: { message: "Email or password is incorrect" },
            },
        };
    },

    register: async (data: SignupFormData) => {
        await delay(DELAY_MS);

        if (mockUsers.find((u) => u.email === data.email)) {
            throw {
                response: {
                status: 409,
                data: { message: "Email has already been used" },
                },
            };
        }

        const newUser = {
            id: String(mockUsers.length + 1),
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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
                accessToken: MOCK_ACCESS_TOKEN,
                refreshToken: MOCK_REFRESH_TOKEN,
            } as AuthResponse,
        };
    },

    googleExchange: async (googleToken: string) => {
        await delay(1000);

        if (!googleToken) {
            throw { response: { status: 400, data: { message: "Google Token is invalid" } } };
        }

        const googleUser = mockUsers[0];

        return {
            data: {
                user: {
                    id: googleUser.id,
                    email: googleUser.email,
                    name: googleUser.name,
                    createdAt: googleUser.createdAt,
                    updatedAt: googleUser.updatedAt,
                },
                accessToken: MOCK_ACCESS_TOKEN,
                refreshToken: MOCK_REFRESH_TOKEN,
            } as AuthResponse,
        };
    },

    refreshToken: async (refreshToken: string) => {
        await delay(DELAY_MS);

        if (refreshToken === MOCK_REFRESH_TOKEN) {
            return {
                data: {
                    accessToken: "new-access-token-" + Date.now(),
                    refreshToken: MOCK_REFRESH_TOKEN,
                },
            };
        }

        throw {
            response: {
                status: 403,
                data: { message: "Session expired" },
            },
        };
    },

    getMe: async () => {
        await delay(DELAY_MS);

        return {
            data: {
                user: mockUsers[0],
            },
        };
    },
};
