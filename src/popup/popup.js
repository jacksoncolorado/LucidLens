import { PopupController } from "./PopupController.js";

const hostEl = document.getElementById("host");
const urlEl = document.getElementById("url");
const scoreEl = document.getElementById("score");

const pc = new PopupController();
pc.init(({ host, url, score }) => {
  hostEl.textContent = host || "(unknown)";
  urlEl.textContent = url || "";
  scoreEl.textContent = score || "TBD";
});
