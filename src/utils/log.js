import fs from "fs";

export function writeToLog(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync("log.txt", `${timestamp} - ${message}\n\n`);
}
