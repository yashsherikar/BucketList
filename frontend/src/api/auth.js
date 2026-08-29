import client from "./client";

export const AuthApi = {
  register: (payload) => client.post("/api/auth/register", payload).then((r) => r.data),
  login: (payload) => client.post("/api/auth/login", payload).then((r) => r.data),
};
