import fs from "fs";

const sample = JSON.parse(fs.readFileSync("scratch/innovx_sample.json", "utf8"));
const data = sample.json_data;

function getAllKeys(obj, prefix = "") {
  let keys = [];
  for (let key in obj) {
    if (typeof obj[key] === "object" && obj[prefix + key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], prefix + key + "."));
    } else {
      keys.push(prefix + key);
    }
  }
  return keys;
}

const allKeys = getAllKeys(data);
console.log(JSON.stringify(allKeys, null, 2));
