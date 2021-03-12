const obfuscated = "@ctigboeaomgbnocomal.";
const key = [11, 18, 3, 15, 12, 5, 4, 1, 14, 19, 13, 8, 0, 7, 6, 9, 10, 20, 2, 16, 17] //prettier-ignore
function decode() {
  let decoded = [];
  key.forEach((curr, idx) => {
    decoded[curr] = obfuscated[idx];
  });
  return decoded.join("");
}
document.querySelectorAll(".cta").forEach((item) => {
  item.addEventListener("click", (e) => {
    const decoded = decode();
    const el = document.createElement("div");
    el.className = "email-wrapper";
    const spn = document.createElement("span");
    spn.innerHTML = "Shoot me an email at: ";
    const inp = document.createElement("input");
    inp.value = decoded;
    el.appendChild(spn);
    el.appendChild(inp);
    e.target.parentElement.appendChild(el);
    inp.select();
    // copy email to clipboard -- though might be intrusive
    // inp.setSelectionRange(0, 9999);
    // document.execCommand("copy");
    item.style.display = "none";
    window.location.href =
      "mailto:" + decoded + "?subject=Let's work together!";
  });
});
