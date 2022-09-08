import axios from "axios";

const api = axios.create({
  // TODO change this based on env variable local / staging /prod
  // baseURL: "http://localhost:8080/api/v1",
  baseURL: "http://localhost:3333",
});

export default api;
