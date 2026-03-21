const isProduction = typeof window !== "undefined" && window.location.hostname !== "localhost";

export const API_BASE_URL = isProduction 
  ? "https://hackcrux.onrender.com"
  : "http://localhost:5000";
