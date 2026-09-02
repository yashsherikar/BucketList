import client from "./client";

export const RoomsApi = {
  list: () => client.get("/api/rooms").then((r) => r.data),
  create: (payload) => client.post("/api/rooms", payload).then((r) => r.data),
  join: (inviteCode) => client.post("/api/rooms/join", { inviteCode }).then((r) => r.data),
  detail: (roomId) => client.get(`/api/rooms/${roomId}`).then((r) => r.data),
  leave: (roomId) => client.post(`/api/rooms/${roomId}/leave`),
  remove: (roomId) => client.delete(`/api/rooms/${roomId}`),
};

export const ItemsApi = {
  list: (roomId) => client.get(`/api/rooms/${roomId}/items`).then((r) => r.data),
  preview: (roomId, url) =>
    client.post(`/api/rooms/${roomId}/items/preview`, { url }).then((r) => r.data),
  add: (roomId, payload) =>
    client.post(`/api/rooms/${roomId}/items`, payload).then((r) => r.data),
  update: (roomId, itemId, payload) =>
    client.patch(`/api/rooms/${roomId}/items/${itemId}`, payload).then((r) => r.data),
  reserve: (roomId, itemId) =>
    client.post(`/api/rooms/${roomId}/items/${itemId}/reserve`).then((r) => r.data),
  release: (roomId, itemId) =>
    client.post(`/api/rooms/${roomId}/items/${itemId}/release`).then((r) => r.data),
  markBought: (roomId, itemId) =>
    client.post(`/api/rooms/${roomId}/items/${itemId}/buy`).then((r) => r.data),
  markWishlisted: (roomId, itemId) =>
    client.post(`/api/rooms/${roomId}/items/${itemId}/unbuy`).then((r) => r.data),
  remove: (roomId, itemId) => client.delete(`/api/rooms/${roomId}/items/${itemId}`),
  comparePrices: (roomId, itemId) =>
    client.get(`/api/rooms/${roomId}/items/${itemId}/compare-prices`).then((r) => r.data),
};
