document.querySelectorAll(".cta").forEach((item) => {
  item.addEventListener("click", (e) => {
    const el = document.createElement("div");
    el.className = "email-wrapper";
    const spn = document.createElement("span");
    spn.innerHTML = "Shoot me an email at: ";
    const inp = document.createElement("input");
    inp.value = "beatobongco@gmail.com";
    el.appendChild(spn);
    el.appendChild(inp);
    e.target.parentElement.appendChild(el);
    inp.select();
    item.style.display = "none";
  });
});
