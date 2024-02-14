import fs from "fs";

export function updateValueInEnv(key, value) {
  let envContent = fs.readFileSync(".env", "utf-8");
  const regex = new RegExp(`^${key}=.*$`, "m");

  // Check if the key exists in the content
  if (regex.test(envContent)) {
    // Update the existing key
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    // Add the new key at the end of the file
    envContent += `\n${key}=${value}`;
  }

  fs.writeFileSync(".env", envContent.trim()); // trim() is used to remove any leading/trailing white spaces or newlines
}
