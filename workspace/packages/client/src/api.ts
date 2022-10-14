import axios from "axios";

const HOST = process.env.REACT_APP_API_ENDPOINT;
const api = axios.create({
  // TODO change this based on env variable local / staging /prod
  baseURL: `${HOST}/api/v1`,
});

export default api;
