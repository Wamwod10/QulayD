import { apiRequest } from "./authService";

export function loadReport(name) {
  return apiRequest({ url: `/reports/${name}`, method: "GET" });
}
